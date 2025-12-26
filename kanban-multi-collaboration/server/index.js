// Express server using Dafny-verified KanbanAppCore
// Uses anchor-based Place for moves and server-allocated card IDs

import express from 'express';
import cors from 'cors';
import {
  KanbanMultiCollaboration,
  KanbanAppCore,
  modelToJs,
  actionFromJson,
  toNumber,
  BigNumber
} from './kanban-core.js';

// Server state (in-memory, single board) - uses verified Init
let serverState = KanbanAppCore.__default.Init();

const app = express();
app.use(cors());
app.use(express.json());

// GET /sync - Get current state
app.get('/sync', (req, res) => {
  const version = toNumber(KanbanAppCore.__default.ServerVersion(serverState));
  const present = KanbanAppCore.__default.ServerModel(serverState);
  res.json({
    version,
    model: modelToJs(present)
  });
});

// POST /dispatch - Process a single action
app.post('/dispatch', (req, res) => {
  const { baseVersion, action } = req.body;

  // Convert baseVersion to BigNumber
  const baseVersionBN = new BigNumber(baseVersion);

  // Parse action
  let dafnyAction;
  try {
    dafnyAction = actionFromJson(action);
  } catch (e) {
    return res.status(400).json({ error: `Invalid action: ${e.message}` });
  }

  // Check version constraint
  const currentVersion = toNumber(KanbanAppCore.__default.ServerVersion(serverState));
  if (baseVersion > currentVersion) {
    return res.status(400).json({ error: 'Invalid base version' });
  }

  // Call Dafny Dispatch via KanbanMultiCollaboration
  const result = KanbanMultiCollaboration.__default.Dispatch(serverState, baseVersionBN, dafnyAction);
  const newState = result[0];
  const reply = result[1];

  // Update server state
  serverState = newState;

  // Build response
  if (KanbanAppCore.__default.IsAccepted(reply)) {
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
      reason: 'DomainInvalid'
    });
  }
});

// GET /state - Debug endpoint to see raw server state
app.get('/state', (req, res) => {
  const version = toNumber(KanbanAppCore.__default.ServerVersion(serverState));
  const present = KanbanAppCore.__default.ServerModel(serverState);
  const auditLogLen = toNumber(KanbanAppCore.__default.AuditLength(serverState));
  res.json({
    version,
    auditLogLen,
    model: modelToJs(present)
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Kanban Multi-Collaboration server running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  GET  /sync     - Get current state');
  console.log('  POST /dispatch - Dispatch action { baseVersion, action }');
  console.log('  GET  /state    - Debug: raw server state');
  console.log('');
  console.log('Features:');
  console.log('  - Anchor-based moves (AtEnd, Before, After)');
  console.log('  - Server-allocated card IDs');
  console.log('  - Candidate fallback for stale anchors');
});
