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
import { getOrCreateUserProject, saveProject } from './persistence.js';

// In-memory cache of projects: Map<projectId, { state, ownerEmail }>
const projectCache = new Map();

// Get or load a user's project (creates if needed)
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

// GET /sync - Get current state (requires auth + Dafny-verified membership)
app.get('/sync', requireAuth, async (req, res) => {
  try {
    const { projectId, state } = await getUserProject(req.userId);
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
app.post('/dispatch', requireAuth, async (req, res) => {
  const { baseVersion, action } = req.body;
  const userId = req.userId;  // From auth middleware, NOT from request body

  try {
    // Load user's project
    const { projectId, state } = await getUserProject(userId);

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
app.get('/state', requireAuth, async (req, res) => {
  try {
    const { projectId, state } = await getUserProject(req.userId);
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
    console.log('  Set Authorization: Bearer <token> header');
  } else {
    console.log('Authentication: X-User-Id header (development mode)');
    console.log('  Set SUPABASE_URL and SUPABASE_ANON_KEY for production');
  }
  console.log('');
  console.log('Endpoints:');
  console.log('  GET  /sync     - Get current state (creates project if needed)');
  console.log('  POST /dispatch - Dispatch action { baseVersion, action }');
  console.log('  GET  /state    - Debug: raw server state');
  console.log('');
  console.log('Features:');
  console.log('  - Per-user projects (each user gets their own board)');
  console.log('  - Verified authorization (only members can edit)');
  console.log('  - Only owner can invite/remove members');
  console.log('  - Anchor-based moves (AtEnd, Before, After)');
  console.log('  - Server-allocated card IDs');
});
