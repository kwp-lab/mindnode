/**
 * OAuth callback handler
 * 
 * Handles OAuth redirects from providers (Google, GitHub)
 * and email confirmation links
 * 
 * Requirements:
 * - 12.5: OAuth authentication callback handling
 */

import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  if (code) {
    const supabase = await createServerClient();
    
    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      // Redirect to login with error
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }
  }

  // Redirect to the next URL or home
  return NextResponse.redirect(`${requestUrl.origin}${next}`);
}
