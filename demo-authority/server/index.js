// Express server using Dafny-verified ServerKernel
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
const authorityCode = readFileSync(join(__dirname, 'Authority.cjs'), 'utf-8');

// Set up require stub for the Dafny code
const require = (mod) => {
  if (mod === 'bignumber.js') return BigNumber;
  throw new Error(`Unknown module: ${mod}`);
};

// Evaluate the Dafny code and extract modules
const initDafny = new Function('require', `
  ${authorityCode}
  return { _dafny, AppCore, ConcreteDomain, ConcreteServer };
`);

const { _dafny, AppCore } = initDafny(require);

// Helper to convert Dafny Seq (string) to JS string
const dafnyStringToJs = (seq) => {
  if (typeof seq === 'string') return seq;
  // Dafny Seq has a toVerbatimString method or we can join the elements
  if (seq.toVerbatimString) return seq.toVerbatimString(false);
  // Fallback: join array elements
  return Array.from(seq).join('');
};

// Server state (in-memory, single document)
let serverState = AppCore.__default.InitServer(new BigNumber(0));

const app = express();
app.use(cors());
app.use(express.json());

// GET /sync - Get current state
app.get('/sync', (req, res) => {
  const syncResponse = AppCore.__default.Sync(serverState);
  res.json({
    ver: syncResponse.ver.toNumber(),
    present: syncResponse.present.toNumber()
  });
});

// POST /dispatch - Process an action
app.post('/dispatch', (req, res) => {
  const { clientVer, action } = req.body;

  // Convert clientVer to BigNumber
  const clientVerBN = new BigNumber(clientVer);

  // Parse action
  let dafnyAction;
  if (action === 'Inc') {
    dafnyAction = AppCore.__default.Inc();
  } else if (action === 'Dec') {
    dafnyAction = AppCore.__default.Dec();
  } else {
    return res.status(400).json({ error: 'Unknown action' });
  }

  // Call Dafny Dispatch
  const [newState, response] = AppCore.__default.Dispatch(serverState, clientVerBN, dafnyAction);

  // Update server state
  serverState = newState;

  // Build response
  const ver = AppCore.__default.GetResponseVersion(response).toNumber();

  if (AppCore.__default.IsSuccess(response)) {
    res.json({
      status: 'success',
      ver,
      present: AppCore.__default.GetSuccessValue(response).toNumber()
    });
  } else if (AppCore.__default.IsStale(response)) {
    res.json({
      status: 'stale',
      ver
    });
  } else if (AppCore.__default.IsInvalid(response)) {
    res.json({
      status: 'invalid',
      ver,
      msg: dafnyStringToJs(AppCore.__default.GetInvalidMsg(response))
    });
  }
});

// GET /state - Debug endpoint to see raw server state
app.get('/state', (req, res) => {
  res.json({
    ver: AppCore.__default.GetVersion(serverState).toNumber(),
    present: AppCore.__default.GetPresent(serverState).toNumber()
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Authority server running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  GET  /sync     - Get current state');
  console.log('  POST /dispatch - Dispatch action { clientVer, action: "Inc"|"Dec" }');
  console.log('  GET  /state    - Debug: raw server state');
});
