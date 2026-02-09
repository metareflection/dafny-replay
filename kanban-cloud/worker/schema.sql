-- D1 Schema for kanban-cloud
-- SQLite-compatible schema for kanban boards

-- Users table (replaces Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Projects table (stores Dafny kanban state)
-- State structure: { cols: [], lanes: {}, wip: {}, cards: {}, nextId: 0 }
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id),
  state TEXT NOT NULL DEFAULT '{"cols":[],"lanes":{},"wip":{},"cards":{},"nextId":0}',
  version INTEGER NOT NULL DEFAULT 0,
  applied_log TEXT NOT NULL DEFAULT '[]',
  audit_log TEXT NOT NULL DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Project members table (access control)
CREATE TABLE IF NOT EXISTS project_members (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (project_id, user_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
