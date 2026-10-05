import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  firestoreGetDoc,
  firestoreSetDoc,
  firestoreDeleteDoc,
  firestoreQuery,
} from './server/firestoreClient';
import { authService, ProfileRecord, WorkspaceRecord } from './server/authService';
import {
  processAndIngestDocument,
  deleteSourceAndChunks,
  SourceRecord,
  ChunkRecord,
} from './server/documentProcessor';
import {
  executeRagQuery,
  BotRecord,
  FeedbackRecord,
  ConversationRecord,
  MessageRecord,
} from './server/ragEngine';
import { seedInitialKnowledgeAndAssistants } from './server/seedService';
import { getWidgetJs } from './server/widgetScript';

const app = express();
const PORT = 3000;

// Enable CORS with credential support for external embed widgets and third-party sites
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-tenant-id, x-workspace-id');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json({ limit: '2mb' }));

// In-memory sliding-window rate limiter for brute-force and DoS protection
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMaps = new Map<string, Map<string, RateLimitRecord>>();

function createRateLimiter(bucketName: string, maxRequests: number, windowMs: number) {
  if (!rateLimitMaps.has(bucketName)) {
    rateLimitMaps.set(bucketName, new Map());
  }
  const bucket = rateLimitMaps.get(bucketName)!;

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const record = bucket.get(ip);

    if (!record || now > record.resetAt) {
      bucket.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      const retrySec = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retrySec);
      res.status(429).json({
        error: 'Too many requests. Please slow down and try again later.',
        retryAfterSec: retrySec,
      });
      return;
    }

    record.count++;
    next();
  };
}

const authLimiter = createRateLimiter('auth', 50, 15 * 60 * 1000); // 50 attempts per 15 min
const chatLimiter = createRateLimiter('chat', 100, 60 * 1000); // 100 queries per min
const uploadLimiter = createRateLimiter('upload', 40, 10 * 60 * 1000); // 40 uploads per 10 min

// Identifier validator: strictly prevents path traversal and injection via resource IDs
function isValidResourceId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  if (id.length > 128) return false;
  return /^[a-zA-Z0-9_\-\.]+$/.test(id) && !id.includes('..') && !id.startsWith('.');
}

// Error sanitizer: prevents API keys, tokens, system paths, or cloud project metadata from leaking
function sanitizeErrorMessage(err: any): string {
  if (!err) return 'An unexpected error occurred';
  const raw = String(err.message || err);
  return raw
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
    .replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]')
    .replace(/projects\/[a-zA-Z0-9_\-]+/g, 'projects/[REDACTED_PROJECT]')
    .replace(/databases\/[a-zA-Z0-9_\-]+/g, 'databases/[REDACTED_DB]')
    .replace(/(?:\/[a-zA-Z0-9_\.\-]+){3,}/g, '[REDACTED_PATH]');
}

// Public Embed Widget JavaScript Endpoint
app.get('/widget.js', (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.get('host') || 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(getWidgetJs(baseUrl));
});

// Multer storage for document file uploads with strict path-traversal prevention
const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    // Sanitize basename to prevent directory traversal attacks (e.g., ../../etc/passwd)
    const safeBase = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '');
    cb(null, `${uniqueSuffix}-${safeBase || 'document'}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Exclude executable and markup formats (.html, .htm, .svg, .js, .exe)
    const allowed = ['.pdf', '.txt', '.md', '.markdown', '.docx', '.csv', '.json'];
    if (allowed.includes(ext) || file.mimetype === 'application/pdf' || file.mimetype.startsWith('text/')) {
      cb(null, true);
    } else {
      cb(new Error('Only safe document files (PDF, TXT, MD, CSV, DOCX) are supported.'));
    }
  },
});

// Authentication & Session Extraction Middleware
interface AuthRequest extends express.Request {
  user?: ProfileRecord;
  workspace?: WorkspaceRecord;
  workspaceId?: string;
}

async function extractAuth(req: AuthRequest, _res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const session = await authService.getSession(token);
      if (session) {
        const user = (await firestoreGetDoc('profiles', session.userId)) as ProfileRecord | null;
        if (user) {
          req.user = user;
          const requestedWsId = req.headers['x-workspace-id'] as string;
          let wsIdToUse = session.workspaceId;
          if (requestedWsId) {
            const hasAccess = await authService.verifyWorkspaceAccess(user.id, requestedWsId);
            if (hasAccess) {
              wsIdToUse = requestedWsId;
            }
          }
          const ws = (await firestoreGetDoc('workspaces', wsIdToUse)) as WorkspaceRecord | null;
          if (ws) {
            req.workspace = ws;
            req.workspaceId = ws.id;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Auth extraction error:', err);
  }
  next();
}

app.use(extractAuth as express.RequestHandler);

// Middleware to strictly enforce authentication for protected actions
function requireAuth(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  next();
}

// Helper to resolve workspace ID with default fallback
function resolveWorkspaceId(req: AuthRequest): string {
  if (req.workspaceId) return req.workspaceId;
  return 'ws-apex';
}

// -------------------------------------------------------------
// AUTHENTICATION & WORKSPACE ROUTES
// -------------------------------------------------------------

// POST /api/auth/signup - Create new user account & organization workspace
app.post('/api/auth/signup', authLimiter as express.RequestHandler, async (req, res) => {
  try {
    const { name, email, password, orgName } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }

    if (!authService.validateEmail(email)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    const pwCheck = authService.validatePasswordStrength(password);
    if (!pwCheck.valid) {
      res.status(400).json({ error: pwCheck.reason });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await authService.findProfileByEmail(normalizedEmail);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const { hash, salt } = await authService.hashAndSalt(password);
    const profile = await authService.createProfile(name.trim(), normalizedEmail, hash, salt);
    const workspace = await authService.createWorkspace(orgName || `${name.trim()}'s Workspace`, profile.id);
    const token = await authService.createSession(profile.id, workspace.id);

    const { passwordHash: _ph, passwordSalt: _ps, ...safeProfile } = profile;
    res.status(201).json({
      user: safeProfile,
      workspace,
      token,
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: sanitizeErrorMessage(error) });
  }
});

// POST /api/auth/login - User login
app.post('/api/auth/login', authLimiter as express.RequestHandler, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const profile = await authService.findProfileByEmail(normalizedEmail);
    if (!profile || !profile.passwordHash || !profile.passwordSalt) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const valid = authService.verifyPassword(password, profile.passwordHash, profile.passwordSalt);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const workspaces = await authService.getUserWorkspaces(profile.id);
    const activeWorkspace = workspaces[0] || (await authService.createWorkspace(`${profile.name}'s Workspace`, profile.id));
    const token = await authService.createSession(profile.id, activeWorkspace.id);

    const { passwordHash: _ph, passwordSalt: _ps, ...safeProfile } = profile;
    res.json({
      user: safeProfile,
      workspace: activeWorkspace,
      workspaces,
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: sanitizeErrorMessage(error) });
  }
});

// POST /api/auth/logout - End session
app.post('/api/auth/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      await authService.deleteSession(token);
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/me - Current user profile & accessible workspaces
app.get('/api/auth/me', async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      // Default guest profile if not authenticated
      res.json({
        user: {
          id: 'usr-guest',
          name: 'Dr. Arthur Vance',
          email: 'admin@apex.edu',
          role: 'Admin',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
        },
        workspace: {
          id: 'ws-apex',
          name: 'Apex University',
          slug: 'apex-university',
          plan: 'Professional',
          memberCount: 5,
          avatarLetter: 'A',
        },
        workspaces: [
          {
            id: 'ws-apex',
            name: 'Apex University',
            slug: 'apex-university',
            plan: 'Professional',
            memberCount: 5,
            avatarLetter: 'A',
          },
        ],
        isAuthenticated: false,
      });
      return;
    }

    const workspaces = await authService.getUserWorkspaces(req.user.id);
    const { passwordHash: _ph, passwordSalt: _ps, ...safeProfile } = req.user;
    res.json({
      user: safeProfile,
      workspace: req.workspace || workspaces[0],
      workspaces,
      isAuthenticated: true,
    });
  } catch (error: any) {
    res.status(500).json({ error: sanitizeErrorMessage(error) });
  }
});

// GET /api/workspaces - List user's workspaces strictly scoped to memberships
app.get('/api/workspaces', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (userId) {
      const workspaces = await authService.getUserWorkspaces(userId);
      res.json(workspaces);
    } else {
      // In guest / unauthenticated mode, ONLY expose public demo workspace metadata, NEVER other customer tenants!
      res.json([
        {
          id: 'ws-apex',
          name: 'Apex University',
          slug: 'apex-university',
          plan: 'Professional',
          memberCount: 5,
          avatarLetter: 'A',
        },
      ]);
    }
  } catch (error: any) {
    res.status(500).json({ error: sanitizeErrorMessage(error) });
  }
});

// POST /api/workspaces - Create a new workspace (Requires authentication)
app.post('/api/workspaces', requireAuth as express.RequestHandler, async (req: AuthRequest, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Workspace name is required.' });
      return;
    }
    if (name.trim().length > 100) {
      res.status(400).json({ error: 'Workspace name must not exceed 100 characters.' });
      return;
    }
    const ownerId = req.user!.id;
    const workspace = await authService.createWorkspace(name.trim(), ownerId);
    res.status(201).json(workspace);
  } catch (error: any) {
    res.status(500).json({ error: sanitizeErrorMessage(error) });
  }
});

// -------------------------------------------------------------
// ASSISTANTS / BOTS MANAGEMENT (CRUD & MULTI-TENANCY)
// -------------------------------------------------------------

// GET /api/assistants - List all assistants for the active workspace
app.get('/api/assistants', async (req: AuthRequest, res) => {
  try {
    const workspaceId = resolveWorkspaceId(req);
    let bots = (await firestoreQuery('bots', 'workspace_id', workspaceId)) as BotRecord[];
    
    // Auto-seed ONLY for the default showcase workspace 'ws-apex'
    if ((!bots || bots.length === 0) && workspaceId === 'ws-apex') {
      await seedInitialKnowledgeAndAssistants();
      bots = (await firestoreQuery('bots', 'workspace_id', workspaceId)) as BotRecord[];
    }

    if (!bots) {
      bots = [];
    }

    // Attach document IDs: union of attached documentIds and direct bot_id sources within this workspace
    const allSources = (await firestoreQuery('sources', 'workspace_id', workspaceId)) as SourceRecord[];
    const result = bots.map(b => {
      const attached = Array.isArray(b.documentIds) ? b.documentIds : [];
      const direct = allSources.filter(s => s.bot_id === b.id).map(s => s.id);
      const docIds = Array.from(new Set([...attached, ...direct]));
      return {
        id: b.id,
        workspaceId: b.workspace_id,
        name: b.name,
        description: b.description,
        status: b.status,
        documentIds: docIds,
        settings: {
          name: b.name,
          description: b.description,
          greeting: b.greeting,
          placeholder: b.placeholder || 'Ask a question...',
          instructions: b.instructions,
          themeColor: b.theme,
          avatarUrl: b.avatar,
          suggestedQuestions: b.suggested_questions || [],
          refusalMessage: b.refusal_message,
        },
        createdAt: b.created_at,
        updatedAt: b.updated_at,
        lastIndexedAt: b.updated_at,
        metrics: b.metrics || {
          totalQuestions: 0,
          totalConversations: 0,
          avgResponseTimeSec: 1.2,
          feedbackScore: 100,
          positiveCount: 0,
          negativeCount: 0,
        },
      };
    });

    res.json(result);
  } catch (error: any) {
    console.error('List assistants error:', error);
    res.status(500).json({ error: sanitizeErrorMessage(error) });
  }
});

// GET /api/assistants/:id - Get assistant details (Public safe view for widgets, full view for workspace members)
app.get('/api/assistants/:id', async (req: AuthRequest, res) => {
  try {
    const rawId = req.params.id;
    if (!isValidResourceId(rawId)) {
      res.status(400).json({ error: 'Invalid assistant ID format.' });
      return;
    }

    let bot = (await firestoreGetDoc('bots', rawId)) as BotRecord | null;
    if (!bot && rawId.startsWith('assistant-')) {
      bot = (await firestoreGetDoc('bots', rawId.replace(/^assistant-/, ''))) as BotRecord | null;
    }
    if (!bot) {
      res.status(404).json({ error: 'Assistant not found.' });
      return;
    }

    const isMember = req.user ? await authService.verifyWorkspaceAccess(req.user.id, bot.workspace_id) : false;

    // Security Gate: Authenticated cross-tenant access is forbidden
    if (req.user && !isMember) {
      res.status(403).json({ error: 'Access denied: You do not have permission to view this assistant.' });
      return;
    }

    // Security Gate: Unauthenticated callers (public embed widget) only receive public display settings.
    // Never expose system instructions, document IDs, workspace ID, or internal metrics!
    if (!isMember) {
      res.json({
        id: bot.id,
        name: bot.name,
        description: bot.description,
        status: bot.status,
        settings: {
          name: bot.name,
          description: bot.description,
          greeting: bot.greeting,
          placeholder: bot.placeholder || 'Ask a question...',
          themeColor: bot.theme,
          suggestedQuestions: bot.suggested_questions || [],
          refusalMessage: bot.refusal_message,
        },
      });
      return;
    }

    const sources = (await firestoreQuery('sources', 'bot_id', bot.id)) as SourceRecord[];
    const attached = Array.isArray(bot.documentIds) ? bot.documentIds : [];
    const direct = sources.map(s => s.id);
    const docIds = Array.from(new Set([...attached, ...direct]));

    res.json({
      id: bot.id,
      workspaceId: bot.workspace_id,
      name: bot.name,
      description: bot.description,
      status: bot.status,
      documentIds: docIds,
      settings: {
        name: bot.name,
        description: bot.description,
        greeting: bot.greeting,
        placeholder: bot.placeholder || 'Ask a question...',
        instructions: bot.instructions,
        themeColor: bot.theme,
        avatarUrl: bot.avatar,
        suggestedQuestions: bot.suggested_questions || [],
        refusalMessage: bot.refusal_message,
      },
      createdAt: bot.created_at,
      updatedAt: bot.updated_at,
      lastIndexedAt: bot.updated_at,
      metrics: bot.metrics,
    });
  } catch (error: any) {
    res.status(500).json({ error: sanitizeErrorMessage(error) });
  }
});

// POST /api/assistants - Create new assistant (Requires authenticated workspace member)
app.post('/api/assistants', requireAuth as express.RequestHandler, async (req: AuthRequest, res) => {
  try {
    const workspaceId = resolveWorkspaceId(req);
    const hasAccess = await authService.verifyWorkspaceAccess(req.user!.id, workspaceId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied: You do not have permission to create assistants in this workspace.' });
      return;
    }

    const { name, description, greeting, placeholder, instructions, themeColor, suggestedQuestions, refusalMessage, settings, documentIds } = req.body;

    const botName = (name || settings?.name || 'Custom AI Assistant').trim();
    if (botName.length > 100) {
      res.status(400).json({ error: 'Assistant name must not exceed 100 characters.' });
      return;
    }

    const botDesc = (description || settings?.description || '').trim();
    if (botDesc.length > 1000) {
      res.status(400).json({ error: 'Assistant description must not exceed 1000 characters.' });
      return;
    }

    const botInstructions = (instructions || settings?.instructions || 'Answer strictly using verified source documents. If not found, refuse.').trim();
    if (botInstructions.length > 5000) {
      res.status(400).json({ error: 'System instructions must not exceed 5000 characters.' });
      return;
    }

    const rawTheme = themeColor || settings?.themeColor || '#2563eb';
    const safeTheme = /^#(?:[0-9a-fA-F]{3,8})$|^rgb\([0-9\s,]+\)$/.test(rawTheme) ? rawTheme : '#2563eb';

    const id = `ast-${Date.now()}`;
    const initialDocIds: string[] = Array.isArray(documentIds)
      ? documentIds
      : (Array.isArray(settings?.documentIds) ? settings.documentIds : []);

    if (initialDocIds.length > 100) {
      res.status(400).json({ error: 'Cannot attach more than 100 documents.' });
      return;
    }

    // Validate that attached documents belong strictly to this workspace
    if (initialDocIds.length > 0) {
      const wsDocs = (await firestoreQuery('sources', 'workspace_id', workspaceId)) as SourceRecord[];
      const validDocIds = new Set(wsDocs.map(d => d.id));
      for (const docId of initialDocIds) {
        if (!isValidResourceId(docId) || !validDocIds.has(docId)) {
          res.status(400).json({ error: `Invalid documentId: ${docId} does not belong to this workspace.` });
          return;
        }
      }
    }

    const newBot: BotRecord = {
      id,
      workspace_id: workspaceId,
      name: botName,
      description: botDesc,
      instructions: botInstructions,
      greeting: (greeting || settings?.greeting || 'Hi! How can I help you today?').trim().slice(0, 500),
      placeholder: (placeholder || settings?.placeholder || 'Ask a question based on uploaded documents...').trim().slice(0, 200),
      avatar: '🤖',
      theme: safeTheme,
      status: 'Ready',
      documentIds: initialDocIds,
      suggested_questions: Array.isArray(suggestedQuestions || settings?.suggestedQuestions)
        ? (suggestedQuestions || settings?.suggestedQuestions).slice(0, 20).map((q: any) => String(q).slice(0, 200))
        : ['What are the core regulations?'],
      refusal_message: (refusalMessage || settings?.refusalMessage || "I couldn't find sufficient information in the knowledge base to answer that question.").trim().slice(0, 1000),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metrics: {
        totalQuestions: 0,
        totalConversations: 0,
        avgResponseTimeSec: 0,
        feedbackScore: 100,
        positiveCount: 0,
        negativeCount: 0,
      },
    };

    await firestoreSetDoc('bots', id, newBot);

    // Keep legacy assistants record in sync
    await firestoreSetDoc('assistants', id, {
      ...newBot,
      documentIds: initialDocIds,
      settings: {
        name: newBot.name,
        description: newBot.description,
        greeting: newBot.greeting,
        placeholder: newBot.placeholder,
        instructions: newBot.instructions,
        themeColor: newBot.theme,
        suggestedQuestions: newBot.suggested_questions,
        refusalMessage: newBot.refusal_message,
      },
    });

    res.status(201).json({
      id: newBot.id,
      workspaceId: newBot.workspace_id,
      name: newBot.name,
      description: newBot.description,
      status: newBot.status,
      documentIds: initialDocIds,
      settings: {
        name: newBot.name,
        description: newBot.description,
        greeting: newBot.greeting,
        placeholder: newBot.placeholder,
        instructions: newBot.instructions,
        themeColor: newBot.theme,
        suggestedQuestions: newBot.suggested_questions,
        refusalMessage: newBot.refusal_message,
      },
      createdAt: newBot.created_at,
      updatedAt: newBot.updated_at,
      lastIndexedAt: newBot.updated_at,
      metrics: newBot.metrics,
    });
  } catch (error: any) {
    console.error('Create assistant error:', error);
    res.status(500).json({ error: sanitizeErrorMessage(error) });
  }
});

// PATCH /api/assistants/:id - Update assistant (Strict workspace ownership verified)
app.patch('/api/assistants/:id', requireAuth as express.RequestHandler, async (req: AuthRequest, res) => {
  try {
    const rawId = req.params.id;
    if (!isValidResourceId(rawId)) {
      res.status(400).json({ error: 'Invalid assistant ID format.' });
      return;
    }

    const existing = (await firestoreGetDoc('bots', rawId)) as BotRecord | null;
    if (!existing) {
      res.status(404).json({ error: 'Assistant not found.' });
      return;
    }

    const hasAccess = await authService.verifyWorkspaceAccess(req.user!.id, existing.workspace_id);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied: You do not have permission to modify this assistant.' });
      return;
    }

    const { name, description, settings, status, documentIds } = req.body;
    const finalDocIds = documentIds !== undefined
      ? documentIds
      : (settings?.documentIds !== undefined ? settings.documentIds : existing.documentIds || []);

    if (finalDocIds && finalDocIds.length > 0) {
      if (finalDocIds.length > 100) {
        res.status(400).json({ error: 'Cannot attach more than 100 documents.' });
        return;
      }
      const wsDocs = (await firestoreQuery('sources', 'workspace_id', existing.workspace_id)) as SourceRecord[];
      const validDocIds = new Set(wsDocs.map(d => d.id));
      for (const docId of finalDocIds) {
        if (!isValidResourceId(docId) || !validDocIds.has(docId)) {
          res.status(400).json({ error: `Invalid documentId: ${docId} does not belong to this workspace.` });
          return;
        }
      }
    }

    const updatedName = name !== undefined ? name : (settings?.name || existing.name);
    if (updatedName && String(updatedName).length > 100) {
      res.status(400).json({ error: 'Name must not exceed 100 characters.' });
      return;
    }

    const updatedInstructions = settings?.instructions !== undefined ? settings.instructions : existing.instructions;
    if (updatedInstructions && String(updatedInstructions).length > 5000) {
      res.status(400).json({ error: 'Instructions must not exceed 5000 characters.' });
      return;
    }

    const rawTheme = settings?.themeColor !== undefined ? settings.themeColor : existing.theme;
    const safeTheme = /^#(?:[0-9a-fA-F]{3,8})$|^rgb\([0-9\s,]+\)$/.test(rawTheme) ? rawTheme : existing.theme;

    const updated: BotRecord = {
      ...existing,
      name: updatedName ? String(updatedName).trim() : existing.name,
      description: description !== undefined ? String(description).slice(0, 1000) : (settings?.description ? String(settings.description).slice(0, 1000) : existing.description),
      status: status !== undefined ? status : existing.status,
      documentIds: finalDocIds,
      instructions: updatedInstructions ? String(updatedInstructions).trim() : existing.instructions,
      greeting: settings?.greeting !== undefined ? String(settings.greeting).slice(0, 500) : existing.greeting,
      placeholder: settings?.placeholder !== undefined ? String(settings.placeholder).slice(0, 200) : existing.placeholder,
      theme: safeTheme,
      suggested_questions: settings?.suggestedQuestions !== undefined ? settings.suggestedQuestions : existing.suggested_questions,
      refusal_message: settings?.refusalMessage !== undefined ? String(settings.refusalMessage).slice(0, 1000) : existing.refusal_message,
      updated_at: new Date().toISOString(),
    };

    await firestoreSetDoc('bots', existing.id, updated);

    // Sync legacy record
    await firestoreSetDoc('assistants', existing.id, {
      ...updated,
      documentIds: finalDocIds,
      settings: {
        name: updated.name,
        description: updated.description,
        greeting: updated.greeting,
        placeholder: updated.placeholder,
        instructions: updated.instructions,
        themeColor: updated.theme,
        suggestedQuestions: updated.suggested_questions,
        refusalMessage: updated.refusal_message,
      },
    });

    const sources = (await firestoreQuery('sources', 'bot_id', existing.id)) as SourceRecord[];
    const directDocIds = sources.map(s => s.id);
    const combinedDocIds = Array.from(new Set([...(finalDocIds || []), ...directDocIds]));

    res.json({
      id: updated.id,
      workspaceId: updated.workspace_id,
      name: updated.name,
      description: updated.description,
      status: updated.status,
      documentIds: combinedDocIds,
      settings: {
        name: updated.name,
        description: updated.description,
        greeting: updated.greeting,
        placeholder: updated.placeholder,
        instructions: updated.instructions,
        themeColor: updated.theme,
        suggestedQuestions: updated.suggested_questions,
        refusalMessage: updated.refusal_message,
      },
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
      lastIndexedAt: updated.updated_at,
      metrics: updated.metrics,
    });
  } catch (error: any) {
    res.status(500).json({ error: sanitizeErrorMessage(error) });
  }
});

// DELETE /api/assistants/:id - Delete assistant and all associated chunks (Strict workspace ownership verified)
app.delete('/api/assistants/:id', requireAuth as express.RequestHandler, async (req: AuthRequest, res) => {
  try {
    const rawId = req.params.id;
    if (!isValidResourceId(rawId)) {
      res.status(400).json({ error: 'Invalid assistant ID format.' });
      return;
    }

    const existing = (await firestoreGetDoc('bots', rawId)) as BotRecord | null;
    if (!existing) {
      res.status(404).json({ error: 'Assistant not found.' });
      return;
    }

    const hasAccess = await authService.verifyWorkspaceAccess(req.user!.id, existing.workspace_id);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied: You do not have permission to delete this assistant.' });
      return;
    }

    // Delete chunks and sources
    const chunks = (await firestoreQuery('chunks', 'bot_id', existing.id)) as ChunkRecord[];
    for (const c of chunks) {
      await firestoreDeleteDoc('chunks', c.id);
    }

    const sources = (await firestoreQuery('sources', 'bot_id', existing.id)) as SourceRecord[];
    for (const s of sources) {
      await firestoreDeleteDoc('sources', s.id);
    }

    await firestoreDeleteDoc('bots', existing.id);
    await firestoreDeleteDoc('assistants', existing.id);

    res.json({ success: true, id: req.params.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// DOCUMENT INGESTION & KNOWLEDGE BASE
// -------------------------------------------------------------

// GET /api/documents - List documents
app.get('/api/documents', async (req: AuthRequest, res) => {
  try {
    const workspaceId = resolveWorkspaceId(req);
    if (!req.user && workspaceId !== 'ws-apex') {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    let sources = (await firestoreQuery('sources', 'workspace_id', workspaceId)) as SourceRecord[];
    if (!sources) {
      sources = [];
    }

    // Map to frontend DocumentItem interface
    const mapped = sources.map(s => ({
      id: s.id,
      filename: s.filename,
      filesize: s.filesize || '2.4 MB',
      type: s.file_type,
      pages: s.page_count,
      status: s.status,
      summary: s.summary || `Semantic vector indexed knowledge document: ${s.filename}`,
      uploadedAt: s.created_at,
      lastIndexedAt: s.updated_at,
    }));

    res.json(mapped);
  } catch (error: any) {
    res.status(500).json({ error: sanitizeErrorMessage(error) });
  }
});

// POST /api/documents/upload - Real Document Ingestion: Extract -> Clean -> Chunk -> Embed -> Store (Requires authentication)
app.post('/api/documents/upload', requireAuth as express.RequestHandler, uploadLimiter as express.RequestHandler, upload.array('files', 10), async (req: AuthRequest, res) => {
  try {
    const workspaceId = resolveWorkspaceId(req);
    const hasAccess = await authService.verifyWorkspaceAccess(req.user!.id, workspaceId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied: You do not have permission to upload documents to this workspace.' });
      return;
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded.' });
      return;
    }

    let targetBotId = (req.body.assistantId as string) || '';
    let targetBot: BotRecord | null = null;

    if (targetBotId) {
      if (!isValidResourceId(targetBotId)) {
        res.status(400).json({ error: 'Invalid target assistant ID.' });
        return;
      }
      targetBot = (await firestoreGetDoc('bots', targetBotId)) as BotRecord | null;
      if (!targetBot) {
        res.status(404).json({ error: 'Target assistant not found.' });
        return;
      }
      const hasBotAccess = await authService.verifyWorkspaceAccess(req.user!.id, targetBot.workspace_id);
      if (!hasBotAccess) {
        res.status(403).json({ error: 'Access denied: Target assistant belongs to a different workspace.' });
        return;
      }
    } else {
      // Workspace-scoped resolution: find first bot in requester's workspace
      const wsBots = (await firestoreQuery('bots', 'workspace_id', workspaceId)) as BotRecord[];
      if (wsBots.length > 0) {
        targetBot = wsBots[0];
        targetBotId = wsBots[0].id;
      }
    }

    const createdSources: any[] = [];

    for (const file of files) {
      const sourceId = `src-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      const ext = path.extname(file.originalname).toUpperCase().replace('.', '') || 'PDF';

      const sourceRecord: SourceRecord = {
        id: sourceId,
        bot_id: targetBotId,
        workspace_id: workspaceId,
        filename: file.originalname,
        storage_path: file.path,
        file_type: ext,
        status: 'Processing',
        page_count: 1,
        filesize: sizeMb,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await firestoreSetDoc('sources', sourceId, sourceRecord);

      // Process pipeline
      try {
        const result = await processAndIngestDocument(sourceRecord, file.path, {
          maxCharacters: 1800,
          overlapCharacters: 270,
        });

        createdSources.push({
          id: sourceId,
          filename: file.originalname,
          filesize: sizeMb,
          type: ext,
          pages: result.pageCount,
          status: 'Ready',
          summary: `Extracted ${result.pageCount} pages and indexed ${result.chunkCount} vector chunks.`,
          uploadedAt: sourceRecord.created_at,
          lastIndexedAt: new Date().toISOString(),
        });
      } catch (procErr: any) {
        console.error('Ingestion processing failed:', procErr);
        createdSources.push({
          id: sourceId,
          filename: file.originalname,
          filesize: sizeMb,
          type: ext,
          pages: 1,
          status: 'Failed',
          summary: `Failed to process document: ${sanitizeErrorMessage(procErr)}`,
          uploadedAt: sourceRecord.created_at,
          lastIndexedAt: new Date().toISOString(),
        });
      }
    }

    if (targetBot) {
      const currentDocIds = (targetBot as any).documentIds || [];
      const newIds = createdSources.filter(s => s.status === 'Ready').map(s => s.id).filter(id => !currentDocIds.includes(id));
      if (newIds.length > 0) {
        await firestoreSetDoc('bots', targetBot.id, {
          ...targetBot,
          documentIds: [...currentDocIds, ...newIds],
          updated_at: new Date().toISOString(),
        });
      }
    }

    res.status(201).json(createdSources);
  } catch (error: any) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: sanitizeErrorMessage(error) });
  }
});

// POST /api/documents/:id/reindex - Re-index source document (Requires authenticated workspace member)
app.post('/api/documents/:id/reindex', requireAuth as express.RequestHandler, async (req: AuthRequest, res) => {
  try {
    const rawId = req.params.id;
    if (!isValidResourceId(rawId)) {
      res.status(400).json({ error: 'Invalid document ID format.' });
      return;
    }

    const source = (await firestoreGetDoc('sources', rawId)) as SourceRecord | null;
    if (!source) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    if (source.workspace_id) {
      const hasAccess = await authService.verifyWorkspaceAccess(req.user!.id, source.workspace_id);
      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied: You do not have permission to reindex this document.' });
        return;
      }
    }

    if (fs.existsSync(source.storage_path)) {
      await processAndIngestDocument(source, source.storage_path);
    } else {
      source.status = 'Ready';
      source.updated_at = new Date().toISOString();
      await firestoreSetDoc('sources', source.id, source);
    }

    res.json({
      id: source.id,
      filename: source.filename,
      filesize: source.filesize || '2.4 MB',
      type: source.file_type,
      pages: source.page_count,
      status: source.status,
      summary: source.summary,
      uploadedAt: source.created_at,
      lastIndexedAt: source.updated_at,
    });
  } catch (error: any) {
    res.status(500).json({ error: sanitizeErrorMessage(error) });
  }
});

// DELETE /api/documents/:id - Delete source document and vector chunks (Requires authenticated workspace member)
app.delete('/api/documents/:id', requireAuth as express.RequestHandler, async (req: AuthRequest, res) => {
  try {
    const rawId = req.params.id;
    if (!isValidResourceId(rawId)) {
      res.status(400).json({ error: 'Invalid document ID format.' });
      return;
    }

    const source = (await firestoreGetDoc('sources', rawId)) as SourceRecord | null;
    if (!source) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    if (source.workspace_id) {
      const hasAccess = await authService.verifyWorkspaceAccess(req.user!.id, source.workspace_id);
      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied: You do not have permission to delete this document.' });
        return;
      }
    }

    await deleteSourceAndChunks(source.id, source.bot_id);
    if (source.storage_path) {
      const resolvedPath = path.resolve(source.storage_path);
      // Strictly guard against directory traversal outside uploadDir
      if (resolvedPath.startsWith(uploadDir) && fs.existsSync(resolvedPath)) {
        try { fs.unlinkSync(resolvedPath); } catch {}
      }
    }

    // Referential integrity: Remove document from any bots referencing it
    const allBots = (await firestoreQuery('bots', 'workspace_id', source.workspace_id || resolveWorkspaceId(req))) as BotRecord[];
    for (const b of allBots) {
      const docIds = (b as any).documentIds || [];
      if (docIds.includes(source.id)) {
        const updatedDocIds = docIds.filter((id: string) => id !== source.id);
        await firestoreSetDoc('bots', b.id, {
          ...b,
          documentIds: updatedDocIds,
          updated_at: new Date().toISOString(),
        });
        await firestoreSetDoc('assistants', b.id, {
          ...b,
          documentIds: updatedDocIds,
          updated_at: new Date().toISOString(),
        });
      }
    }

    res.json({ success: true, id: source.id });
  } catch (error: any) {
    res.status(500).json({ error: sanitizeErrorMessage(error) });
  }
});

// Helper for real trend and top question analytics
function computeTrendsAndTopQuestions(messages: any[], daysCount = 7) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayBuckets: Record<string, { questions: number; conversations: Set<string>; totalLatency: number; count: number }> = {};

  const today = new Date();
  const dateLabels: string[] = [];
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const label = days[d.getDay()];
    dateLabels.push(label);
    dayBuckets[label] = { questions: 0, conversations: new Set(), totalLatency: 0, count: 0 };
  }

  const questionCounts: Record<string, { count: number; botId: string; lastAsked: string }> = {};

  for (const msg of messages) {
    const createdAt = msg.created_at ? new Date(msg.created_at) : new Date();
    const dayLabel = days[createdAt.getDay()];
    if (dayBuckets[dayLabel]) {
      if (msg.role === 'user') {
        dayBuckets[dayLabel].questions++;
        const qText = (msg.content || '').trim();
        if (qText.length > 5) {
          if (!questionCounts[qText]) {
            questionCounts[qText] = { count: 0, botId: msg.bot_id, lastAsked: 'Recently' };
          }
          questionCounts[qText].count++;
        }
      }
      if (msg.conversation_id) {
        dayBuckets[dayLabel].conversations.add(msg.conversation_id);
      }
      if (msg.latency_ms) {
        dayBuckets[dayLabel].totalLatency += msg.latency_ms;
        dayBuckets[dayLabel].count++;
      }
    }
  }

  const trends = dateLabels.map(label => {
    const b = dayBuckets[label];
    return {
      date: label,
      questions: b ? b.questions : 0,
      conversations: b ? b.conversations.size : 0,
      avgResponseMs: b && b.count > 0 ? Math.round(b.totalLatency / b.count) : 1150,
    };
  });

  const sortedQuestions = Object.entries(questionCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([query, data]) => ({
      query,
      count: data.count,
      matchedAssistant: data.botId,
      citationDoc: 'Verified Knowledge Base',
      lastAsked: data.lastAsked,
    }));

  return { trends, topQuestions: sortedQuestions };
}

// -------------------------------------------------------------
// RAG CONVERSATION & VECTOR RETRIEVAL
// -------------------------------------------------------------

// POST /api/assistants/:id/chat - Grounded RAG Chat with Citation Generation
app.post('/api/assistants/:id/chat', chatLimiter as express.RequestHandler, async (req, res) => {
  try {
    const rawId = req.params.id;
    if (!isValidResourceId(rawId)) {
      res.status(400).json({ error: 'Invalid assistant ID format.' });
      return;
    }

    const { message, conversationId, history } = req.body;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ error: 'Question message is required.' });
      return;
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length > 4000) {
      res.status(400).json({ error: 'Question message exceeds maximum allowed length of 4000 characters.' });
      return;
    }

    if (conversationId && (!isValidResourceId(conversationId) || conversationId.length > 128)) {
      res.status(400).json({ error: 'Invalid conversationId format.' });
      return;
    }

    let sanitizedHistory: { role: 'user' | 'assistant'; content: string }[] = [];
    if (Array.isArray(history)) {
      sanitizedHistory = history.slice(-50).map(item => ({
        role: item.role === 'assistant' ? 'assistant' : 'user',
        content: typeof item.content === 'string' ? item.content.slice(0, 4000) : '',
      }));
    }

    let bot = (await firestoreGetDoc('bots', rawId)) as BotRecord | null;
    if (!bot && rawId.startsWith('assistant-')) {
      bot = (await firestoreGetDoc('bots', rawId.replace(/^assistant-/, ''))) as BotRecord | null;
    }
    if (!bot) {
      res.status(404).json({ error: 'Assistant not found.' });
      return;
    }

    // Execute the complete RAG Query Pipeline:
    // User Question -> Query Embedding -> Scoped Vector Search -> Similarity Ranking -> Grounded Prompt -> Gemini -> Citations
    const ragResult = await executeRagQuery(
      bot,
      trimmedMessage,
      conversationId,
      sanitizedHistory
    );

    res.json({
      message: {
        id: ragResult.messageId,
        role: 'assistant',
        content: ragResult.answer,
        citations: ragResult.citations,
        isRefusal: ragResult.isRefusal,
        responseTimeMs: ragResult.latencyMs,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      conversationId: ragResult.conversationId,
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: sanitizeErrorMessage(error) });
  }
});

// POST /api/assistants/:id/feedback - Collect user answer feedback
app.post('/api/assistants/:id/feedback', chatLimiter as express.RequestHandler, async (req, res) => {
  try {
    const rawId = req.params.id;
    if (!isValidResourceId(rawId)) {
      res.status(400).json({ error: 'Invalid assistant ID format.' });
      return;
    }

    const { messageId, type, comment } = req.body; // 'positive' | 'negative'
    if (type !== 'positive' && type !== 'negative') {
      res.status(400).json({ error: 'Feedback rating must be either "positive" or "negative".' });
      return;
    }

    if (messageId && (!isValidResourceId(messageId) || messageId.length > 128)) {
      res.status(400).json({ error: 'Invalid message ID.' });
      return;
    }

    if (comment && String(comment).length > 1000) {
      res.status(400).json({ error: 'Feedback comment must not exceed 1000 characters.' });
      return;
    }

    const bot = (await firestoreGetDoc('bots', rawId)) as BotRecord | null;
    if (!bot) {
      res.status(404).json({ error: 'Assistant not found.' });
      return;
    }

    const feedbackId = `fb-${Date.now()}`;
    const fbRecord: FeedbackRecord = {
      id: feedbackId,
      bot_id: bot.id,
      message_id: messageId || 'unknown',
      rating: type === 'positive' ? 1 : 0,
      comment: comment ? String(comment).slice(0, 1000) : '',
      created_at: new Date().toISOString(),
    };
    await firestoreSetDoc('feedback', feedbackId, fbRecord);

    const pos = (bot.metrics?.positiveCount || 0) + (type === 'positive' ? 1 : 0);
    const neg = (bot.metrics?.negativeCount || 0) + (type === 'negative' ? 1 : 0);
    const total = pos + neg;
    const score = total > 0 ? Math.round((pos / total) * 100) : 100;

    const updatedMetrics = {
      ...bot.metrics,
      positiveCount: pos,
      negativeCount: neg,
      feedbackScore: score,
    };

    await firestoreSetDoc('bots', bot.id, {
      ...bot,
      metrics: updatedMetrics,
      updated_at: new Date().toISOString(),
    });

    res.json({ success: true, metrics: updatedMetrics });
  } catch (error: any) {
    res.status(500).json({ error: sanitizeErrorMessage(error) });
  }
});

// GET /api/assistants/:id/conversations - List conversations for an assistant (Requires authenticated workspace member)
app.get('/api/assistants/:id/conversations', requireAuth as express.RequestHandler, async (req: AuthRequest, res) => {
  try {
    const rawId = req.params.id;
    if (!isValidResourceId(rawId)) {
      res.status(400).json({ error: 'Invalid assistant ID format.' });
      return;
    }

    let bot = (await firestoreGetDoc('bots', rawId)) as BotRecord | null;
    if (!bot && rawId.startsWith('assistant-')) {
      bot = (await firestoreGetDoc('bots', rawId.replace(/^assistant-/, ''))) as BotRecord | null;
    }
    if (!bot) {
      res.status(404).json({ error: 'Assistant not found.' });
      return;
    }

    const hasAccess = await authService.verifyWorkspaceAccess(req.user!.id, bot.workspace_id);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied: You do not have permission to view these conversations.' });
      return;
    }

    const conversations = (await firestoreQuery('conversations', 'bot_id', bot.id)) as ConversationRecord[];
    conversations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(conversations);
  } catch (error: any) {
    res.status(500).json({ error: sanitizeErrorMessage(error) });
  }
});

// GET /api/conversations/:id/messages - Get messages for a specific conversation (Requires authenticated workspace member)
app.get('/api/conversations/:id/messages', requireAuth as express.RequestHandler, async (req: AuthRequest, res) => {
  try {
    const rawId = req.params.id;
    if (!isValidResourceId(rawId)) {
      res.status(400).json({ error: 'Invalid conversation ID format.' });
      return;
    }

    const conv = (await firestoreGetDoc('conversations', rawId)) as ConversationRecord | null;
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    const bot = (await firestoreGetDoc('bots', conv.bot_id)) as BotRecord | null;
    if (bot) {
      const hasAccess = await authService.verifyWorkspaceAccess(req.user!.id, bot.workspace_id);
      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied: You do not have permission to view these messages.' });
        return;
      }
    }

    const messages = (await firestoreQuery('messages', 'conversation_id', conv.id)) as MessageRecord[];
    messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: sanitizeErrorMessage(error) });
  }
});

// GET /api/assistants/:id/analytics - Get assistant analytics (Requires authenticated workspace member)
app.get('/api/assistants/:id/analytics', requireAuth as express.RequestHandler, async (req: AuthRequest, res) => {
  try {
    const rawId = req.params.id;
    if (!isValidResourceId(rawId)) {
      res.status(400).json({ error: 'Invalid assistant ID format.' });
      return;
    }

    const bot = (await firestoreGetDoc('bots', rawId)) as BotRecord | null;
    if (!bot) {
      res.status(404).json({ error: 'Assistant not found.' });
      return;
    }

    const hasAccess = await authService.verifyWorkspaceAccess(req.user!.id, bot.workspace_id);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied: You do not have permission to view this assistant\'s analytics.' });
      return;
    }

    const messages = (await firestoreQuery('messages', 'bot_id', bot.id)) as any[];
    const feedbackList = (await firestoreQuery('feedback', 'bot_id', bot.id)) as any[];
    const { trends, topQuestions } = computeTrendsAndTopQuestions(messages);

    res.json({
      metrics: bot.metrics,
      totalMessages: messages.length,
      totalFeedback: feedbackList.length,
      botName: bot.name,
      trends,
      topQuestions: topQuestions.map(q => ({ ...q, matchedAssistant: bot.name })),
    });
  } catch (error: any) {
    res.status(500).json({ error: sanitizeErrorMessage(error) });
  }
});

// GET /api/analytics - Get organization workspace-wide aggregated analytics
app.get('/api/analytics', async (req: AuthRequest, res) => {
  try {
    const wsId = resolveWorkspaceId(req);
    if (!req.user && wsId !== 'ws-apex') {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const bots = (await firestoreQuery('bots', 'workspace_id', wsId)) as BotRecord[];
    const docs = (await firestoreQuery('sources', 'workspace_id', wsId)) as SourceRecord[];

    let allMessages: any[] = [];
    let allFeedback: any[] = [];
    for (const b of bots) {
      const msgs = (await firestoreQuery('messages', 'bot_id', b.id)) as any[];
      const fbs = (await firestoreQuery('feedback', 'bot_id', b.id)) as any[];
      allMessages.push(...msgs);
      allFeedback.push(...fbs);
    }

    const totalQuestions = bots.reduce((sum, a) => sum + (a.metrics?.totalQuestions || 0), 0);
    const totalConversations = bots.reduce((sum, a) => sum + (a.metrics?.totalConversations || 0), 0);
    const totalPositive = bots.reduce((sum, a) => sum + (a.metrics?.positiveCount || 0), 0);
    const totalNegative = bots.reduce((sum, a) => sum + (a.metrics?.negativeCount || 0), 0);
    const avgResponseTimeSec = parseFloat(
      (bots.reduce((sum, a) => sum + (a.metrics?.avgResponseTimeSec || 0), 0) / (bots.length || 1)).toFixed(2)
    );

    const { trends, topQuestions } = computeTrendsAndTopQuestions(allMessages);
    const topQuestionsWithNames = topQuestions.map(q => {
      const matchBot = bots.find(b => b.id === q.matchedAssistant);
      return {
        ...q,
        matchedAssistant: matchBot ? matchBot.name : 'Knowledge Assistant',
      };
    });

    res.json({
      totalAssistants: bots.length,
      totalDocuments: docs.length,
      totalQuestions,
      totalConversations,
      avgResponseTimeSec,
      totalPositive,
      totalNegative,
      feedbackScore: Math.round((totalPositive / ((totalPositive + totalNegative) || 1)) * 100),
      trends,
      topQuestions: topQuestionsWithNames,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/activities - Get recent workspace activity events
app.get('/api/activities', async (req: AuthRequest, res) => {
  try {
    const wsId = resolveWorkspaceId(req);
    const bots = (await firestoreQuery('bots', 'workspace_id', wsId)) as BotRecord[];
    const docs = (await firestoreQuery('sources', 'workspace_id', wsId)) as SourceRecord[];

    const activities: any[] = [];

    // Synthesize real events from documents and bots
    for (const d of docs) {
      activities.push({
        id: `act-doc-${d.id}`,
        type: 'doc_uploaded',
        title: 'Document indexed',
        description: `${d.filename} (${d.page_count || 1} pages) indexed into vector chunks.`,
        timestamp: d.updated_at || d.created_at,
        assistantName: bots.find(b => b.id === d.bot_id)?.name || 'Knowledge Hub',
      });
    }

    for (const b of bots) {
      activities.push({
        id: `act-bot-${b.id}`,
        type: 'assistant_created',
        title: 'Assistant configured',
        description: `${b.name} is ready with ${b.status} status.`,
        timestamp: b.updated_at || b.created_at,
        assistantName: b.name,
      });

      if ((b.metrics?.positiveCount || 0) > 0) {
        activities.push({
          id: `act-fb-${b.id}`,
          type: 'query_answered',
          title: 'High satisfaction milestone',
          description: `${b.metrics?.feedbackScore}% positive feedback score maintained across queries.`,
          timestamp: b.updated_at || b.created_at,
          assistantName: b.name,
        });
      }
    }

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Format relative time
    const formatted = activities.slice(0, 10).map(a => {
      const ms = Date.now() - new Date(a.timestamp).getTime();
      const minutes = Math.floor(ms / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      let relative = 'Just now';
      if (days > 0) relative = `${days} day${days > 1 ? 's' : ''} ago`;
      else if (hours > 0) relative = `${hours} hour${hours > 1 ? 's' : ''} ago`;
      else if (minutes > 0) relative = `${minutes} min ago`;

      return {
        ...a,
        timestamp: relative,
      };
    });

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: sanitizeErrorMessage(error) });
  }
});

// Health check
app.get('/api/health', async (_req, res) => {
  res.json({
    status: 'ok',
    product: 'KnowFlow AI',
    timestamp: new Date().toISOString(),
  });
});

// Manual Seed trigger
app.post('/api/seed', async (_req, res) => {
  try {
    await seedInitialKnowledgeAndAssistants();
    res.json({ success: true, message: 'Seeded initial workspace, bots, and vector chunks.' });
  } catch (error: any) {
    res.status(500).json({ error: sanitizeErrorMessage(error) });
  }
});

// -------------------------------------------------------------
// VITE DEV / PRODUCTION MIDDLEWARE
// -------------------------------------------------------------
async function startServer() {
  // Ensure default knowledge is seeded on server start
  try {
    await seedInitialKnowledgeAndAssistants();
  } catch (seedErr) {
    console.warn('Initial seeding notice:', seedErr);
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KnowFlow AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
