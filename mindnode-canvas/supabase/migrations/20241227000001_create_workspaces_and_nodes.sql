-- MindNode Canvas Database Schema
-- Migration: Create workspaces and nodes tables with RLS policies

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- WORKSPACES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  root_node_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  viewport_x FLOAT DEFAULT 0,
  viewport_y FLOAT DEFAULT 0,
  viewport_zoom FLOAT DEFAULT 1
);

-- Index for efficient user workspace queries
CREATE INDEX IF NOT EXISTS idx_workspaces_user ON workspaces(user_id);

-- ============================================
-- NODES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('root', 'user', 'ai')),
  content TEXT NOT NULL DEFAULT '',
  selection_source TEXT,
  position_x FLOAT NOT NULL DEFAULT 0,
  position_y FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_nodes_workspace ON nodes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(parent_id);

-- Add foreign key constraint for root_node_id after nodes table exists
ALTER TABLE workspaces 
  ADD CONSTRAINT fk_workspaces_root_node 
  FOREIGN KEY (root_node_id) 
  REFERENCES nodes(id) 
  ON DELETE SET NULL;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on workspaces table
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;


-- Policy: Users can only view their own workspaces (Requirement 12.3)
CREATE POLICY "Users can view own workspaces" ON workspaces
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own workspaces
CREATE POLICY "Users can create own workspaces" ON workspaces
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own workspaces
CREATE POLICY "Users can update own workspaces" ON workspaces
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own workspaces (Requirement 7.4)
CREATE POLICY "Users can delete own workspaces" ON workspaces
  FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS on nodes table
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view nodes in their own workspaces
CREATE POLICY "Users can view nodes in own workspaces" ON nodes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE workspaces.id = nodes.workspace_id 
      AND workspaces.user_id = auth.uid()
    )
  );

-- Policy: Users can create nodes in their own workspaces
CREATE POLICY "Users can create nodes in own workspaces" ON nodes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE workspaces.id = nodes.workspace_id 
      AND workspaces.user_id = auth.uid()
    )
  );

-- Policy: Users can update nodes in their own workspaces (Requirement 10.1, 10.2)
CREATE POLICY "Users can update nodes in own workspaces" ON nodes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE workspaces.id = nodes.workspace_id 
      AND workspaces.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE workspaces.id = nodes.workspace_id 
      AND workspaces.user_id = auth.uid()
    )
  );

-- Policy: Users can delete nodes in their own workspaces
CREATE POLICY "Users can delete nodes in own workspaces" ON nodes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE workspaces.id = nodes.workspace_id 
      AND workspaces.user_id = auth.uid()
    )
  );

-- ============================================
-- TRIGGER FOR UPDATED_AT TIMESTAMP
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for workspaces table
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for nodes table
CREATE TRIGGER update_nodes_updated_at
  BEFORE UPDATE ON nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
