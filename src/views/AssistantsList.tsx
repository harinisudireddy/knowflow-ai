import React, { useState } from 'react';
import { Assistant } from '../types';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import {
  Bot,
  PlusCircle,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  FileText,
  MessageSquare,
  Clock,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';

export interface AssistantsListProps {
  assistants: Assistant[];
  isDemoMode?: boolean;
  onOpenWorkspace: (assistantId: string, initialTab?: string) => void;
  onOpenCreateModal: () => void;
  onDeleteAssistant: (assistantId: string) => void;
}

export const AssistantsList: React.FC<AssistantsListProps> = ({
  assistants,
  isDemoMode = false,
  onOpenWorkspace,
  onOpenCreateModal,
  onDeleteAssistant,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const toast = useToast();

  const filtered = assistants.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const targetDeleteAssistant = assistants.find(a => a.id === deleteModalId);

  const confirmDelete = () => {
    if (!deleteModalId) return;
    onDeleteAssistant(deleteModalId);
    toast.info('Assistant deleted', `${targetDeleteAssistant?.name} has been removed.`);
    setDeleteModalId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Assistants
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure, monitor, and deploy source-grounded knowledge bots for your organization.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            icon={PlusCircle}
            onClick={onOpenCreateModal}
          >
            Create Assistant
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, description, or policy..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-800">{filtered.length}</span>
          <span>{filtered.length === 1 ? 'Assistant' : 'Assistants'}</span>
        </div>
      </div>

      {/* Assistants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((assistant) => {
          const formattedDate = new Date(assistant.updatedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });

          return (
            <Card
              key={assistant.id}
              hoverable
              padding="md"
              className="flex flex-col justify-between border-slate-200/90"
            >
              <div>
                {/* Top bar */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl text-white flex items-center justify-center font-bold shadow-2xs"
                      style={{ backgroundColor: assistant.settings.themeColor || '#2563eb' }}
                    >
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 leading-tight">
                        {assistant.name}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Updated {formattedDate}
                      </span>
                    </div>
                  </div>

                  <Badge variant="success" size="sm" dot>
                    {assistant.status}
                  </Badge>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4 min-h-[36px]">
                  {assistant.description}
                </p>

                {/* Metric Badges */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="text-slate-500 text-[11px]">Docs:</span>
                    <strong className="text-slate-800 text-xs">{assistant.documentIds.length}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-slate-500 text-[11px]">Questions:</span>
                    <strong className="text-slate-800 text-xs">{assistant.metrics.totalQuestions}</strong>
                  </div>
                </div>
              </div>

              {/* Actions: Open, Edit, Delete (exact prompt requirement) */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon={ExternalLink}
                  onClick={() => onOpenWorkspace(assistant.id, 'overview')}
                  className="flex-1"
                >
                  Open
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  icon={Edit2}
                  onClick={() => onOpenWorkspace(assistant.id, 'settings')}
                  title="Edit Configuration"
                >
                  Edit
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteModalId(assistant.id)}
                  title="Delete Assistant"
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 bg-white border border-slate-200/90 rounded-xl p-8 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Bot className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">No assistants found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5 leading-relaxed">
            {searchQuery
              ? `No assistants match "${searchQuery}". Try a different keyword.`
              : 'Create your first knowledge assistant to start indexing documents and answering questions.'}
          </p>
          <Button variant="primary" size="sm" icon={PlusCircle} onClick={onOpenCreateModal}>
            Create Assistant
          </Button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalId !== null}
        onClose={() => setDeleteModalId(null)}
        title="Delete Assistant"
        description="This action cannot be undone."
        maxWidth="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDeleteModalId(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={confirmDelete}>
              Delete Assistant
            </Button>
          </>
        }
      >
        <p className="text-xs text-slate-600 leading-relaxed">
          Are you sure you want to permanently delete{' '}
          <strong className="text-slate-900 font-semibold">{targetDeleteAssistant?.name}</strong>?
          Active embed widgets for this assistant will immediately stop answering questions.
        </p>
      </Modal>
    </div>
  );
};
