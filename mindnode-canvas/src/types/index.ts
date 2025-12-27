// Core data types for MindNode Canvas

export interface Workspace {
  id: string;
  userId: string;
  title: string;
  rootNodeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface MindNode {
  id: string;
  workspaceId: string;
  parentId: string | null;
  type: 'root' | 'user' | 'ai';
  data: {
    label: string;
    contextContent: string;
    selectionSource?: string;
    isEditing?: boolean;
    isGenerating?: boolean;
    suggestions?: string[];
  };
  position: {
    x: number;
    y: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  type?: 'default' | 'smoothstep';
}

export interface ContextNode {
  id: string;
  content: string;
  type: 'root' | 'user' | 'ai';
  selectionSource?: string;
}

export interface AIError {
  type: 'rate_limit' | 'timeout' | 'auth' | 'unknown';
  message: string;
  retryable: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
