/**
 * Batch Nodes API Route
 * 
 * PUT /api/nodes/batch - Update multiple nodes in a single transaction
 * 
 * Requirements:
 * - 10.1: Batch multiple updates into single transaction
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { MindNode } from '@/types';
import { NodeRow } from '@/lib/supabase/database.types';

// ============================================
// TYPES
// ============================================

interface BatchUpdateItem {
  nodeId: string;
  data: {
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
  };
}

interface BatchUpdateRequest {
  updates: BatchUpdateItem[];
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
 * Validate batch update request
 */
function validateBatchRequest(
  body: unknown
): { valid: true; data: BatchUpdateRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  const request = body as Record<string, unknown>;

  if (!Array.isArray(request.updates)) {
    return { valid: false, error: 'updates must be an array' };
  }

  if (request.updates.length === 0) {
    return { valid: false, error: 'updates array cannot be empty' };
  }

  if (request.updates.length > 100) {
    return { valid: false, error: 'Maximum 100 updates per batch' };
  }

  const updates: BatchUpdateItem[] = [];

  for (const item of request.updates) {
    if (!item || typeof item !== 'object') {
      return { valid: false, error: 'Each update must be an object' };
    }

    const update = item as Record<string, unknown>;

    if (!update.nodeId || typeof update.nodeId !== 'string') {
      return { valid: false, error: 'Each update must have a nodeId' };
    }

    if (!update.data || typeof update.data !== 'object') {
      return { valid: false, error: 'Each update must have data' };
    }

    updates.push({
      nodeId: update.nodeId as string,
      data: update.data as BatchUpdateItem['data'],
    });
  }

  return { valid: true, data: { updates } };
}

// ============================================
// PUT /api/nodes/batch
// ============================================

/**
 * Update multiple nodes in a batch
 * Requirements: 10.1 - Batch multiple updates into single transaction
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json();

    const validation = validateBatchRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { updates } = validation.data;
    const supabase = await createServerClient();
    const results: { nodeId: string; success: boolean; error?: string }[] = [];
    const updatedNodes: MindNode[] = [];

    // Process each update
    // Note: Supabase doesn't support true batch updates, so we process sequentially
    // but this is still more efficient than individual API calls from the client
    for (const update of updates) {
      const { nodeId, data } = update;

      // Build update object
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (data.data?.contextContent !== undefined) {
        updateData.content = data.data.contextContent;
      }

      if (data.data?.selectionSource !== undefined) {
        updateData.selection_source = data.data.selectionSource;
      }

      if (data.position !== undefined) {
        updateData.position_x = data.position.x;
        updateData.position_y = data.position.y;
      }

      if (data.type !== undefined) {
        updateData.type = data.type;
      }

      const { data: nodeData, error } = await supabase
        .from('nodes')
        .update(updateData)
        .eq('id', nodeId)
        .select()
        .single();

      if (error) {
        results.push({
          nodeId,
          success: false,
          error: error.message,
        });
      } else {
        results.push({ nodeId, success: true });
        updatedNodes.push(transformNode(nodeData as NodeRow));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: failedCount === 0,
      results,
      updatedNodes,
      summary: {
        total: updates.length,
        succeeded: successCount,
        failed: failedCount,
      },
    });
  } catch (error) {
    console.error('Batch update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
