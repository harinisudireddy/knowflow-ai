import React from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileText,
  Code2,
  Users,
  CheckCircle2,
  Bot,
  ExternalLink,
  ChevronRight,
  Layers,
  Quote,
  Clock
} from 'lucide-react';
import { Button } from '../components/common/Button';

export interface LandingPageProps {
  isAuthenticated?: boolean;
  onEnterDashboard: () => void;
  onOpenCreateAssistant: () => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onOpenDemo?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  isAuthenticated = false,
  onEnterDashboard,
  onOpenCreateAssistant,
  onOpenAuth,
  onOpenDemo,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold tracking-tight text-slate-900">KnowFlow</span>
              <span className="text-[11px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                AI
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Features
            </a>
            <a href="#citations" className="hover:text-slate-900 transition-colors">
              Source Citations
            </a>
            <a href="#deployment" className="hover:text-slate-900 transition-colors">
              Web Deployment
            </a>
            {onOpenDemo && (
              <button
                type="button"
                onClick={onOpenDemo}
                className="hover:text-blue-600 transition-colors cursor-pointer text-xs font-medium"
              >
                Interactive Demo
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button
                variant="primary"
                size="sm"
                onClick={onEnterDashboard}
              >
                Open Workspace
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenAuth('login')}
                >
                  Log in
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onOpenAuth('signup')}
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-14 pb-20 sm:pt-20 sm:pb-28 bg-gradient-to-b from-white to-slate-50 border-b border-slate-200/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          {/* Tag Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-6 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>Next-Generation Knowledge Grounding Engine</span>
          </div>

          {/* Exact required headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.15]">
            Build AI Assistants That Know Your Organization
          </h1>

          {/* Exact required subtitle theme */}
          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Organizations can connect their approved knowledge and deploy source-grounded AI assistants. Guarantee zero hallucinations with page-level PDF citations and full multi-tenant governance.
          </p>

          {/* Action buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Button
              size="lg"
              variant="primary"
              icon={Sparkles}
              onClick={() => {
                if (isAuthenticated) {
                  onOpenCreateAssistant();
                } else {
                  onOpenAuth('signup');
                }
              }}
              className="w-full sm:w-auto shadow-md shadow-blue-600/20"
            >
              {isAuthenticated ? 'Create Assistant' : 'Create Free Workspace'}
            </Button>
            {onOpenDemo && (
              <Button
                size="lg"
                variant="outline"
                icon={ArrowRight}
                iconPosition="right"
                onClick={onOpenDemo}
                className="w-full sm:w-auto"
              >
                Explore Live Demo
              </Button>
            )}
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> PDF Document Grounding
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Page Citations
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 1-Line Embed Script
            </span>
          </div>
        </div>

        {/* HERO PRODUCT PREVIEW */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-14">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-2xl shadow-slate-200/50">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/75 rounded-t-xl mb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="ml-2 text-xs font-mono text-slate-400">
                  knowflow-ai.app/workspace/university-support
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium text-[10px]">
                  INDEXED & READY
                </span>
              </div>
            </div>

            {/* Mocked Split Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-2">
              {/* Left Column: Knowledge Sources */}
              <div className="lg:col-span-4 border border-slate-200/80 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Approved Knowledge Base
                    </span>
                    <span className="text-[11px] font-semibold text-blue-600">3 PDFs</span>
                  </div>

                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs shadow-2xs">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-slate-800">Student Handbook.pdf</span>
                      </div>
                      <span className="text-[10px] text-slate-400">48 pgs</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs shadow-2xs">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-slate-800">University FAQ.pdf</span>
                      </div>
                      <span className="text-[10px] text-slate-400">22 pgs</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs shadow-2xs">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-slate-800">Academic Regulations.pdf</span>
                      </div>
                      <span className="text-[10px] text-slate-400">36 pgs</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Strict Guardrails Active</span>
                  </div>
                  <p className="text-[11px] mt-1 text-slate-500">
                    Refuses out-of-domain questions to ensure academic compliance.
                  </p>
                </div>
              </div>

              {/* Right Column: Grounded Chat Output */}
              <div className="lg:col-span-8 border border-slate-200/80 rounded-xl p-4 bg-white flex flex-col justify-between">
                <div className="space-y-3.5">
                  {/* User query */}
                  <div className="flex justify-end">
                    <div className="bg-slate-900 text-white text-xs sm:text-sm px-4 py-2.5 rounded-2xl rounded-tr-xs max-w-md">
                      What is the refund policy?
                    </div>
                  </div>

                  {/* Assistant grounded answer */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-2xs">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="flex-1 bg-slate-50 border border-slate-200/80 rounded-2xl rounded-tl-xs p-4 text-xs sm:text-sm">
                      <p className="text-slate-900 font-normal leading-relaxed">
                        The refund policy allows eligible users to request a refund within 30 days of the term start date. Standard course fee refunds are processed according to the tiered withdrawal schedule.
                      </p>

                      {/* Source Citations */}
                      <div className="mt-3 pt-2.5 border-t border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                          Sources
                        </span>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-700 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-2xs">
                            <span className="font-bold text-blue-600">[1]</span>
                            <span className="font-medium">Student Handbook.pdf</span>
                            <span className="text-slate-400">— Page 12</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-700 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-2xs">
                            <span className="font-bold text-blue-600">[2]</span>
                            <span className="font-medium">University FAQ.pdf</span>
                            <span className="text-slate-400">— Page 4</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Latency: 0.82s
                  </span>
                  <button
                    onClick={onEnterDashboard}
                    className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Test in Interactive Playground</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CORE 4 FEATURE PILLARS (Requested in Prompt) */}
      <section id="features" className="py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">
              Engineered For Truth & Compliance
            </h2>
            <p className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Four Core Pillars of Enterprise Knowledge
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Transform unstructured company documents into interactive, reliable AI assistants ready to embed across your digital footprint.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. Knowledge-based AI */}
            <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 transition-all hover:shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-5 shadow-2xs">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">Knowledge-Based AI</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Connect verified PDF documents, policy handbooks, and standard operating procedures directly into your assistant's boundary.
              </p>
            </div>

            {/* 2. Source citations */}
            <div id="citations" className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 transition-all hover:shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mb-5 shadow-2xs">
                <Quote className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">Source Citations</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every generated response includes exact document filenames and page numbers, enabling auditability and student/employee trust.
              </p>
            </div>

            {/* 3. Multi-tenant workspaces */}
            <div id="workspaces" className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 transition-all hover:shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-5 shadow-2xs">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">Multi-Tenant Workspaces</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Isolate data silos across departments, campuses, or client organizations with role-based access control and workspace scoping.
              </p>
            </div>

            {/* 4. Website deployment */}
            <div id="deployment" className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 transition-all hover:shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-5 shadow-2xs">
                <Code2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">Website Deployment</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Copy a single script snippet into your HTML before the closing body tag. Launch an intelligent floating assistant anywhere in seconds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION BANNER */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ready to ground your organization's AI?
          </h2>
          <p className="mt-3 text-slate-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            Create an assistant, upload your first PDF handbook, and test source-grounded answers immediately.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              variant="primary"
              icon={Sparkles}
              onClick={onOpenCreateAssistant}
              className="bg-blue-600 hover:bg-blue-500 w-full sm:w-auto"
            >
              Create Assistant Now
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={onEnterDashboard}
              className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700 w-full sm:w-auto"
            >
              Explore Live Workspace
            </Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 bg-white border-t border-slate-200 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-slate-800">KnowFlow AI</span>
            <span>— Enterprise AI Knowledge Assistant Platform</span>
          </div>
          <p>© 2026 KnowFlow AI Inc. Designed for university & enterprise software demonstration.</p>
        </div>
      </footer>
    </div>
  );
};
