import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import { Button } from '../common/Button';

const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.doc', '.docx', '.md', '.markdown', '.csv', '.json', '.rtf', '.html', '.tsv'];

export interface FileUploadProps {
  onFilesSelected?: (files: { name: string; size: string; pages: number }[]) => void;
  onRawFilesSelected?: (files: File[]) => void;
  maxFiles?: number;
  className?: string;
  isUploading?: boolean;
  autoUpload?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  onRawFilesSelected,
  maxFiles = 5,
  className = '',
  isUploading = false,
  autoUpload = true,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState<File[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear queue when uploading completes
  useEffect(() => {
    if (!isUploading && selectedQueue.length > 0) {
      setSelectedQueue([]);
    }
  }, [isUploading]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const isFileSupported = (file: File): boolean => {
    const name = file.name.toLowerCase();
    const hasExt = ALLOWED_EXTENSIONS.some(ext => name.endsWith(ext));
    const hasMime = file.type.startsWith('text/') ||
      file.type.includes('pdf') ||
      file.type.includes('document') ||
      file.type.includes('csv') ||
      file.type.includes('json');
    return hasExt || hasMime;
  };

  const processFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);
    const newFiles: File[] = [];
    let hasInvalid = false;

    Array.from(files).forEach(file => {
      if (!isFileSupported(file)) {
        hasInvalid = true;
        return;
      }
      newFiles.push(file);
    });

    if (hasInvalid) {
      setErrorMessage('Some files were skipped. Supported formats: PDF, DOCX, TXT, Markdown, CSV, JSON.');
    }

    if (newFiles.length > 0) {
      const clamped = newFiles.slice(0, maxFiles);
      setSelectedQueue(clamped);

      // Auto-upload immediately so the user doesn't get stuck in an unconfirmed queue
      if (autoUpload) {
        if (onRawFilesSelected) {
          onRawFilesSelected(clamped);
        } else if (onFilesSelected) {
          const summaryItems = clamped.map(file => {
            const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
            return {
              name: file.name,
              size: `${sizeInMb} MB`,
              pages: Math.max(1, Math.ceil(file.size / (50 * 1024))),
            };
          });
          onFilesSelected(summaryItems);
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = (index: number) => {
    setSelectedQueue(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirmUpload = () => {
    if (selectedQueue.length === 0) return;

    if (onRawFilesSelected) {
      onRawFilesSelected(selectedQueue);
    } else if (onFilesSelected) {
      const summaryItems = selectedQueue.map(file => {
        const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
        return {
          name: file.name,
          size: `${sizeInMb} MB`,
          pages: Math.max(1, Math.ceil(file.size / (50 * 1024))),
        };
      });
      onFilesSelected(summaryItems);
    }
  };

  return (
    <div className={`w-full flex flex-col gap-3.5 ${className}`}>
      {/* Inline Error State */}
      {errorMessage && (
        <div className="flex items-start justify-between gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-900">Upload notice</p>
              <p className="text-rose-700 text-[11px] mt-0.5 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 p-0.5 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Active Uploading Banner */}
      {isUploading && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 animate-pulse">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-blue-950">
              Indexing document(s) with Google Gemini File Search...
            </p>
            <p className="text-[11px] text-blue-700 mt-0.5 truncate">
              Storing in Firestore, extracting document contents, and generating vector embeddings.
            </p>
          </div>
        </div>
      )}

      {/* Dropzone Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 sm:p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
          isUploading
            ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-200'
            : isDragging
            ? 'border-blue-500 bg-blue-50/60 scale-[1.005]'
            : 'border-slate-200/90 hover:border-blue-400 hover:bg-slate-50/70 bg-slate-50/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.doc,.docx,.md,.markdown,.csv,.json,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/csv,application/json"
          multiple
          disabled={isUploading}
          className="hidden"
          onChange={handleFileInput}
        />

        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3 shadow-2xs">
          {isUploading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <UploadCloud className="w-6 h-6" />
          )}
        </div>

        <h3 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight">
          {isUploading ? 'Uploading and indexing...' : 'Upload your knowledge documents'}
        </h3>

        <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-1 leading-relaxed">
          Select files from your device. Documents will be indexed into Gemini File Search and stored in Firestore.
        </p>

        <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Formats: <strong className="text-slate-900">PDF, DOCX, TXT, MD, CSV</strong>
          </span>
          <span className="text-[11px] text-slate-400">Up to 50MB per file</span>
        </div>

        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            {isUploading ? 'Uploading...' : 'Browse files from device'}
          </Button>
        </div>
      </div>

      {/* Selected Pending Files Queue (shown if autoUpload is off or manual queue) */}
      {!autoUpload && selectedQueue.length > 0 && (
        <div className="border border-slate-200/90 rounded-xl bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
              Pending Documents ({selectedQueue.length})
            </span>
            <button
              onClick={() => setSelectedQueue([])}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer font-medium"
            >
              Clear queue
            </button>
          </div>

          <div className="space-y-2 mb-4">
            {selectedQueue.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded bg-blue-100/60 text-blue-700 flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-medium text-slate-800 truncate">{file.name}</span>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    ({(file.size / (1024 * 1024)).toFixed(1)} MB)
                  </span>
                </div>
                <button
                  onClick={() => handleRemove(idx)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <Button
            variant="primary"
            size="md"
            className="w-full"
            loading={isUploading}
            onClick={handleConfirmUpload}
          >
            Process and Index {selectedQueue.length} {selectedQueue.length === 1 ? 'Document' : 'Documents'}
          </Button>
        </div>
      )}
    </div>
  );
};
