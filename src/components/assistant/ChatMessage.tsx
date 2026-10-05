import React, { useState } from 'react';
import { ChatMessageItem } from '../../types';
import { SourceCitation } from './SourceCitation';
import {
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  RotateCcw,
  Bot,
  User,
  AlertTriangle,
  Clock
} from 'lucide-react';

export interface ChatMessageProps {
  message: ChatMessageItem;
  assistantName?: string;
  assistantColor?: string;
  onFeedback?: (id: string, type: 'positive' | 'negative') => void;
  onRegenerate?: (message: ChatMessageItem) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  assistantName = 'Assistant',
  assistantColor = '#2563eb',
  onFeedback,
  onRegenerate,
}) => {
  const [copied, setCopied] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<'positive' | 'negative' | null>(
    message.feedback || null
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleThumbs = (type: 'positive' | 'negative') => {
    const nextVal = currentFeedback === type ? null : type;
    setCurrentFeedback(nextVal);
    if (nextVal && onFeedback) {
      onFeedback(message.id, nextVal);
    }
  };

  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex items-start justify-end gap-2.5 sm:gap-3 my-3 sm:my-4">
        <div className="max-w-[85%] sm:max-w-xl bg-slate-900 text-white rounded-2xl rounded-tr-xs px-4 py-3 shadow-2xs">
          <p className="text-xs sm:text-sm font-normal leading-relaxed whitespace-pre-wrap">{message.content}</p>
          <div className="flex items-center justify-end mt-1.5 text-[10px] text-slate-400">
            <span>{message.timestamp}</span>
          </div>
        </div>
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 text-xs font-semibold shadow-2xs mt-0.5">
          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 sm:gap-3.5 my-3 sm:my-4">
      <div
        className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs mt-0.5"
        style={{ backgroundColor: assistantColor }}
      >
        <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </div>

      <div className="flex-1 max-w-[95%] sm:max-w-2xl lg:max-w-3xl">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold text-slate-900">{assistantName}</span>
          <span className="text-[10px] text-slate-400">{message.timestamp}</span>
          {message.responseTimeMs && (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">
              <Clock className="w-2.5 h-2.5" />
              {(message.responseTimeMs / 1000).toFixed(2)}s
            </span>
          )}
        </div>

        {/* Message Bubble */}
        <div
          className={`border rounded-2xl rounded-tl-xs p-4 sm:p-5 bg-white shadow-2xs ${
            message.isRefusal
              ? 'border-amber-300 bg-amber-50/20'
              : 'border-slate-200/90'
          }`}
        >
          {message.isRefusal ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-amber-900 text-xs font-semibold bg-amber-100/70 px-2.5 py-1 rounded-md w-fit">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Knowledge Boundary Guardrail Refusal</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-900 leading-relaxed font-medium">
                {message.content}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                KnowFlow AI strict groundness mode is enabled. The assistant only answers when verifiable facts exist in uploaded PDF documents to guarantee zero hallucinations.
              </p>
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-normal">
              {message.content}
            </p>
          )}

          {/* Sources */}
          {message.citations && message.citations.length > 0 && (
            <SourceCitation citations={message.citations} />
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-slate-400 text-xs">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleThumbs('positive')}
                title="Helpful answer"
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  currentFeedback === 'positive'
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                    : 'hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden sm:inline">Helpful</span>
              </button>

              <button
                type="button"
                onClick={() => handleThumbs('negative')}
                title="Not helpful"
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  currentFeedback === 'negative'
                    ? 'text-rose-700 bg-rose-50 border border-rose-200'
                    : 'hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden sm:inline">Unhelpful</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {onRegenerate && (
                <button
                  type="button"
                  onClick={() => onRegenerate(message)}
                  title="Regenerate answer"
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-[11px] hidden sm:inline">Regenerate</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopy}
                title="Copy response"
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[11px] text-emerald-600 font-medium">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[11px] hidden sm:inline">Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
