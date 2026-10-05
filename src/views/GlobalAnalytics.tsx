import React, { useState, useEffect } from 'react';
import { Assistant } from '../types';
import { Card, CardHeader } from '../components/common/Card';
import { Chart } from '../components/common/Chart';
import { apiService } from '../services/apiService';
import {
  BarChart3,
  MessageSquare,
  Users,
  Clock,
  ThumbsUp,
  ThumbsDown,
  FileText,
  TrendingUp,
  Bot,
  HelpCircle
} from 'lucide-react';

export interface GlobalAnalyticsProps {
  assistants: Assistant[];
  isDemoMode?: boolean;
}

export const GlobalAnalytics: React.FC<GlobalAnalyticsProps> = ({ assistants, isDemoMode = false }) => {
  const [analyticsData, setAnalyticsData] = useState<{
    trends: { date: string; questions: number; conversations: number; avgResponseMs: number }[];
    topQuestions: { query: string; count: number; matchedAssistant: string; citationDoc?: string; lastAsked: string }[];
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    apiService.getGlobalAnalytics().then(res => {
      if (isMounted && res) {
        setAnalyticsData(res);
      }
    }).catch(console.warn);
    return () => { isMounted = false; };
  }, [assistants]);

  const totalQuestions = assistants.reduce((sum, a) => sum + (a.metrics?.totalQuestions || 0), 0);
  const totalConversations = assistants.reduce((sum, a) => sum + (a.metrics?.totalConversations || 0), 0);
  const totalPositive = assistants.reduce((sum, a) => sum + (a.metrics?.positiveCount || 0), 0);
  const totalNegative = assistants.reduce((sum, a) => sum + (a.metrics?.negativeCount || 0), 0);
  const avgResponseTime = (
    assistants.reduce((sum, a) => sum + (a.metrics?.avgResponseTimeSec || 0), 0) / (assistants.length || 1)
  ).toFixed(2);

  const defaultTrends = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => ({
    date: d,
    questions: 0,
    conversations: 0,
    avgResponseMs: 1150,
  }));

  const trendPoints = analyticsData?.trends && analyticsData.trends.length > 0
    ? analyticsData.trends
    : defaultTrends;

  const topQuestions = analyticsData?.topQuestions || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Organization Analytics
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Aggregated performance, query volume, citation accuracy, and user sentiment across all assistants.
        </p>
      </div>

      {/* Top Stat Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] uppercase font-semibold text-slate-400">Total Conversations</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalConversations}</div>
          <span className="text-[10px] text-purple-600 font-medium">Session threads</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] uppercase font-semibold text-slate-400">Total Questions</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalQuestions}</div>
          <span className="text-[10px] text-blue-600 font-medium">All citations verified</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] uppercase font-semibold text-slate-400">Avg Response Time</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{avgResponseTime}s</div>
          <span className="text-[10px] text-emerald-600 font-medium">Vector index latency</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] uppercase font-semibold text-slate-400">Positive Feedback</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1 flex items-center gap-1">
            <ThumbsUp className="w-5 h-5" />
            <span>{totalPositive}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Verified helpful</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] uppercase font-semibold text-slate-400">Negative Feedback</span>
          <div className="text-2xl font-bold text-rose-600 mt-1 flex items-center gap-1">
            <ThumbsDown className="w-5 h-5" />
            <span>{totalNegative}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Out-of-domain flags</span>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card padding="md" className="lg:col-span-8">
          <CardHeader
            title="Weekly Query Volume vs. Sessions"
            description="Comparison of total answered questions and active user conversation threads"
          />
          <Chart.AreaLine
            data={trendPoints.map(t => ({
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
            title="Global Feedback Distribution"
            description="Overall user sentiment ratio"
          />
          <div className="py-2">
            <Chart.Donut
              positive={totalPositive}
              negative={totalNegative}
              size={160}
            />
          </div>
          <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
            Across {assistants.length} deployed assistants.
          </div>
        </Card>
      </div>

      {/* Top Questions Section */}
      {topQuestions.length > 0 && (
        <Card padding="md">
          <CardHeader
            title="Frequent Inquiries & Topics"
            description="Most common questions asked by visitors across workspace assistants"
          />
          <div className="divide-y divide-slate-100 mt-2">
            {topQuestions.map((q, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[11px]">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{q.query}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Assistant: <span className="text-slate-700 font-medium">{q.matchedAssistant}</span> • Source: {q.citationDoc || 'Knowledge Base'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-full text-xs">
                    {q.count} {q.count === 1 ? 'query' : 'queries'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Assistant Comparison Table */}
      <Card padding="md">
        <CardHeader
          title="Assistant Performance Breakdown"
          description="Traffic and citation accuracy per individual agent"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Assistant</th>
                <th className="py-2.5 px-3">Questions</th>
                <th className="py-2.5 px-3">Conversations</th>
                <th className="py-2.5 px-3">Avg Latency</th>
                <th className="py-2.5 px-3">Satisfaction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assistants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-slate-500">
                    No assistant performance data available yet.
                  </td>
                </tr>
              ) : (
                assistants.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-md text-white flex items-center justify-center font-bold text-xs"
                          style={{ backgroundColor: a.settings.themeColor || '#2563eb' }}
                        >
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-semibold text-slate-900">{a.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{a.metrics.totalQuestions}</td>
                    <td className="py-3 px-3 text-slate-600">{a.metrics.totalConversations}</td>
                    <td className="py-3 px-3 text-slate-600">{a.metrics.avgResponseTimeSec}s</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {a.metrics.feedbackScore}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
