-- Configure Authentication Settings
-- Migration: Set up OAuth providers and authentication policies

-- Note: OAuth provider configuration (Google, GitHub) must be done through
-- the Supabase Dashboard under Authentication > Providers
-- This migration documents the required configuration

-- Enable email confirmations (optional - can be disabled for development)
-- This is configured in the Supabase Dashboard under Authentication > Settings

-- Create a function to handle new user setup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a default workspace for new users
  INSERT INTO public.workspaces (user_id, title)
  VALUES (NEW.id, 'My First Workspace');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default workspace when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Comments for OAuth configuration (to be done in Supabase Dashboard)
COMMENT ON SCHEMA public IS 'OAuth Configuration Required:
1. Google OAuth:
   - Go to Supabase Dashboard > Authentication > Providers > Google
   - Enable Google provider
   - Add Client ID and Client Secret from Google Cloud Console
   - Add authorized redirect URI: https://[PROJECT_REF].supabase.co/auth/v1/callback

2. GitHub OAuth:
   - Go to Supabase Dashboard > Authentication > Providers > GitHub
   - Enable GitHub provider
   - Add Client ID and Client Secret from GitHub OAuth Apps
   - Add authorized redirect URI: https://[PROJECT_REF].supabase.co/auth/v1/callback

3. Email Settings:
   - Configure email templates in Authentication > Email Templates
   - Set up SMTP settings if using custom email provider
';
