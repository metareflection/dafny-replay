// Express server using Dafny-verified KanbanAppCore
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
const kanbanCode = readFileSync(join(__dirname, 'KanbanMulti.cjs'), 'utf-8');

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

// Convert Dafny Model to JS object for API response
const modelToJs = (m) => {
  // Get columns from the model
  const columnsMap = m.dtor_columns;
  const wipMap = m.dtor_wip;
  const cardsMap = m.dtor_cards;

  const columns = {};
  const wip = {};
  const cards = {};

  // Convert columns map
  if (columnsMap && columnsMap.Keys) {
    for (const key of columnsMap.Keys.Elements) {
      const colName = dafnyStringToJs(key);
      const cardIds = columnsMap.get(key);
      columns[colName] = seqToArray(cardIds).map(id => toNumber(id));
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
  // Note: Dafny may optimize Card datatype to just the title string
  if (cardsMap && cardsMap.Keys) {
    for (const key of cardsMap.Keys.Elements) {
      const cardId = toNumber(key);
      const card = cardsMap.get(key);
      // Handle both wrapped Card and unwrapped string
      const title = card.dtor_title !== undefined ? card.dtor_title : card;
      cards[cardId] = { title: dafnyStringToJs(title) };
    }
  }

  return { columns, wip, cards };
};

// Server state (in-memory, single board)
let serverState = KanbanAppCore.__default.InitServer();

const app = express();
app.use(cors());
app.use(express.json());

// GET /sync - Get current state
app.get('/sync', (req, res) => {
  const version = toNumber(KanbanAppCore.__default.GetServerVersion(serverState));
  const present = KanbanAppCore.__default.GetServerPresent(serverState);
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
        dafnyAction = KanbanAppCore.__default.NoOp();
        break;
      case 'AddColumn':
        dafnyAction = KanbanAppCore.__default.AddColumn(
          _dafny.Seq.UnicodeFromString(action.col),
          new BigNumber(action.limit)
        );
        break;
      case 'DeleteColumn':
        dafnyAction = KanbanAppCore.__default.DeleteColumn(
          _dafny.Seq.UnicodeFromString(action.col)
        );
        break;
      case 'SetWip':
        dafnyAction = KanbanAppCore.__default.SetWip(
          _dafny.Seq.UnicodeFromString(action.col),
          new BigNumber(action.limit)
        );
        break;
      case 'AddCard':
        dafnyAction = KanbanAppCore.__default.AddCard(
          _dafny.Seq.UnicodeFromString(action.col),
          new BigNumber(action.id),
          new BigNumber(action.pos),
          _dafny.Seq.UnicodeFromString(action.title)
        );
        break;
      case 'DeleteCard':
        dafnyAction = KanbanAppCore.__default.DeleteCard(new BigNumber(action.id));
        break;
      case 'MoveCard':
        dafnyAction = KanbanAppCore.__default.MoveCard(
          new BigNumber(action.id),
          _dafny.Seq.UnicodeFromString(action.toCol),
          new BigNumber(action.pos)
        );
        break;
      case 'EditTitle':
        dafnyAction = KanbanAppCore.__default.EditTitle(
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
  const currentVersion = toNumber(KanbanAppCore.__default.GetServerVersion(serverState));
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
    const newVersion = toNumber(KanbanAppCore.__default.GetResponseVersion(reply));
    const newPresent = KanbanAppCore.__default.GetSuccessPresent(reply);
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
  const version = toNumber(KanbanAppCore.__default.GetServerVersion(serverState));
  const present = KanbanAppCore.__default.GetServerPresent(serverState);
  const appliedLogLen = toNumber(KanbanAppCore.__default.GetAppliedLogLen(serverState));
  const auditLogLen = toNumber(KanbanAppCore.__default.GetAuditLogLen(serverState));
  res.json({
    version,
    appliedLogLen,
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
});
