'use client';

/**
 * Main page component that renders the MindNode Canvas with workspace management
 * 
 * Implements:
 * - Task 14.3: Workspace switching logic integration
 * - Task 16.3: Export UI integration
 * - Task 17.3: Load user session on app initialization
 * - Task 20.1: Full component integration with proper data flow
 * - Task 20.3: Responsive design with mobile compatibility
 * 
 * Requirements:
 * - 1.5: Support touch gestures for pan and zoom on mobile devices
 * - 7.2: Load workspace node tree and canvas state when switching
 * - 7.5: Display list of all user workspaces
 * - 10.5: Display sync status indicator
 * - 11.4: Provide download link for Markdown file
 * - 11.5: Support exporting individual branches
 * - 12.3: Only display workspaces owned by authenticated user
 * - 15.3: Display connection status warning
 */

import { useEffect, useState, useCallback } from 'react';
import { 
  CanvasWorkspace, 
  WorkspaceSidebar, 
  ExportButton, 
  LogoutButton,
  SyncStatusIndicator,
  ConnectionIndicator,
  ErrorNotification,
  PageSkeleton,
  LoadingOverlay,
  SlideTransition,
} from '../components';
import { MindNode } from '../types';
import { useMindNodeStore } from '../store';
import { useWorkspaces, usePersistence } from '../hooks';
import { useAuth } from '@/lib/auth/AuthProvider';

// Demo workspace ID for development fallback
const DEMO_WORKSPACE_ID = 'demo-workspace';

// Breakpoint for mobile detection
const MOBILE_BREAKPOINT = 768;

// Initial demo node for testing
const createInitialNode = (workspaceId: string): MindNode => ({
  id: 'root-node',
  workspaceId,
  parentId: null,
  type: 'root',
  data: {
    label: 'Welcome to MindNode Canvas',
    contextContent: 'Welcome to MindNode Canvas\n\nThis is your starting point. Press Tab to create a child node, or Enter to create a sibling.',
  },
  position: { x: 100, y: 200 },
  createdAt: new Date(),
  updatedAt: new Date(),
});

/**
 * Custom hook for responsive design
 * Requirements: 1.5 - Mobile compatibility
 */
function useResponsive() {
  const [isMobile, setIsMobile] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setWindowSize({ width, height });
      setIsMobile(width < MOBILE_BREAKPOINT);
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { isMobile, windowSize };
}

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const { user, isLoading: isAuthLoading } = useAuth();
  const { nodes, setNodes, setCurrentWorkspace, selectedNodeId } = useMindNodeStore();
  
  // Responsive design hook
  // Requirements: 1.5 - Mobile compatibility
  const { isMobile, windowSize } = useResponsive();
  
  // Persistence hook for sync status and data persistence
  // Requirements: 10.1, 10.2, 10.4, 10.5
  const { flushAll } = usePersistence();
  
  // Use workspace management hook with actual user ID
  const {
    workspaces,
    currentWorkspaceId,
    isLoading,
    isSwitching,
    error,
    switchWorkspace,
    createWorkspace,
    deleteWorkspace,
  } = useWorkspaces({
    userId: user?.id || '',
    autoLoad: !!user?.id,
  });

  // Ensure we're on the client side before rendering React Flow
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Auto-collapse sidebar on mobile
  // Requirements: 1.5 - Optimize for different screen sizes
  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  }, [isMobile]);

  // Flush pending changes before page unload
  // Requirements: 10.1 - Ensure data is saved
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushAll();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [flushAll]);

  // Initialize with demo workspace if no workspaces exist and not loading
  useEffect(() => {
    if (isClient && !isLoading && !isAuthLoading && user && workspaces.length === 0 && !currentWorkspaceId) {
      // Fall back to demo mode
      setCurrentWorkspace(DEMO_WORKSPACE_ID);
      if (nodes.length === 0) {
        setNodes([createInitialNode(DEMO_WORKSPACE_ID)]);
      }
    }
  }, [isClient, isLoading, isAuthLoading, user, workspaces.length, currentWorkspaceId, nodes.length, setCurrentWorkspace, setNodes]);

  // Handle workspace selection
  const handleWorkspaceSelect = useCallback((workspaceId: string) => {
    switchWorkspace(workspaceId);
  }, [switchWorkspace]);

  // Handle workspace creation
  const handleWorkspaceCreate = useCallback((title: string) => {
    createWorkspace(title);
  }, [createWorkspace]);

  // Handle workspace deletion
  const handleWorkspaceDelete = useCallback((workspaceId: string) => {
    deleteWorkspace(workspaceId);
  }, [deleteWorkspace]);

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setMobileMenuOpen(prev => !prev);
    } else {
      setSidebarCollapsed(prev => !prev);
    }
  }, [isMobile]);

  // Close mobile menu when workspace is selected
  const handleWorkspaceSelectMobile = useCallback((workspaceId: string) => {
    switchWorkspace(workspaceId);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  }, [switchWorkspace, isMobile]);

  if (!isClient || isAuthLoading) {
    return <PageSkeleton />;
  }

  return (
    <main className="w-screen h-screen overflow-hidden flex flex-col md:flex-row">
      {/* Global Error Notification - Requirements: 15.2 */}
      <ErrorNotification />
      
      {/* Connection Status Indicator - Requirements: 15.3 */}
      <ConnectionIndicator />
      
      {/* Mobile Header - Requirements: 1.5 */}
      {isMobile && (
        <div className="flex-shrink-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-40">
          {/* Menu button */}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Title */}
          <span className="text-sm font-medium text-gray-800 truncate max-w-[150px]">
            {workspaces.find(w => w.id === currentWorkspaceId)?.title || 'MindNode Canvas'}
          </span>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            <SyncStatusIndicator showText={false} showPendingCount={false} />
            <ExportButton
              nodes={nodes}
              workspaceTitle={workspaces.find(w => w.id === currentWorkspaceId)?.title}
              selectedNodeId={selectedNodeId}
              disabled={isSwitching}
              compact={true}
            />
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay - Requirements: 1.5 */}
      {isMobile && mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Sidebar */}
          <div className="fixed left-0 top-0 bottom-0 w-72 z-50 bg-white shadow-xl">
            <WorkspaceSidebar
              workspaces={workspaces}
              currentWorkspaceId={currentWorkspaceId}
              isLoading={isLoading}
              onWorkspaceSelect={handleWorkspaceSelectMobile}
              onWorkspaceCreate={handleWorkspaceCreate}
              onWorkspaceDelete={handleWorkspaceDelete}
            />
            {/* Close button */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </>
      )}

      {/* Desktop Sidebar toggle button (visible when collapsed) */}
      {!isMobile && sidebarCollapsed && (
        <button
          onClick={toggleSidebar}
          className="absolute left-0 top-4 z-50 p-2 bg-white border border-gray-200 rounded-r-lg shadow-md hover:bg-gray-50 transition-colors"
          title="Show workspaces"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Desktop Workspace Sidebar with slide transition */}
      {!isMobile && (
        <SlideTransition show={!sidebarCollapsed} direction="left" duration={200}>
          <div className="relative w-64 flex-shrink-0 h-full">
            <WorkspaceSidebar
              workspaces={workspaces}
              currentWorkspaceId={currentWorkspaceId}
              isLoading={isLoading}
              onWorkspaceSelect={handleWorkspaceSelect}
              onWorkspaceCreate={handleWorkspaceCreate}
              onWorkspaceDelete={handleWorkspaceDelete}
            />
            {/* Collapse button */}
            <button
              onClick={toggleSidebar}
              className="absolute right-0 top-4 translate-x-1/2 z-10 p-1.5 bg-white border border-gray-200 rounded-full shadow-md hover:bg-gray-50 transition-colors"
              title="Hide workspaces"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </SlideTransition>
      )}

      {/* Main Canvas Area */}
      <div className="flex-1 relative min-h-0">
        {/* Desktop Workspace Toolbar */}
        {!isMobile && (
          <div className="absolute top-4 right-4 z-30 flex items-center gap-2 flex-wrap justify-end">
            {/* Sync Status Indicator - Requirements: 10.5 */}
            <SyncStatusIndicator showText={true} showPendingCount={true} />
            
            {/* User info */}
            {user && (
              <div className="flex items-center gap-2 bg-white/80 px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                <span className="text-sm text-gray-600 hidden lg:inline">
                  {user.email}
                </span>
                <LogoutButton className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                  Sign out
                </LogoutButton>
              </div>
            )}
            
            {/* Current workspace title */}
            {currentWorkspaceId && (
              <span className="text-sm text-gray-600 bg-white/80 px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm hidden lg:inline">
                {workspaces.find(w => w.id === currentWorkspaceId)?.title || 'Workspace'}
              </span>
            )}
            
            {/* Export Button - Requirements: 11.4, 11.5 */}
            <ExportButton
              nodes={nodes}
              workspaceTitle={workspaces.find(w => w.id === currentWorkspaceId)?.title}
              selectedNodeId={selectedNodeId}
              disabled={isSwitching}
            />
          </div>
        )}

        {/* Loading overlay when switching workspaces */}
        <LoadingOverlay show={isSwitching} message="Loading workspace..." />

        {/* Error display */}
        {error && (
          <div className="absolute top-16 md:top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm shadow-md max-w-[90%]">
            {error}
          </div>
        )}

        {/* Canvas - Requirements: 1.5 - Touch gestures supported by React Flow */}
        <CanvasWorkspace 
          workspaceId={currentWorkspaceId || DEMO_WORKSPACE_ID}
        />
      </div>
    </main>
  );
}
