import React, { useState, useEffect } from 'react';
import { Card, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Chart } from '../components/common/Chart';
import {
  Bot,
  FileText,
  MessageSquare,
  Clock,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  Sparkles,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  Calendar,
  Layers,
  HelpCircle
} from 'lucide-react';
import { Assistant, ActivityItem, Workspace } from '../types';
import { apiService } from '../services/apiService';

export interface DashboardOverviewProps {
  workspace: Workspace;
  assistants: Assistant[];
  totalDocuments: number;
  activities: ActivityItem[];
  isDemoMode?: boolean;
  onOpenCreateAssistant: () => void;
  onOpenAssistantWorkspace: (assistantId: string) => void;
  onNavigateAssistants: () => void;
  onNavigateKnowledge: () => void;
  onNavigateAnalytics: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  workspace,
  assistants,
  totalDocuments,
  activities,
  isDemoMode = false,
  onOpenCreateAssistant,
  onOpenAssistantWorkspace,
  onNavigateAssistants,
  onNavigateKnowledge,
  onNavigateAnalytics,
}) => {
  const [trends, setTrends] = useState<{ date: string; questions: number; conversations: number; avgResponseMs: number }[]>([]);

  useEffect(() => {
    let isMounted = true;
    if (!isDemoMode) {
      apiService.getGlobalAnalytics().then(res => {
        if (isMounted && res && res.trends) {
          setTrends(res.trends);
        }
      }).catch(console.warn);
    }
    return () => { isMounted = false; };
  }, [workspace.id, assistants, isDemoMode]);

  const defaultTrends = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => ({
    date: d,
    questions: 0,
    conversations: 0,
    avgResponseMs: 0,
  }));

  const chartData = (trends.length > 0 ? trends : defaultTrends).map(t => ({
    label: t.date,
    value: t.questions,
    secondaryValue: t.conversations,
  }));

  const totalQuestions = assistants.reduce((sum, a) => sum + (a.metrics?.totalQuestions || 0), 0);
  const totalConversations = assistants.reduce((sum, a) => sum + (a.metrics?.totalConversations || 0), 0);
  const avgResponseTimeSec = assistants.length > 0 && totalQuestions > 0
    ? (assistants.reduce((sum, a) => sum + (a.metrics?.avgResponseTimeSec || 0), 0) / assistants.length).toFixed(2)
    : null;

  // Stat cards with verified backend-derived data only (no fabricated trends)
  const statCards = [
    {
      title: 'Total Assistants',
      value: assistants.length.toString(),
      subtext: assistants.length === 0 ? 'No assistants created yet' : `${assistants.length} active agent${assistants.length === 1 ? '' : 's'}`,
      badge: assistants.length > 0 ? `${assistants.length} Active` : undefined,
      icon: Bot,
      color: 'blue',
      onClick: onNavigateAssistants,
    },
    {
      title: 'Knowledge Sources',
      value: totalDocuments.toString(),
      subtext: totalDocuments === 0 ? 'No documents uploaded yet' : `${totalDocuments} indexed document${totalDocuments === 1 ? '' : 's'}`,
      badge: totalDocuments > 0 ? 'Vector Ready' : undefined,
      icon: FileText,
      color: 'purple',
      onClick: onNavigateKnowledge,
    },
    {
      title: 'Questions Answered',
      value: totalQuestions.toLocaleString(),
      subtext: totalQuestions === 0 ? 'No queries answered yet' : `${totalConversations} conversation session${totalConversations === 1 ? '' : 's'}`,
      badge: totalQuestions > 0 ? 'Cited Answers' : undefined,
      icon: MessageSquare,
      color: 'emerald',
      onClick: onNavigateAnalytics,
    },
    {
      title: 'Average Latency',
      value: avgResponseTimeSec ? `${avgResponseTimeSec}s` : '—',
      subtext: avgResponseTimeSec ? 'Vector retrieval + answer' : 'Awaiting first query',
      badge: avgResponseTimeSec ? 'Grounded' : undefined,
      icon: Clock,
      color: 'amber',
      onClick: onNavigateAnalytics,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Workspace Overview
            </h1>
            {isDemoMode && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                Demo
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time status for <strong className="text-slate-800 font-semibold">{workspace.name}</strong> source-grounded knowledge assistants.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateKnowledge}
          >
            Upload PDF
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={PlusCircle}
            onClick={onOpenCreateAssistant}
            className="shadow-xs shadow-blue-600/30"
          >
            + Create Assistant
          </Button>
        </div>
      </div>

      {/* First-Time User Experience (FTUX) Guidance Card when 0 assistants exist */}
      {assistants.length === 0 && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-white border border-blue-200/80 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-blue-100/80 text-blue-800 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Welcome to Your Knowledge Workspace</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                How KnowFlow AI Works
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                A workspace is an isolated environment for your organization. Upload policy PDFs or guides to give your AI assistants accurate, verifiable grounding with page-level citations and zero hallucinations.
              </p>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row gap-3">
              <Button
                variant="primary"
                size="md"
                icon={PlusCircle}
                onClick={onOpenCreateAssistant}
              >
                Create First Assistant
              </Button>
              <Button
                variant="outline"
                size="md"
                icon={FileText}
                onClick={onNavigateKnowledge}
              >
                Upload Documents
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-blue-100">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                1
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900">Create an Assistant</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Name your agent and define its organizational domain and tone.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                2
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900">Upload Approved PDFs</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Handbooks and policies are parsed and indexed into vector chunks.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                3
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900">Deploy & Verify</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Embed the widget on your site or intranet with 1 line of script.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4 Dashboard Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              onClick={stat.onClick}
              className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {stat.title}
                  </span>
                  <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1.5 tracking-tight">
                    {stat.value}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform shadow-2xs">
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium truncate">{stat.subtext}</span>
                {stat.badge && (
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                    {stat.badge}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Recent Assistants + Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Assistants (Left / Main) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Recent Assistants
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage grounding settings, knowledge documents, and live deployments.
              </p>
            </div>
            {assistants.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                icon={ArrowRight}
                iconPosition="right"
                onClick={onNavigateAssistants}
              >
                View all
              </Button>
            )}
          </div>

          {assistants.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-xl p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">No assistants created yet</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4 max-w-sm mx-auto leading-relaxed">
                Create your first AI knowledge assistant and upload PDF documents to start serving verified, cited answers.
              </p>
              <Button variant="primary" size="sm" icon={PlusCircle} onClick={onOpenCreateAssistant}>
                Create Assistant
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {assistants.slice(0, 3).map((assistant) => (
                <div
                  key={assistant.id}
                  onClick={() => onOpenAssistantWorkspace(assistant.id)}
                  className="bg-white border border-slate-200/90 rounded-xl p-4.5 shadow-2xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div
                        className="w-7 h-7 rounded-lg text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs"
                        style={{ backgroundColor: assistant.settings?.themeColor || '#2563eb' }}
                      >
                        <Bot className="w-4 h-4" />
                      </div>
                      <Badge variant="success" size="sm" dot>
                        {assistant.status || 'Active'}
                      </Badge>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {assistant.name}
                    </h3>

                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {assistant.description || 'Grounded knowledge assistant'}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium text-slate-700">
                      {assistant.documentIds?.length || 0} docs
                    </span>
                    <span className="font-semibold text-slate-800">
                      {assistant.metrics?.totalQuestions || 0} questions
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Weekly Traffic & Query Volume Chart Card */}
          <Card padding="md">
            <CardHeader
              title="Query Traffic & Citation Volume"
              description="7-day distribution of source-grounded questions versus user sessions"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNavigateAnalytics}
                >
                  Deep Analytics
                </Button>
              }
            />
            <Chart.AreaLine
              data={chartData}
              primaryLabel="Questions"
              secondaryLabel="Conversations"
              height={200}
            />
          </Card>
        </div>

        {/* Right Column: Recent Activity Feed */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Recent Activity
            </h2>
            <span className="text-[11px] font-semibold text-slate-400">Live Audit Log</span>
          </div>

          <Card padding="sm" className="divide-y divide-slate-100">
            {activities.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No activity recorded yet</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  Audit events for document uploads, index builds, and queries will appear here automatically.
                </p>
              </div>
            ) : (
              activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="py-3 px-2 first:pt-1 last:pb-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-800 leading-snug">
                      {activity.title}
                    </p>
                    <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                      {activity.timestamp}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {activity.description}
                  </p>
                  {activity.assistantName && (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      <Bot className="w-2.5 h-2.5" />
                      {activity.assistantName}
                    </span>
                  )}
                </div>
              ))
            )}

            <div className="pt-3 px-2">
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-950">Embeddable Widget Ready</p>
                  <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                    Embed KnowFlow AI on your public or intranet site with 1 line of script.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
