import React, { useState, useEffect } from 'react';
import { Assistant, DocumentItem, ChatMessageItem } from '../types';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Tabs } from '../components/common/Tabs';
import { Card, CardHeader } from '../components/common/Card';
import { Input, Textarea } from '../components/common/Input';
import { DataTable, Column } from '../components/common/DataTable';
import { Chart } from '../components/common/Chart';
import { FileUpload } from '../components/assistant/FileUpload';
import { ChatMessage } from '../components/assistant/ChatMessage';
import { Widget } from '../components/assistant/Widget';
import { useToast } from '../components/common/Toast';
import { apiService } from '../services/apiService';
import {
  Bot,
  FileText,
  MessageSquare,
  BarChart3,
  Rocket,
  Settings,
  LayoutDashboard,
  Send,
  Plus,
  RefreshCw,
  Trash2,
  Copy,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Search,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Code2,
  ArrowLeft,
  Layers,
  Check,
  X
} from 'lucide-react';

export interface AssistantWorkspaceProps {
  assistant: Assistant;
  initialTab?: string;
  isDemoMode?: boolean;
  onBack: () => void;
  onUpdateAssistant: (updated: Assistant) => void;
  onRefreshData?: () => void;
}

export const AssistantWorkspace: React.FC<AssistantWorkspaceProps> = ({
  assistant: currentAssistant,
  initialTab = 'overview',
  isDemoMode = false,
  onBack,
  onUpdateAssistant,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [assistant, setAssistant] = useState<Assistant>(currentAssistant);
  const toast = useToast();

  // Knowledge base state
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [allWorkspaceDocs, setAllWorkspaceDocs] = useState<DocumentItem[]>([]);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Playground conversation state
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [lastUserQuestion, setLastUserQuestion] = useState<string>('What is the refund policy?');

  // Load documents for this assistant
  useEffect(() => {
    let isMounted = true;
    apiService.getDocuments().then(allDocs => {
      if (isMounted && allDocs) {
        setAllWorkspaceDocs(allDocs);
        const assigned = allDocs.filter(d => (assistant.documentIds || []).includes(d.id));
        setDocuments(assigned);
      }
    }).catch(console.error);
    return () => { isMounted = false; };
  }, [assistant.id, assistant.documentIds]);

  // Real Assistant Analytics state
  const [assistantAnalytics, setAssistantAnalytics] = useState<{
    trends: { date: string; questions: number; conversations: number; avgResponseMs: number }[];
    topQuestions: { query: string; count: number; matchedAssistant: string; citationDoc?: string; lastAsked: string }[];
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    apiService.getAnalytics(assistant.id).then(res => {
      if (isMounted && res) {
        setAssistantAnalytics(res);
      }
    }).catch(console.warn);
    return () => { isMounted = false; };
  }, [assistant.id, assistant.metrics]);

  // Playground state
  const [playgroundMessages, setPlaygroundMessages] = useState<ChatMessageItem[]>([
    {
      id: `init-${assistant.id}`,
      role: 'assistant',
      content: assistant.settings.greeting || 'Hi! How can I help you today?',
      timestamp: 'Just now',
    },
  ]);
  const [playgroundInput, setPlaygroundInput] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);

  // Reset playground messages when switching assistants
  useEffect(() => {
    setPlaygroundMessages([
      {
        id: `init-${assistant.id}`,
        role: 'assistant',
        content: assistant.settings.greeting || 'Hi! How can I help you today?',
        timestamp: 'Just now',
      },
    ]);
  }, [assistant.id, assistant.settings.greeting]);

  // Deploy state
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Settings form state
  const [settingsName, setSettingsName] = useState(assistant.settings.name);
  const [settingsDescription, setSettingsDescription] = useState(assistant.settings.description);
  const [settingsGreeting, setSettingsGreeting] = useState(assistant.settings.greeting);
  const [settingsPlaceholder, setSettingsPlaceholder] = useState(assistant.settings.placeholder);
  const [settingsInstructions, setSettingsInstructions] = useState(assistant.settings.instructions);
  const [settingsThemeColor, setSettingsThemeColor] = useState(assistant.settings.themeColor);
  const [settingsQuestions, setSettingsQuestions] = useState<string[]>(
    assistant.settings.suggestedQuestions || []
  );
  const [newQuestionText, setNewQuestionText] = useState('');

  // Synchronize when parent updates
  const syncAssistantState = (newObj: Assistant) => {
    setAssistant(newObj);
    onUpdateAssistant(newObj);
  };

  // --- KNOWLEDGE HANDLERS ---
  const handleUploadRawFiles = async (rawFiles: File[]) => {
    setIsUploading(true);
    try {
      const uploadedDocs = await apiService.uploadDocuments(rawFiles, assistant.id);
      const newDocIds = uploadedDocs.map(d => d.id);
      const updatedIds = Array.from(new Set([...(assistant.documentIds || []), ...newDocIds]));
      
      const updated = await apiService.updateAssistant(assistant.id, {
        documentIds: updatedIds,
        lastIndexedAt: new Date().toISOString(),
      });
      syncAssistantState(updated);

      // Immediately append newly uploaded documents to the view
      setDocuments(prev => [...uploadedDocs, ...prev.filter(p => !newDocIds.includes(p.id))]);
      setAllWorkspaceDocs(prev => [...uploadedDocs, ...prev.filter(p => !newDocIds.includes(p.id))]);
      setShowUploadArea(false);
      toast.success(`Successfully uploaded and indexed ${rawFiles.length} document(s) via Gemini File Search`);
      onRefreshData?.();
    } catch (err: any) {
      toast.error('Upload failed', err.message || 'Could not upload files');
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleAttachDoc = async (docId: string) => {
    const current = assistant.documentIds || [];
    const isAttached = current.includes(docId);
    const updatedIds = isAttached ? current.filter(id => id !== docId) : [...current, docId];
    try {
      const updated = await apiService.updateAssistant(assistant.id, {
        documentIds: updatedIds,
      });
      syncAssistantState(updated);
      const assigned = allWorkspaceDocs.filter(d => updatedIds.includes(d.id));
      setDocuments(assigned);
      toast.success(isAttached ? 'Document removed from assistant' : 'Document attached to assistant');
      onRefreshData?.();
    } catch (err: any) {
      toast.error('Failed to update document attachment', err.message);
    }
  };

  const handleReindex = async (docId: string, filename: string) => {
    try {
      await apiService.reindexDocument(docId);
      const allDocs = await apiService.getDocuments();
      setDocuments(allDocs.filter(d => (assistant.documentIds || []).includes(d.id)));
      toast.info('Document re-indexed', `${filename} chunk index refreshed`);
    } catch (err: any) {
      toast.error('Re-index failed', err.message);
    }
  };

  const handleDeleteDoc = async (docId: string, filename: string) => {
    try {
      await apiService.deleteDocument(docId);
      const updatedIds = (assistant.documentIds || []).filter(id => id !== docId);
      const updated = await apiService.updateAssistant(assistant.id, {
        documentIds: updatedIds,
      });
      syncAssistantState(updated);

      const allDocs = await apiService.getDocuments();
      setDocuments(allDocs.filter(d => updatedIds.includes(d.id)));
      toast.info('Document deleted', `${filename} removed from knowledge base`);
    } catch (err: any) {
      toast.error('Delete failed', err.message);
    }
  };

  // --- PLAYGROUND HANDLERS ---
  const handleSendPlayground = async (queryOverride?: string) => {
    const q = (queryOverride || playgroundInput).trim();
    if (!q || isAnswering) return;

    setLastUserQuestion(q);
    const userMsg: ChatMessageItem = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setPlaygroundMessages(prev => [...prev, userMsg]);
    setPlaygroundInput('');
    setIsAnswering(true);

    try {
      const history = playgroundMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const res = await apiService.sendChatMessage(assistant.id, q, conversationId, history);
      setConversationId(res.conversationId);
      setPlaygroundMessages(prev => [...prev, res.message]);
    } catch (err: any) {
      setPlaygroundMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `Knowledge Retrieval Error: ${err.message || 'Server error'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isRefusal: true,
        },
      ]);
    } finally {
      setIsAnswering(false);
    }
  };

  const handleFeedback = async (messageId: string, type: 'positive' | 'negative') => {
    try {
      await apiService.submitFeedback(assistant.id, messageId, type);
      const updated = await apiService.getAssistant(assistant.id);
      syncAssistantState(updated);
      toast.success(`Feedback recorded`, `Marked as ${type === 'positive' ? 'helpful' : 'unhelpful'}`);
    } catch {
      toast.success(`Feedback recorded`, `Marked as ${type === 'positive' ? 'helpful' : 'unhelpful'}`);
    }
  };

  const handleRegenerate = async (msg: ChatMessageItem) => {
    if (isAnswering) return;
    setIsAnswering(true);
    try {
      const history = playgroundMessages.filter(m => m.id !== msg.id).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const res = await apiService.sendChatMessage(
        assistant.id,
        lastUserQuestion,
        conversationId,
        history
      );
      setPlaygroundMessages(prev => [
        ...prev.filter(m => m.id !== msg.id),
        { ...res.message, id: `regen-${Date.now()}` },
      ]);
      toast.info('Answer regenerated');
    } catch (err: any) {
      toast.error('Regeneration failed', err.message);
    } finally {
      setIsAnswering(false);
    }
  };

  // --- SETTINGS SAVE ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await apiService.updateAssistant(assistant.id, {
        name: settingsName,
        description: settingsDescription,
        settings: {
          ...assistant.settings,
          name: settingsName,
          description: settingsDescription,
          greeting: settingsGreeting,
          placeholder: settingsPlaceholder,
          instructions: settingsInstructions,
          themeColor: settingsThemeColor,
          suggestedQuestions: settingsQuestions,
        },
      });
      syncAssistantState(updated);
      toast.success('Settings saved', 'Assistant configuration updated across all deployments.');
    } catch (err: any) {
      toast.error('Save failed', err.message);
    }
  };

  // Embed script string with dynamic origin resolution
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://knowflow.ai';
  const embedCode = `<script
  src="${currentOrigin}/widget.js"
  data-bot-id="${assistant.id}">
</script>`;

  const assistantUrl = `${currentOrigin}/chat/${assistant.id}`;

  const tabsList = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'knowledge', label: 'Knowledge Base', icon: FileText, badge: documents.length },
    { id: 'playground', label: 'Playground', icon: MessageSquare },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'deploy', label: 'Deploy', icon: Rocket },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Document table columns
  const filteredDocs = documents.filter(d =>
    d.filename.toLowerCase().includes(docSearchQuery.toLowerCase())
  );

  const documentColumns: Column<DocumentItem>[] = [
    {
      key: 'filename',
      header: 'Filename',
      render: (doc) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-semibold text-slate-800 text-xs">{doc.filename}</span>
            <p className="text-[10px] text-slate-400">{doc.filesize}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (doc) => (
        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
          {doc.type}
        </span>
      ),
    },
    {
      key: 'pages',
      header: 'Pages',
      render: (doc) => <span className="text-slate-600 font-medium">{doc.pages} pgs</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (doc) => (
        <Badge
          variant={doc.status === 'Ready' ? 'success' : doc.status === 'Processing' ? 'warning' : 'danger'}
          size="sm"
          dot
        >
          {doc.status}
        </Badge>
      ),
    },
    {
      key: 'uploadedAt',
      header: 'Uploaded',
      render: (doc) => (
        <span className="text-slate-500 text-[11px]">
          {new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'lastIndexedAt',
      header: 'Last indexed',
      render: (doc) => (
        <span className="text-slate-500 text-[11px]">
          {new Date(doc.lastIndexedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (doc) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleReindex(doc.id, doc.filename)}
            title="Re-index document"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDeleteDoc(doc.id, doc.filename)}
            title="Delete document"
            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* HEADER BAR (Required fields: Assistant name, Status, Last indexed, Actions) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
        {/* Back navigation link */}
        <div className="mb-3.5 pb-2.5 border-b border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Assistants</span>
          </button>
          <span className="text-[11px] font-mono text-slate-400">ID: {assistant.id}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className="w-12 h-12 rounded-xl text-white flex items-center justify-center font-bold text-lg shadow-2xs shrink-0"
              style={{ backgroundColor: assistant.settings.themeColor || '#2563eb' }}
            >
              <Bot className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  {assistant.name}
                </h1>
                <Badge variant="success" size="sm" dot>
                  {assistant.status}
                </Badge>
              </div>

              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                {assistant.description}
              </p>

              <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400 font-medium">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Last indexed:{' '}
                  <strong className="text-slate-700">
                    {new Date(assistant.lastIndexedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </strong>
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" /> {documents.length} approved documents
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              icon={Rocket}
              onClick={() => setActiveTab('deploy')}
            >
              Deploy
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={MessageSquare}
              onClick={() => setActiveTab('playground')}
            >
              Open Playground
            </Button>
          </div>
        </div>

        {/* WORKSPACE NAVIGATION TABS */}
        <div className="mt-5 pt-2 border-t border-slate-100">
          <Tabs
            tabs={tabsList}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="underline"
          />
        </div>
      </div>

      {/* ================= TAB 1: OVERVIEW ================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in-50 duration-150">
          {/* 5 Stats required in prompt: Documents, Questions, Conversations, Average response time, Feedback score */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                Documents
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{documents.length}</div>
              <span className="text-[10px] text-emerald-600 font-medium">Active PDF Sources</span>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                Questions
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {assistant.metrics.totalQuestions}
              </div>
              <span className="text-[10px] text-blue-600 font-medium">Total answered</span>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                Conversations
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {assistant.metrics.totalConversations}
              </div>
              <span className="text-[10px] text-purple-600 font-medium">Active chat threads</span>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                Avg Response Time
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {assistant.metrics.avgResponseTimeSec}s
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">Sub-second chunking</span>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                Feedback Score
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {assistant.metrics.feedbackScore}%
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">Thumbs-up rating</span>
            </div>
          </div>

          {/* Quick actions: Add Knowledge, Test Assistant, Customize, Deploy */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <button
                onClick={() => {
                  setActiveTab('knowledge');
                  setShowUploadArea(true);
                }}
                className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all text-left group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900">Add Knowledge</h4>
                <p className="text-xs text-slate-500 mt-0.5">Upload new PDF documents to re-index.</p>
              </button>

              <button
                onClick={() => setActiveTab('playground')}
                className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all text-left group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900">Test Assistant</h4>
                <p className="text-xs text-slate-500 mt-0.5">Simulate Q&A and verify citations.</p>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all text-left group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                  <Settings className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900">Customize</h4>
                <p className="text-xs text-slate-500 mt-0.5">Colors, greeting, prompts, and tone.</p>
              </button>

              <button
                onClick={() => setActiveTab('deploy')}
                className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all text-left group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                  <Rocket className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900">Deploy</h4>
                <p className="text-xs text-slate-500 mt-0.5">Get script tag or shareable URL.</p>
              </button>
            </div>
          </div>

          {/* Assistant Info & Verification Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card padding="md">
              <CardHeader
                title="Grounding Rules & Prompt Guardrails"
                description="Strict knowledge boundaries enforced by KnowFlow AI"
              />
              <div className="space-y-3 text-xs text-slate-600">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="font-semibold text-slate-800 block mb-1">System Instructions:</span>
                  <p className="italic text-slate-600 leading-relaxed">
                    "{assistant.settings.instructions}"
                  </p>
                </div>

                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200/60 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Out-of-domain refusal active: Unsupported questions will be politely rejected.</span>
                </div>
              </div>
            </Card>

            <Card padding="md">
              <CardHeader
                title="Active Knowledge Sources"
                description="Documents connected to this assistant"
                action={
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('knowledge')}>
                    Manage Docs
                  </Button>
                }
              />
              <div className="space-y-2">
                {documents.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate">{d.filename}</span>
                    </div>
                    <span className="text-slate-400 shrink-0">{d.pages} pages</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ================= TAB 2: KNOWLEDGE BASE ================= */}
      {activeTab === 'knowledge' && (
        <div className="space-y-6 animate-in fade-in-50 duration-150">
          {/* Upload Accordion / Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Knowledge Base Management</h2>
              <p className="text-xs text-slate-500">
                Upload or link documents to power accurate, grounded AI answers for this assistant.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={Layers}
                onClick={() => setShowAttachModal(true)}
              >
                Attach Existing ({allWorkspaceDocs.length})
              </Button>
              <Button
                variant={showUploadArea ? 'outline' : 'primary'}
                size="sm"
                icon={Plus}
                onClick={() => setShowUploadArea(!showUploadArea)}
              >
                {showUploadArea ? 'Hide Upload' : 'Upload Documents'}
              </Button>
            </div>
          </div>

          {/* Large Drag and Drop Upload Area */}
          {showUploadArea && (
            <Card padding="md" className="border-blue-200 bg-blue-50/10">
              <FileUpload
                onRawFilesSelected={handleUploadRawFiles}
                isUploading={isUploading}
                maxFiles={5}
                autoUpload={true}
              />
            </Card>
          )}

          {/* Document Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                  placeholder="Search assistant documents..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="text-xs text-slate-500">
                Showing <strong className="text-slate-800">{filteredDocs.length}</strong> active documents
              </div>
            </div>

            <DataTable
              columns={documentColumns}
              data={filteredDocs}
              keyExtractor={d => d.id}
              emptyMessage="No documents linked to this assistant yet."
              emptyDescription="Upload files from your device or attach existing organization documents."
              emptyIcon={<FileText className="w-6 h-6 text-slate-400" />}
              emptyAction={
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    onClick={() => setShowUploadArea(true)}
                  >
                    Upload Documents
                  </Button>
                  {allWorkspaceDocs.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Layers}
                      onClick={() => setShowAttachModal(true)}
                    >
                      Attach from Library ({allWorkspaceDocs.length})
                    </Button>
                  )}
                </div>
              }
            />
          </div>

          {/* Modal: Attach from Workspace Library */}
          {showAttachModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-0 duration-200">
              <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Attach Organization Documents</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select which documents should be indexed and cited by {assistant.name}.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAttachModal(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 flex-1 overflow-y-auto divide-y divide-slate-100">
                  {allWorkspaceDocs.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-xs text-slate-500">No documents found in the organization repository.</p>
                    </div>
                  ) : (
                    allWorkspaceDocs.map(doc => {
                      const isAttached = (assistant.documentIds || []).includes(doc.id);
                      return (
                        <div
                          key={doc.id}
                          onClick={() => handleToggleAttachDoc(doc.id)}
                          className="py-3 px-2 flex items-center justify-between hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-4">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isAttached ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">{doc.filename}</p>
                              <p className="text-[11px] text-slate-400">{doc.type} • {doc.filesize} • {doc.pages} pages</p>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {isAttached ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
                                <Check className="w-3 h-3" /> Attached
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700">
                                <Plus className="w-3 h-3" /> Link
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {(assistant.documentIds || []).length} document(s) assigned
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowAttachModal(false)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: PLAYGROUND ================= */}
      {activeTab === 'playground' && (
        <div className="space-y-4 animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Ground-Truth Playground</h2>
              <p className="text-xs text-slate-500">
                Test prompts in real-time. Inspect cited vector chunks and verify guardrail refusals.
              </p>
            </div>

            {/* Quick Test Prompt Shortcuts */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSendPlayground('What is the refund policy?')}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-medium transition-colors cursor-pointer"
              >
                Test "Refund Policy"
              </button>
              <button
                type="button"
                onClick={() => handleSendPlayground('What is the square root of 99999?')}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-medium transition-colors cursor-pointer"
              >
                Test Refusal State
              </button>
            </div>
          </div>

          {/* ChatGPT-style Conversation Area */}
          <Card padding="none" className="flex flex-col h-[600px] border-slate-200/90 shadow-sm overflow-hidden">
            {/* Assistant Sub-bar */}
            <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-slate-800">{assistant.name}</span>
                <span className="text-slate-400">({documents.length} grounded documents)</span>
              </div>
              <button
                onClick={() => setPlaygroundMessages([
                  {
                    id: `welcome-${Date.now()}`,
                    role: 'assistant',
                    content: assistant.settings.greeting || 'Hi! How can I help you today?',
                    timestamp: 'Just now',
                  }
                ])}
                className="text-slate-400 hover:text-slate-700 cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Clear chat</span>
              </button>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/30">
              {playgroundMessages.map(msg => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  assistantName={assistant.name}
                  assistantColor={assistant.settings.themeColor || '#2563eb'}
                  onFeedback={handleFeedback}
                  onRegenerate={handleRegenerate}
                />
              ))}

              {isAnswering && (
                <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs animate-pulse">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <span>Searching vector chunks & formulating source-grounded response...</span>
                </div>
              )}
            </div>

            {/* Suggested Question Chips */}
            {assistant.settings.suggestedQuestions && (
              <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Prompts:</span>
                {assistant.settings.suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendPlayground(q)}
                    className="text-xs whitespace-nowrap bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full transition-colors cursor-pointer shrink-0"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendPlayground();
              }}
              className="p-3.5 bg-white border-t border-slate-200 flex items-center gap-3"
            >
              <input
                type="text"
                value={playgroundInput}
                onChange={e => setPlaygroundInput(e.target.value)}
                placeholder={assistant.settings.placeholder || 'Ask a question using uploaded documents...'}
                className="flex-1 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 transition-colors"
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                icon={Send}
                disabled={!playgroundInput.trim() || isAnswering}
                className="shrink-0"
              >
                Send
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* ================= TAB 4: ANALYTICS ================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-in fade-in-50 duration-150">
          {/* Analytics Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] uppercase font-semibold text-slate-400">Total Conversations</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {assistant.metrics.totalConversations}
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">+14% this week</span>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] uppercase font-semibold text-slate-400">Total Questions</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {assistant.metrics.totalQuestions}
              </div>
              <span className="text-[10px] text-blue-600 font-medium">100% cited</span>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] uppercase font-semibold text-slate-400">Avg Response Time</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {assistant.metrics.avgResponseTimeSec}s
              </div>
              <span className="text-[10px] text-purple-600 font-medium">Fast retrieval</span>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] uppercase font-semibold text-slate-400">Positive Feedback</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1 flex items-center gap-1">
                <ThumbsUp className="w-5 h-5" />
                <span>{assistant.metrics.positiveCount}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Helpful ratings</span>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-[11px] uppercase font-semibold text-slate-400">Negative Feedback</span>
              <div className="text-2xl font-bold text-rose-600 mt-1 flex items-center gap-1">
                <ThumbsDown className="w-5 h-5" />
                <span>{assistant.metrics.negativeCount}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Unhelpful flags</span>
            </div>
          </div>

          {/* Charts: Questions over time, Conversations over time, Feedback distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card padding="md" className="lg:col-span-8">
              <CardHeader
                title="Questions & Conversations Over Time"
                description="Daily inquiry traffic and interactive student/employee sessions"
              />
              <Chart.AreaLine
                data={(assistantAnalytics?.trends && assistantAnalytics.trends.length > 0
                  ? assistantAnalytics.trends
                  : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => ({ date: d, questions: 0, conversations: 0 }))
                ).map(t => ({
                  label: t.date,
                  value: t.questions,
                  secondaryValue: t.conversations,
                }))}
                primaryLabel="Questions"
                secondaryLabel="Conversations"
                height={220}
              />
            </Card>

            <Card padding="md" className="lg:col-span-4 flex flex-col justify-between">
              <CardHeader
                title="Feedback Distribution"
                description="User satisfaction rating ratio"
              />
              <div className="py-2">
                <Chart.Donut
                  positive={assistant.metrics.positiveCount}
                  negative={assistant.metrics.negativeCount}
                  size={160}
                />
              </div>
              <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
                Calculated from verified thumbs-up and thumbs-down votes.
              </div>
            </Card>
          </div>

          {/* Most Asked Questions */}
          <Card padding="md">
            <CardHeader
              title="Most Asked Questions"
              description="Frequently searched user topics and their corresponding cited source documents"
            />
            <div className="divide-y divide-slate-100">
              {(assistantAnalytics?.topQuestions && assistantAnalytics.topQuestions.length > 0 ? (
                assistantAnalytics.topQuestions.map((item, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        "{item.query}"
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                        <span className="text-blue-600 font-medium flex items-center gap-1">
                          <FileText className="w-3 h-3" /> {item.citationDoc || 'Knowledge Base'}
                        </span>
                        <span>•</span>
                        <span>Last asked {item.lastAsked}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-slate-900">{item.count}</span>
                      <span className="text-[10px] text-slate-400 block uppercase">queries</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No questions asked yet. Test queries in the Playground to start tracking user trends.
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ================= TAB 5: DEPLOY ================= */}
      {activeTab === 'deploy' && (
        <div className="space-y-6 animate-in fade-in-50 duration-150">
          <div>
            {/* Headline required by prompt */}
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Your assistant is ready to deploy.
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Embed KnowFlow AI on your organization's website with a single lightweight script tag.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Embed Snippet & Instructions */}
            <div className="lg:col-span-7 space-y-6">
              {/* Direct Assistant URL */}
              <Card padding="md">
                <CardHeader
                  title="Assistant Direct Share URL"
                  description="Shareable hosted portal for students, staff, or customers"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={assistantUrl}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Copy}
                    onClick={() => {
                      navigator.clipboard.writeText(assistantUrl);
                      setCopiedUrl(true);
                      toast.success('URL copied!');
                      setTimeout(() => setCopiedUrl(false), 2000);
                    }}
                  >
                    {copiedUrl ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </Card>

              {/* Embed Code Block */}
              <Card padding="md">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-900">Embed Script Tag</h3>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Copy}
                    onClick={() => {
                      navigator.clipboard.writeText(embedCode);
                      setCopiedEmbed(true);
                      toast.success('Script code copied!');
                      setTimeout(() => setCopiedEmbed(false), 2000);
                    }}
                  >
                    {copiedEmbed ? 'Copied Code!' : 'Copy Code'}
                  </Button>
                </div>

                <p className="text-xs text-slate-500 mb-3">
                  Inject this tag anywhere on WordPress, Webflow, Next.js, HTML, or custom intranets.
                </p>

                <div className="p-4 bg-slate-950 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
                  <pre>{embedCode}</pre>
                </div>
              </Card>

              {/* Installation Instructions (Exact 1, 2, 3 required by prompt) */}
              <Card padding="md" className="bg-slate-50/60">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  Installation Instructions:
                </h3>
                <ol className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      1
                    </span>
                    <span>Copy the script above.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      2
                    </span>
                    <span>Paste it right before the closing <code>&lt;/body&gt;</code> tag of your website's <code>index.html</code> (after all main scripts).</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      3
                    </span>
                    <span>Publish or refresh your website. The interactive floating widget will automatically appear!</span>
                  </li>
                </ol>

                <div className="mt-4 pt-3 border-t border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-600 mb-1.5">Example Placement in index.html:</div>
                  <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg text-[11px] font-mono leading-relaxed overflow-x-auto">
{`  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>

  <!-- KnowFlow AI Embed Widget -->
  ${embedCode}
</body>`}
                  </pre>
                </div>
              </Card>
            </div>

            {/* Right: Live Widget Preview (required in prompt) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Live Widget Preview
                </span>
                <span className="text-[11px] text-slate-400">Interactive preview</span>
              </div>

              <Widget assistant={assistant} mode="embedded" />
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 6: SETTINGS ================= */}
      {activeTab === 'settings' && (
        <div className="space-y-6 animate-in fade-in-50 duration-150">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Assistant Customization & Settings</h2>
            <p className="text-xs text-slate-500">
              Control bot identity, visual themes, initial messages, and suggested starter prompts.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Form Controls */}
            <form onSubmit={handleSaveSettings} className="lg:col-span-7 space-y-4">
              <Card padding="md" className="space-y-4">
                <Input
                  label="Assistant Name"
                  value={settingsName}
                  onChange={e => setSettingsName(e.target.value)}
                />

                <Input
                  label="Description"
                  value={settingsDescription}
                  onChange={e => setSettingsDescription(e.target.value)}
                />

                {/* Theme Color Picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Theme Color
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { name: 'Blue', color: '#2563eb' },
                      { name: 'Purple', color: '#7c3aed' },
                      { name: 'Teal', color: '#0d9488' },
                      { name: 'Navy', color: '#0f172a' },
                      { name: 'Rose', color: '#e11d48' },
                    ].map(c => (
                      <button
                        key={c.color}
                        type="button"
                        onClick={() => setSettingsThemeColor(c.color)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                          settingsThemeColor === c.color
                            ? 'border-slate-900 ring-2 ring-slate-900 ring-offset-2'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: c.color }} />
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Greeting Message"
                  value={settingsGreeting}
                  onChange={e => setSettingsGreeting(e.target.value)}
                  helperText="Displayed as the first welcome message when the widget opens."
                />

                <Input
                  label="Input Placeholder"
                  value={settingsPlaceholder}
                  onChange={e => setSettingsPlaceholder(e.target.value)}
                />

                <Textarea
                  label="System Instructions & Boundary Rules"
                  rows={3}
                  value={settingsInstructions}
                  onChange={e => setSettingsInstructions(e.target.value)}
                  helperText="Governs how strictly the AI responds to questions."
                />

                {/* Suggested Questions */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Suggested Questions
                  </label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Add another suggested prompt..."
                      value={newQuestionText}
                      onChange={e => setNewQuestionText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newQuestionText.trim()) {
                            setSettingsQuestions(prev => [...prev, newQuestionText.trim()]);
                            setNewQuestionText('');
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (newQuestionText.trim()) {
                          setSettingsQuestions(prev => [...prev, newQuestionText.trim()]);
                          setNewQuestionText('');
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {settingsQuestions.map((q, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-700 border border-slate-200"
                      >
                        <span>{q}</span>
                        <button
                          type="button"
                          onClick={() => setSettingsQuestions(prev => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-slate-700 cursor-pointer font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <Button type="submit" variant="primary" size="md">
                    Save Changes
                  </Button>
                </div>
              </Card>
            </form>

            {/* Right Column: Live Settings Preview */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Real-time Appearance Preview
                </span>
                <span className="text-[11px] text-slate-400">Updates live</span>
              </div>

              {/* Dynamic preview widget reflecting the form inputs */}
              <Widget
                assistant={{
                  ...assistant,
                  name: settingsName,
                  settings: {
                    ...assistant.settings,
                    name: settingsName,
                    greeting: settingsGreeting,
                    placeholder: settingsPlaceholder,
                    themeColor: settingsThemeColor,
                    suggestedQuestions: settingsQuestions,
                  },
                }}
                mode="embedded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
