/**
 * Individual Node API Route
 * 
 * GET /api/nodes/[id] - Get a specific node
 * PUT /api/nodes/[id] - Update a node
 * DELETE /api/nodes/[id] - Delete a node and its descendants
 * 
 * Requirements:
 * - 10.1: Save node to database within 2 seconds
 * - 10.2: Update database with new coordinates
 * - 2.6: Delete node and all descendants
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { MindNode } from '@/types';
import { NodeRow } from '@/lib/supabase/database.types';

// ============================================
// TYPES
// ============================================

export interface UpdateNodeRequest {
  data?: {
    label?: string;
    contextContent?: string;
    selectionSource?: string;
  };
  position?: {
    x: number;
    y: number;
  };
  type?: 'root' | 'user' | 'ai';
}

// ============================================
// HELPERS
// ============================================

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
 * Validate update node request
 */
function validateUpdateRequest(
  body: unknown
): { valid: true; data: UpdateNodeRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  const request = body as Record<string, unknown>;
  const data: UpdateNodeRequest = {};

  if (request.data !== undefined) {
    if (typeof request.data !== 'object' || request.data === null) {
      return { valid: false, error: 'data must be an object' };
    }
    const nodeData = request.data as Record<string, unknown>;
    data.data = {
      label: nodeData.label as string | undefined,
      contextContent: nodeData.contextContent as string | undefined,
      selectionSource: nodeData.selectionSource as string | undefined,
    };
  }

  if (request.position !== undefined) {
    if (typeof request.position !== 'object' || request.position === null) {
      return { valid: false, error: 'position must be an object' };
    }
    const position = request.position as Record<string, unknown>;
    if (typeof position.x !== 'number' || typeof position.y !== 'number') {
      return { valid: false, error: 'position.x and position.y must be numbers' };
    }
    data.position = {
      x: position.x,
      y: position.y,
    };
  }

  if (request.type !== undefined) {
    if (!['root', 'user', 'ai'].includes(request.type as string)) {
      return { valid: false, error: 'type must be root, user, or ai' };
    }
    data.type = request.type as 'root' | 'user' | 'ai';
  }

  return { valid: true, data };
}

// ============================================
// GET /api/nodes/[id]
// ============================================

/**
 * Get a specific node
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('nodes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Node not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching node:', error);
      return NextResponse.json(
        { error: 'Failed to fetch node' },
        { status: 500 }
      );
    }

    const node = transformNode(data as NodeRow);

    return NextResponse.json({ node });
  } catch (error) {
    console.error('Node GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// PUT /api/nodes/[id]
// ============================================

/**
 * Update a node
 * Requirements: 10.1, 10.2 - Save node changes to database
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const validation = validateUpdateRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { data: nodeData, position, type } = validation.data;
    const supabase = createServerClient();

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (nodeData?.contextContent !== undefined) {
      updateData.content = nodeData.contextContent;
    }

    if (nodeData?.selectionSource !== undefined) {
      updateData.selection_source = nodeData.selectionSource;
    }

    if (position !== undefined) {
      updateData.position_x = position.x;
      updateData.position_y = position.y;
    }

    if (type !== undefined) {
      updateData.type = type;
    }

    const { data, error } = await supabase
      .from('nodes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Node not found' },
          { status: 404 }
        );
      }
      console.error('Error updating node:', error);
      return NextResponse.json(
        { error: 'Failed to update node' },
        { status: 500 }
      );
    }

    const node = transformNode(data as NodeRow);

    return NextResponse.json({ node });
  } catch (error) {
    console.error('Node PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/nodes/[id]
// ============================================

/**
 * Delete a node and all its descendants
 * Requirements: 2.6 - Delete node and all descendants
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    // Check if node exists
    const { data: existingNode, error: checkError } = await supabase
      .from('nodes')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingNode) {
      return NextResponse.json(
        { error: 'Node not found' },
        { status: 404 }
      );
    }

    // Delete node (cascade will delete descendants due to foreign key constraint)
    const { error: deleteError } = await supabase
      .from('nodes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting node:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete node' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Node deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Node DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
