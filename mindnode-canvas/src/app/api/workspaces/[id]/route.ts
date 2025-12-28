/**
 * Individual Workspace API Route
 * 
 * GET /api/workspaces/[id] - Get a specific workspace
 * PUT /api/workspaces/[id] - Update a workspace
 * DELETE /api/workspaces/[id] - Delete a workspace and all its nodes
 * 
 * Requirements:
 * - 7.2: Load workspace node tree and canvas state
 * - 7.4: Delete workspace and all associated nodes
 * - 12.3: User workspace isolation
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireAuth, checkWorkspaceOwnership } from '@/lib/auth/server';
import { Workspace, MindNode, Edge, deriveEdgesFromNodes } from '@/types';
import { WorkspaceRow, NodeRow } from '@/lib/supabase/database.types';

// ============================================
// TYPES
// ============================================

export interface WorkspaceWithNodesResponse {
  workspace: Workspace;
  nodes: MindNode[];
  edges: Edge[];
}

export interface UpdateWorkspaceRequest {
  title?: string;
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

// ============================================
// HELPERS
// ============================================

/**
 * Transform database row to Workspace type
 */
function transformWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    rootNodeId: row.root_node_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    viewport: {
      x: row.viewport_x,
      y: row.viewport_y,
      zoom: row.viewport_zoom,
    },
  };
}

/**
 * Transform database row to MindNode type
 */
function transformNode(row: NodeRow): MindNode {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    parentId: row.parent_id,
    type: row.type,
    data: {
      label: row.content,
      contextContent: row.content,
      selectionSource: row.selection_source || undefined,
    },
    position: {
      x: row.position_x,
      y: row.position_y,
    },
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Validate update workspace request
 */
function validateUpdateRequest(
  body: unknown
): { valid: true; data: UpdateWorkspaceRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  const request = body as Record<string, unknown>;
  const data: UpdateWorkspaceRequest = {};

  if (request.title !== undefined) {
    if (typeof request.title !== 'string') {
      return { valid: false, error: 'title must be a string' };
    }
    if (request.title.trim().length === 0) {
      return { valid: false, error: 'title cannot be empty' };
    }
    if (request.title.length > 255) {
      return { valid: false, error: 'title cannot exceed 255 characters' };
    }
    data.title = request.title.trim();
  }

  if (request.viewport !== undefined) {
    if (typeof request.viewport !== 'object' || request.viewport === null) {
      return { valid: false, error: 'viewport must be an object' };
    }
    const viewport = request.viewport as Record<string, unknown>;
    if (
      typeof viewport.x !== 'number' ||
      typeof viewport.y !== 'number' ||
      typeof viewport.zoom !== 'number'
    ) {
      return { valid: false, error: 'viewport must have x, y, and zoom as numbers' };
    }
    if (viewport.zoom < 0.1 || viewport.zoom > 10) {
      return { valid: false, error: 'viewport zoom must be between 0.1 and 10' };
    }
    data.viewport = {
      x: viewport.x,
      y: viewport.y,
      zoom: viewport.zoom,
    };
  }

  return { valid: true, data };
}

// ============================================
// GET /api/workspaces/[id]
// ============================================

/**
 * Get a specific workspace with its nodes and edges
 * Requirements: 7.2 - Load workspace node tree and canvas state
 * Requirements: 12.3 - User workspace isolation
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const user = await requireAuth();
    
    const { id } = await params;
    
    // Check workspace ownership
    const hasAccess = await checkWorkspaceOwnership(id, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 404 }
      );
    }
    
    const supabase = await createServerClient();

    // Fetch workspace (RLS ensures user can only access their own workspaces)
    const { data: workspaceData, error: workspaceError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', id)
      .single();

    if (workspaceError) {
      if (workspaceError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Workspace not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching workspace:', workspaceError);
      return NextResponse.json(
        { error: 'Failed to fetch workspace' },
        { status: 500 }
      );
    }

    // Fetch all nodes for this workspace
    const { data: nodesData, error: nodesError } = await supabase
      .from('nodes')
      .select('*')
      .eq('workspace_id', id)
      .order('created_at', { ascending: true });

    if (nodesError) {
      console.error('Error fetching nodes:', nodesError);
      return NextResponse.json(
        { error: 'Failed to fetch workspace nodes' },
        { status: 500 }
      );
    }

    const workspace = transformWorkspace(workspaceData as WorkspaceRow);
    const nodes = (nodesData || []).map((row) => transformNode(row as NodeRow));
    const edges = deriveEdgesFromNodes(nodes);

    return NextResponse.json({
      workspace,
      nodes,
      edges,
    } as WorkspaceWithNodesResponse);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.error('Workspace GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// PUT /api/workspaces/[id]
// ============================================

/**
 * Update a workspace (title, viewport state)
 * Requirements: 7.3 - Persist changes to database
 * Requirements: 12.3 - User workspace isolation
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const user = await requireAuth();
    
    const { id } = await params;
    
    // Check workspace ownership
    const hasAccess = await checkWorkspaceOwnership(id, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 404 }
      );
    }
    
    const body = await req.json();

    // Validate request
    const validation = validateUpdateRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { title, viewport } = validation.data;
    const supabase = await createServerClient();

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) {
      updateData.title = title;
    }

    if (viewport !== undefined) {
      updateData.viewport_x = viewport.x;
      updateData.viewport_y = viewport.y;
      updateData.viewport_zoom = viewport.zoom;
    }

    // Update workspace (RLS ensures user can only update their own workspaces)
    const { data, error } = await supabase
      .from('workspaces')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Workspace not found' },
          { status: 404 }
        );
      }
      console.error('Error updating workspace:', error);
      return NextResponse.json(
        { error: 'Failed to update workspace' },
        { status: 500 }
      );
    }

    const workspace = transformWorkspace(data as WorkspaceRow);

    return NextResponse.json({ workspace });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.error('Workspace PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/workspaces/[id]
// ============================================

/**
 * Delete a workspace and all its associated nodes
 * Requirements: 7.4 - Delete workspace and all associated nodes
 * Requirements: 12.3 - User workspace isolation
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const user = await requireAuth();
    
    const { id } = await params;
    
    // Check workspace ownership
    const hasAccess = await checkWorkspaceOwnership(id, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 404 }
      );
    }
    
    const supabase = await createServerClient();

    // Delete workspace (cascade will delete all nodes due to foreign key constraint)
    // RLS ensures user can only delete their own workspaces
    const { error: deleteError } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting workspace:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete workspace' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Workspace deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.error('Workspace DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
