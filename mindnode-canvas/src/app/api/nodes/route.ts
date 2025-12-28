/**
 * Nodes API Route
 * 
 * POST /api/nodes - Create a new node
 * 
 * Requirements:
 * - 10.1: Save node to database within 2 seconds
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { MindNode } from '@/types';
import { NodeRow } from '@/lib/supabase/database.types';

// ============================================
// TYPES
// ============================================

export interface CreateNodeRequest {
  id?: string;
  workspaceId: string;
  parentId: string | null;
  type: 'root' | 'user' | 'ai';
  data: {
    label: string;
    contextContent: string;
    selectionSource?: string;
  };
  position: {
    x: number;
    y: number;
  };
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
 * Validate create node request
 */
function validateCreateRequest(
  body: unknown
): { valid: true; data: CreateNodeRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  const request = body as Record<string, unknown>;

  if (!request.workspaceId || typeof request.workspaceId !== 'string') {
    return { valid: false, error: 'workspaceId is required' };
  }

  if (!request.type || !['root', 'user', 'ai'].includes(request.type as string)) {
    return { valid: false, error: 'type must be root, user, or ai' };
  }

  if (!request.data || typeof request.data !== 'object') {
    return { valid: false, error: 'data is required' };
  }

  const data = request.data as Record<string, unknown>;
  if (typeof data.contextContent !== 'string') {
    return { valid: false, error: 'data.contextContent is required' };
  }

  if (!request.position || typeof request.position !== 'object') {
    return { valid: false, error: 'position is required' };
  }

  const position = request.position as Record<string, unknown>;
  if (typeof position.x !== 'number' || typeof position.y !== 'number') {
    return { valid: false, error: 'position.x and position.y must be numbers' };
  }

  return {
    valid: true,
    data: {
      id: typeof request.id === 'string' ? request.id : undefined,
      workspaceId: request.workspaceId as string,
      parentId: request.parentId as string | null,
      type: request.type as 'root' | 'user' | 'ai',
      data: {
        label: data.label as string || data.contextContent as string,
        contextContent: data.contextContent as string,
        selectionSource: data.selectionSource as string | undefined,
      },
      position: {
        x: position.x as number,
        y: position.y as number,
      },
    },
  };
}

// ============================================
// POST /api/nodes
// ============================================

/**
 * Create a new node
 * Requirements: 10.1 - Save node to database
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const validation = validateCreateRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { workspaceId, parentId, type, data, position, id } = validation.data;
    const supabase = await createServerClient();

    // Build properly typed insert data
    const insertData = {
      ...(id ? { id } : {}),
      workspace_id: workspaceId,
      parent_id: parentId,
      type: type as 'root' | 'user' | 'ai',
      content: data.contextContent,
      selection_source: data.selectionSource || null,
      position_x: position.x,
      position_y: position.y,
    };

    const { data: nodeData, error } = await supabase
      .from('nodes')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating node:', error);
      return NextResponse.json(
        { error: 'Failed to create node' },
        { status: 500 }
      );
    }

    const node = transformNode(nodeData as NodeRow);

    return NextResponse.json({ node }, { status: 201 });
  } catch (error) {
    console.error('Nodes POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
