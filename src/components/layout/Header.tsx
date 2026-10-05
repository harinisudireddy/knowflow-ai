import React, { useState, useEffect } from 'react';
import {
  Search,
  Bell,
  ChevronDown,
  Building2,
  Check,
  LogOut,
  User,
  Shield,
  Menu,
  Sparkles,
  Info
} from 'lucide-react';
import { Workspace, UserProfile } from '../../types';
import { UserAvatar } from '../common/UserAvatar';

export interface HeaderProps {
  currentWorkspace: Workspace;
  workspaces: Workspace[];
  onSelectWorkspace: (ws: Workspace) => void;
  onOpenMobileMenu?: () => void;
  onSearch?: (query: string) => void;
  onOpenAuth?: (mode: 'login' | 'signup') => void;
  onSignOut?: () => void;
  onOpenNotifications?: () => void;
  user?: UserProfile;
  isDemoMode?: boolean;
  onExitDemo?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentWorkspace,
  workspaces,
  onSelectWorkspace,
  onOpenMobileMenu,
  onSearch,
  onOpenAuth,
  onSignOut,
  user,
  isDemoMode = false,
  onExitDemo,
}) => {
  const [isWsMenuOpen, setIsWsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  // Close menus on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsWsMenuOpen(false);
        setIsProfileMenuOpen(false);
        setIsNotifOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const notifications = [
    { id: 1, title: 'Knowledge Engine Ready', text: 'All active documents are indexed and ready for retrieval.', time: 'Active', unread: false },
    { id: 2, title: 'Workspace Protection', text: 'Multi-tenant isolation and verified citations active.', time: 'Live', unread: false },
  ];

  const displayName = user?.name || (isDemoMode ? 'Demo Evaluator' : 'Workspace Member');
  const displayRole = user?.role || (isDemoMode ? 'Interactive Sandbox' : 'Member');
  const displayEmail = user?.email || (isDemoMode ? 'demo@knowflow.internal' : '');

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Workspace Switcher */}
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Multi-Tenant Workspace Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsWsMenuOpen(!isWsMenuOpen)}
            aria-label="Switch organization workspace"
            aria-expanded={isWsMenuOpen}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 text-xs font-semibold text-slate-800 transition-all cursor-pointer shadow-2xs"
          >
            <div className={`w-5 h-5 rounded-md ${isDemoMode ? 'bg-amber-600' : 'bg-blue-600'} text-white flex items-center justify-center text-[10px] font-bold`}>
              {currentWorkspace.avatarLetter || currentWorkspace.name.charAt(0) || 'W'}
            </div>
            <span className="max-w-[140px] sm:max-w-[200px] truncate">{currentWorkspace.name}</span>
            {isDemoMode && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1 rounded uppercase">Demo</span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isWsMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setIsWsMenuOpen(false)}
              />
              <div className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Switch Organization Workspace
                  </p>
                </div>
                {workspaces.map(ws => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      onSelectWorkspace(ws);
                      setIsWsMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-6 h-6 rounded bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                        {ws.avatarLetter || ws.name.charAt(0)}
                      </div>
                      <div className="truncate">
                        <p className="font-semibold text-slate-900 truncate">{ws.name}</p>
                        <p className="text-[10px] text-slate-400">{ws.plan || 'Free'} Plan</p>
                      </div>
                    </div>
                    {ws.id === currentWorkspace.id && (
                      <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Center: Search Bar */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchVal}
            onChange={(e) => {
              setSearchVal(e.target.value);
              if (onSearch) onSearch(e.target.value);
            }}
            placeholder="Search assistants, documents, citations..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Right: Actions, Demo Mode Switch, and User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {isDemoMode && onExitDemo && (
          <button
            onClick={onExitDemo}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
          >
            Create Free Account
          </button>
        )}

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Notifications"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
          </button>

          {isNotifOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setIsNotifOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-2">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900">Notifications</span>
                  <span className="text-[10px] text-blue-600 font-semibold cursor-pointer">All systems operational</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                        <span className="text-[10px] text-slate-400 shrink-0">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{n.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            aria-expanded={isProfileMenuOpen}
            aria-label="User profile menu"
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <UserAvatar name={displayName} avatarUrl={user?.avatar} size="sm" />
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-slate-900 leading-none">{displayName}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{displayRole}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {isProfileMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setIsProfileMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5">
                <div className="px-3.5 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-900">{displayName}</p>
                  {displayEmail && (
                    <p className="text-[11px] text-slate-500 truncate">{displayEmail}</p>
                  )}
                </div>

                <div className="py-1">
                  {isDemoMode ? (
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (onOpenAuth) onOpenAuth('signup');
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-blue-600 hover:bg-blue-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Create Real Workspace</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          if (onOpenAuth) onOpenAuth('login');
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Switch Account</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          if (onOpenAuth) onOpenAuth('signup');
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                      >
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>Create New Organization</span>
                      </button>
                    </>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      if (isDemoMode && onExitDemo) {
                        onExitDemo();
                      } else if (onSignOut) {
                        onSignOut();
                      } else if (onOpenAuth) {
                        onOpenAuth('login');
                      }
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    <span>{isDemoMode ? 'Exit Demo' : 'Sign Out'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

