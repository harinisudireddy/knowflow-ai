export type AssistantStatus = 'Ready' | 'Draft' | 'Indexing' | 'Paused';

export type DocumentStatus = 'Ready' | 'Processing' | 'Failed';

export interface DocumentItem {
  id: string;
  filename: string;
  filesize: string;
  type: string;
  pages: number;
  status: DocumentStatus;
  uploadedAt: string;
  lastIndexedAt: string;
  summary?: string;
  chunkCount?: number;
}

export interface Citation {
  id: string;
  index: number;
  documentId: string;
  documentName: string;
  page: number;
  snippet: string;
}

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  citations?: Citation[];
  isRefusal?: boolean;
  feedback?: 'positive' | 'negative' | null;
  responseTimeMs?: number;
}

export interface AssistantSettings {
  name: string;
  description: string;
  greeting: string;
  placeholder: string;
  instructions: string;
  themeColor: string; // hex or tailwind class
  avatarUrl?: string;
  suggestedQuestions: string[];
  refusalMessage?: string;
}

export interface Assistant {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  status: AssistantStatus;
  documentIds: string[];
  settings: AssistantSettings;
  createdAt: string;
  updatedAt: string;
  lastIndexedAt: string;
  metrics: {
    totalQuestions: number;
    totalConversations: number;
    avgResponseTimeSec: number;
    feedbackScore: number; // percentage e.g. 94
    positiveCount: number;
    negativeCount: number;
  };
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: 'Starter' | 'Professional' | 'Enterprise';
  memberCount: number;
  avatarLetter: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Member' | 'Viewer';
  avatar?: string;
}

export interface ActivityItem {
  id: string;
  type: 'assistant_created' | 'doc_uploaded' | 'query_answered' | 'assistant_deployed';
  title: string;
  description: string;
  timestamp: string;
  assistantName?: string;
}

export interface AnalyticsTrendPoint {
  date: string;
  questions: number;
  conversations: number;
  avgResponseMs: number;
}

export interface TopQuestionItem {
  query: string;
  count: number;
  matchedAssistant: string;
  citationDoc: string;
  lastAsked: string;
}
