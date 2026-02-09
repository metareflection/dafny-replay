-- ClearSplit Supabase Schema
-- Dafny-verified collaborative expense splitting with Supabase

-- ============================================================================
-- Tables
-- ============================================================================

-- Groups table: stores Dafny state for expense groups
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Dafny model state (JSON)
  -- ClearSplit Model: { members, memberList, expenses, settlements }
  -- members/memberList use display_names from group_members
  state JSONB NOT NULL DEFAULT '{
    "members": [],
    "memberList": [],
    "expenses": [],
    "settlements": []
  }',

  -- For reconciliation (MultiCollaboration pattern)
  version INT NOT NULL DEFAULT 0,
  applied_log JSONB NOT NULL DEFAULT '[]',
  audit_log JSONB NOT NULL DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Group members: actual users who can access the group
CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- display_name is how this user appears in expenses (e.g., "Alice")
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- Invitations to join a group
CREATE TABLE IF NOT EXISTS group_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, email)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_email ON group_invites(email);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invites ENABLE ROW LEVEL SECURITY;

-- Helper function to check membership
CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
    AND user_id = auth.uid()
  )
$$;

-- Helper function to check ownership
CREATE OR REPLACE FUNCTION is_group_owner(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM groups
    WHERE id = p_group_id
    AND owner_id = auth.uid()
  )
$$;

-- Groups: members can read full data
CREATE POLICY "members can read groups"
  ON groups FOR SELECT
  USING (is_group_member(id));

-- Function to get group name (for invites and listings)
CREATE OR REPLACE FUNCTION get_group_name(p_group_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT name FROM groups WHERE id = p_group_id
$$;

-- Group members: members can see other members in their groups
CREATE POLICY "members can view membership"
  ON group_members FOR SELECT
  USING (is_group_member(group_id));

-- Only owner can add members
CREATE POLICY "owner can add members"
  ON group_members FOR INSERT
  WITH CHECK (is_group_owner(group_id));

-- Only owner can remove members (but not themselves)
CREATE POLICY "owner can remove members"
  ON group_members FOR DELETE
  USING (
    is_group_owner(group_id)
    AND user_id != auth.uid()
  );

-- Invites: members can view invites for their groups, invited users can see their invites
CREATE POLICY "members can view invites"
  ON group_invites FOR SELECT
  USING (is_group_member(group_id) OR email = auth.jwt() ->> 'email');

-- Only owner can create invites
CREATE POLICY "owner can create invites"
  ON group_invites FOR INSERT
  WITH CHECK (is_group_owner(group_id));

-- Owner can delete invites, or invited user can delete their own
CREATE POLICY "can delete invites"
  ON group_invites FOR DELETE
  USING (is_group_owner(group_id) OR email = auth.jwt() ->> 'email');

-- ============================================================================
-- Functions
-- ============================================================================

-- Helper to rebuild Dafny state from group_members
CREATE OR REPLACE FUNCTION rebuild_group_state(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_names TEXT[];
  current_state JSONB;
BEGIN
  -- Get all display names in join order
  SELECT array_agg(display_name ORDER BY joined_at)
  INTO member_names
  FROM group_members
  WHERE group_id = p_group_id;

  -- Get current state (preserving expenses/settlements)
  SELECT state INTO current_state FROM groups WHERE id = p_group_id;

  -- Update members in state
  RETURN jsonb_set(
    jsonb_set(current_state, '{members}', to_jsonb(member_names)),
    '{memberList}', to_jsonb(member_names)
  );
END;
$$;

-- Create a new expense group (owner only, no other members yet)
CREATE OR REPLACE FUNCTION create_expense_group(
  group_name TEXT,
  owner_display_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
  initial_state JSONB;
BEGIN
  -- Build initial state with just the owner
  initial_state := jsonb_build_object(
    'members', jsonb_build_array(owner_display_name),
    'memberList', jsonb_build_array(owner_display_name),
    'expenses', '[]'::jsonb,
    'settlements', '[]'::jsonb
  );

  -- Create group
  INSERT INTO groups (name, owner_id, state)
  VALUES (group_name, auth.uid(), initial_state)
  RETURNING id INTO new_id;

  -- Add owner as member
  INSERT INTO group_members (group_id, user_id, display_name, role)
  VALUES (new_id, auth.uid(), owner_display_name, 'owner');

  RETURN new_id;
END;
$$;

-- Invite a user to a group by email
CREATE OR REPLACE FUNCTION invite_to_group(
  p_group_id UUID,
  p_email TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_id UUID;
BEGIN
  -- Check caller is owner
  IF NOT is_group_owner(p_group_id) THEN
    RAISE EXCEPTION 'Only the group owner can invite members';
  END IF;

  -- Check not already a member
  IF EXISTS (
    SELECT 1 FROM group_members gm
    JOIN auth.users u ON u.id = gm.user_id
    WHERE gm.group_id = p_group_id AND u.email = p_email
  ) THEN
    RAISE EXCEPTION 'User is already a member';
  END IF;

  -- Create invite (upsert)
  INSERT INTO group_invites (group_id, email, invited_by)
  VALUES (p_group_id, p_email, auth.uid())
  ON CONFLICT (group_id, email) DO UPDATE SET created_at = now()
  RETURNING id INTO invite_id;

  RETURN invite_id;
END;
$$;

-- Accept an invitation and join a group
CREATE OR REPLACE FUNCTION join_group(
  p_group_id UUID,
  p_display_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  new_state JSONB;
BEGIN
  -- Get current user's email
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();

  -- Check there's an invite for this user
  IF NOT EXISTS (
    SELECT 1 FROM group_invites
    WHERE group_id = p_group_id AND email = user_email
  ) THEN
    RAISE EXCEPTION 'No invitation found for this group';
  END IF;

  -- Check display name is unique in this group
  IF EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND display_name = p_display_name
  ) THEN
    RAISE EXCEPTION 'Display name already taken in this group';
  END IF;

  -- Add as member
  INSERT INTO group_members (group_id, user_id, display_name, role)
  VALUES (p_group_id, auth.uid(), p_display_name, 'member');

  -- Delete the invite
  DELETE FROM group_invites WHERE group_id = p_group_id AND email = user_email;

  -- Rebuild and update group state with new member
  new_state := rebuild_group_state(p_group_id);
  UPDATE groups SET state = new_state, version = version + 1 WHERE id = p_group_id;

  RETURN TRUE;
END;
$$;

-- ============================================================================
-- Realtime
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE groups;

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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
