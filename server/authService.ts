import crypto from 'crypto';
import {
  firestoreGetDoc,
  firestoreSetDoc,
  firestoreDeleteDoc,
  firestoreQuery,
} from './firestoreClient';

export interface ProfileRecord {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  passwordSalt?: string;
  role: 'Admin' | 'Member' | 'Viewer';
  avatar?: string;
  createdAt: string;
}

export interface WorkspaceRecord {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: 'Starter' | 'Professional' | 'Enterprise';
  memberCount: number;
  avatarLetter: string;
  createdAt: string;
}

export interface WorkspaceMemberRecord {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'Owner' | 'Admin' | 'Member';
  createdAt: string;
}

export interface SessionRecord {
  id: string; // token
  userId: string;
  workspaceId: string;
  createdAt: string;
  expiresAt: string;
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

export const authService = {
  async hashAndSalt(password: string): Promise<{ hash: string; salt: string }> {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);
    return { hash, salt };
  },

  verifyPassword(password: string, hash: string, salt: string): boolean {
    try {
      const candidateHash = hashPassword(password, salt);
      const bufA = Buffer.from(candidateHash);
      const bufB = Buffer.from(hash);
      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  },

  validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
    if (!password || typeof password !== 'string') return { valid: false, reason: 'Password is required' };
    if (password.length < 8) return { valid: false, reason: 'Password must be at least 8 characters long' };
    return { valid: true };
  },

  validateEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  },

  async createSession(userId: string, workspaceId: string): Promise<string> {
    const token = `kf_sess_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const session: SessionRecord = {
      id: token,
      userId,
      workspaceId,
      createdAt: new Date().toISOString(),
      expiresAt,
    };
    await firestoreSetDoc('sessions', token, session);
    return token;
  },

  async getSession(token: string): Promise<SessionRecord | null> {
    const session = (await firestoreGetDoc('sessions', token)) as SessionRecord | null;
    if (!session) return null;
    const exp = new Date(session.expiresAt);
    if (isNaN(exp.getTime()) || exp < new Date()) {
      await firestoreDeleteDoc('sessions', token);
      return null;
    }
    return session;
  },

  async deleteSession(token: string): Promise<void> {
    await firestoreDeleteDoc('sessions', token);
  },

  async findProfileByEmail(email: string): Promise<ProfileRecord | null> {
    const normalized = email.toLowerCase().trim();
    const profiles = (await firestoreQuery('profiles', 'email', normalized)) as ProfileRecord[];
    return profiles[0] || null;
  },

  async createProfile(name: string, email: string, passwordHash: string, salt: string): Promise<ProfileRecord> {
    const id = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const profile: ProfileRecord = {
      id,
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      passwordSalt: salt,
      role: 'Admin',
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face`,
      createdAt: new Date().toISOString(),
    };
    await firestoreSetDoc('profiles', id, profile);
    return profile;
  },

  async createWorkspace(name: string, ownerId: string): Promise<WorkspaceRecord> {
    const id = `ws-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const avatarLetter = (name.trim()[0] || 'W').toUpperCase();
    const ws: WorkspaceRecord = {
      id,
      name,
      slug,
      ownerId,
      plan: 'Professional',
      memberCount: 1,
      avatarLetter,
      createdAt: new Date().toISOString(),
    };
    await firestoreSetDoc('workspaces', id, ws);

    // Create owner membership
    const memberId = `${id}_${ownerId}`;
    const membership: WorkspaceMemberRecord = {
      id: memberId,
      workspaceId: id,
      userId: ownerId,
      role: 'Owner',
      createdAt: new Date().toISOString(),
    };
    await firestoreSetDoc('workspace_members', memberId, membership);

    return ws;
  },

  async getUserWorkspaces(userId: string): Promise<WorkspaceRecord[]> {
    const memberships = (await firestoreQuery('workspace_members', 'userId', userId)) as WorkspaceMemberRecord[];
    const list: WorkspaceRecord[] = [];
    for (const m of memberships) {
      const ws = (await firestoreGetDoc('workspaces', m.workspaceId)) as WorkspaceRecord | null;
      if (ws) list.push(ws);
    }
    // Also include workspaces owned by user directly
    const owned = (await firestoreQuery('workspaces', 'ownerId', userId)) as WorkspaceRecord[];
    for (const o of owned) {
      if (!list.some(w => w.id === o.id)) {
        list.push(o);
      }
    }
    return list;
  },

  async verifyWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
    const ws = (await firestoreGetDoc('workspaces', workspaceId)) as WorkspaceRecord | null;
    if (!ws) return false;
    if (ws.ownerId === userId) return true;
    const membership = (await firestoreGetDoc('workspace_members', `${workspaceId}_${userId}`)) as WorkspaceMemberRecord | null;
    return !!membership;
  },
};
