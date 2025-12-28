# Authentication Setup Guide

This document provides instructions for setting up authentication in MindNode Canvas.

## Overview

MindNode Canvas uses Supabase for authentication, supporting:
- Email/password authentication
- OAuth providers (Google, GitHub)
- Row Level Security (RLS) for data isolation
- Protected routes with middleware

## Prerequisites

1. A Supabase project (create one at https://supabase.com)
2. Environment variables configured

## Environment Variables

Create a `.env.local` file in the `mindnode-canvas` directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OpenAI Configuration (for AI SDK)
OPENAI_API_KEY=your-openai-api-key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Setup

1. Run the migrations in order:

```bash
# First migration: Create tables and RLS policies
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/20241227000001_create_workspaces_and_nodes.sql

# Second migration: Configure authentication
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/20241228000001_configure_auth.sql
```

Or use the Supabase CLI:

```bash
supabase db push
```

## OAuth Provider Configuration

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable Google+ API
4. Go to Credentials > Create Credentials > OAuth 2.0 Client ID
5. Add authorized redirect URI: `https://[PROJECT_REF].supabase.co/auth/v1/callback`
6. Copy Client ID and Client Secret
7. In Supabase Dashboard:
   - Go to Authentication > Providers > Google
   - Enable Google provider
   - Paste Client ID and Client Secret
   - Save

### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - Application name: MindNode Canvas
   - Homepage URL: `http://localhost:3000` (or your production URL)
   - Authorization callback URL: `https://[PROJECT_REF].supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret
5. In Supabase Dashboard:
   - Go to Authentication > Providers > GitHub
   - Enable GitHub provider
   - Paste Client ID and Client Secret
   - Save

## Email Configuration

### Development

For development, Supabase provides a default email service. No additional configuration needed.

### Production

For production, configure a custom SMTP provider:

1. Go to Supabase Dashboard > Authentication > Email Templates
2. Configure SMTP settings with your email provider (SendGrid, Mailgun, etc.)
3. Customize email templates as needed

## Testing Authentication

1. Start the development server:

```bash
npm run dev
```

2. Navigate to `http://localhost:3000`
3. You should be redirected to `/login`
4. Try signing up with email/password
5. Try signing in with OAuth providers

## Authentication Flow

### Sign Up
1. User visits `/signup`
2. Enters email, password, and full name
3. System creates user account
4. Email confirmation sent (if enabled)
5. User redirected to home page

### Sign In
1. User visits `/login`
2. Enters email and password OR clicks OAuth button
3. System authenticates user
4. User redirected to home page or original destination

### Sign Out
1. User clicks "Sign out" button
2. System clears session
3. User redirected to `/login`

## Protected Routes

The following routes require authentication:
- `/` (home page)
- `/workspace/*` (workspace pages)

Public routes:
- `/login`
- `/signup`
- `/auth/callback` (OAuth callback)

## Row Level Security (RLS)

RLS policies ensure users can only access their own data:

### Workspaces
- Users can only view their own workspaces
- Users can only create workspaces for themselves
- Users can only update their own workspaces
- Users can only delete their own workspaces

### Nodes
- Users can only view nodes in their own workspaces
- Users can only create nodes in their own workspaces
- Users can only update nodes in their own workspaces
- Users can only delete nodes in their own workspaces

## API Authentication

All API routes under `/api/workspaces` and `/api/nodes` require authentication:

```typescript
import { requireAuth } from '@/lib/auth/server';

export async function GET() {
  const user = await requireAuth(); // Throws if not authenticated
  // ... rest of the handler
}
```

## Troubleshooting

### "Missing Supabase environment variables"
- Ensure `.env.local` file exists with correct values
- Restart the development server after adding environment variables

### "Unauthorized" errors
- Check that user is logged in
- Verify RLS policies are correctly configured
- Check browser console for authentication errors

### OAuth redirect issues
- Verify redirect URIs match exactly in provider settings
- Check that `NEXT_PUBLIC_APP_URL` is set correctly
- Ensure OAuth providers are enabled in Supabase Dashboard

### Email confirmation not working
- Check email templates in Supabase Dashboard
- Verify SMTP settings (for production)
- Check spam folder

## Security Best Practices

1. **Never commit `.env.local`** - Add it to `.gitignore`
2. **Use strong passwords** - Enforce minimum 8 characters
3. **Enable email confirmation** - For production environments
4. **Configure rate limiting** - Prevent brute force attacks
5. **Use HTTPS** - Always use HTTPS in production
6. **Rotate secrets** - Regularly rotate API keys and secrets
7. **Monitor auth logs** - Check Supabase Dashboard for suspicious activity

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js Authentication](https://nextjs.org/docs/authentication)
- [OAuth 2.0 Specification](https://oauth.net/2/)
