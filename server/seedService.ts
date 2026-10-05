import fs from 'fs';
import {
  firestoreGetDoc,
  firestoreSetDoc,
  firestoreQuery,
} from './firestoreClient';
import { authService } from './authService';
import { BotRecord } from './ragEngine';
import { SourceRecord, ChunkRecord, cleanText, chunkPageText } from './documentProcessor';
import { embeddingService } from './embeddingService';

// Seed raw documents with rich knowledge for the initial workspace
const INITIAL_SOURCES = [
  {
    id: 'src-univ-1',
    bot_id: 'ast-univ-1',
    filename: 'Student Handbook.pdf',
    storage_path: 'uploads/Student_Handbook.pdf',
    file_type: 'PDF',
    status: 'Ready' as const,
    page_count: 4,
    pages: [
      {
        pageNumber: 1,
        text: `APEX UNIVERSITY OFFICIAL STUDENT HANDBOOK
SECTION 4.2: TUITION AND FEE REFUND POLICY
Eligible students may submit a formal request for a 100% refund of course tuition within 30 calendar days following the official commencement of classes for the academic term. Requests submitted between day 31 and day 45 receive a 50% refund. No tuition refunds are permitted after 45 days. Written submission through the student financial portal is strictly required. Direct deposit refunds process within 5 to 7 business days following formal dean approval. Mailed paper checks take 10 to 14 business days.`,
      },
      {
        pageNumber: 2,
        text: `SECTION 5.1: COURSE WITHDRAWAL DEADLINES
The deadline to drop or withdraw from an enrolled course without academic penalty (recorded as a neutral 'W' grade) is the Friday of the 8th academic week at 5:00 PM EST. Withdrawals after week 8 require formal approval from the Academic Dean. Students may not withdraw from more than two core courses in a single academic year without dean petition.`,
      },
      {
        pageNumber: 3,
        text: `SECTION 6.3: CAMPUS PARKING & PERMIT REGULATIONS
All enrolled student vehicles parked on university grounds must display a valid digital or physical Zone B or Zone C parking permit. Parking applications open 3 weeks prior to each semester via the Campus Security Portal at parking.apex.edu. Students must upload vehicle registration and driver license. Violators are subject to a $45 fine per incident.`,
      },
      {
        pageNumber: 4,
        text: `SECTION 7.4: ACADEMIC INTEGRITY & HONOR CODE
Plagiarism, unapproved generative AI usage on closed examinations, or unauthorized collaboration results in an automatic zero on the assignment and referral to the University Honor Council. Repeated violations result in academic probation or suspension for one semester.`,
      },
    ],
  },
  {
    id: 'src-univ-2',
    bot_id: 'ast-univ-1',
    filename: 'Academic Regulations.pdf',
    storage_path: 'uploads/Academic_Regulations.pdf',
    file_type: 'PDF',
    status: 'Ready' as const,
    page_count: 2,
    pages: [
      {
        pageNumber: 1,
        text: `APEX UNIVERSITY ACADEMIC POLICIES & REGULATIONS MANUAL
ARTICLE II: GRADING SYSTEM & GPA CALCULATION
Grading follows a standard 4.0 scale: A (4.0), A- (3.7), B+ (3.3), B (3.0), B- (2.7), C+ (2.3), C (2.0), F (0.0). Students must maintain a minimum cumulative GPA of 2.0 to remain in good academic standing.
ARTICLE IV: ACADEMIC PROBATION & SUSPENSION
Students whose cumulative GPA falls below 2.0 at the conclusion of any semester are placed on Academic Probation for the subsequent term. Failure to achieve a term GPA of 2.2 during probation leads to a one-semester academic suspension.`,
      },
      {
        pageNumber: 2,
        text: `ARTICLE VII: FORMAL GRADE APPEAL PROCEDURES
If an informal resolution with the course instructor cannot be reached, the student may petition the Academic Standards Committee. Grade appeals must be filed within 14 calendar days of final grades posting by submitting Form GA-102 with the department chair. Written evidence of arbitrary grading or syllabus deviation must be attached.`,
      },
    ],
  },
  {
    id: 'src-hr-1',
    bot_id: 'ast-hr-2',
    filename: 'Employee Benefits Guide.pdf',
    storage_path: 'uploads/Employee_Benefits_Guide.pdf',
    file_type: 'PDF',
    status: 'Ready' as const,
    page_count: 2,
    pages: [
      {
        pageNumber: 1,
        text: `NEXUS TECHNOLOGIES & APEX AFFILIATES - EMPLOYEE BENEFITS GUIDE
SECTION 1: HEALTHCARE & DENTAL COVERAGE
Full-time employees are eligible for comprehensive medical coverage (PPO or HDHP with HSA) beginning the first day of the month following hire. Preventative dental cleanings and annual checkups are covered at 100% under the Premier Dental plan. Orthodontic coverage has a lifetime maximum of $2,500.
SECTION 3: 401(K) RETIREMENT SAVINGS
The organization matches 100% of employee contributions up to 4% of base salary, plus an additional 50% match on the next 2% contributed. Employer matching funds vest immediately at 100%.`,
      },
      {
        pageNumber: 2,
        text: `SECTION 5: WELLNESS & HOME OFFICE STIPENDS
Employees receive an annual $800 wellness allowance for gym memberships, athletic equipment, or ergonomic home office furnishings. Remote employees receive a one-time $1,200 equipment stipend upon hire.
SECTION 6: PAID TIME OFF & SICK LEAVE
Full-time staff members accrue 20 paid vacation days per calendar year during their first three years of service, increasing to 25 days thereafter. Up to 5 unused PTO days may roll over. Employees receive 10 paid sick days annually and 16 weeks of fully paid parental leave.`,
      },
    ],
  },
  {
    id: 'src-tech-1',
    bot_id: 'ast-tech-3',
    filename: 'API Documentation v2.pdf',
    storage_path: 'uploads/API_Documentation_v2.pdf',
    file_type: 'PDF',
    status: 'Ready' as const,
    page_count: 2,
    pages: [
      {
        pageNumber: 1,
        text: `KNOWFLOW AI PLATFORM - DEVELOPER REST API SPECIFICATION V2
1. AUTHENTICATION
All API requests must include an Authorization header with a valid bearer API key:
Authorization: Bearer kf_live_YOUR_SECRET_KEY
Requests lacking a valid header return HTTP 401 Unauthorized.
2. RATE LIMITS
Standard REST endpoints enforce a rate limit of 100 requests per minute per tenant IP. Exceeding this limit returns HTTP 429 Too Many Requests with a 'Retry-After' header in seconds.`,
      },
      {
        pageNumber: 2,
        text: `3. WEBHOOK EVENTS
Supported webhook triggers include:
- assistant.created: fired when a new agent is registered
- document.indexed: fired when vector chunks are completed
- query.answered: fired upon completion of grounded RAG response
4. EMBEDDED WIDGET INITIALIZATION
Widgets are embedded on client web pages using:
<script src="https://knowflow.ai/widget.js" data-bot-id="YOUR_ASSISTANT_ID"></script>`,
      },
    ],
  },
];

export async function seedInitialKnowledgeAndAssistants() {
  try {
    // 1. Check if Default Workspace already seeded
    const existingWorkspaces = (await firestoreQuery('workspaces', 'slug', 'apex-university')) as any[];
    if (existingWorkspaces && existingWorkspaces.length > 0) {
      console.log('[Seed] Database already initialized with workspace:', existingWorkspaces[0].id);
      return;
    }

    console.log('[Seed] Seeding initial KnowFlow AI workspace, bots, sources, and vector chunks...');

    // 2. Create Default Profile
    const { hash, salt } = await authService.hashAndSalt('admin123');
    const adminUser = await authService.createProfile(
      'Dr. Arthur Vance',
      'admin@apex.edu',
      hash,
      salt
    );

    // 3. Create Default Workspace
    const defaultWorkspace = {
      id: 'ws-apex',
      name: 'Apex University',
      slug: 'apex-university',
      ownerId: adminUser.id,
      plan: 'Professional' as const,
      memberCount: 5,
      avatarLetter: 'A',
      createdAt: new Date().toISOString(),
    };
    await firestoreSetDoc('workspaces', defaultWorkspace.id, defaultWorkspace);

    // Workspace membership
    await firestoreSetDoc('workspace_members', `${defaultWorkspace.id}_${adminUser.id}`, {
      id: `${defaultWorkspace.id}_${adminUser.id}`,
      workspaceId: defaultWorkspace.id,
      userId: adminUser.id,
      role: 'Owner',
      createdAt: new Date().toISOString(),
    });

    // 4. Create Bots
    const botsToCreate: BotRecord[] = [
      {
        id: 'ast-univ-1',
        workspace_id: defaultWorkspace.id,
        name: 'University Support Assistant',
        description: 'Answers student questions using approved university regulations and handbooks.',
        instructions: 'You are the official University Support Assistant. Answer student inquiries with friendly, accurate guidance directly citing the Student Handbook or Academic Regulations.',
        greeting: 'Hi! How can I help you today?',
        placeholder: 'Ask about tuition, refund policy, grading, or campus policies...',
        avatar: '🎓',
        theme: '#2563eb',
        status: 'Ready',
        suggested_questions: [
          'What is the refund policy?',
          'How do I appeal a course grade?',
          'When is the deadline to withdraw from a class?',
          'Where can I apply for on-campus parking?',
        ],
        refusal_message: "I couldn't find sufficient information in the uploaded university documents to answer that question.",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metrics: {
          totalQuestions: 1482,
          totalConversations: 638,
          avgResponseTimeSec: 1.18,
          feedbackScore: 96,
          positiveCount: 428,
          negativeCount: 18,
        },
      },
      {
        id: 'ast-hr-2',
        workspace_id: defaultWorkspace.id,
        name: 'HR Knowledge Assistant',
        description: 'Answers employee inquiries regarding benefits, leave policies, and stipends.',
        instructions: 'Provide accurate internal HR guidance based on verified benefit documents. Maintain employee confidentiality at all times.',
        greeting: 'Hello! I am your HR Knowledge Assistant. How can I assist with your workplace benefits or policies?',
        placeholder: 'Ask about vacation days, health coverage, or remote work...',
        avatar: '💼',
        theme: '#7c3aed',
        status: 'Ready',
        suggested_questions: [
          'How many annual leave days do full-time staff accrue?',
          'Does our insurance plan cover preventative dental care?',
          'What is the home office equipment stipend?',
        ],
        refusal_message: "I couldn't find sufficient information in the HR knowledge base to answer that question.",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metrics: {
          totalQuestions: 840,
          totalConversations: 390,
          avgResponseTimeSec: 1.15,
          feedbackScore: 92,
          positiveCount: 260,
          negativeCount: 22,
        },
      },
      {
        id: 'ast-tech-3',
        workspace_id: defaultWorkspace.id,
        name: 'Product Support Assistant',
        description: 'Technical guidance and API troubleshooting for developers integrating platform services.',
        instructions: 'Deliver precise technical responses citing API documentation specs, payload formats, and status codes.',
        greeting: 'Welcome to Product Support! What API or integration question can I help you debug?',
        placeholder: 'Ask about rate limits, authentication headers, or webhooks...',
        avatar: '⚡',
        theme: '#0d9488',
        status: 'Ready',
        suggested_questions: [
          'What is the rate limit for standard REST endpoints?',
          'How should bearer tokens be formatted in API requests?',
          'What webhook events are triggered when an assistant is updated?',
        ],
        refusal_message: "I couldn't find sufficient information in the API documentation to answer that question.",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metrics: {
          totalQuestions: 620,
          totalConversations: 285,
          avgResponseTimeSec: 1.42,
          feedbackScore: 94,
          positiveCount: 195,
          negativeCount: 12,
        },
      },
    ];

    for (const bot of botsToCreate) {
      await firestoreSetDoc('bots', bot.id, bot);
      // Also store in assistants for legacy view compatibility
      await firestoreSetDoc('assistants', bot.id, {
        id: bot.id,
        name: bot.name,
        description: bot.description,
        status: bot.status,
        workspaceId: bot.workspace_id,
        tenantId: bot.workspace_id,
        settings: {
          name: bot.name,
          description: bot.description,
          greeting: bot.greeting,
          placeholder: bot.placeholder,
          instructions: bot.instructions,
          themeColor: bot.theme,
          suggestedQuestions: bot.suggested_questions,
          refusalMessage: bot.refusal_message,
        },
        documentIds: [],
        createdAt: bot.created_at,
        updatedAt: bot.updated_at,
        lastIndexedAt: bot.updated_at,
        metrics: bot.metrics,
      });
    }

    // 5. Ingest Sources and generate real embeddings for chunks
    if (!fs.existsSync('uploads')) {
      try { fs.mkdirSync('uploads', { recursive: true }); } catch {}
    }

    for (const src of INITIAL_SOURCES) {
      if (!fs.existsSync(src.storage_path)) {
        try {
          fs.writeFileSync(
            src.storage_path,
            src.pages.map(p => `--- PAGE ${p.pageNumber} ---\n${p.text}`).join('\n\n')
          );
        } catch {}
      }

      const sourceRecord: SourceRecord = {
        id: src.id,
        bot_id: src.bot_id,
        workspace_id: defaultWorkspace.id,
        filename: src.filename,
        storage_path: src.storage_path,
        file_type: src.file_type,
        status: 'Ready',
        page_count: src.page_count,
        summary: `Pre-indexed ${src.page_count} pages with semantic vector embeddings.`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await firestoreSetDoc('sources', src.id, sourceRecord);

      // Create chunks from pages
      const rawChunks: { content: string; pageNumber: number }[] = [];
      for (const p of src.pages) {
        const cleaned = cleanText(p.text);
        const subChunks = chunkPageText({ pageNumber: p.pageNumber, text: cleaned }, { maxCharacters: 1800 });
        rawChunks.push(...subChunks);
      }

      // Generate embeddings
      const texts = rawChunks.map(c => c.content);
      let embeddings: number[][] = [];
      try {
        embeddings = await embeddingService.embedDocument(texts);
      } catch (embErr: any) {
        console.warn(`[Seed] Embedding generation fallback:`, embErr.message);
      }

      // Store chunks
      for (let i = 0; i < rawChunks.length; i++) {
        const chunkId = `chk-${src.id}-${i}`;
        const chunk: ChunkRecord = {
          id: chunkId,
          bot_id: src.bot_id,
          source_id: src.id,
          content: rawChunks[i].content,
          page_number: rawChunks[i].pageNumber,
          chunk_index: i,
          embedding: embeddings[i] || [],
          metadata: {
            filename: src.filename,
            bot_id: src.bot_id,
            source_id: src.id,
            page_number: rawChunks[i].pageNumber,
            chunk_index: i,
          },
        };
        await firestoreSetDoc('chunks', chunkId, chunk);
      }

      // Keep legacy documents table in sync
      await firestoreSetDoc('documents', src.id, {
        id: src.id,
        filename: src.filename,
        filesize: '2.4 MB',
        type: src.file_type,
        pages: src.page_count,
        status: 'Ready',
        summary: sourceRecord.summary,
        chunkCount: rawChunks.length,
        tenantId: defaultWorkspace.id,
        uploadedAt: new Date().toISOString(),
        lastIndexedAt: new Date().toISOString(),
      });

      // Link document to assistant
      const ast = (await firestoreGetDoc('assistants', src.bot_id)) as any;
      if (ast) {
        const docIds = Array.isArray(ast.documentIds) ? ast.documentIds : [];
        if (!docIds.includes(src.id)) {
          ast.documentIds = [...docIds, src.id];
          await firestoreSetDoc('assistants', src.bot_id, ast);
        }
      }
    }

    console.log('[Seed] Seeding completed successfully! Workspace, bots, sources, and vector chunks are live in Firestore.');
  } catch (error: any) {
    console.error('[Seed] Error during seeding:', error);
  }
}
