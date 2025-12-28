/**
 * Workspaces API Route
 * 
 * GET /api/workspaces - List all workspaces for the authenticated user
 * POST /api/workspaces - Create a new workspace
 * 
 * Requirements:
 * - 7.1: Create new workspace with unique ID and root node
 * - 7.5: Display list of all user workspaces with preview information
 * - 12.3: Only display workspaces owned by authenticated user
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/server';
import { Workspace } from '@/types';
import { WorkspaceRow, NodeRow } from '@/lib/supabase/database.types';

// ============================================
// TYPES
// ============================================

export interface CreateWorkspaceRequest {
  title: string;
}

export interface WorkspaceListResponse {
  workspaces: Workspace[];
}

export interface WorkspaceResponse {
  workspace: Workspace;
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
 * Validate create workspace request
 */
function validateCreateRequest(
  body: unknown
): { valid: true; data: CreateWorkspaceRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  const request = body as Record<string, unknown>;

  if (!request.title || typeof request.title !== 'string') {
    return { valid: false, error: 'title is required and must be a string' };
  }

  if (request.title.trim().length === 0) {
    return { valid: false, error: 'title cannot be empty' };
  }

  if (request.title.length > 255) {
    return { valid: false, error: 'title cannot exceed 255 characters' };
  }

  return {
    valid: true,
    data: {
      title: request.title.trim(),
    },
  };
}

// ============================================
// GET /api/workspaces
// ============================================

/**
 * List all workspaces for the authenticated user
 * Requirements: 7.5 - Display list of all user workspaces
 * Requirements: 12.3 - Only display workspaces owned by authenticated user
 */
export async function GET() {
  try {
    // Require authentication
    const user = await requireAuth();

    const supabase = await createServerClient();

    // Fetch workspaces for the authenticated user
    // RLS policies ensure users can only see their own workspaces
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching workspaces:', error);
      return NextResponse.json(
        { error: 'Failed to fetch workspaces' },
        { status: 500 }
      );
    }

    const workspaces = (data || []).map((row) => transformWorkspace(row as WorkspaceRow));

    return NextResponse.json({ workspaces } as WorkspaceListResponse);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.error('Workspaces GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/workspaces
// ============================================

/**
 * Create a new workspace with a root node
 * Requirements: 7.1 - Create new workspace with unique ID and root node
 * Requirements: 12.3 - Associate workspace with authenticated user
 */
export async function POST(req: Request) {
  try {
    // Require authentication
    const user = await requireAuth();
    
    const body = await req.json();

    // Validate request
    const validation = validateCreateRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { title } = validation.data;
    const supabase = await createServerClient();

    // Create workspace for the authenticated user
    const { data: workspaceData, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        user_id: user.id,
        title,
        viewport_x: 0,
        viewport_y: 0,
        viewport_zoom: 1,
      })
      .select()
      .single();

    if (workspaceError || !workspaceData) {
      console.error('Error creating workspace:', workspaceError);
      return NextResponse.json(
        { error: 'Failed to create workspace' },
        { status: 500 }
      );
    }

    const workspaceRow = workspaceData as WorkspaceRow;

    // Create root node for the workspace
    const { data: rootNodeData, error: rootNodeError } = await supabase
      .from('nodes')
      .insert({
        workspace_id: workspaceRow.id,
        parent_id: null,
        type: 'root',
        content: title,
        position_x: 0,
        position_y: 0,
      })
      .select()
      .single();

    if (rootNodeError || !rootNodeData) {
      console.error('Error creating root node:', rootNodeError);
      // Rollback: delete the workspace
      await supabase.from('workspaces').delete().eq('id', workspaceRow.id);
      return NextResponse.json(
        { error: 'Failed to create root node' },
        { status: 500 }
      );
    }

    const rootNode = rootNodeData as NodeRow;

    // Update workspace with root_node_id
    const { data: updatedWorkspace, error: updateError } = await supabase
      .from('workspaces')
      .update({ root_node_id: rootNode.id })
      .eq('id', workspaceRow.id)
      .select()
      .single();

    if (updateError || !updatedWorkspace) {
      console.error('Error updating workspace with root node:', updateError);
      return NextResponse.json(
        { error: 'Failed to link root node to workspace' },
        { status: 500 }
      );
    }

    const workspace = transformWorkspace(updatedWorkspace as WorkspaceRow);

    return NextResponse.json(
      { workspace } as WorkspaceResponse,
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.error('Workspaces POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
