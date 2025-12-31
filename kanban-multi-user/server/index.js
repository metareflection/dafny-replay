// Express server using Dafny-verified KanbanMultiUserAppCore
// Multi-user Kanban with verified authorization and Supabase auth

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {
  KanbanMultiUser,
  KanbanMultiUserAppCore,
  modelToJs,
  actionFromJson,
  toNumber,
  BigNumber,
  _dafny,
  trySync
} from './kanban-core.js';
import { requireAuth, isSupabaseConfigured } from './supabase.js';
import { getOrCreateUserProject, saveProject, listProjects, loadProjectById } from './persistence.js';

// In-memory cache of projects: Map<projectId, { state, ownerEmail }>
const projectCache = new Map();

// Get or load a user's own project (creates if needed)
const getUserProject = async (userEmail) => {
  // Check cache first - look for project owned by this user
  for (const [projectId, project] of projectCache) {
    if (project.ownerEmail === userEmail) {
      return { projectId, state: project.state };
    }
  }

  // Load from persistence
  const { projectId, state } = await getOrCreateUserProject(userEmail);
  projectCache.set(projectId, { state, ownerEmail: userEmail });
  return { projectId, state };
};

// Load a specific project by ID (from cache or persistence)
const getProjectById = async (projectId) => {
  // Check cache first
  if (projectCache.has(projectId)) {
    const cached = projectCache.get(projectId);
    return { projectId, state: cached.state, ownerEmail: cached.ownerEmail };
  }

  // Load from persistence
  const result = await loadProjectById(projectId);
  if (!result) return null;

  projectCache.set(projectId, { state: result.state, ownerEmail: result.ownerEmail });
  return { projectId, state: result.state, ownerEmail: result.ownerEmail };
};

// Update cached state and persist
const updateProject = async (projectId, newState) => {
  const cached = projectCache.get(projectId);
  if (cached) {
    cached.state = newState;
  }
  await saveProject(projectId, newState);
};

const app = express();
app.use(cors());
app.use(express.json());

// GET /projects - List projects user can access
app.get('/projects', requireAuth, async (req, res) => {
  try {
    const projects = await listProjects(req.userId);
    res.json({ projects, userId: req.userId });
  } catch (e) {
    console.error('[projects] Error:', e.message);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// GET /sync - Get current state (requires auth + Dafny-verified membership)
// Query param: ?projectId=xxx (optional, defaults to user's own project)
app.get('/sync', requireAuth, async (req, res) => {
  try {
    let projectId = req.query.projectId;
    let state;

    if (projectId) {
      // Load specific project
      const project = await getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      state = project.state;
    } else {
      // Load user's own project (creates if needed)
      const project = await getUserProject(req.userId);
      projectId = project.projectId;
      state = project.state;
    }

    // Dafny-verified membership check
    const result = trySync(state, req.userId);
    if (!result.ok) {
      return res.status(403).json({ error: 'Not a member of this project' });
    }

    res.json({
      version: result.version,
      model: result.model,
      userId: req.userId,
      projectId
    });
  } catch (e) {
    console.error('[sync] Error:', e.message);
    res.status(500).json({ error: 'Failed to load project' });
  }
});

// POST /dispatch - Process a single action (requires auth, injects userId)
// Body: { baseVersion, action, projectId? }
app.post('/dispatch', requireAuth, async (req, res) => {
  const { baseVersion, action, projectId: requestedProjectId } = req.body;
  const userId = req.userId;  // From auth middleware, NOT from request body

  try {
    // Load project (specific or user's own)
    let projectId, state;
    if (requestedProjectId) {
      const project = await getProjectById(requestedProjectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      projectId = requestedProjectId;
      state = project.state;
    } else {
      const project = await getUserProject(userId);
      projectId = project.projectId;
      state = project.state;
    }

    // Dafny-verified membership check (fail fast)
    const syncCheck = trySync(state, userId);
    if (!syncCheck.ok) {
      return res.status(403).json({ error: 'Not a member of this project' });
    }

    // Convert baseVersion to BigNumber
    const baseVersionBN = new BigNumber(baseVersion);

    // Parse action and inject authenticated userId as actor
    let dafnyAction;
    try {
      dafnyAction = actionFromJson(action, userId);  // userId injected here!
    } catch (e) {
      return res.status(400).json({ error: `Invalid action: ${e.message}` });
    }

    // Check version constraint
    const currentVersion = toNumber(KanbanMultiUserAppCore.__default.ServerVersion(state));
    if (baseVersion > currentVersion) {
      return res.status(400).json({ error: 'Invalid base version' });
    }

    // Call Dafny Dispatch via KanbanMultiUser
    const result = KanbanMultiUser.__default.Dispatch(state, baseVersionBN, dafnyAction);
    const newState = result[0];
    const reply = result[1];

    // Build response
    if (KanbanMultiUserAppCore.__default.IsAccepted(reply)) {
      const newVersion = toNumber(reply.dtor_newVersion);
      const newPresent = reply.dtor_newPresent;

      // Persist state after successful action
      try {
        await updateProject(projectId, newState);
      } catch (e) {
        console.error('[server] Failed to persist state:', e.message);
        // Continue anyway - state is in memory
      }

      res.json({
        status: 'accepted',
        version: newVersion,
        model: modelToJs(newPresent)
      });
    } else {
      res.json({
        status: 'rejected',
        reason: 'Unauthorized or DomainInvalid'
      });
    }
  } catch (e) {
    console.error('[dispatch] Error:', e.message);
    res.status(500).json({ error: 'Failed to process action' });
  }
});

// GET /state - Debug endpoint (requires Dafny-verified membership)
// Query param: ?projectId=xxx (optional)
app.get('/state', requireAuth, async (req, res) => {
  try {
    let projectId = req.query.projectId;
    let state;

    if (projectId) {
      const project = await getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      state = project.state;
    } else {
      const project = await getUserProject(req.userId);
      projectId = project.projectId;
      state = project.state;
    }

    const result = trySync(state, req.userId);
    if (!result.ok) {
      return res.status(403).json({ error: 'Not a member of this project' });
    }

    res.json({
      version: result.version,
      model: result.model,
      projectId
    });
  } catch (e) {
    console.error('[state] Error:', e.message);
    res.status(500).json({ error: 'Failed to load project' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Kanban Multi-User server running on http://localhost:${PORT}`);
  console.log('');
  if (isSupabaseConfigured()) {
    console.log('Authentication: Supabase JWT (production mode)');
  } else {
    console.log('Authentication: X-User-Id header (development mode)');
  }
  console.log('');
  console.log('Endpoints:');
  console.log('  GET  /projects - List projects user can access');
  console.log('  GET  /sync     - Get state (?projectId=xxx optional)');
  console.log('  POST /dispatch - Dispatch action { baseVersion, action, projectId? }');
  console.log('  GET  /state    - Debug (?projectId=xxx optional)');
  console.log('');
  console.log('Features:');
  console.log('  - Per-user projects (auto-created on first sync)');
  console.log('  - Project selection (owner can invite members)');
  console.log('  - Dafny-verified authorization');
});
