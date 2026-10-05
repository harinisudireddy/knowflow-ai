import {
  Assistant,
  DocumentItem,
  ChatMessageItem,
  Workspace,
  UserProfile,
  ActivityItem,
  AnalyticsTrendPoint,
  TopQuestionItem
} from '../types';

const STORAGE_KEY_PREFIX = 'knowflow_ai_';

export const DEFAULT_WORKSPACES: Workspace[] = [
  {
    id: 'ws-univ',
    name: 'Apex University Knowledge Hub',
    slug: 'apex-university',
    plan: 'Enterprise',
    memberCount: 24,
    avatarLetter: 'A',
  },
  {
    id: 'ws-tech',
    name: 'Nexus Technologies SaaS',
    slug: 'nexus-tech',
    plan: 'Professional',
    memberCount: 12,
    avatarLetter: 'N',
  },
];

export const CURRENT_USER: UserProfile = {
  id: 'usr-1',
  name: 'Sarah Jenkins',
  email: 's.jenkins@apex.edu',
  role: 'Admin',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
};

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-1',
    filename: 'Student Handbook.pdf',
    filesize: '4.2 MB',
    type: 'PDF',
    pages: 48,
    status: 'Ready',
    uploadedAt: '2026-03-01T10:30:00Z',
    lastIndexedAt: '2026-03-01T10:32:15Z',
    chunkCount: 142,
    summary: 'Comprehensive campus regulations, academic integrity, refund deadlines, and student rights.',
  },
  {
    id: 'doc-2',
    filename: 'University FAQ.pdf',
    filesize: '1.8 MB',
    type: 'PDF',
    pages: 22,
    status: 'Ready',
    uploadedAt: '2026-03-03T14:15:00Z',
    lastIndexedAt: '2026-03-03T14:16:30Z',
    chunkCount: 68,
    summary: 'Frequently asked questions regarding admission, financial aid, parking permits, and refund schedules.',
  },
  {
    id: 'doc-3',
    filename: 'Academic Regulations.pdf',
    filesize: '3.1 MB',
    type: 'PDF',
    pages: 36,
    status: 'Ready',
    uploadedAt: '2026-03-05T09:00:00Z',
    lastIndexedAt: '2026-03-05T09:02:40Z',
    chunkCount: 110,
    summary: 'Grading scale, grade appeals procedure, course withdrawal limits, and academic probation standards.',
  },
  {
    id: 'doc-4',
    filename: 'Employee Benefits 2025.pdf',
    filesize: '5.6 MB',
    type: 'PDF',
    pages: 64,
    status: 'Ready',
    uploadedAt: '2026-03-08T11:20:00Z',
    lastIndexedAt: '2026-03-08T11:24:10Z',
    chunkCount: 185,
    summary: 'Health coverage plans, retirement matching, vision and dental stipends, and wellness allowance.',
  },
  {
    id: 'doc-5',
    filename: 'Leave Policy.pdf',
    filesize: '1.4 MB',
    type: 'PDF',
    pages: 18,
    status: 'Ready',
    uploadedAt: '2026-03-08T12:00:00Z',
    lastIndexedAt: '2026-03-08T12:01:45Z',
    chunkCount: 52,
    summary: 'Annual paid leave accrual, bereavement leave, sick days, parental leave guidelines, and notice periods.',
  },
  {
    id: 'doc-6',
    filename: 'Remote Work Guidelines.pdf',
    filesize: '2.1 MB',
    type: 'PDF',
    pages: 24,
    status: 'Ready',
    uploadedAt: '2026-03-09T08:45:00Z',
    lastIndexedAt: '2026-03-09T08:47:00Z',
    chunkCount: 74,
    summary: 'Hybrid workspace protocols, core collaboration hours (10 AM - 3 PM), home office equipment subsidy.',
  },
  {
    id: 'doc-7',
    filename: 'API Documentation v2.pdf',
    filesize: '6.4 MB',
    type: 'PDF',
    pages: 82,
    status: 'Ready',
    uploadedAt: '2026-03-10T16:00:00Z',
    lastIndexedAt: '2026-03-10T16:05:00Z',
    chunkCount: 230,
    summary: 'REST endpoints, JSON payloads, bearer token authentication, rate limits (100 req/min), and webhooks.',
  },
];

export const INITIAL_ASSISTANTS: Assistant[] = [
  {
    id: 'ast-univ-1',
    workspaceId: 'ws-univ',
    name: 'University Support Assistant',
    description: 'Answers student questions using approved university documents.',
    status: 'Ready',
    documentIds: ['doc-1', 'doc-2', 'doc-3'],
    settings: {
      name: 'University Support Assistant',
      description: 'Answers student questions using approved university documents.',
      greeting: 'Hi! How can I help you today?',
      placeholder: 'Ask about tuition, refund policy, grading, or campus policies...',
      instructions: 'You are the official University Support Assistant. Answer student inquiries with friendly, accurate guidance directly citing the Student Handbook, FAQ, or Academic Regulations.',
      themeColor: '#2563eb', // royal blue
      suggestedQuestions: [
        'What is the refund policy?',
        'How do I appeal a course grade?',
        'When is the deadline to withdraw from a class?',
        'Where can I apply for on-campus parking?',
      ],
      refusalMessage: "I couldn't find sufficient information in the uploaded knowledge base to answer that question.",
    },
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-14T09:12:00Z',
    lastIndexedAt: '2026-03-14T09:15:00Z',
    metrics: {
      totalQuestions: 1482,
      totalConversations: 638,
      avgResponseTimeSec: 1.24,
      feedbackScore: 96,
      positiveCount: 428,
      negativeCount: 18,
    },
  },
  {
    id: 'ast-hr-2',
    workspaceId: 'ws-univ',
    name: 'HR Knowledge Assistant',
    description: 'Answers employee inquiries regarding benefits, leave policies, and remote work protocols.',
    status: 'Ready',
    documentIds: ['doc-4', 'doc-5', 'doc-6'],
    settings: {
      name: 'HR Knowledge Assistant',
      description: 'Answers employee inquiries regarding benefits, leave policies, and remote work protocols.',
      greeting: 'Hello! I am your HR Knowledge Assistant. How can I assist with your workplace benefits or policies?',
      placeholder: 'Ask about vacation days, health coverage, or remote work...',
      instructions: 'Provide accurate internal HR guidance based on verified benefit documents. Maintain employee confidentiality at all times.',
      themeColor: '#7c3aed', // purple
      suggestedQuestions: [
        'How many annual leave days do full-time staff accrue?',
        'What are the core hours for remote team members?',
        'Does our insurance plan cover preventative dental care?',
      ],
      refusalMessage: "I couldn't find sufficient information in the uploaded knowledge base to answer that question.",
    },
    createdAt: '2026-03-08T11:00:00Z',
    updatedAt: '2026-03-15T14:30:00Z',
    lastIndexedAt: '2026-03-15T14:32:00Z',
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
    id: 'ast-prod-3',
    workspaceId: 'ws-univ',
    name: 'Product Support Assistant',
    description: 'Technical guidance and API troubleshooting for developers integrating platform services.',
    status: 'Ready',
    documentIds: ['doc-7'],
    settings: {
      name: 'Product Support Assistant',
      description: 'Technical guidance and API troubleshooting for developers integrating platform services.',
      greeting: 'Welcome to Product Support! What API or integration question can I help you debug?',
      placeholder: 'Ask about rate limits, authentication headers, or webhooks...',
      instructions: 'Deliver precise technical responses citing API documentation specs, payload formats, and status codes.',
      themeColor: '#0d9488', // teal
      suggestedQuestions: [
        'What is the rate limit for standard REST endpoints?',
        'How should bearer tokens be formatted in API requests?',
        'What webhook events are triggered when an assistant is updated?',
      ],
      refusalMessage: "I couldn't find sufficient information in the uploaded knowledge base to answer that question.",
    },
    createdAt: '2026-03-10T15:30:00Z',
    updatedAt: '2026-03-16T08:20:00Z',
    lastIndexedAt: '2026-03-16T08:22:00Z',
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

export const INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act-1',
    type: 'doc_uploaded',
    title: 'Knowledge indexed',
    description: 'Academic Regulations.pdf (36 pages) was re-indexed with 110 vector chunks.',
    timestamp: '15 minutes ago',
    assistantName: 'University Support Assistant',
  },
  {
    id: 'act-2',
    type: 'query_answered',
    title: 'High satisfaction milestone',
    description: '96% positive feedback achieved over last 500 student queries.',
    timestamp: '2 hours ago',
    assistantName: 'University Support Assistant',
  },
  {
    id: 'act-3',
    type: 'assistant_deployed',
    title: 'Widget deployed to website',
    description: 'Embed script installed on student-portal.apex.edu/support.',
    timestamp: '1 day ago',
    assistantName: 'University Support Assistant',
  },
  {
    id: 'act-4',
    type: 'assistant_created',
    title: 'New Assistant drafted',
    description: 'Product Support Assistant configured with API Documentation v2.pdf.',
    timestamp: '3 days ago',
    assistantName: 'Product Support Assistant',
  },
];

export const ANALYTICS_TRENDS: AnalyticsTrendPoint[] = [
  { date: 'Mon', questions: 142, conversations: 64, avgResponseMs: 1220 },
  { date: 'Tue', questions: 186, conversations: 88, avgResponseMs: 1190 },
  { date: 'Wed', questions: 224, conversations: 102, avgResponseMs: 1250 },
  { date: 'Thu', questions: 278, conversations: 126, avgResponseMs: 1180 },
  { date: 'Fri', questions: 312, conversations: 145, avgResponseMs: 1210 },
  { date: 'Sat', questions: 165, conversations: 74, avgResponseMs: 1140 },
  { date: 'Sun', questions: 175, conversations: 79, avgResponseMs: 1170 },
];

export const TOP_QUESTIONS: TopQuestionItem[] = [
  {
    query: 'What is the refund policy?',
    count: 342,
    matchedAssistant: 'University Support Assistant',
    citationDoc: 'Student Handbook.pdf',
    lastAsked: '10m ago',
  },
  {
    query: 'How do I appeal a course grade?',
    count: 189,
    matchedAssistant: 'University Support Assistant',
    citationDoc: 'Academic Regulations.pdf',
    lastAsked: '45m ago',
  },
  {
    query: 'How many annual leave days do full-time staff accrue?',
    count: 154,
    matchedAssistant: 'HR Knowledge Assistant',
    citationDoc: 'Leave Policy.pdf',
    lastAsked: '2h ago',
  },
  {
    query: 'What are the core hours for remote team members?',
    count: 118,
    matchedAssistant: 'HR Knowledge Assistant',
    citationDoc: 'Remote Work Guidelines.pdf',
    lastAsked: '3h ago',
  },
  {
    query: 'What is the rate limit for standard REST endpoints?',
    count: 94,
    matchedAssistant: 'Product Support Assistant',
    citationDoc: 'API Documentation v2.pdf',
    lastAsked: '5h ago',
  },
];

class MockDataService {
  private assistants: Assistant[] = [];
  private documents: DocumentItem[] = [];
  private activities: ActivityItem[] = [];
  private currentWorkspace: Workspace = DEFAULT_WORKSPACES[0];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const storedAssistants = localStorage.getItem(STORAGE_KEY_PREFIX + 'assistants');
      const storedDocs = localStorage.getItem(STORAGE_KEY_PREFIX + 'docs');
      const storedActivities = localStorage.getItem(STORAGE_KEY_PREFIX + 'activities');

      this.assistants = storedAssistants ? JSON.parse(storedAssistants) : INITIAL_ASSISTANTS;
      this.documents = storedDocs ? JSON.parse(storedDocs) : INITIAL_DOCUMENTS;
      this.activities = storedActivities ? JSON.parse(storedActivities) : INITIAL_ACTIVITIES;
    } catch {
      this.assistants = INITIAL_ASSISTANTS;
      this.documents = INITIAL_DOCUMENTS;
      this.activities = INITIAL_ACTIVITIES;
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + 'assistants', JSON.stringify(this.assistants));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'docs', JSON.stringify(this.documents));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'activities', JSON.stringify(this.activities));
    } catch {
      // Storage unavailable or full
    }
  }

  // Workspaces
  getWorkspaces(): Workspace[] {
    return DEFAULT_WORKSPACES;
  }

  getCurrentWorkspace(): Workspace {
    return this.currentWorkspace;
  }

  setWorkspace(ws: Workspace) {
    this.currentWorkspace = ws;
  }

  // Assistants
  getAssistants(): Assistant[] {
    return [...this.assistants];
  }

  getAssistantById(id: string): Assistant | undefined {
    return this.assistants.find(a => a.id === id);
  }

  createAssistant(data: {
    name: string;
    description: string;
    greeting: string;
    instructions: string;
    themeColor?: string;
    documentIds?: string[];
  }): Assistant {
    const newAssistant: Assistant = {
      id: `ast-${Date.now()}`,
      workspaceId: this.currentWorkspace.id,
      name: data.name,
      description: data.description,
      status: 'Ready',
      documentIds: data.documentIds || ['doc-1', 'doc-2'],
      settings: {
        name: data.name,
        description: data.description,
        greeting: data.greeting || 'Hi! How can I help you today?',
        placeholder: 'Ask a question...',
        instructions: data.instructions || 'You are a helpful knowledge assistant.',
        themeColor: data.themeColor || '#2563eb',
        suggestedQuestions: [
          'What is the refund policy?',
          'How do I submit an application?',
          'What are the core operating hours?',
        ],
        refusalMessage: "I couldn't find sufficient information in the uploaded knowledge base to answer that question.",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastIndexedAt: new Date().toISOString(),
      metrics: {
        totalQuestions: 0,
        totalConversations: 0,
        avgResponseTimeSec: 1.1,
        feedbackScore: 100,
        positiveCount: 0,
        negativeCount: 0,
      },
    };

    this.assistants.unshift(newAssistant);
    this.addActivity({
      type: 'assistant_created',
      title: 'New Assistant created',
      description: `${data.name} was successfully created and ready to be trained.`,
      assistantName: data.name,
    });
    this.saveToStorage();
    return newAssistant;
  }

  updateAssistant(id: string, updates: Partial<Assistant>): Assistant | null {
    const index = this.assistants.findIndex(a => a.id === id);
    if (index === -1) return null;

    this.assistants[index] = {
      ...this.assistants[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveToStorage();
    return this.assistants[index];
  }

  deleteAssistant(id: string): boolean {
    const target = this.assistants.find(a => a.id === id);
    if (!target) return false;
    this.assistants = this.assistants.filter(a => a.id !== id);
    this.saveToStorage();
    return true;
  }

  // Documents
  getDocuments(): DocumentItem[] {
    return [...this.documents];
  }

  getDocumentById(id: string): DocumentItem | undefined {
    return this.documents.find(d => d.id === id);
  }

  getDocumentsForAssistant(assistantId: string): DocumentItem[] {
    const ast = this.getAssistantById(assistantId);
    if (!ast) return [];
    return this.documents.filter(d => ast.documentIds.includes(d.id));
  }

  addDocument(file: { name: string; size: string; pages?: number }): DocumentItem {
    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      filename: file.name,
      filesize: file.size,
      type: 'PDF',
      pages: file.pages || Math.floor(Math.random() * 30) + 12,
      status: 'Ready',
      uploadedAt: new Date().toISOString(),
      lastIndexedAt: new Date().toISOString(),
      chunkCount: Math.floor(Math.random() * 80) + 30,
      summary: `Uploaded document ${file.name} containing organizational guidelines and procedures.`,
    };

    this.documents.unshift(newDoc);
    this.addActivity({
      type: 'doc_uploaded',
      title: 'Document uploaded',
      description: `${file.name} (${newDoc.pages} pages) processed and indexed.`,
    });
    this.saveToStorage();
    return newDoc;
  }

  reindexDocument(id: string): DocumentItem | null {
    const doc = this.documents.find(d => d.id === id);
    if (!doc) return null;
    doc.lastIndexedAt = new Date().toISOString();
    doc.status = 'Ready';
    this.saveToStorage();
    return doc;
  }

  deleteDocument(id: string): boolean {
    this.documents = this.documents.filter(d => d.id !== id);
    // Remove from all assistants
    this.assistants.forEach(a => {
      a.documentIds = a.documentIds.filter(docId => docId !== id);
    });
    this.saveToStorage();
    return true;
  }

  // Activities
  getActivities(): ActivityItem[] {
    return [...this.activities];
  }

  private addActivity(item: Omit<ActivityItem, 'id' | 'timestamp'>) {
    this.activities.unshift({
      ...item,
      id: `act-${Date.now()}`,
      timestamp: 'Just now',
    });
    if (this.activities.length > 20) this.activities.pop();
  }

  // Q&A Engine with citations and required refusal state
  generateAnswer(assistantId: string, userQuestion: string): ChatMessageItem {
    const trimmed = userQuestion.trim().toLowerCase();
    const assistant = this.getAssistantById(assistantId) || this.assistants[0];

    // Record question in assistant metrics
    assistant.metrics.totalQuestions += 1;
    this.saveToStorage();

    // 1. REFUND POLICY (Exact prompt example check)
    if (trimmed.includes('refund') || trimmed.includes('money back') || trimmed.includes('tuition refund')) {
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'The refund policy allows eligible users to request a refund within 30 days of the term start date. Standard course fee refunds are processed according to the tiered withdrawal schedule, requiring written submission through the student portal.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        responseTimeMs: 820,
        citations: [
          {
            id: 'cit-1',
            index: 1,
            documentId: 'doc-1',
            documentName: 'Student Handbook.pdf',
            page: 12,
            snippet: '§ 4.2 Refund Policy: Eligible students may submit a formal request for 100% refund of tuition within 30 calendar days following the commencement of classes.',
          },
          {
            id: 'cit-2',
            index: 2,
            documentId: 'doc-2',
            documentName: 'University FAQ.pdf',
            page: 4,
            snippet: 'Q: How soon will my tuition refund be credited? A: Direct deposit refunds process within 5 to 7 business days following dean approval.',
          },
        ],
      };
    }

    // 2. GRADE APPEAL
    if (trimmed.includes('grade') || trimmed.includes('appeal') || trimmed.includes('gpa') || trimmed.includes('probation')) {
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'Students wishing to appeal an assigned course grade must first initiate an informal conference with the course instructor within 14 calendar days of final grade publication. If unresolved, a formal Stage 2 petition may be submitted to the Department Academic Standards Committee.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        responseTimeMs: 910,
        citations: [
          {
            id: 'cit-3',
            index: 1,
            documentId: 'doc-3',
            documentName: 'Academic Regulations.pdf',
            page: 19,
            snippet: 'Article VIII: Final Grade Appeal Procedure requires written evidence of mathematical error or arbitrary evaluation presented within 14 days.',
          },
        ],
      };
    }

    // 3. WITHDRAWAL DEADLINE
    if (trimmed.includes('withdraw') || trimmed.includes('drop') || trimmed.includes('deadline')) {
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'The standard course withdrawal deadline without academic penalty (recorded as a "W" on official transcripts) is the end of the 10th academic week of the semester. Withdrawals requested past this deadline require Dean of Students medical or extenuating petition approval.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        responseTimeMs: 760,
        citations: [
          {
            id: 'cit-4',
            index: 1,
            documentId: 'doc-1',
            documentName: 'Student Handbook.pdf',
            page: 28,
            snippet: 'Section 6.1: Course Withdrawal limits allow a maximum of 4 course withdrawals throughout an undergraduate degree.',
          },
        ],
      };
    }

    // 4. PARKING
    if (trimmed.includes('park') || trimmed.includes('permit') || trimmed.includes('car')) {
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'On-campus parking permits for resident and commuter students are issued through the Parking & Transportation Services portal starting August 1st for the fall semester. Zone A, B, and C passes require a valid student ID and vehicle registration.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        responseTimeMs: 650,
        citations: [
          {
            id: 'cit-5',
            index: 1,
            documentId: 'doc-2',
            documentName: 'University FAQ.pdf',
            page: 15,
            snippet: 'Parking Section: Permits are digital and linked directly to the vehicle license plate number.',
          },
        ],
      };
    }

    // 5. LEAVE / VACATION (HR Assistant)
    if (trimmed.includes('leave') || trimmed.includes('vacation') || trimmed.includes('pto') || trimmed.includes('sick')) {
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'Full-time employees accrue 1.67 days of paid annual leave per calendar month worked (equivalent to 20 days annually). Sick leave is provided at 10 days per calendar year and resets on January 1st.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        responseTimeMs: 840,
        citations: [
          {
            id: 'cit-6',
            index: 1,
            documentId: 'doc-5',
            documentName: 'Leave Policy.pdf',
            page: 6,
            snippet: 'Section 3: Annual Paid Vacation Accrual schedule for full-time continuous employees.',
          },
          {
            id: 'cit-7',
            index: 2,
            documentId: 'doc-4',
            documentName: 'Employee Benefits 2025.pdf',
            page: 31,
            snippet: 'Benefit Overview: Unused PTO rolls over up to a maximum cap of 5 carryover days per annum.',
          },
        ],
      };
    }

    // 6. REMOTE WORK
    if (trimmed.includes('remote') || trimmed.includes('hybrid') || trimmed.includes('hours') || trimmed.includes('home')) {
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'Under the hybrid workplace guidelines, team members working remotely are expected to observe core collaboration hours from 10:00 AM to 3:00 PM local time. Remote team members are eligible for a one-time $500 home office ergonomics stipend upon completion of probation.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        responseTimeMs: 780,
        citations: [
          {
            id: 'cit-8',
            index: 1,
            documentId: 'doc-6',
            documentName: 'Remote Work Guidelines.pdf',
            page: 8,
            snippet: 'Core Collaboration Window: All distributed staff must maintain Slack/Email presence between 10:00 - 15:00.',
          },
        ],
      };
    }

    // 7. API / TECH / RATE LIMITS (Product Support Assistant)
    if (trimmed.includes('api') || trimmed.includes('rate limit') || trimmed.includes('token') || trimmed.includes('webhook') || trimmed.includes('endpoint')) {
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'Standard REST API endpoints have a baseline rate limit of 100 requests per minute per authenticated API key. Authentication requires the HTTP header "Authorization: Bearer <API_KEY>". Exceeding the threshold returns HTTP 429 Too Many Requests with a Retry-After header.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        responseTimeMs: 890,
        citations: [
          {
            id: 'cit-9',
            index: 1,
            documentId: 'doc-7',
            documentName: 'API Documentation v2.pdf',
            page: 14,
            snippet: 'Section 2.4 Rate Limiting & Quotas: Global rate limit per tenant is 100 req/min for Starter and 1000 req/min for Enterprise.',
          },
        ],
      };
    }

    // 8. REFUSAL STATE (Mandatory requirement from user prompt)
    // "Also create an unsupported question state:
    // 'I couldn't find sufficient information in the uploaded knowledge base to answer that question.'
    // This refusal state is important."
    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: "I couldn't find sufficient information in the uploaded knowledge base to answer that question.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      responseTimeMs: 450,
      isRefusal: true,
      citations: [],
    };
  }

  recordFeedback(assistantId: string, messageId: string, feedback: 'positive' | 'negative') {
    const ast = this.getAssistantById(assistantId);
    if (!ast) return;
    if (feedback === 'positive') {
      ast.metrics.positiveCount += 1;
    } else {
      ast.metrics.negativeCount += 1;
    }
    const total = ast.metrics.positiveCount + ast.metrics.negativeCount;
    ast.metrics.feedbackScore = Math.round((ast.metrics.positiveCount / (total || 1)) * 100);
    this.saveToStorage();
  }

  // Analytics totals
  getGlobalMetrics() {
    const totalAssistants = this.assistants.length;
    const totalDocs = this.documents.length;
    const totalQuestions = this.assistants.reduce((sum, a) => sum + a.metrics.totalQuestions, 0);
    const avgResponseSec = (
      this.assistants.reduce((sum, a) => sum + a.metrics.avgResponseTimeSec, 0) / (totalAssistants || 1)
    ).toFixed(2);
    const totalPositive = this.assistants.reduce((sum, a) => sum + a.metrics.positiveCount, 0);
    const totalNegative = this.assistants.reduce((sum, a) => sum + a.metrics.negativeCount, 0);
    const avgFeedback = Math.round(
      (totalPositive / ((totalPositive + totalNegative) || 1)) * 100
    );

    return {
      totalAssistants,
      totalDocs,
      totalQuestions,
      avgResponseSec,
      totalPositive,
      totalNegative,
      avgFeedback,
    };
  }
}

export const mockService = new MockDataService();
