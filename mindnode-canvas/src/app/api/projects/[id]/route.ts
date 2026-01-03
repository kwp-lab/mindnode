import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * GET /api/projects/[id]
 * Get a single project with its nodes
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value);
            });
          },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Fetch nodes for this project
    const { data: nodes, error: nodesError } = await supabase
      .from('nodes')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: true });

    if (nodesError) {
      console.error('Error fetching nodes:', nodesError);
    }

    // Transform to frontend format
    const transformedProject = {
      id: project.id,
      workspaceId: project.workspace_id,
      title: project.title,
      description: project.description,
      rootNodeId: project.root_node_id,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      viewport: {
        x: project.viewport_x || 0,
        y: project.viewport_y || 0,
        zoom: project.viewport_zoom || 1,
      },
    };

    const transformedNodes = (nodes || []).map((n) => ({
      id: n.id,
      workspaceId: n.workspace_id,
      projectId: n.project_id,
      parentId: n.parent_id,
      type: n.type,
      data: {
        label: n.content?.split('\n')[0] || 'Untitled',
        contextContent: n.content || '',
        selectionSource: n.selection_source,
      },
      position: {
        x: n.position_x || 0,
        y: n.position_y || 0,
      },
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    }));

    return NextResponse.json({
      project: transformedProject,
      nodes: transformedNodes,
    });
  } catch (error) {
    console.error('Error in GET /api/projects/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]
 * Update a project
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, viewport } = body;

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value);
            });
          },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (viewport) {
      updates.viewport_x = viewport.x;
      updates.viewport_y = viewport.y;
      updates.viewport_zoom = viewport.zoom;
    }

    // Update project
    const { data: project, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating project:', error);
      return NextResponse.json(
        { error: 'Failed to update project' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      project: {
        id: project.id,
        workspaceId: project.workspace_id,
        title: project.title,
        description: project.description,
        rootNodeId: project.root_node_id,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        viewport: {
          x: project.viewport_x || 0,
          y: project.viewport_y || 0,
          zoom: project.viewport_zoom || 1,
        },
      },
    });
  } catch (error) {
    console.error('Error in PUT /api/projects/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]
 * Delete a project
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value);
            });
          },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete project (nodes will be cascade deleted)
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting project:', error);
      return NextResponse.json(
        { error: 'Failed to delete project' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/projects/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}