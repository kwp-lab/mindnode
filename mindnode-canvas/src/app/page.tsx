'use client';

/**
 * Main page component that renders the MindNode Canvas
 */

import { useEffect, useState } from 'react';
import { CanvasWorkspace } from '../components';
import { MindNode } from '../types';
import { useMindNodeStore } from '../store';

// Demo workspace ID for development
const DEMO_WORKSPACE_ID = 'demo-workspace';

// Initial demo node for testing
const createInitialNode = (): MindNode => ({
  id: 'root-node',
  workspaceId: DEMO_WORKSPACE_ID,
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
  const { nodes, setNodes, setCurrentWorkspace } = useMindNodeStore();

  // Ensure we're on the client side before rendering React Flow
  useEffect(() => {
    setIsClient(true);
    setCurrentWorkspace(DEMO_WORKSPACE_ID);
    
    // Initialize with a root node if no nodes exist
    if (nodes.length === 0) {
      setNodes([createInitialNode()]);
    }
  }, []);

  if (!isClient) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-4xl font-bold mb-4">MindNode Canvas</h1>
        <p className="text-lg text-gray-600">Loading...</p>
      </main>
    );
  }

  return (
    <main className="w-screen h-screen overflow-hidden">
      <CanvasWorkspace 
        workspaceId={DEMO_WORKSPACE_ID}
      />
    </main>
  );
}
