import React, { useState, useRef, useEffect } from 'react';
import { Assistant, ChatMessageItem } from '../../types';
import { apiService } from '../../services/apiService';
import { SourceCitation } from './SourceCitation';
import {
  Bot,
  Send,
  X,
  MessageSquare,
  Sparkles,
  RotateCcw,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';

export interface WidgetProps {
  assistant: Assistant;
  mode?: 'floating' | 'embedded';
  defaultOpen?: boolean;
  onClose?: () => void;
}

export const Widget: React.FC<WidgetProps> = ({
  assistant,
  mode = 'embedded',
  defaultOpen = true,
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: assistant.settings.greeting || 'Hi! How can I help you today?',
      timestamp: 'Just now',
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync greeting if assistant settings change
  useEffect(() => {
    if (messages.length === 1 && messages[0].id === 'welcome-1') {
      setMessages([
        {
          id: 'welcome-1',
          role: 'assistant',
          content: assistant.settings.greeting || 'Hi! How can I help you today?',
          timestamp: 'Just now',
        },
      ]);
    }
  }, [assistant.settings.greeting]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessageItem = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    try {
      const history = messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const res = await apiService.sendChatMessage(assistant.id, text, conversationId, history);
      setConversationId(res.conversationId);
      setMessages(prev => [...prev, res.message]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `Unable to get answer: ${err.message || 'Server error'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isRefusal: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleReset = () => {
    setConversationId(undefined);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: assistant.settings.greeting || 'Hi! How can I help you today?',
        timestamp: 'Just now',
      },
    ]);
  };

  const themeColor = assistant.settings.themeColor || '#2563eb';

  const widgetContent = (
    <div className="flex flex-col h-[520px] max-h-[85vh] w-full max-w-[380px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden font-sans">
      {/* Header */}
      <div
        className="px-4 py-3.5 text-white flex items-center justify-between shadow-xs select-none"
        style={{ backgroundColor: themeColor }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold leading-none truncate text-white">
              {assistant.settings.name || assistant.name}
            </h4>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-[10px] text-white/80 font-medium">Gemini 3.6 Flash RAG</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleReset}
            title="Reset conversation"
            className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {mode === 'floating' && (
            <button
              onClick={() => {
                setIsOpen(false);
                onClose?.();
              }}
              title="Close chat"
              className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Grounding Source Badge */}
      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-medium text-slate-600">Grounded in verified knowledge</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          {assistant.documentIds?.length || 0} source(s)
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 p-3.5 overflow-y-auto space-y-3.5 bg-slate-50/50">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-2xs ${
                msg.role === 'user'
                  ? 'text-white rounded-br-2xs'
                  : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-2xs'
              }`}
              style={msg.role === 'user' ? { backgroundColor: themeColor } : {}}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {/* Citations List if any */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Verified Sources:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.citations.map(c => (
                      <SourceCitation key={c.id} citation={c} compact />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200/80 max-w-[120px] shadow-2xs">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" />
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
            <span className="text-[10px] text-slate-400 font-medium ml-1">Searching...</span>
          </div>
        )}
      </div>

      {/* Suggested Questions */}
      {messages.length <= 2 && assistant.settings.suggestedQuestions && assistant.settings.suggestedQuestions.length > 0 && (
        <div className="p-2.5 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto scrollbar-none">
          {assistant.settings.suggestedQuestions.slice(0, 3).map((sq, i) => (
            <button
              key={i}
              onClick={() => handleSend(sq)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 whitespace-nowrap transition-colors cursor-pointer shrink-0 border border-slate-200/60"
            >
              {sq}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          placeholder={assistant.settings.placeholder || 'Ask a question based on uploaded docs...'}
          className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!inputVal.trim() || isTyping}
          className="p-2 rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer shadow-2xs"
          style={{ backgroundColor: themeColor }}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );

  if (mode === 'embedded') {
    return widgetContent;
  }

  // Floating Mode Trigger Button
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {isOpen && <div className="mb-3 animate-in fade-in slide-in-from-bottom-3 duration-200">{widgetContent}</div>}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-3 rounded-full text-white shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
        style={{ backgroundColor: themeColor }}
      >
        {isOpen ? (
          <ChevronDown className="w-5 h-5" />
        ) : (
          <>
            <Bot className="w-5 h-5" />
            <span className="text-xs font-bold tracking-tight">
              Chat with {assistant.settings.name || assistant.name}
            </span>
          </>
        )}
      </button>
    </div>
  );
};
