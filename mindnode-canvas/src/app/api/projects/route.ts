import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * GET /api/projects
 * Get all projects for a workspace
 * Query params: workspaceId (required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

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

    // Fetch projects for the workspace
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json(
        { error: 'Failed to fetch projects' },
        { status: 500 }
      );
    }

    // Transform to frontend format
    const transformedProjects = projects.map((p) => ({
      id: p.id,
      workspaceId: p.workspace_id,
      title: p.title,
      description: p.description,
      rootNodeId: p.root_node_id,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      viewport: {
        x: p.viewport_x || 0,
        y: p.viewport_y || 0,
        zoom: p.viewport_zoom || 1,
      },
    }));

    return NextResponse.json({ projects: transformedProjects });
  } catch (error) {
    console.error('Error in GET /api/projects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * Create a new project
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, title, description } = body;

    if (!workspaceId || !title) {
      return NextResponse.json(
        { error: 'workspaceId and title are required' },
        { status: 400 }
      );
    }

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

    // Create the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        workspace_id: workspaceId,
        title,
        description: description || null,
        viewport_x: 0,
        viewport_y: 0,
        viewport_zoom: 1,
      })
      .select()
      .single();

    if (projectError) {
      console.error('Error creating project:', projectError);
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      );
    }

    // Create initial root node for the project
    const { data: rootNode, error: nodeError } = await supabase
      .from('nodes')
      .insert({
        workspace_id: workspaceId,
        project_id: project.id,
        parent_id: null,
        type: 'root',
        content: 'Welcome to your new canvas!\n\nThis is your starting point. Press Tab to create a child node, or Enter to create a sibling.',
        position_x: 100,
        position_y: 200,
      })
      .select()
      .single();

    if (nodeError) {
      console.error('Error creating root node:', nodeError);
      // Don't fail the request, project is still created
    }

    // Update project with root node id
    if (rootNode) {
      await supabase
        .from('projects')
        .update({ root_node_id: rootNode.id })
        .eq('id', project.id);
    }

    return NextResponse.json({
      project: {
        id: project.id,
        workspaceId: project.workspace_id,
        title: project.title,
        description: project.description,
        rootNodeId: rootNode?.id || null,
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
    console.error('Error in POST /api/projects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}