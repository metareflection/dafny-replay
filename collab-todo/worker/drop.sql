-- Drop all tables (reverse dependency order)
PRAGMA foreign_keys = OFF;
DROP TABLE IF EXISTS project_members;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;
PRAGMA foreign_keys = ON;
