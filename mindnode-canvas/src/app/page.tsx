'use client';

/**
 * Main page component that renders the MindNode Canvas with workspace management
 * 
 * Implements:
 * - Task 14.3: Workspace switching logic integration
 * - Task 16.3: Export UI integration
 * - Task 17.3: Load user session on app initialization
 * 
 * Requirements:
 * - 7.2: Load workspace node tree and canvas state when switching
 * - 7.5: Display list of all user workspaces
 * - 11.4: Provide download link for Markdown file
 * - 11.5: Support exporting individual branches
 * - 12.3: Only display workspaces owned by authenticated user
 */

import { useEffect, useState, useCallback } from 'react';
import { CanvasWorkspace, WorkspaceSidebar, ExportButton, LogoutButton } from '../components';
import { MindNode } from '../types';
import { useMindNodeStore } from '../store';
import { useWorkspaces } from '../hooks';
import { useAuth } from '@/lib/auth/AuthProvider';

// Demo workspace ID for development fallback
const DEMO_WORKSPACE_ID = 'demo-workspace';

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

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const { user, isLoading: isAuthLoading } = useAuth();
  const { nodes, setNodes, setCurrentWorkspace, selectedNodeId } = useMindNodeStore();
  
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
    setSidebarCollapsed(prev => !prev);
  }, []);

  if (!isClient || isAuthLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-4xl font-bold mb-4">MindNode Canvas</h1>
        <p className="text-lg text-gray-600">Loading...</p>
      </main>
    );
  }

  return (
    <main className="w-screen h-screen overflow-hidden flex">
      {/* Sidebar toggle button (visible when collapsed) */}
      {sidebarCollapsed && (
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

      {/* Workspace Sidebar */}
      {!sidebarCollapsed && (
        <div className="relative w-64 flex-shrink-0">
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
      )}

      {/* Main Canvas Area */}
      <div className="flex-1 relative">
        {/* Workspace Toolbar */}
        <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
          {/* User info */}
          {user && (
            <div className="flex items-center gap-2 bg-white/80 px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
              <span className="text-sm text-gray-600">
                {user.email}
              </span>
              <LogoutButton className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                Sign out
              </LogoutButton>
            </div>
          )}
          
          {/* Current workspace title */}
          {currentWorkspaceId && (
            <span className="text-sm text-gray-600 bg-white/80 px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
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

        {/* Loading overlay when switching workspaces */}
        {isSwitching && (
          <div className="absolute inset-0 z-40 bg-white/80 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 border-3 border-gray-300 border-t-blue-500 rounded-full animate-spin mb-3" />
              <span className="text-sm text-gray-600">Loading workspace...</span>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm shadow-md">
            {error}
          </div>
        )}

        {/* Canvas */}
        <CanvasWorkspace 
          workspaceId={currentWorkspaceId || DEMO_WORKSPACE_ID}
        />
      </div>
    </main>
  );
}
