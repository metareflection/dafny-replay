// Persistence layer for Kanban projects using Supabase
// Stores and retrieves ServerState as JSON in Postgres

import { supabase, isSupabaseConfigured } from './supabase.js';
import { serverStateToJson, serverStateFromJson, KanbanMultiUserAppCore, _dafny } from './kanban-core.js';

// In-memory fallback for when Supabase is not configured (dev mode)
const memoryStore = new Map();

// Default project ID for single-project mode (fixed UUID)
const DEFAULT_PROJECT_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Load a project's state from the database
 * @param {string} projectId - The project ID (or 'default' for single-project mode)
 * @returns {Promise<{state: DafnyServerState, isNew: boolean}>}
 */
export const loadProject = async (projectId = DEFAULT_PROJECT_ID) => {
  if (!isSupabaseConfigured()) {
    // Dev mode: use in-memory store
    if (memoryStore.has(projectId)) {
      const json = memoryStore.get(projectId);
      return { state: serverStateFromJson(json), isNew: false };
    }
    return { state: null, isNew: true };
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('state')
      .eq('id', projectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Row not found
        return { state: null, isNew: true };
      }
      throw error;
    }

    return { state: serverStateFromJson(data.state), isNew: false };
  } catch (e) {
    console.error('Error loading project:', e.message);
    throw e;
  }
};

/**
 * Save a project's state to the database
 * @param {string} projectId - The project ID (null for default project)
 * @param {DafnyServerState} state - The Dafny ServerState
 * @param {string} ownerEmail - The owner's email (for new projects)
 * @param {string} name - The project name (for new projects)
 */
export const saveProject = async (projectId, state, ownerEmail = null, name = null) => {
  projectId = projectId || DEFAULT_PROJECT_ID;
  const json = serverStateToJson(state);

  if (!isSupabaseConfigured()) {
    // Dev mode: use in-memory store
    memoryStore.set(projectId, json);
    console.log(`[persistence] Saved project ${projectId} to memory (dev mode)`);
    return;
  }

  try {
    const { error } = await supabase
      .from('projects')
      .upsert({
        id: projectId,
        name: name || projectId,
        owner_email: ownerEmail || json.present.owner,
        state: json,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (error) throw error;
    console.log(`[persistence] Saved project ${projectId}`);
  } catch (e) {
    console.error('Error saving project:', e.message);
    throw e;
  }
};

/**
 * Create a new project with an owner
 * @param {string} ownerEmail - The owner's email
 * @param {string} name - The project name
 * @returns {Promise<{projectId: string, state: DafnyServerState}>}
 */
export const createProject = async (ownerEmail, name) => {
  // Create initial state with owner
  const owner = _dafny.Seq.UnicodeFromString(ownerEmail);
  const state = KanbanMultiUserAppCore.__default.InitProject(owner);

  // Generate a unique project ID
  const projectId = isSupabaseConfigured()
    ? crypto.randomUUID()
    : `project-${Date.now()}`;

  await saveProject(projectId, state, ownerEmail, name);

  return { projectId, state };
};

/**
 * List projects accessible to a user
 * @param {string} userEmail - The user's email
 * @returns {Promise<Array<{id: string, name: string, owner_email: string}>>}
 */
export const listProjects = async (userEmail) => {
  if (!isSupabaseConfigured()) {
    // Dev mode: return all projects from memory
    const projects = [];
    for (const [id, json] of memoryStore) {
      if (json.present.members.includes(userEmail)) {
        projects.push({
          id,
          name: id,
          owner_email: json.present.owner,
          is_owner: json.present.owner === userEmail
        });
      }
    }
    return projects;
  }

  try {
    // Query projects where user is in the members array
    // Note: This requires the state column to have the members extracted or use a SQL function
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, owner_email, state')
      .or(`owner_email.eq.${userEmail}`);

    if (error) throw error;

    // Filter by membership (for now, check in JavaScript)
    // A more efficient approach would be a generated column or RLS policy
    return (data || [])
      .filter(p => p.state?.present?.members?.includes(userEmail))
      .map(p => ({
        id: p.id,
        name: p.name,
        owner_email: p.owner_email,
        is_owner: p.owner_email === userEmail
      }));
  } catch (e) {
    console.error('Error listing projects:', e.message);
    throw e;
  }
};

/**
 * Get or create a project for a user (each user gets their own project)
 * @param {string} userEmail - The user's email
 * @returns {Promise<{projectId: string, state: DafnyServerState}>}
 */
export const getOrCreateUserProject = async (userEmail) => {
  if (!isSupabaseConfigured()) {
    // Dev mode: look for project owned by this user
    for (const [id, json] of memoryStore) {
      if (json.present.owner === userEmail) {
        return { projectId: id, state: serverStateFromJson(json) };
      }
    }
    // No project found, create one
    console.log(`[persistence] Creating project for ${userEmail}`);
    return await createProject(userEmail, `${userEmail}'s Project`);
  }

  try {
    // Look for a project owned by this user
    const { data, error } = await supabase
      .from('projects')
      .select('id, state')
      .eq('owner_email', userEmail)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No project found, create one
        console.log(`[persistence] Creating project for ${userEmail}`);
        return await createProject(userEmail, `${userEmail}'s Project`);
      }
      throw error;
    }

    console.log(`[persistence] Loaded project for ${userEmail}`);
    return { projectId: data.id, state: serverStateFromJson(data.state) };
  } catch (e) {
    console.error('Error getting user project:', e.message);
    throw e;
  }
};
