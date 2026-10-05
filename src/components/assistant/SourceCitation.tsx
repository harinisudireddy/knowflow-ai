import React, { useState } from 'react';
import { Citation } from '../../types';
import { FileText, ChevronDown, ChevronUp, ExternalLink, ShieldCheck, Quote } from 'lucide-react';

export interface SourceCitationProps {
  citations: Citation[];
}

export const SourceCitation: React.FC<SourceCitationProps> = ({ citations }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-3.5 pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Cited Sources ({citations.length})</span>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">Click source to inspect excerpt</span>
      </div>

      <div className="flex flex-col gap-1.5">
        {citations.map((citation, idx) => {
          const citKey = citation.id || `cit-${idx}`;
          const isExpanded = expandedId === citKey;
          return (
            <div
              key={citKey}
              className={`border rounded-lg transition-all duration-150 overflow-hidden ${
                isExpanded
                  ? 'border-blue-300 bg-blue-50/20 shadow-2xs'
                  : 'border-slate-200/90 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : citKey)}
                aria-expanded={isExpanded}
                className="w-full flex items-center justify-between px-3 py-2 text-left cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex items-center justify-center w-5 h-5 rounded-md bg-blue-600 text-white text-[11px] font-bold shrink-0 shadow-2xs">
                    {citation.index}
                  </span>
                  <div className="flex items-center gap-1.5 truncate">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {citation.documentName}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200/80 px-1.5 py-0.5 rounded shrink-0">
                    Page {citation.page}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-slate-400">
                  <span className="text-[10px] font-medium text-blue-600 hidden sm:inline">
                    {isExpanded ? 'Hide citation' : 'View citation'}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-blue-100 bg-white/90">
                  <div className="relative pl-3 border-l-2 border-blue-500 py-1 my-1">
                    <p className="text-xs text-slate-700 leading-relaxed font-sans">
                      "{citation.snippet}"
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Vector match • Page {citation.page}
                    </span>
                    <span className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer">
                      <span>Document viewer</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
