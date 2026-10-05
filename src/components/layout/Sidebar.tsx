import React from 'react';
import {
  LayoutDashboard,
  Bot,
  FileText,
  BarChart3,
  Settings,
  Sparkles,
  PlusCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Workspace } from '../../types';

export type NavigationPage =
  | 'landing'
  | 'overview'
  | 'assistants'
  | 'assistant_workspace'
  | 'create_assistant'
  | 'knowledge_base'
  | 'analytics'
  | 'settings';

export interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  workspace: Workspace;
  totalAssistants: number;
  onOpenCreateModal: () => void;
  className?: string;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  workspace,
  totalAssistants,
  onOpenCreateModal,
  className = '',
  isMobileOpen = false,
  onMobileClose,
}) => {
  const menuItems = [
    { id: 'overview' as NavigationPage, label: 'Overview', icon: LayoutDashboard },
    {
      id: 'assistants' as NavigationPage,
      label: 'Assistants',
      icon: Bot,
      badge: totalAssistants,
    },
    { id: 'knowledge_base' as NavigationPage, label: 'Knowledge Base', icon: FileText },
    { id: 'analytics' as NavigationPage, label: 'Analytics', icon: BarChart3 },
    { id: 'settings' as NavigationPage, label: 'Settings', icon: Settings },
  ];

  const handleItemClick = (page: NavigationPage) => {
    onNavigate(page);
    if (onMobileClose) onMobileClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0 transition-transform duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${className}`}
      >
        {/* Brand Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div
            onClick={() => handleItemClick('landing')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-white tracking-tight">KnowFlow</span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-400/30">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Enterprise Assistant Platform</p>
            </div>
          </div>
        </div>

        {/* Quick Action Button */}
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => {
              onOpenCreateModal();
              if (onMobileClose) onMobileClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs shadow-blue-600/30 transition-all cursor-pointer active:scale-98"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Create Assistant</span>
          </button>
        </div>

        {/* Main Navigation Menu */}
        <div className="flex-1 px-3 py-3 overflow-y-auto space-y-1">
          <div className="px-3 pb-1 pt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Workspace Platform
            </span>
          </div>

          {menuItems.map((item) => {
            const isActive =
              currentPage === item.id ||
              (item.id === 'assistants' &&
                (currentPage === 'assistant_workspace' || currentPage === 'create_assistant'));
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-blue-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Multi-tenant Workspace Badge & Plan Status */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/40">
          <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/60">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[11px] font-medium text-slate-400">Active Tenant</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {workspace.plan}
              </span>
            </div>
            <p className="text-xs font-semibold text-white truncate">{workspace.name}</p>
            <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">{workspace.memberCount} Team Members</span>
              <button
                onClick={() => handleItemClick('landing')}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
              >
                <span>Landing</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
