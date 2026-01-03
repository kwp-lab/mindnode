-- MindNode Canvas Database Schema
-- Migration: Create projects table and update nodes table

-- ============================================
-- PROJECTS TABLE
-- ============================================
-- Projects represent individual canvases within a workspace
-- Hierarchy: User -> Workspace -> Project -> Nodes

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  root_node_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Canvas viewport state for this project
  viewport_x FLOAT DEFAULT 0,
  viewport_y FLOAT DEFAULT 0,
  viewport_zoom FLOAT DEFAULT 1
);

-- Index for efficient workspace project queries
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id);

-- ============================================
-- UPDATE NODES TABLE
-- ============================================
-- Add project_id column to nodes table
-- This allows nodes to belong to a specific project within a workspace

ALTER TABLE nodes 
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Index for efficient project node queries
CREATE INDEX IF NOT EXISTS idx_nodes_project ON nodes(project_id);

-- Add foreign key constraint for root_node_id in projects table
ALTER TABLE projects 
  ADD CONSTRAINT fk_projects_root_node 
  FOREIGN KEY (root_node_id) 
  REFERENCES nodes(id) 
  ON DELETE SET NULL;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR PROJECTS
-- ============================================

-- Enable RLS on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view projects in their own workspaces
CREATE POLICY "Users can view projects in own workspaces" ON projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE workspaces.id = projects.workspace_id 
      AND workspaces.user_id = auth.uid()
    )
  );

-- Policy: Users can create projects in their own workspaces
CREATE POLICY "Users can create projects in own workspaces" ON projects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE workspaces.id = projects.workspace_id 
      AND workspaces.user_id = auth.uid()
    )
  );

-- Policy: Users can update projects in their own workspaces
CREATE POLICY "Users can update projects in own workspaces" ON projects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE workspaces.id = projects.workspace_id 
      AND workspaces.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE workspaces.id = projects.workspace_id 
      AND workspaces.user_id = auth.uid()
    )
  );

-- Policy: Users can delete projects in their own workspaces
CREATE POLICY "Users can delete projects in own workspaces" ON projects
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE workspaces.id = projects.workspace_id 
      AND workspaces.user_id = auth.uid()
    )
  );

-- ============================================
-- UPDATE NODES RLS POLICIES
-- ============================================
-- Update nodes policies to also check project ownership

-- Drop existing policies first (they will be recreated)
DROP POLICY IF EXISTS "Users can view nodes in own workspaces" ON nodes;
DROP POLICY IF EXISTS "Users can create nodes in own workspaces" ON nodes;
DROP POLICY IF EXISTS "Users can update nodes in own workspaces" ON nodes;
DROP POLICY IF EXISTS "Users can delete nodes in own workspaces" ON nodes;

-- Recreate policies with project support
-- Policy: Users can view nodes in their own workspaces (with or without project)
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
    AND (
      nodes.project_id IS NULL 
      OR EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = nodes.project_id 
        AND projects.workspace_id = nodes.workspace_id
      )
    )
  );

-- Policy: Users can update nodes in their own workspaces
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
-- TRIGGER FOR PROJECTS UPDATED_AT TIMESTAMP
-- ============================================

-- Trigger for projects table
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION: CREATE DEFAULT PROJECTS FOR EXISTING WORKSPACES
-- ============================================
-- This creates a default project for each existing workspace
-- and migrates existing nodes to that project

DO $$
DECLARE
  ws RECORD;
  new_project_id UUID;
BEGIN
  -- For each workspace without any projects
  FOR ws IN 
    SELECT w.id, w.root_node_id 
    FROM workspaces w 
    WHERE NOT EXISTS (
      SELECT 1 FROM projects p WHERE p.workspace_id = w.id
    )
  LOOP
    -- Create a default project
    INSERT INTO projects (workspace_id, title, description, root_node_id)
    VALUES (ws.id, 'Main Canvas', 'Default project', ws.root_node_id)
    RETURNING id INTO new_project_id;
    
    -- Update all nodes in this workspace to belong to the new project
    UPDATE nodes 
    SET project_id = new_project_id 
    WHERE workspace_id = ws.id AND project_id IS NULL;
  END LOOP;
END $$;