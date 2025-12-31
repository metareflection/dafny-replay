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
  _dafny
} from './kanban-core.js';
import { requireAuth, isSupabaseConfigured } from './supabase.js';

// Server state (in-memory, single project)
// In production, this would be stored in Supabase and loaded per-project
const DEFAULT_OWNER = process.env.DEFAULT_OWNER || 'owner@example.com';
let serverState = KanbanMultiUserAppCore.__default.InitProject(
  _dafny.Seq.UnicodeFromString(DEFAULT_OWNER)
);

const app = express();
app.use(cors());
app.use(express.json());

// GET /sync - Get current state (requires auth)
app.get('/sync', requireAuth, (req, res) => {
  const version = toNumber(KanbanMultiUserAppCore.__default.ServerVersion(serverState));
  const present = KanbanMultiUserAppCore.__default.ServerModel(serverState);
  res.json({
    version,
    model: modelToJs(present),
    userId: req.userId
  });
});

// POST /dispatch - Process a single action (requires auth, injects userId)
app.post('/dispatch', requireAuth, (req, res) => {
  const { baseVersion, action } = req.body;
  const userId = req.userId;  // From auth middleware, NOT from request body

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
  const currentVersion = toNumber(KanbanMultiUserAppCore.__default.ServerVersion(serverState));
  if (baseVersion > currentVersion) {
    return res.status(400).json({ error: 'Invalid base version' });
  }

  // Call Dafny Dispatch via KanbanMultiUser
  const result = KanbanMultiUser.__default.Dispatch(serverState, baseVersionBN, dafnyAction);
  const newState = result[0];
  const reply = result[1];

  // Update server state
  serverState = newState;

  // Build response
  if (KanbanMultiUserAppCore.__default.IsAccepted(reply)) {
    const newVersion = toNumber(reply.dtor_newVersion);
    const newPresent = reply.dtor_newPresent;
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
});

// GET /state - Debug endpoint to see raw server state
app.get('/state', requireAuth, (req, res) => {
  const version = toNumber(KanbanMultiUserAppCore.__default.ServerVersion(serverState));
  const present = KanbanMultiUserAppCore.__default.ServerModel(serverState);
  res.json({
    version,
    model: modelToJs(present)
  });
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
  console.log(`Default owner: ${DEFAULT_OWNER}`);
  console.log('');
  console.log('Endpoints:');
  console.log('  GET  /sync     - Get current state');
  console.log('  POST /dispatch - Dispatch action { baseVersion, action }');
  console.log('  GET  /state    - Debug: raw server state');
  console.log('');
  console.log('Features:');
  console.log('  - Verified authorization (only members can edit)');
  console.log('  - Only owner can invite/remove members');
  console.log('  - Anchor-based moves (AtEnd, Before, After)');
  console.log('  - Server-allocated card IDs');
});
