-- Kanban Supabase Schema
-- Dafny-verified collaborative Kanban with Supabase

-- ============================================================================
-- Tables
-- ============================================================================

-- Projects table: stores Dafny state
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Dafny model state (JSON)
  state JSONB NOT NULL DEFAULT '{
    "cols": [],
    "lanes": {},
    "wip": {},
    "cards": {},
    "nextId": 0
  }',

  -- For reconciliation (MultiCollaboration pattern)
  version INT NOT NULL DEFAULT 0,
  applied_log JSONB NOT NULL DEFAULT '[]',
  audit_log JSONB NOT NULL DEFAULT '[]',  -- Full audit trail from verified Dispatch

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- Migration: Add audit_log column to existing databases
-- Run this if you have an existing projects table without audit_log:
-- ============================================================================
-- ALTER TABLE projects ADD COLUMN IF NOT EXISTS audit_log JSONB DEFAULT '[]';

-- Project members: who can access which project
CREATE TABLE IF NOT EXISTS project_members (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

-- Index for fast membership lookups
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Helper function to check membership (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id
    AND user_id = auth.uid()
  )
$$;

-- Helper function to check ownership
CREATE OR REPLACE FUNCTION is_project_owner(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id
    AND owner_id = auth.uid()
  )
$$;

-- Projects: members can read
-- (Writes go through Edge Function which uses service role)
CREATE POLICY "members can read projects"
  ON projects FOR SELECT
  USING (is_project_member(id));

-- Project members: members can see other members in their projects
CREATE POLICY "members can view membership"
  ON project_members FOR SELECT
  USING (is_project_member(project_id));

-- Only owner can add members
CREATE POLICY "owner can add members"
  ON project_members FOR INSERT
  WITH CHECK (is_project_owner(project_id));

-- Only owner can remove members (but not themselves)
CREATE POLICY "owner can remove members"
  ON project_members FOR DELETE
  USING (
    is_project_owner(project_id)
    AND user_id != auth.uid()
  );

-- ============================================================================
-- Functions
-- ============================================================================

-- Create a new project (owner auto-added as member)
CREATE OR REPLACE FUNCTION create_project(project_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Create project
  INSERT INTO projects (name, owner_id, state)
  VALUES (
    project_name,
    auth.uid(),
    '{"cols": [], "lanes": {}, "wip": {}, "cards": {}, "nextId": 0}'::jsonb
  )
  RETURNING id INTO new_id;

  -- Add owner as member
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (new_id, auth.uid(), 'owner');

  RETURN new_id;
END;
$$;

-- ============================================================================
-- Realtime
-- ============================================================================

-- Enable realtime for projects table
ALTER PUBLICATION supabase_realtime ADD TABLE projects;

-- ============================================================================
-- Profiles table for user metadata
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for looking up users by email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read all profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
