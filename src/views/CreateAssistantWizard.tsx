import React, { useState } from 'react';
import { Assistant, DocumentItem } from '../types';
import { Button } from '../components/common/Button';
import { Input, Textarea } from '../components/common/Input';
import { Card } from '../components/common/Card';
import { FileUpload } from '../components/assistant/FileUpload';
import { Widget } from '../components/assistant/Widget';
import { useToast } from '../components/common/Toast';
import { apiService } from '../services/apiService';
import {
  Check,
  ChevronRight,
  ArrowLeft,
  Bot,
  FileText,
  Sliders,
  Play,
  Rocket,
  CheckCircle2,
  Copy,
  Sparkles,
  Info
} from 'lucide-react';

export interface CreateAssistantWizardProps {
  existingDocuments: DocumentItem[];
  onFinish: (newAssistant: Assistant) => void;
  onCancel: () => void;
}

export const CreateAssistantWizard: React.FC<CreateAssistantWizardProps> = ({
  existingDocuments,
  onFinish,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const toast = useToast();

  // Step 1: Basic Information
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [greeting, setGreeting] = useState('Hello! How can I help you today?');
  const [instructions, setInstructions] = useState(
    'You are an official organizational knowledge assistant. Answer questions truthfully and concisely using only verified citations from approved knowledge documents. If the answer cannot be found in the provided sources, politely state that you do not have sufficient information.'
  );

  // Step 2: Knowledge Documents
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [docsList, setDocsList] = useState<DocumentItem[]>(existingDocuments);

  // Step 3: Configure
  const [themeColor, setThemeColor] = useState('#2563eb');
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([
    'What policies apply to this organization?',
    'Where can I find more details on this topic?',
  ]);
  const [newQuestionInput, setNewQuestionInput] = useState('');

  // Step 4: Test (Live playground state)
  const [testQuery, setTestQuery] = useState('');
  const [testAnswer, setTestAnswer] = useState<string | null>(null);
  const [testCitations, setTestCitations] = useState<any[]>([]);

  // Step 5: Deploy (Snippet copy state)
  const [copiedCode, setCopiedCode] = useState(false);
  const [createdAssistant, setCreatedAssistant] = useState<Assistant | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const steps = [
    { num: 1, label: 'Basic Information', icon: Bot },
    { num: 2, label: 'Knowledge', icon: FileText },
    { num: 3, label: 'Configure', icon: Sliders },
    { num: 4, label: 'Test', icon: Play },
    { num: 5, label: 'Deploy', icon: Rocket },
  ];

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!name.trim()) {
        toast.error('Assistant name is required');
        return;
      }
    }
    if (currentStep === 2) {
      if (selectedDocIds.length === 0) {
        if (docsList.length === 0) {
          toast.info('Continuing without knowledge documents', 'You can attach documents anytime from the Assistant Knowledge tab.');
        } else {
          toast.error('Please select at least 1 document source to ground this assistant');
          return;
        }
      }
    }
    if (currentStep === 3) {
      setIsCreating(true);
      try {
        if (!createdAssistant) {
          const created = await apiService.createAssistant({
            name,
            description,
            settings: {
              name,
              description,
              greeting,
              placeholder: 'Ask a question...',
              instructions,
              themeColor,
              suggestedQuestions,
            },
            documentIds: selectedDocIds,
          });
          setCreatedAssistant(created);
        } else {
          const updated = await apiService.updateAssistant(createdAssistant.id, {
            name,
            description,
            settings: {
              name,
              description,
              greeting,
              placeholder: 'Ask a question...',
              instructions,
              themeColor,
              suggestedQuestions,
            },
            documentIds: selectedDocIds,
          });
          setCreatedAssistant(updated);
        }
      } catch (err: any) {
        toast.error('Failed to configure assistant', err.message);
        return;
      } finally {
        setIsCreating(false);
      }
    }
    if (currentStep === 4) {
      setCurrentStep(5);
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleAddQuestion = () => {
    if (!newQuestionInput.trim()) return;
    setSuggestedQuestions(prev => [...prev, newQuestionInput.trim()]);
    setNewQuestionInput('');
  };

  const handleRemoveQuestion = (index: number) => {
    setSuggestedQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleRunTest = async (queryToRun?: string) => {
    const q = queryToRun || testQuery;
    if (!q || isTesting) return;
    setIsTesting(true);
    try {
      const targetId = createdAssistant ? createdAssistant.id : 'ast-univ-1';
      const res = await apiService.sendChatMessage(targetId, q);
      setTestAnswer(res.message.content);
      setTestCitations(res.message.citations || []);
    } catch (err: any) {
      setTestAnswer(`Response: ${err.message || 'Error executing test search'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleFileUploadRaw = async (files: File[]) => {
    setIsUploading(true);
    try {
      const addedDocs = await apiService.uploadDocuments(files);
      setDocsList(prev => [...addedDocs, ...prev]);
      setSelectedDocIds(prev => [...prev, ...addedDocs.map(d => d.id)]);
      toast.success(`Uploaded & indexed ${files.length} document(s) in Gemini File Search`);
    } catch (err: any) {
      toast.error('Upload failed', err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const toggleDocSelection = (id: string) => {
    setSelectedDocIds(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const embedSnippet = `<script
  src="https://knowflow-ai.example/widget.js"
  data-bot-id="assistant-${(createdAssistant?.id || name).toLowerCase().replace(/[^a-z0-9]/g, '-')}-123">
</script>`;

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(embedSnippet);
    setCopiedCode(true);
    toast.success('Embed script copied to clipboard!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const finalizeAndOpen = async () => {
    if (createdAssistant) {
      toast.success('Assistant successfully deployed!', createdAssistant.name);
      onFinish(createdAssistant);
    } else {
      const all = await apiService.getAssistants();
      const newest = all[0];
      toast.success('Assistant successfully deployed!', newest?.name);
      if (newest) onFinish(newest);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Create New Assistant
            </h1>
            <p className="text-xs text-slate-500">
              Follow the 5-step guided workflow to ground and deploy an AI assistant.
            </p>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {/* 5-Step Indicator */}
      <div className="grid grid-cols-5 gap-2">
        {steps.map((s) => {
          const isDone = currentStep > s.num;
          const isCurrent = currentStep === s.num;
          const Icon = s.icon;
          return (
            <div
              key={s.num}
              className={`flex flex-col items-center text-center p-2 rounded-xl transition-all ${
                isCurrent
                  ? 'bg-blue-50 border border-blue-200 text-blue-700 font-semibold'
                  : isDone
                  ? 'bg-emerald-50/60 border border-emerald-200/60 text-emerald-700'
                  : 'bg-slate-50 border border-slate-200 text-slate-400'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs mb-1.5 font-bold ${
                  isCurrent
                    ? 'bg-blue-600 text-white'
                    : isDone
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : s.num}
              </div>
              <span className="text-[11px] leading-tight line-clamp-1">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card padding="lg" className="border-slate-200/90 shadow-sm">
        {/* STEP 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Step 1: Basic Information</h2>
              <p className="text-xs text-slate-500 mt-1">
                Name and describe your assistant. Define the introductory welcome greeting message.
              </p>
            </div>

            <div className="space-y-4">
              <Input
                label="Assistant Name"
                placeholder="e.g. University Support Assistant"
                value={name}
                onChange={e => setName(e.target.value)}
                helperText="Identifies this bot in your workspace and in the widget title header."
              />

              <Input
                label="Description"
                placeholder="e.g. Answers student questions using approved university documents."
                value={description}
                onChange={e => setDescription(e.target.value)}
                helperText="Internal summary for administrators and team members."
              />

              <Input
                label="Greeting Message"
                placeholder="e.g. Hi! How can I help you today?"
                value={greeting}
                onChange={e => setGreeting(e.target.value)}
                helperText="The first message sent to users when they open the chat widget."
              />

              <Textarea
                label="System Instructions"
                rows={3}
                placeholder="e.g. Ground all answers strictly in approved documents..."
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                helperText="Directs persona, tone, and strict boundary rules."
              />
            </div>
          </div>
        )}

        {/* STEP 2: Knowledge */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Step 2: Knowledge Base</h2>
              <p className="text-xs text-slate-500 mt-1">
                Select approved documents to connect to this assistant, or upload a new PDF.
              </p>
            </div>

            {/* Drag and Drop Upload */}
            <FileUpload
              onRawFilesSelected={handleFileUploadRaw}
              isUploading={isUploading}
              maxFiles={3}
            />

            {/* Existing Documents Multi-Selector */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Select Documents to Ground This Assistant ({selectedDocIds.length} selected)
                </span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {docsList.length === 0 ? (
                  <div className="text-center py-6 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <FileText className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-slate-700">No documents in workspace yet</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Upload a PDF in the dropzone above, or continue and attach documents later.
                    </p>
                  </div>
                ) : (
                  docsList.map((doc) => {
                    const isChecked = selectedDocIds.includes(doc.id);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => toggleDocSelection(doc.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'border-blue-500 bg-blue-50/40 shadow-2xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center text-xs ${
                              isChecked ? 'bg-blue-600 text-white' : 'border border-slate-300'
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-900">{doc.filename}</p>
                            <p className="text-[11px] text-slate-500">
                              {doc.pages} pages • {doc.filesize} • Status: {doc.status}
                            </p>
                          </div>
                        </div>

                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          Ready
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Configure */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Step 3: Configure & Brand</h2>
              <p className="text-xs text-slate-500 mt-1">
                Customize appearance colors and suggested starter prompt pills.
              </p>
            </div>

            <div className="space-y-5">
              {/* Color Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Widget Theme Accent Color
                </label>
                <div className="flex items-center gap-3">
                  {[
                    { name: 'Royal Blue', color: '#2563eb' },
                    { name: 'Deep Purple', color: '#7c3aed' },
                    { name: 'Teal', color: '#0d9488' },
                    { name: 'Navy Slate', color: '#0f172a' },
                    { name: 'Crimson', color: '#dc2626' },
                  ].map(c => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setThemeColor(c.color)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                        themeColor === c.color
                          ? 'border-slate-900 ring-2 ring-slate-900 ring-offset-2'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: c.color }} />
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Suggested Questions */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Suggested Questions Pills
                </label>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Add a sample question for users..."
                    value={newQuestionInput}
                    onChange={e => setNewQuestionInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddQuestion())}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddQuestion}>
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map((q, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-xs font-medium text-slate-700 border border-slate-200"
                    >
                      <span>{q}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(idx)}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer text-xs font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Test */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Step 4: Test in Playground</h2>
              <p className="text-xs text-slate-500 mt-1">
                Verify knowledge ground truth and citation extraction prior to live deployment.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Test question (e.g. What is the refund policy?)"
                  value={testQuery}
                  onChange={e => setTestQuery(e.target.value)}
                />
                <Button
                  variant="primary"
                  size="sm"
                  loading={isTesting}
                  onClick={() => handleRunTest()}
                >
                  Query Assistant
                </Button>
              </div>

              {/* Quick sample prompt buttons */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-400">Try sample:</span>
                <button
                  type="button"
                  onClick={() => {
                    setTestQuery('What is the refund policy?');
                    handleRunTest('What is the refund policy?');
                  }}
                  className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  "What is the refund policy?"
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTestQuery('Can you write a poem about mars?');
                    handleRunTest('Can you write a poem about mars?');
                  }}
                  className="px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 cursor-pointer"
                >
                  Test Refusal Guardrail
                </button>
              </div>

              {testAnswer && (
                <div className="mt-4 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-800">Assistant Response:</span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold text-[10px]">
                      Grounded Answer
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                    {testAnswer}
                  </p>

                  {testCitations.length > 0 && (
                    <div className="pt-3 border-t border-slate-100">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                        Verified Sources
                      </span>
                      <div className="space-y-1">
                        {testCitations.map((c: any) => (
                          <div
                            key={c.id}
                            className="flex items-center gap-2 text-[11px] text-slate-700 bg-slate-50 px-2 py-1.5 rounded border border-slate-100"
                          >
                            <span className="font-bold text-blue-600">[{c.index}]</span>
                            <span>{c.documentName}</span>
                            <span className="text-slate-400">— Page {c.page}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: Deploy */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-in fade-in-50 duration-200 text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Your assistant is ready to deploy.
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                <strong className="text-slate-800 font-semibold">{name}</strong> has been indexed with {selectedDocIds.length} approved documents.
              </p>
            </div>

            {/* Embed Code Snippet */}
            <div className="max-w-xl mx-auto text-left">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 text-slate-300 rounded-t-xl text-xs font-mono">
                <span>Embed Code</span>
                <button
                  type="button"
                  onClick={handleCopySnippet}
                  className="flex items-center gap-1 text-blue-400 hover:text-white transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedCode ? 'Copied!' : 'Copy code'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 text-emerald-400 rounded-b-xl text-xs font-mono overflow-x-auto border-x border-b border-slate-800 leading-relaxed">
                {embedSnippet}
              </pre>
            </div>

            {/* 3 Step Installation Instructions (exact prompt requirement) */}
            <div className="max-w-xl mx-auto bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs space-y-2">
              <span className="font-bold text-slate-800 block uppercase tracking-wider text-[10px]">
                Installation Instructions:
              </span>
              <ol className="list-decimal list-inside space-y-1 text-slate-600">
                <li>Copy the script.</li>
                <li>Paste it before the closing body tag.</li>
                <li>Publish your website.</li>
              </ol>
            </div>
          </div>
        )}

        {/* Footer Navigation Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-6">
          {currentStep > 1 && currentStep < 5 ? (
            <Button variant="outline" size="sm" onClick={handleBack}>
              Back
            </Button>
          ) : (
            <div />
          )}

          {currentStep < 4 && (
            <Button variant="primary" size="md" onClick={handleNext}>
              <span>Continue to Step {currentStep + 1}</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}

          {currentStep === 4 && (
            <Button
              variant="primary"
              size="md"
              icon={Rocket}
              loading={isCreating}
              onClick={handleNext}
            >
              Create & Deploy Assistant
            </Button>
          )}

          {currentStep === 5 && (
            <Button variant="primary" size="md" icon={Bot} onClick={finalizeAndOpen} className="w-full sm:w-auto">
              Open Assistant Workspace
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
