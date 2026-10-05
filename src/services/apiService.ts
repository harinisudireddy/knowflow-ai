import { Assistant, DocumentItem, ChatMessageItem, Workspace, UserProfile } from '../types';

const TOKEN_KEY = 'kf_auth_token';
const WORKSPACE_KEY = 'kf_active_workspace_id';

type SessionExpiredHandler = () => void;
const sessionExpiredHandlers: SessionExpiredHandler[] = [];

function notifySessionExpired() {
  sessionExpiredHandlers.forEach(handler => {
    try {
      handler();
    } catch (err) {
      console.error('Session expiration handler error:', err);
    }
  });
}

function getHeaders(isJson = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const wsId = localStorage.getItem(WORKSPACE_KEY);
  if (wsId) {
    headers['x-workspace-id'] = wsId;
  }
  return headers;
}

async function handleFetchResponse(res: Response, fallbackError: string): Promise<any> {
  if (res.status === 401) {
    const hadToken = !!localStorage.getItem(TOKEN_KEY);
    if (hadToken) {
      localStorage.removeItem(TOKEN_KEY);
      notifySessionExpired();
    }
    const errData = await res.json().catch(() => ({ error: 'Session expired' }));
    throw new Error(errData.error || 'Your session has expired. Please sign in again.');
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: fallbackError }));
    throw new Error(errData.error || fallbackError);
  }

  return res.json();
}

export const apiService = {
  // Session Expiration Subscription
  onSessionExpired(callback: SessionExpiredHandler): () => void {
    sessionExpiredHandlers.push(callback);
    return () => {
      const idx = sessionExpiredHandlers.indexOf(callback);
      if (idx !== -1) sessionExpiredHandlers.splice(idx, 1);
    };
  },

  // Auth Token & Active Workspace state
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(WORKSPACE_KEY);
  },

  setActiveWorkspaceId(wsId: string) {
    localStorage.setItem(WORKSPACE_KEY, wsId);
  },

  getActiveWorkspaceId(): string | null {
    return localStorage.getItem(WORKSPACE_KEY);
  },

  // Auth Endpoints
  async signup(data: { name: string; email: string; password: string; orgName?: string }): Promise<{
    user: UserProfile;
    workspace: Workspace;
    token: string;
  }> {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Signup failed' }));
      throw new Error(err.error || 'Signup failed');
    }
    const result = await res.json();
    if (result.token) {
      this.setToken(result.token);
      if (result.workspace?.id) this.setActiveWorkspaceId(result.workspace.id);
    }
    return result;
  },

  async login(data: { email: string; password: string }): Promise<{
    user: UserProfile;
    workspace: Workspace;
    workspaces: Workspace[];
    token: string;
  }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Invalid email or password' }));
      throw new Error(err.error || 'Invalid email or password');
    }
    const result = await res.json();
    if (result.token) {
      this.setToken(result.token);
      if (result.workspace?.id) this.setActiveWorkspaceId(result.workspace.id);
    }
    return result;
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getHeaders(),
      });
    } finally {
      this.clearToken();
    }
  },

  async getCurrentUser(): Promise<{
    user: UserProfile;
    workspace: Workspace;
    workspaces: Workspace[];
    isAuthenticated: boolean;
  }> {
    const res = await fetch('/api/auth/me', {
      headers: getHeaders(false),
    });
    return handleFetchResponse(res, 'Failed to fetch user profile');
  },

  async getWorkspaces(): Promise<Workspace[]> {
    const res = await fetch('/api/workspaces', {
      headers: getHeaders(false),
    });
    return handleFetchResponse(res, 'Failed to fetch workspaces');
  },

  async createWorkspace(name: string): Promise<Workspace> {
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name }),
    });
    return handleFetchResponse(res, 'Failed to create workspace');
  },

  // Health
  async checkHealth(): Promise<{ status: string }> {
    const res = await fetch('/api/health');
    return res.json();
  },

  // Assistants
  async getAssistants(): Promise<Assistant[]> {
    const res = await fetch('/api/assistants', {
      headers: getHeaders(false),
    });
    return handleFetchResponse(res, 'Failed to fetch assistants');
  },

  async getAssistant(id: string): Promise<Assistant> {
    const res = await fetch(`/api/assistants/${id}`, {
      headers: getHeaders(false),
    });
    return handleFetchResponse(res, 'Failed to fetch assistant');
  },

  async createAssistant(data: Partial<Assistant> & { documentIds?: string[] }): Promise<Assistant> {
    const res = await fetch('/api/assistants', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleFetchResponse(res, 'Failed to create assistant');
  },

  async updateAssistant(id: string, updates: Partial<Assistant> & { documentIds?: string[] }): Promise<Assistant> {
    const res = await fetch(`/api/assistants/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    return handleFetchResponse(res, 'Failed to update assistant');
  },

  async deleteAssistant(id: string): Promise<void> {
    const res = await fetch(`/api/assistants/${id}`, {
      method: 'DELETE',
      headers: getHeaders(false),
    });
    await handleFetchResponse(res, 'Failed to delete assistant');
  },

  // Documents
  async getDocuments(): Promise<DocumentItem[]> {
    const res = await fetch('/api/documents', {
      headers: getHeaders(false),
    });
    return handleFetchResponse(res, 'Failed to fetch documents');
  },

  async uploadDocuments(files: File[], assistantId?: string): Promise<DocumentItem[]> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    if (assistantId) {
      formData.append('assistantId', assistantId);
    }

    const headers: Record<string, string> = {};
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const wsId = localStorage.getItem(WORKSPACE_KEY);
    if (wsId) headers['x-workspace-id'] = wsId;

    const res = await fetch('/api/documents/upload', {
      method: 'POST',
      headers,
      body: formData,
    });
    return handleFetchResponse(res, 'Failed to upload files');
  },

  async reindexDocument(id: string): Promise<DocumentItem> {
    const res = await fetch(`/api/documents/${id}/reindex`, {
      method: 'POST',
      headers: getHeaders(false),
    });
    return handleFetchResponse(res, 'Failed to re-index document');
  },

  async deleteDocument(id: string): Promise<void> {
    const res = await fetch(`/api/documents/${id}`, {
      method: 'DELETE',
      headers: getHeaders(false),
    });
    await handleFetchResponse(res, 'Failed to delete document');
  },

  // Live Grounded RAG Chat
  async sendChatMessage(
    assistantId: string,
    message: string,
    conversationId?: string,
    history?: { role: 'user' | 'assistant'; content: string }[]
  ): Promise<{ message: ChatMessageItem; conversationId: string }> {
    const res = await fetch(`/api/assistants/${assistantId}/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message, conversationId, history }),
    });
    return handleFetchResponse(res, 'Failed to get answer');
  },

  // Conversations & History
  async getAssistantConversations(assistantId: string): Promise<any[]> {
    const res = await fetch(`/api/assistants/${assistantId}/conversations`, {
      headers: getHeaders(false),
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getConversationMessages(conversationId: string): Promise<any[]> {
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      headers: getHeaders(false),
    });
    if (!res.ok) return [];
    return res.json();
  },

  // Feedback
  async submitFeedback(
    assistantId: string,
    messageId: string,
    type: 'positive' | 'negative',
    comment?: string
  ): Promise<void> {
    await fetch(`/api/assistants/${assistantId}/feedback`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ messageId, type, comment }),
    });
  },

  // Analytics
  async getAnalytics(assistantId: string): Promise<any> {
    const res = await fetch(`/api/assistants/${assistantId}/analytics`, {
      headers: getHeaders(false),
    });
    if (!res.ok) return null;
    return res.json();
  },

  async getGlobalAnalytics(): Promise<any> {
    const res = await fetch(`/api/analytics`, {
      headers: getHeaders(false),
    });
    if (!res.ok) return null;
    return res.json();
  },

  // Activities
  async getActivities(): Promise<any[]> {
    const res = await fetch(`/api/activities`, {
      headers: getHeaders(false),
    });
    if (!res.ok) return [];
    return res.json();
  },
};
