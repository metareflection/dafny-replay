-- Drop all tables (reverse dependency order)
PRAGMA foreign_keys = OFF;
DROP TABLE IF EXISTS group_invites;
DROP TABLE IF EXISTS group_members;
DROP TABLE IF EXISTS groups;
DROP TABLE IF EXISTS users;
PRAGMA foreign_keys = ON;
