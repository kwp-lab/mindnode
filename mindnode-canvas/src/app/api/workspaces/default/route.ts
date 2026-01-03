import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * POST /api/workspaces/default
 * Create a default workspace for a new user
 */
export async function POST(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
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

    // Create default workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        title: 'My Workspace',
        user_id: user.id,
        viewport: { x: 0, y: 0, zoom: 1 },
      })
      .select()
      .single();

    if (workspaceError) {
      console.error('Error creating default workspace:', workspaceError);
      return NextResponse.json(
        { error: 'Failed to create default workspace' },
        { status: 500 }
      );
    }

    // Create initial root node for the workspace
    const { error: nodeError } = await supabase
      .from('nodes')
      .insert({
        workspace_id: workspace.id,
        parent_id: null,
        type: 'root',
        data: {
          label: 'Welcome to MindNode Canvas',
          contextContent: 'Welcome to MindNode Canvas\n\nThis is your starting point. Press Tab to create a child node, or Enter to create a sibling.',
        },
        position: { x: 100, y: 200 },
      });

    if (nodeError) {
      console.error('Error creating initial node:', nodeError);
      // Don't fail the request if node creation fails
    }

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        title: workspace.title,
        userId: workspace.user_id,
        viewport: workspace.viewport,
        createdAt: workspace.created_at,
        updatedAt: workspace.updated_at,
      },
    });
  } catch (error) {
    console.error('Error in default workspace creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}