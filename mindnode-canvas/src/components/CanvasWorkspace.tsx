'use client';

/**
 * CanvasWorkspace Component
 * Main infinite canvas container that manages the React Flow instance.
 * 
 * Requirements:
 * - 1.1: Pan smoothly in any direction
 * - 1.2: Zoom in/out with cursor as focal point
 * - 1.3: Render all visible nodes within viewport
 * - 4.1: Display Floating_Toolbar near text selection
 * - 4.2: Create child node with selected text as context
 * - 4.3: Store selected text in node's selectionSource field
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Node,
  Edge as ReactFlowEdge,
  NodeChange,
  EdgeChange,
  Connection,
  OnNodesChange,
  OnEdgesChange,
  NodeTypes,
  Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { MindNode, Edge, createEdgeFromNodes } from '../types';
import { useMindNodeStore } from '../store';
import { NODE_WIDTH, NODE_HEIGHT } from '../lib/layout';
import MindNodeComponent from './MindNodeComponent';
import SelectionToolbar from './SelectionToolbar';
import { useTextSelection } from '../hooks';

// ============================================
// TYPES
// ============================================

export interface CanvasWorkspaceProps {
  workspaceId: string;
  initialNodes?: MindNode[];
  initialEdges?: Edge[];
  onNodesChange?: (nodes: MindNode[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
}

// ============================================
// CUSTOM NODE TYPES
// ============================================

const nodeTypes: NodeTypes = {
  mindNode: MindNodeComponent,
};

// ============================================
// CONVERSION UTILITIES
// ============================================

/**
 * Convert MindNode to React Flow Node format
 */
function toReactFlowNode(node: MindNode): Node {
  return {
    id: node.id,
    type: 'mindNode',
    position: node.position,
    data: {
      ...node.data,
      nodeType: node.type,
      parentId: node.parentId,
      workspaceId: node.workspaceId,
    },
    style: {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    },
  };
}

/**
 * Convert React Flow Node back to MindNode format
 */
function fromReactFlowNode(rfNode: Node, originalNode: MindNode): MindNode {
  return {
    ...originalNode,
    position: rfNode.position,
    data: {
      label: rfNode.data.label as string,
      contextContent: rfNode.data.contextContent as string,
      selectionSource: rfNode.data.selectionSource as string | undefined,
      isEditing: rfNode.data.isEditing as boolean | undefined,
      isGenerating: rfNode.data.isGenerating as boolean | undefined,
      suggestions: rfNode.data.suggestions as string[] | undefined,
    },
  };
}

/**
 * Convert Edge to React Flow Edge format
 */
function toReactFlowEdge(edge: Edge): ReactFlowEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type || 'smoothstep',
    animated: false,
    style: { stroke: '#94a3b8', strokeWidth: 2 },
  };
}

// ============================================
// INNER CANVAS COMPONENT (with React Flow hooks)
// ============================================

function CanvasWorkspaceInner({
  workspaceId,
  initialNodes = [],
  initialEdges = [],
  onNodesChange: onNodesChangeCallback,
  onEdgesChange: onEdgesChangeCallback,
}: CanvasWorkspaceProps) {
  const reactFlowInstance = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Store state and actions
  const {
    nodes: storeNodes,
    edges: storeEdges,
    viewport: storeViewport,
    selectedNodeId,
    setNodes: setStoreNodes,
    setEdges: setStoreEdges,
    setViewport: setStoreViewport,
    setSelectedNode,
    addNode,
    updateNode,
    updateNodePosition,
    deleteNode,
    applyLayout,
    startGeneration,
  } = useMindNodeStore();

  // Text selection hook for floating toolbar
  // Requirements: 4.1 - Detect text selection within nodes
  const { selection, clearSelection } = useTextSelection({
    minLength: 1,
    clearDelay: 150,
    enabled: true,
  });

  // Convert store nodes/edges to React Flow format
  const rfNodes = useMemo(
    () => storeNodes.map(toReactFlowNode),
    [storeNodes]
  );
  
  const rfEdges = useMemo(
    () => storeEdges.map(toReactFlowEdge),
    [storeEdges]
  );

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);

  // Sync store nodes to React Flow when store changes
  useEffect(() => {
    setNodes(rfNodes);
  }, [rfNodes, setNodes]);

  useEffect(() => {
    setEdges(rfEdges);
  }, [rfEdges, setEdges]);

  // Initialize with initial nodes if provided
  useEffect(() => {
    if (initialNodes.length > 0) {
      setStoreNodes(initialNodes);
    }
    if (initialEdges.length > 0) {
      setStoreEdges(initialEdges);
    }
  }, [initialNodes, initialEdges, setStoreNodes, setStoreEdges]);

  /**
   * Handle node position changes (drag)
   * Requirements: 1.1 - Pan/drag support
   */
  const handleNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      
      // Update store for position changes
      changes.forEach((change) => {
        if (change.type === 'position' && change.position && change.id) {
          updateNodePosition(change.id, change.position, change.dragging === false);
        }
      });
    },
    [onNodesChange, updateNodePosition]
  );

  /**
   * Handle edge changes
   */
  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  /**
   * Handle viewport changes (pan/zoom)
   * Requirements: 1.1, 1.2 - Pan and zoom with cursor as focal point
   */
  const handleViewportChange = useCallback(
    (viewport: Viewport) => {
      setStoreViewport({
        x: viewport.x,
        y: viewport.y,
        zoom: viewport.zoom,
      });
    },
    [setStoreViewport]
  );

  /**
   * Handle node selection
   */
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  /**
   * Handle pane click (deselect)
   */
  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  /**
   * Handle new connections (edge creation)
   */
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        const newEdge = createEdgeFromNodes(connection.source, connection.target);
        setStoreEdges([...storeEdges, newEdge]);
      }
    },
    [storeEdges, setStoreEdges]
  );

  /**
   * Create a new child node from the selected node
   * Requirements: 2.1 - Tab creates child node
   */
  const createChildNode = useCallback(
    (parentId: string) => {
      const parentNode = storeNodes.find((n) => n.id === parentId);
      if (!parentNode) return;

      const newNode: MindNode = {
        id: `node-${Date.now()}`,
        workspaceId,
        parentId,
        type: 'user',
        data: {
          label: '',
          contextContent: '',
          isEditing: true,
        },
        position: {
          x: parentNode.position.x + NODE_WIDTH + 100,
          y: parentNode.position.y,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      addNode(newNode);
      setSelectedNode(newNode.id);
      
      // Apply layout after adding node
      setTimeout(() => applyLayout(), 0);
    },
    [storeNodes, workspaceId, addNode, setSelectedNode, applyLayout]
  );

  /**
   * Create a sibling node (same parent as selected node)
   * Requirements: 2.2 - Enter creates sibling node
   */
  const createSiblingNode = useCallback(
    (nodeId: string) => {
      const currentNode = storeNodes.find((n) => n.id === nodeId);
      if (!currentNode || !currentNode.parentId) return;

      const siblings = storeNodes.filter((n) => n.parentId === currentNode.parentId);
      const lastSibling = siblings[siblings.length - 1];

      const newNode: MindNode = {
        id: `node-${Date.now()}`,
        workspaceId,
        parentId: currentNode.parentId,
        type: 'user',
        data: {
          label: '',
          contextContent: '',
          isEditing: true,
        },
        position: {
          x: lastSibling.position.x,
          y: lastSibling.position.y + NODE_HEIGHT + 50,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      addNode(newNode);
      setSelectedNode(newNode.id);
      
      // Apply layout after adding node
      setTimeout(() => applyLayout(), 0);
    },
    [storeNodes, workspaceId, addNode, setSelectedNode, applyLayout]
  );

  /**
   * Create a selection branch (child node with selected text as context)
   * Requirements: 4.2, 4.3 - Create child node with selectionSource field
   * 
   * This creates a new AI node that will use the selected text as additional
   * context for generating a focused response.
   */
  const createSelectionBranch = useCallback(
    (selectedText: string) => {
      if (!selection) return;
      
      const parentNode = storeNodes.find((n) => n.id === selection.nodeId);
      if (!parentNode) return;

      // Create a new AI node with the selection source
      const newNode: MindNode = {
        id: `node-${Date.now()}`,
        workspaceId,
        parentId: selection.nodeId,
        type: 'ai', // AI node since it will trigger AI generation
        data: {
          label: '', // Will be filled by AI response
          contextContent: '', // Will be filled by AI response
          selectionSource: selectedText, // Store the selected text
          isEditing: false,
          isGenerating: true, // Start in generating state
        },
        position: {
          x: parentNode.position.x + NODE_WIDTH + 100,
          y: parentNode.position.y,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add the node
      addNode(newNode);
      setSelectedNode(newNode.id);
      
      // Mark as generating (for AI integration - Task 11)
      startGeneration(newNode.id);
      
      // Clear the text selection
      clearSelection();
      
      // Clear browser selection
      window.getSelection()?.removeAllRanges();
      
      // Apply layout after adding node
      setTimeout(() => applyLayout(), 0);
      
      // Note: Actual AI generation will be triggered in Task 11 (AI Integration)
      // For now, we just create the node structure with selectionSource
      console.log('Selection branch created:', {
        nodeId: newNode.id,
        parentId: selection.nodeId,
        selectionSource: selectedText,
      });
    },
    [selection, storeNodes, workspaceId, addNode, setSelectedNode, startGeneration, clearSelection, applyLayout]
  );

  /**
   * Handle toolbar dismiss
   */
  const handleToolbarDismiss = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  /**
   * Handle keyboard shortcuts
   * Requirements: 2.1, 2.2 - Tab and Enter shortcuts
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Only handle if we have a selected node and not in an input/textarea
      if (!selectedNodeId) return;
      
      const target = event.target as HTMLElement;
      const isInputElement = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;
      
      // Check if any node is in editing mode
      const editingNode = storeNodes.find((n) => n.data.isEditing);
      
      if (event.key === 'Tab' && !isInputElement && !editingNode) {
        event.preventDefault();
        createChildNode(selectedNodeId);
      } else if (event.key === 'Enter' && !isInputElement && !editingNode) {
        event.preventDefault();
        createSiblingNode(selectedNodeId);
      } else if (event.key === 'Delete' && !isInputElement && !editingNode) {
        event.preventDefault();
        deleteNode(selectedNodeId);
      } else if (event.key === 'Escape') {
        // Exit editing mode for any editing node
        if (editingNode) {
          updateNode(editingNode.id, { isEditing: false });
        }
        setSelectedNode(null);
      }
    },
    [selectedNodeId, storeNodes, createChildNode, createSiblingNode, deleteNode, updateNode, setSelectedNode]
  );

  // Attach keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Sync viewport from store on mount
  useEffect(() => {
    if (storeViewport && reactFlowInstance) {
      reactFlowInstance.setViewport(storeViewport);
    }
  }, []);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative"
      style={{ width: '100%', height: '100%' }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onViewportChange={handleViewportChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={4}
        defaultViewport={storeViewport}
        snapToGrid={false}
        panOnScroll
        zoomOnScroll
        zoomOnPinch
        panOnDrag
        selectionOnDrag={false}
        selectNodesOnDrag={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e2e8f0" gap={20} />
        <Controls 
          showZoom
          showFitView
          showInteractive={false}
          position="bottom-right"
        />
        <MiniMap 
          nodeColor={(node) => {
            const nodeType = node.data?.nodeType;
            if (nodeType === 'root') return '#6366f1';
            if (nodeType === 'ai') return '#10b981';
            return '#3b82f6';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          position="bottom-left"
        />
      </ReactFlow>
      
      {/* Selection Toolbar - Requirements: 4.1, 4.2 */}
      {selection && (
        <SelectionToolbar
          selectedText={selection.text}
          position={selection.position}
          onCreateBranch={createSelectionBranch}
          onDismiss={handleToolbarDismiss}
          visible={true}
        />
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT (with Provider)
// ============================================

/**
 * CanvasWorkspace - Main canvas component wrapped with ReactFlowProvider
 */
export default function CanvasWorkspace(props: CanvasWorkspaceProps) {
  return (
    <ReactFlowProvider>
      <CanvasWorkspaceInner {...props} />
    </ReactFlowProvider>
  );
}

// ============================================
// EXPORTS
// ============================================

export { toReactFlowNode, fromReactFlowNode, toReactFlowEdge };
