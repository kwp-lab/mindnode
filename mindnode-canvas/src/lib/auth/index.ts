/**
 * Authentication utilities
 * 
 * Provides helper functions for:
 * - User authentication (sign up, sign in, sign out)
 * - OAuth authentication (Google, GitHub)
 * - Session management
 * 
 * Requirements:
 * - 12.1: Email/password authentication
 * - 12.2: User login and session management
 * - 12.4: Logout functionality
 * - 12.5: OAuth authentication
 */

import { supabase } from '../supabase/client';
import type { AuthError, User, Session } from '@supabase/supabase-js';

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

/**
 * Sign up a new user with email and password
 * Requirement 12.1: Email/password authentication
 */
export async function signUp(
  email: string,
  password: string,
  metadata?: { fullName?: string }
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  return {
    user: data.user,
    session: data.session,
    error,
  };
}

/**
 * Sign in an existing user with email and password
 * Requirement 12.2: User login
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return {
    user: data.user,
    session: data.session,
    error,
  };
}

/**
 * Sign out the current user
 * Requirement 12.4: Logout functionality
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Sign in with OAuth provider (Google or GitHub)
 * Requirement 12.5: OAuth authentication
 */
export async function signInWithOAuth(
  provider: 'google' | 'github'
): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  return { error };
}

/**
 * Get the current user session
 * Requirement 12.2: Session management
 */
export async function getSession(): Promise<{
  session: Session | null;
  error: AuthError | null;
}> {
  const { data, error } = await supabase.auth.getSession();
  return {
    session: data.session,
    error,
  };
}

/**
 * Get the current user
 * Requirement 12.2: Session management
 */
export async function getUser(): Promise<{
  user: User | null;
  error: AuthError | null;
}> {
  const { data, error } = await supabase.auth.getUser();
  return {
    user: data.user,
    error,
  };
}

/**
 * Listen to authentication state changes
 * Requirement 12.2: Session management
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

/**
 * Reset password for a user
 */
export async function resetPassword(
  email: string
): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  return { error };
}

/**
 * Update user password
 */
export async function updatePassword(
  newPassword: string
): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  return { error };
}
