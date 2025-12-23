// Express server using Dafny-verified KanbanAppCore v2
// Uses anchor-based Place for moves and server-allocated card IDs
import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import BigNumber from 'bignumber.js';

// Configure BigNumber as Dafny expects
BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });

// Load Dafny-generated code
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const kanbanCode = readFileSync(join(__dirname, 'KanbanMulti2.cjs'), 'utf-8');

// Set up require stub for the Dafny code
const require = (mod) => {
  if (mod === 'bignumber.js') return BigNumber;
  throw new Error(`Unknown module: ${mod}`);
};

// Evaluate the Dafny code and extract modules
const initDafny = new Function('require', `
  ${kanbanCode}
  return { _dafny, KanbanDomain, KanbanMultiCollaboration, KanbanAppCore };
`);

const { _dafny, KanbanDomain, KanbanMultiCollaboration, KanbanAppCore } = initDafny(require);

// Helper to convert Dafny Seq (string) to JS string
const dafnyStringToJs = (seq) => {
  if (typeof seq === 'string') return seq;
  if (seq.toVerbatimString) return seq.toVerbatimString(false);
  return Array.from(seq).join('');
};

// Helper to convert Dafny seq to JS array
const seqToArray = (seq) => {
  const arr = [];
  for (let i = 0; i < seq.length; i++) {
    arr.push(seq[i]);
  }
  return arr;
};

// Helper to convert BigNumber to JS number
const toNumber = (bn) => {
  if (bn && typeof bn.toNumber === 'function') {
    return bn.toNumber();
  }
  return bn;
};

// Convert Dafny Model v2 to JS object for API response
// Model v2: { cols, lanes, wip, cards, nextId }
const modelToJs = (m) => {
  const cols = seqToArray(m.dtor_cols).map(c => dafnyStringToJs(c));
  const lanesMap = m.dtor_lanes;
  const wipMap = m.dtor_wip;
  const cardsMap = m.dtor_cards;
  const nextId = toNumber(m.dtor_nextId);

  const lanes = {};
  const wip = {};
  const cards = {};

  // Convert lanes map
  if (lanesMap && lanesMap.Keys) {
    for (const key of lanesMap.Keys.Elements) {
      const colName = dafnyStringToJs(key);
      const cardIds = lanesMap.get(key);
      lanes[colName] = seqToArray(cardIds).map(id => toNumber(id));
    }
  }

  // Convert wip map
  if (wipMap && wipMap.Keys) {
    for (const key of wipMap.Keys.Elements) {
      const colName = dafnyStringToJs(key);
      wip[colName] = toNumber(wipMap.get(key));
    }
  }

  // Convert cards map
  if (cardsMap && cardsMap.Keys) {
    for (const key of cardsMap.Keys.Elements) {
      const cardId = toNumber(key);
      const card = cardsMap.get(key);
      // Card datatype: Card(title: string)
      const title = card.dtor_title !== undefined ? card.dtor_title : card;
      cards[cardId] = { title: dafnyStringToJs(title) };
    }
  }

  return { cols, lanes, wip, cards, nextId };
};

// Helper to parse Place from JSON
const placeFromJson = (placeJson) => {
  if (!placeJson || placeJson.type === 'AtEnd') {
    return KanbanDomain.Place.create_AtEnd();
  } else if (placeJson.type === 'Before') {
    return KanbanDomain.Place.create_Before(new BigNumber(placeJson.anchor));
  } else if (placeJson.type === 'After') {
    return KanbanDomain.Place.create_After(new BigNumber(placeJson.anchor));
  }
  return KanbanDomain.Place.create_AtEnd();
};

// Create initial model with empty state
const createInitialModel = () => {
  return KanbanDomain.Model.create_Model(
    _dafny.Seq.of(),           // cols
    _dafny.Map.Empty,          // lanes
    _dafny.Map.Empty,          // wip
    _dafny.Map.Empty,          // cards
    _dafny.ZERO                // nextId
  );
};

// Server state (in-memory, single board)
let serverState = KanbanAppCore.__default.InitServer(createInitialModel());

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
    switch (action.type) {
      case 'NoOp':
        dafnyAction = KanbanDomain.Action.create_NoOp();
        break;
      case 'AddColumn':
        dafnyAction = KanbanDomain.Action.create_AddColumn(
          _dafny.Seq.UnicodeFromString(action.col),
          new BigNumber(action.limit)
        );
        break;
      case 'SetWip':
        dafnyAction = KanbanDomain.Action.create_SetWip(
          _dafny.Seq.UnicodeFromString(action.col),
          new BigNumber(action.limit)
        );
        break;
      case 'AddCard':
        // v2: AddCard only takes col and title; server allocates id
        dafnyAction = KanbanDomain.Action.create_AddCard(
          _dafny.Seq.UnicodeFromString(action.col),
          _dafny.Seq.UnicodeFromString(action.title)
        );
        break;
      case 'MoveCard':
        // v2: MoveCard uses Place instead of position
        dafnyAction = KanbanDomain.Action.create_MoveCard(
          new BigNumber(action.id),
          _dafny.Seq.UnicodeFromString(action.toCol),
          placeFromJson(action.place)
        );
        break;
      case 'EditTitle':
        dafnyAction = KanbanDomain.Action.create_EditTitle(
          new BigNumber(action.id),
          _dafny.Seq.UnicodeFromString(action.title)
        );
        break;
      default:
        return res.status(400).json({ error: 'Unknown action type' });
    }
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
  console.log(`Kanban Multi-Collaboration v2 server running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  GET  /sync     - Get current state');
  console.log('  POST /dispatch - Dispatch action { baseVersion, action }');
  console.log('  GET  /state    - Debug: raw server state');
  console.log('');
  console.log('v2 features:');
  console.log('  - Anchor-based moves (AtEnd, Before, After)');
  console.log('  - Server-allocated card IDs');
  console.log('  - Candidate fallback for stale anchors');
});
