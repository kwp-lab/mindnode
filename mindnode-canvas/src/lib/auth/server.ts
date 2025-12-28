/**
 * Server-side authentication utilities
 * 
 * Provides helper functions for server-side authentication checks
 * in API routes and server components
 * 
 * Requirements:
 * - 12.2: User session management
 * - 12.3: User workspace isolation
 */

import { createServerClient } from '../supabase/server';
import type { User } from '@supabase/supabase-js';

/**
 * Get the authenticated user from the server
 * Returns null if not authenticated
 */
export async function getAuthenticatedUser(): Promise<User | null> {
  const supabase = await createServerClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

/**
 * Require authentication - throws error if not authenticated
 * Use this in API routes that require authentication
 */
export async function requireAuth(): Promise<User> {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

/**
 * Check if a user owns a workspace
 */
export async function checkWorkspaceOwnership(
  workspaceId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('user_id', userId)
    .single();

  return !error && !!data;
}
