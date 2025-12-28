/**
 * Supabase client for client-side operations
 * 
 * This client is used for:
 * - Authentication operations (sign up, sign in, sign out)
 * - Real-time subscriptions
 * - Client-side data fetching with RLS
 * 
 * Requirements:
 * - 12.1: Email/password authentication
 * - 12.2: User login and session management
 * - 12.5: OAuth authentication (Google, GitHub)
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);
