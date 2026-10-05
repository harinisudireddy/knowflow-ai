import React, { useState, useEffect } from 'react';
import { DocumentItem } from '../types';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { Modal } from '../components/common/Modal';
import { DataTable, Column } from '../components/common/DataTable';
import { FileUpload } from '../components/assistant/FileUpload';
import { useToast } from '../components/common/Toast';
import { apiService } from '../services/apiService';
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers
} from 'lucide-react';

export interface GlobalKnowledgeBaseProps {
  documents: DocumentItem[];
  isDemoMode?: boolean;
  onRefresh: () => void;
}

export const GlobalKnowledgeBase: React.FC<GlobalKnowledgeBaseProps> = ({
  documents,
  isDemoMode = false,
  onRefresh,
}) => {
  const [localDocs, setLocalDocs] = useState<DocumentItem[]>(documents);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteTargetDoc, setDeleteTargetDoc] = useState<DocumentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToast();

  // Keep in sync with parent updates
  useEffect(() => {
    if (documents) {
      setLocalDocs(documents);
    }
  }, [documents]);

  // Always fetch fresh documents from backend on mount
  useEffect(() => {
    let isMounted = true;
    if (!isDemoMode) {
      apiService.getDocuments().then(fresh => {
        if (isMounted && Array.isArray(fresh)) {
          setLocalDocs(fresh);
        }
      }).catch(console.error);
    }
    return () => { isMounted = false; };
  }, [isDemoMode]);

  const handleUploadRawFiles = async (files: File[]) => {
    setIsUploading(true);
    try {
      const createdDocs = await apiService.uploadDocuments(files);
      if (createdDocs && createdDocs.length > 0) {
        setLocalDocs(prev => [...createdDocs, ...prev.filter(d => !createdDocs.some(c => c.id === d.id))]);
      }
      await onRefresh();
      setShowUpload(false);
      toast.success(`Successfully uploaded and indexed ${files.length} document(s) with Gemini File Search`);
    } catch (err: any) {
      toast.error('Upload failed', err.message || 'Error uploading files');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReindex = async (doc: DocumentItem) => {
    try {
      await apiService.reindexDocument(doc.id);
      await onRefresh();
      const fresh = await apiService.getDocuments().catch(() => null);
      if (fresh) setLocalDocs(fresh);
      toast.info('Document re-indexed', `${doc.filename} refreshed in vector store.`);
    } catch (err: any) {
      toast.error('Re-index failed', err.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTargetDoc) return;
    setIsDeleting(true);
    const docToDelete = deleteTargetDoc;
    try {
      setLocalDocs(prev => prev.filter(d => d.id !== docToDelete.id));
      await apiService.deleteDocument(docToDelete.id);
      await onRefresh();
      toast.info('Document removed', `${docToDelete.filename} deleted.`);
      setDeleteTargetDoc(null);
    } catch (err: any) {
      toast.error('Delete failed', err.message);
      // Revert if failed
      setLocalDocs(prev => [...prev, docToDelete]);
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = localDocs.filter(d =>
    d.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.summary && d.summary.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const columns: Column<DocumentItem>[] = [
    {
      key: 'filename',
      header: 'Document Name',
      render: (doc) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-xs">{doc.filename}</p>
            <p className="text-[10px] text-slate-400 truncate max-w-xs">{doc.summary}</p>
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
      render: (doc) => <span className="font-medium text-slate-700">{doc.pages} pgs</span>,
    },
    {
      key: 'chunkCount',
      header: 'Vector Chunks',
      render: (doc) => (
        <span className="text-slate-600 font-mono text-[11px]">{doc.chunkCount || 100}</span>
      ),
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
          {new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
            onClick={() => handleReindex(doc)}
            title="Re-index document"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDeleteTargetDoc(doc)}
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Workspace Knowledge Base
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Global repository of approved documents indexed for all organization AI assistants.
          </p>
        </div>

        <Button
          variant={showUpload ? 'outline' : 'primary'}
          size="md"
          icon={Plus}
          onClick={() => setShowUpload(!showUpload)}
        >
          {showUpload ? 'Hide Upload Area' : 'Upload Documents'}
        </Button>
      </div>

      {showUpload && (
        <Card padding="md" className="border-blue-200 bg-blue-50/10">
          <FileUpload
            onRawFilesSelected={handleUploadRawFiles}
            isUploading={isUploading}
            maxFiles={5}
            autoUpload={true}
          />
        </Card>
      )}

      {/* Search & Stats Filter */}
      <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search across documents and summaries..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
          <span className="font-semibold text-slate-800">{filtered.length} Indexed Documents</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">Formats: PDF, DOCX, TXT, MD, CSV</span>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={d => d.id}
        emptyMessage="No documents found in knowledge base."
        emptyDescription="Upload files from your device to build your organization's verified source-of-truth knowledge base."
        emptyIcon={<FileText className="w-6 h-6 text-slate-400" />}
        emptyAction={
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowUpload(true)}>
            Upload Documents
          </Button>
        }
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteTargetDoc !== null}
        onClose={() => setDeleteTargetDoc(null)}
        title="Delete Knowledge Document"
        description="This action cannot be undone."
        maxWidth="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDeleteTargetDoc(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" loading={isDeleting} onClick={confirmDelete}>
              Delete Document
            </Button>
          </>
        }
      >
        <p className="text-xs text-slate-600 leading-relaxed">
          Are you sure you want to permanently remove{' '}
          <strong className="text-slate-900 font-semibold">{deleteTargetDoc?.filename}</strong>?
          This will delete its indexed vector chunks and citations from all connected assistants.
        </p>
      </Modal>
    </div>
  );
};
