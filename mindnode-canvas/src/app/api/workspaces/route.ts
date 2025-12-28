/**
 * Workspaces API Route
 * 
 * GET /api/workspaces - List all workspaces for the authenticated user
 * POST /api/workspaces - Create a new workspace
 * 
 * Requirements:
 * - 7.1: Create new workspace with unique ID and root node
 * - 7.5: Display list of all user workspaces with preview information
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { Workspace } from '@/types';
import { WorkspaceRow, NodeRow } from '@/lib/supabase/database.types';

// ============================================
// TYPES
// ============================================

export interface CreateWorkspaceRequest {
  title: string;
  userId: string;
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

  if (!request.userId || typeof request.userId !== 'string') {
    return { valid: false, error: 'userId is required and must be a string' };
  }

  return {
    valid: true,
    data: {
      title: request.title.trim(),
      userId: request.userId,
    },
  };
}

// ============================================
// GET /api/workspaces
// ============================================

/**
 * List all workspaces for a user
 * Requirements: 7.5 - Display list of all user workspaces
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Fetch workspaces for the user
    // Requirements: 7.5 - Display list of all user workspaces with preview information
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('user_id', userId)
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
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate request
    const validation = validateCreateRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { title, userId } = validation.data;
    const supabase = createServerClient();

    // Create workspace first (without root_node_id)
    const { data: workspaceData, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        user_id: userId,
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
    // Requirements: 7.1 - Generate unique workspace ID and root node
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
    console.error('Workspaces POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
