-- Todo Collab Supabase Schema
-- Dafny-verified collaborative Todo app with Supabase

-- ============================================================================
-- Tables
-- ============================================================================

-- Projects table: stores Dafny state
-- Each project contains the full Todo model state
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Dafny Todo model state (JSON)
  -- Matches TodoDomain.Model structure:
  --   mode: 'Personal' | 'Collaborative'
  --   owner: UserId (string)
  --   members: array of UserId
  --   lists: array of ListId (ordered)
  --   listNames: { listId: name }
  --   tasks: { listId: [taskId, ...] }
  --   taskData: { taskId: Task }
  --   tags: { tagId: { name: string } }
  --   nextListId, nextTaskId, nextTagId: allocators
  state JSONB NOT NULL DEFAULT '{
    "mode": "Personal",
    "owner": "",
    "members": [],
    "lists": [],
    "listNames": {},
    "tasks": {},
    "taskData": {},
    "tags": {},
    "nextListId": 0,
    "nextTaskId": 0,
    "nextTagId": 0
  }',

  -- For reconciliation (MultiCollaboration pattern)
  version INT NOT NULL DEFAULT 0,
  applied_log JSONB NOT NULL DEFAULT '[]',
  audit_log JSONB NOT NULL DEFAULT '[]',  -- Full audit trail from verified Dispatch

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- Migration: From Kanban to Todo schema
-- Run this if you have an existing Kanban projects table:
-- ============================================================================
-- UPDATE projects SET state = '{
--   "mode": "Personal",
--   "owner": "",
--   "members": [],
--   "lists": [],
--   "listNames": {},
--   "tasks": {},
--   "taskData": {},
--   "tags": {},
--   "nextListId": 0,
--   "nextTaskId": 0,
--   "nextTagId": 0
-- }'::jsonb WHERE state->>'cols' IS NOT NULL;

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
-- Initializes Todo model with owner as the sole member (Personal mode)
-- Rejects duplicate project names (case-insensitive) per user
CREATE OR REPLACE FUNCTION create_project(project_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
  owner_id_str TEXT;
BEGIN
  -- Check for duplicate project name (case-insensitive) for this user
  IF EXISTS (
    SELECT 1 FROM projects
    WHERE owner_id = auth.uid()
    AND LOWER(name) = LOWER(project_name)
  ) THEN
    RAISE EXCEPTION 'Project with this name already exists';
  END IF;

  -- Get owner ID as string for Dafny model
  owner_id_str := auth.uid()::TEXT;

  -- Create project with Todo model state
  -- Owner is set in the Dafny model state, members includes owner
  INSERT INTO projects (name, owner_id, state)
  VALUES (
    project_name,
    auth.uid(),
    jsonb_build_object(
      'mode', 'Personal',
      'owner', owner_id_str,
      'members', jsonb_build_array(owner_id_str),
      'lists', '[]'::jsonb,
      'listNames', '{}'::jsonb,
      'tasks', '{}'::jsonb,
      'taskData', '{}'::jsonb,
      'tags', '{}'::jsonb,
      'nextListId', 0,
      'nextTaskId', 0,
      'nextTagId', 0
    )
  )
  RETURNING id INTO new_id;

  -- Add owner as member in project_members table
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (new_id, auth.uid(), 'owner');

  RETURN new_id;
END;
$$;

-- Rename a project (owner only)
CREATE OR REPLACE FUNCTION rename_project(p_project_id UUID, p_new_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check ownership
  IF NOT is_project_owner(p_project_id) THEN
    RAISE EXCEPTION 'Only the owner can rename a project';
  END IF;

  -- Check for duplicate name (case-insensitive) for this user
  IF EXISTS (
    SELECT 1 FROM projects
    WHERE owner_id = auth.uid()
    AND LOWER(name) = LOWER(p_new_name)
    AND id != p_project_id
  ) THEN
    RAISE EXCEPTION 'Project with this name already exists';
  END IF;

  -- Update the name
  UPDATE projects
  SET name = p_new_name, updated_at = now()
  WHERE id = p_project_id;
END;
$$;

-- ============================================================================
-- Multi-Project Functions (for cross-project operations)
-- ============================================================================

-- Check if user is member of ALL specified projects
CREATE OR REPLACE FUNCTION is_member_of_all_projects(p_project_ids UUID[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT (
    SELECT COUNT(DISTINCT project_id)
    FROM project_members
    WHERE project_id = ANY(p_project_ids)
    AND user_id = auth.uid()
  ) = array_length(p_project_ids, 1)
$$;

-- Save multi-project update atomically
-- Used by /multi-dispatch for cross-project operations
-- Each update contains: id, state, expectedVersion, newVersion, newLogEntry
-- Note: Membership check is done by the edge function before calling this.
-- This function is called with service role, so we skip auth.uid() checks.
CREATE OR REPLACE FUNCTION save_multi_update(updates_json TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updates JSONB := updates_json::jsonb;
  u RECORD;
  updated_projects JSONB := '[]'::jsonb;
BEGIN
  -- Process each update
  FOR u IN SELECT value FROM jsonb_array_elements(updates)
  LOOP
    UPDATE projects
    SET state = (u.value->>'state')::jsonb,
        version = (u.value->>'newVersion')::int,
        applied_log = applied_log || (u.value->'newLogEntry'),
        updated_at = now()
    WHERE id = (u.value->>'id')::uuid
    AND version = (u.value->>'expectedVersion')::int;

    IF NOT FOUND THEN
      -- Conflict detected - rollback
      RAISE EXCEPTION 'Version conflict on project %', u.value->>'id';
    END IF;

    -- Track updated project
    updated_projects := updated_projects || jsonb_build_object(
      'id', u.value->>'id',
      'version', (u.value->>'newVersion')::int
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'updated', updated_projects
  );
END;
$$;

-- Load projects for cross-project dispatch
-- Returns state, version, and applied_log for each project
CREATE OR REPLACE FUNCTION load_projects_for_dispatch(p_project_ids UUID[])
RETURNS TABLE (
  id UUID,
  state JSONB,
  version INT,
  applied_log JSONB
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.id, p.state, p.version, p.applied_log
  FROM projects p
  WHERE p.id = ANY(p_project_ids)
  AND is_project_member(p.id)
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
