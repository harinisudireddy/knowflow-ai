import React, { useState, useEffect, useCallback } from 'react';
import { ToastProvider, useToast } from './components/common/Toast';
import { Sidebar, NavigationPage } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LandingPage } from './views/LandingPage';
import { DashboardOverview } from './views/DashboardOverview';
import { AssistantsList } from './views/AssistantsList';
import { AssistantWorkspace } from './views/AssistantWorkspace';
import { CreateAssistantWizard } from './views/CreateAssistantWizard';
import { GlobalKnowledgeBase } from './views/GlobalKnowledgeBase';
import { GlobalAnalytics } from './views/GlobalAnalytics';
import { WorkspaceSettings } from './views/WorkspaceSettings';
import { AuthModal, AuthMode } from './views/AuthModal';
import { Modal } from './components/common/Modal';
import { Button } from './components/common/Button';
import { Widget } from './components/assistant/Widget';
import { mockService } from './services/mockDataService';
import { apiService } from './services/apiService';
import { Assistant, Workspace, DocumentItem, UserProfile } from './types';
import { AlertTriangle, Sparkles, LogIn, ArrowRight } from 'lucide-react';

const PROTECTED_PAGES: NavigationPage[] = [
  'overview',
  'assistants',
  'assistant_workspace',
  'create_assistant',
  'knowledge_base',
  'analytics',
  'settings',
];

function MainApp() {
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<NavigationPage>('landing');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [userWorkspaces, setUserWorkspaces] = useState<Workspace[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Data state
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>('');
  const [workspaceInitialTab, setWorkspaceInitialTab] = useState<string>('overview');

  // Auth & Session Modal state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authNotice, setAuthNotice] = useState<string | undefined>(undefined);
  const [returnToPage, setReturnToPage] = useState<NavigationPage | null>(null);
  const [isSessionExpiredOpen, setIsSessionExpiredOpen] = useState(false);

  // Mobile sidebar state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toast = useToast();

  const activeAssistant = assistants.find(a => a.id === selectedAssistantId) || assistants[0];

  // Refresh assistants, documents, and activities from backend
  const refreshData = useCallback(async () => {
    if (isDemoMode) {
      setAssistants(mockService.getAssistants());
      setDocuments(mockService.getDocuments());
      setActivities(mockService.getActivities());
      return;
    }

    try {
      const [realAssistants, realDocs, realActs] = await Promise.all([
        apiService.getAssistants().catch(() => null),
        apiService.getDocuments().catch(() => null),
        apiService.getActivities().catch(() => null),
      ]);

      if (realAssistants !== null && Array.isArray(realAssistants)) {
        setAssistants(realAssistants);
        if (realAssistants.length > 0) {
          if (!selectedAssistantId || !realAssistants.some(a => a.id === selectedAssistantId)) {
            setSelectedAssistantId(realAssistants[0].id);
          }
        } else {
          setSelectedAssistantId('');
        }
      }

      if (realDocs !== null && Array.isArray(realDocs)) {
        setDocuments(realDocs);
      }

      if (realActs !== null && Array.isArray(realActs)) {
        setActivities(realActs);
      }
    } catch {
      // Keep existing state on error
    }
  }, [isDemoMode, selectedAssistantId]);

  // Navigate safely with route protection and URL hash synchronization
  const navigateTo = useCallback((page: NavigationPage, replaceHash = false) => {
    const isProtected = PROTECTED_PAGES.includes(page);

    if (isProtected && !isAuthenticated && !isDemoMode) {
      setReturnToPage(page);
      setAuthNotice('Please sign in to access this workspace section.');
      setAuthMode('login');
      setIsAuthOpen(true);
      return;
    }

    setCurrentPage(page);
    if (page === 'landing') {
      if (window.location.hash) {
        history.replaceState(null, '', window.location.pathname);
      }
    } else {
      const newHash = `#${page}`;
      if (replaceHash) {
        history.replaceState(null, '', newHash);
      } else {
        window.location.hash = page;
      }
    }
  }, [isAuthenticated, isDemoMode]);

  // Handle URL hash routing
  const handleHashChange = useCallback(() => {
    const hash = window.location.hash.replace(/^#\/?/, '').trim();

    if (!hash || hash === 'landing') {
      setCurrentPage('landing');
      return;
    }

    if (hash === 'demo') {
      setIsDemoMode(true);
      setCurrentWorkspace(mockService.getCurrentWorkspace());
      setUserWorkspaces(mockService.getWorkspaces());
      setCurrentPage('overview');
      return;
    }

    if (hash === 'login') {
      if (isAuthenticated) {
        navigateTo('overview', true);
      } else {
        setAuthMode('login');
        setIsAuthOpen(true);
      }
      return;
    }

    if (hash === 'signup') {
      if (isAuthenticated) {
        navigateTo('overview', true);
      } else {
        setAuthMode('signup');
        setIsAuthOpen(true);
      }
      return;
    }

    if (PROTECTED_PAGES.includes(hash as NavigationPage)) {
      navigateTo(hash as NavigationPage, true);
    }
  }, [isAuthenticated, navigateTo]);

  // Listen to hash changes (browser Back/Forward navigation)
  useEffect(() => {
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [handleHashChange]);

  // Session expiration listener
  useEffect(() => {
    const unsubscribe = apiService.onSessionExpired(() => {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setIsSessionExpiredOpen(true);
    });
    return unsubscribe;
  }, []);

  // Initial authentication & workspace boot
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const token = apiService.getToken();
      if (!token) {
        if (isMounted) {
          setIsAuthenticated(false);
          setIsAuthChecking(false);
          handleHashChange();
        }
        return;
      }

      try {
        const authData = await apiService.getCurrentUser();
        if (!isMounted) return;

        if (authData?.user) {
          setCurrentUser(authData.user);
          setIsAuthenticated(true);
          setIsDemoMode(false);
        }
        if (authData?.workspace) {
          setCurrentWorkspace(authData.workspace);
        }
        if (authData?.workspaces && authData.workspaces.length > 0) {
          setUserWorkspaces(authData.workspaces);
        }

        const hash = window.location.hash.replace(/^#\/?/, '').trim();
        if (PROTECTED_PAGES.includes(hash as NavigationPage)) {
          setCurrentPage(hash as NavigationPage);
        } else {
          setCurrentPage('overview');
          window.location.hash = 'overview';
        }
      } catch {
        if (isMounted) {
          setIsAuthenticated(false);
          apiService.clearToken();
          handleHashChange();
        }
      } finally {
        if (isMounted) {
          setIsAuthChecking(false);
          refreshData();
        }
      }
    }

    initAuth();
    return () => { isMounted = false; };
  }, [refreshData, handleHashChange]);

  // When demo mode changes, refresh data
  useEffect(() => {
    if (isDemoMode) {
      refreshData();
    }
  }, [isDemoMode, refreshData]);

  const handleSelectWorkspace = (ws: Workspace) => {
    apiService.setActiveWorkspaceId(ws.id);
    setCurrentWorkspace(ws);
    toast.info('Workspace switched', `Switched to ${ws.name}`);
    refreshData();
  };

  const handleOpenWorkspace = (assistantId: string, initialTab: string = 'overview') => {
    setSelectedAssistantId(assistantId);
    setWorkspaceInitialTab(initialTab);
    navigateTo('assistant_workspace');
  };

  const handleDeleteAssistant = async (assistantId: string) => {
    try {
      await apiService.deleteAssistant(assistantId);
      toast.info('Assistant deleted', 'Assistant and its knowledge vectors removed');
    } catch (err: any) {
      toast.error('Delete failed', err.message);
    }
    await refreshData();
    if (selectedAssistantId === assistantId) {
      setSelectedAssistantId('');
    }
  };

  const handleAssistantCreated = (newAssistant: Assistant) => {
    refreshData();
    setSelectedAssistantId(newAssistant.id);
    setWorkspaceInitialTab('overview');
    navigateTo('assistant_workspace');
  };

  const handleUpdateAssistant = (updated: Assistant) => {
    setAssistants(prev => prev.map(a => (a.id === updated.id ? updated : a)));
    refreshData();
  };

  const handleSignOut = async () => {
    try {
      await apiService.logout();
    } catch {
      // Continue client cleanup
    }
    setIsAuthenticated(false);
    setIsDemoMode(false);
    setCurrentUser(null);
    setCurrentWorkspace(null);
    setUserWorkspaces([]);
    setAssistants([]);
    setDocuments([]);
    setActivities([]);
    toast.info('Signed out', 'You have been signed out of your workspace');
    navigateTo('landing');
  };

  const handleAuthSuccess = async () => {
    setIsDemoMode(false);
    try {
      const authData = await apiService.getCurrentUser();
      if (authData?.user) {
        setCurrentUser(authData.user);
        setIsAuthenticated(true);
      }
      if (authData?.workspace) {
        setCurrentWorkspace(authData.workspace);
      }
      if (authData?.workspaces) {
        setUserWorkspaces(authData.workspaces);
      }
    } catch {
      // Ignore
    }

    await refreshData();

    // Return to preserved route if safe, else overview
    if (returnToPage && PROTECTED_PAGES.includes(returnToPage)) {
      const target = returnToPage;
      setReturnToPage(null);
      navigateTo(target);
    } else {
      navigateTo('overview');
    }
  };

  const handleEnterDemoMode = () => {
    setIsDemoMode(true);
    setCurrentWorkspace(mockService.getCurrentWorkspace());
    setUserWorkspaces(mockService.getWorkspaces());
    setCurrentPage('overview');
    window.location.hash = 'demo';
    toast.info('Demo Mode Active', 'You are exploring the interactive demo sandbox.');
  };

  const handleExitDemoMode = () => {
    setIsDemoMode(false);
    setAssistants([]);
    setDocuments([]);
    setActivities([]);
    setCurrentWorkspace(null);
    navigateTo('landing');
    toast.info('Demo Closed', 'Returned to public landing.');
  };

  // Loading Screen while authenticating
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 animate-pulse mb-4">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="text-slate-800 font-semibold text-sm">Loading KnowFlow AI...</div>
        <p className="text-xs text-slate-400 mt-1">Verifying organization workspace session</p>
      </div>
    );
  }

  // Active workspace fallback for demo or empty state
  const effectiveWorkspace = currentWorkspace || {
    id: 'ws-new',
    name: 'My Organization Workspace',
    slug: 'my-org',
    plan: 'Professional',
    memberCount: 1,
    avatarLetter: 'M',
  };

  // If on Landing Page, render the dedicated landing view
  if (currentPage === 'landing') {
    return (
      <div className="relative min-h-screen bg-slate-50">
        <LandingPage
          isAuthenticated={isAuthenticated}
          onEnterDashboard={() => navigateTo('overview')}
          onOpenCreateAssistant={() => {
            if (isAuthenticated) {
              navigateTo('create_assistant');
            } else {
              setReturnToPage('create_assistant');
              setAuthMode('signup');
              setIsAuthOpen(true);
            }
          }}
          onOpenAuth={(mode) => {
            setAuthNotice(undefined);
            setAuthMode(mode);
            setIsAuthOpen(true);
          }}
          onOpenDemo={handleEnterDemoMode}
        />

        {/* Global Floating Chat Widget Preview on Landing Page */}
        {activeAssistant && (
          <Widget assistant={activeAssistant} mode="floating" defaultOpen={false} />
        )}

        <AuthModal
          isOpen={isAuthOpen}
          initialMode={authMode}
          noticeMessage={authNotice}
          onClose={() => {
            setIsAuthOpen(false);
            setAuthNotice(undefined);
          }}
          onSuccess={handleAuthSuccess}
        />
      </div>
    );
  }

  // Otherwise, render full SaaS Dashboard Layout
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 flex-col">
      {/* Persistent Demo Warning Banner */}
      {isDemoMode && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-medium flex items-center justify-between shadow-xs sticky top-0 z-50">
          <div className="flex items-center gap-2 max-w-3xl">
            <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />
            <span>
              <strong>Demo Sandbox Mode:</strong> You are viewing an isolated, read-only demo workspace with simulated university policies. Real changes require an organization account.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setAuthNotice('Create an account to deploy your own private knowledge assistant.');
                setAuthMode('signup');
                setIsAuthOpen(true);
              }}
              className="px-2.5 py-1 rounded bg-slate-950 text-white hover:bg-slate-800 text-[11px] font-semibold transition-colors cursor-pointer"
            >
              Create Free Workspace
            </button>
            <button
              onClick={handleExitDemoMode}
              className="px-2 py-1 rounded text-slate-900 hover:text-slate-950 hover:bg-amber-400 text-[11px] font-semibold transition-colors cursor-pointer"
            >
              Exit Demo
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* SaaS Sidebar */}
        <Sidebar
          currentPage={currentPage}
          onNavigate={(page) => navigateTo(page)}
          workspace={effectiveWorkspace}
          totalAssistants={assistants.length}
          onOpenCreateModal={() => navigateTo('create_assistant')}
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header
            currentWorkspace={effectiveWorkspace}
            workspaces={userWorkspaces.length > 0 ? userWorkspaces : [effectiveWorkspace]}
            onSelectWorkspace={handleSelectWorkspace}
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
            user={currentUser || undefined}
            isDemoMode={isDemoMode}
            onExitDemo={handleExitDemoMode}
            onSignOut={handleSignOut}
            onOpenAuth={(mode) => {
              setAuthNotice(undefined);
              setAuthMode(mode);
              setIsAuthOpen(true);
            }}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {/* DASHBOARD OVERVIEW */}
            {currentPage === 'overview' && (
              <DashboardOverview
                workspace={effectiveWorkspace}
                assistants={assistants}
                totalDocuments={documents.length}
                activities={activities}
                isDemoMode={isDemoMode}
                onOpenCreateAssistant={() => navigateTo('create_assistant')}
                onOpenAssistantWorkspace={(id) => handleOpenWorkspace(id, 'overview')}
                onNavigateAssistants={() => navigateTo('assistants')}
                onNavigateKnowledge={() => navigateTo('knowledge_base')}
                onNavigateAnalytics={() => navigateTo('analytics')}
              />
            )}

            {/* ASSISTANTS MANAGEMENT PAGE */}
            {currentPage === 'assistants' && (
              <AssistantsList
                assistants={assistants}
                isDemoMode={isDemoMode}
                onOpenWorkspace={handleOpenWorkspace}
                onOpenCreateModal={() => navigateTo('create_assistant')}
                onDeleteAssistant={handleDeleteAssistant}
              />
            )}

            {/* CREATE ASSISTANT WIZARD */}
            {currentPage === 'create_assistant' && (
              <CreateAssistantWizard
                existingDocuments={documents}
                onFinish={handleAssistantCreated}
                onCancel={() => navigateTo('assistants')}
              />
            )}

            {/* ASSISTANT WORKSPACE (6 Contextual Tabs) */}
            {currentPage === 'assistant_workspace' && activeAssistant && (
              <AssistantWorkspace
                assistant={activeAssistant}
                initialTab={workspaceInitialTab}
                isDemoMode={isDemoMode}
                onBack={() => navigateTo('assistants')}
                onUpdateAssistant={handleUpdateAssistant}
                onRefreshData={refreshData}
              />
            )}

            {/* GLOBAL KNOWLEDGE BASE */}
            {currentPage === 'knowledge_base' && (
              <GlobalKnowledgeBase
                documents={documents}
                isDemoMode={isDemoMode}
                onRefresh={refreshData}
              />
            )}

            {/* GLOBAL ANALYTICS */}
            {currentPage === 'analytics' && (
              <GlobalAnalytics assistants={assistants} isDemoMode={isDemoMode} />
            )}

            {/* WORKSPACE SETTINGS */}
            {currentPage === 'settings' && (
              <WorkspaceSettings
                workspace={effectiveWorkspace}
                currentUser={currentUser || undefined}
                isDemoMode={isDemoMode}
                onUpdateWorkspace={(ws) => {
                  setCurrentWorkspace(ws);
                }}
              />
            )}
          </main>
        </div>
      </div>

      {/* Floating Widget Preview (available throughout the app except inside the assistant workspace where dedicated playground exists) */}
      {activeAssistant && currentPage !== 'assistant_workspace' && (
        <Widget assistant={activeAssistant} mode="floating" defaultOpen={false} />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        initialMode={authMode}
        noticeMessage={authNotice}
        onClose={() => {
          setIsAuthOpen(false);
          setAuthNotice(undefined);
        }}
        onSuccess={handleAuthSuccess}
      />

      {/* Session Expired Modal */}
      <Modal
        isOpen={isSessionExpiredOpen}
        onClose={() => setIsSessionExpiredOpen(false)}
        title="Session Expired"
        description="Your organization session has timed out."
        maxWidth="sm"
        footer={
          <Button
            variant="primary"
            size="sm"
            icon={LogIn}
            onClick={() => {
              setIsSessionExpiredOpen(false);
              setAuthNotice('Please sign in to resume your active session.');
              setAuthMode('login');
              setIsAuthOpen(true);
            }}
          >
            Sign In Again
          </Button>
        }
      >
        <div className="py-2 text-xs text-slate-600 space-y-2">
          <p>
            For your security and multi-tenant data protection, authenticated sessions expire after inactivity.
          </p>
          <p>
            Please re-authenticate to continue working in your workspace.
          </p>
        </div>
      </Modal>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
