// App-specific convenience wrappers for collab-todo
// This file adds aliases and helpers on top of the generated app.js

import GeneratedApp from './app.js';
import BigNumber from 'bignumber.js';

const { _dafny, TodoDomain, TodoAppCore } = GeneratedApp._internal;

// Helper to convert seq to array
const seqToArray = (seq) => {
  const arr = [];
  for (let i = 0; i < seq.length; i++) {
    arr.push(seq[i]);
  }
  return arr;
};

// Helper to convert Dafny string to JS string
const dafnyStringToJs = (seq) => {
  if (typeof seq === 'string') return seq;
  if (seq.toVerbatimString) return seq.toVerbatimString(false);
  return Array.from(seq).join('');
};

// Helper to convert BigNumber to JS number
const toNumber = (bn) => {
  if (bn && typeof bn.toNumber === 'function') {
    return bn.toNumber();
  }
  return bn;
};

// -------------------------------------------------------------------------
// Option handling (null-based, matching existing DB data)
// -------------------------------------------------------------------------

// Convert Dafny Option to JS (None -> null)
const optionToJs = (opt, converter = (x) => x) => {
  if (opt.is_None) return null;
  return converter(opt.dtor_value);
};

// Convert JS to Dafny Option (null/undefined -> None)
const jsToOption = (val, converter = (x) => x) => {
  if (val === null || val === undefined) {
    return TodoDomain.Option.create_None();
  }
  return TodoDomain.Option.create_Some(converter(val));
};

// Preprocess model JSON: convert null Option fields to { type: 'None' } format
// so the generated modelFromJson can handle them
const preprocessModelJson = (json) => {
  if (!json) return json;

  // Helper to convert null to { type: 'None' }
  const fixOption = (val) => {
    if (val === null || val === undefined) return { type: 'None' };
    if (val && val.type) return val; // Already in correct format
    return { type: 'Some', value: val };
  };

  // Preprocess taskData map
  const taskData = {};
  if (json.taskData) {
    for (const [id, task] of Object.entries(json.taskData)) {
      taskData[id] = {
        ...task,
        dueDate: fixOption(task.dueDate),
        deletedBy: fixOption(task.deletedBy),
        deletedFromList: fixOption(task.deletedFromList)
      };
    }
  }

  return { ...json, taskData };
};

// Re-export everything from generated app, plus extras
const App = {
  ...GeneratedApp,

  // -------------------------------------------------------------------------
  // Domain TryStep (for optimistic updates)
  // -------------------------------------------------------------------------

  TryStep: (model, action) => {
    const result = TodoDomain.__default.TryStep(model, action);
    return {
      is_Ok: result.is_Ok,
      dtor_value: result.is_Ok ? result.dtor_value : null
    };
  },

  // -------------------------------------------------------------------------
  // ClientState management (JSON-accepting wrappers)
  // -------------------------------------------------------------------------

  // Override modelFromJson to handle null Option fields from database
  modelFromJson: (json) => GeneratedApp.modelFromJson(preprocessModelJson(json)),

  // Initialize a new client state from server sync response
  InitClient: (version, modelJson) => {
    const model = GeneratedApp.modelFromJson(preprocessModelJson(modelJson));
    return TodoAppCore.ClientState.create_ClientState(
      new BigNumber(version),
      model,
      _dafny.Seq.of()
    );
  },

  // Client-side local dispatch (optimistic update)
  LocalDispatch: (client, action) => {
    return GeneratedApp.ClientLocalDispatch(client, action);
  },

  // -------------------------------------------------------------------------
  // ClientState accessors (aliases)
  // -------------------------------------------------------------------------

  GetPendingCount: (client) => GeneratedApp.PendingCount(client),
  GetBaseVersion: (client) => GeneratedApp.ClientVersion(client),
  GetPresent: (client) => GeneratedApp.ClientModel(client),

  GetPendingActions: (client) => {
    return seqToArray(client.dtor_pending);
  },

  // -------------------------------------------------------------------------
  // Model accessors (convenience aliases)
  // -------------------------------------------------------------------------

  // Get list name by ID (alias for GetListNames)
  GetListName: (m, listId) => GeneratedApp.GetListNames(m, listId) || '',

  // Get tasks in a list (alias for GetTasks)
  GetTasksInList: (m, listId) => GeneratedApp.GetTasks(m, listId) || [],

  // Get task data by ID (alias for GetTaskData)
  GetTask: (m, taskId) => GeneratedApp.GetTaskData(m, taskId),

  // Get tag name by ID
  GetTagName: (m, tagId) => {
    const tag = GeneratedApp.GetTags(m, tagId);
    return tag ? tag.name : '';
  },

  // Get all tags as object { id: { name } }
  GetAllTags: (m) => {
    const result = {};
    if (m.dtor_tags && m.dtor_tags.Keys) {
      for (const key of m.dtor_tags.Keys.Elements) {
        const tag = m.dtor_tags.get(key);
        result[toNumber(key)] = { name: dafnyStringToJs(tag.dtor_name) };
      }
    }
    return result;
  },

  // -------------------------------------------------------------------------
  // Due date convenience methods
  // -------------------------------------------------------------------------

  // Set due date with year/month/day values
  SetDueDateValue: (taskId, year, month, day) => TodoDomain.Action.create_SetDueDate(
    new BigNumber(taskId),
    TodoDomain.Option.create_Some(
      TodoDomain.Date.create_Date(new BigNumber(year), new BigNumber(month), new BigNumber(day))
    )
  ),

  // Clear due date
  ClearDueDate: (taskId) => TodoDomain.Action.create_SetDueDate(
    new BigNumber(taskId),
    TodoDomain.Option.create_None()
  ),

  // Create Some(Date) option
  SomeDate: (year, month, day) => TodoDomain.Option.create_Some(
    TodoDomain.Date.create_Date(new BigNumber(year), new BigNumber(month), new BigNumber(day))
  ),

  // -------------------------------------------------------------------------
  // Effect State Machine - JSON-accepting wrappers
  // -------------------------------------------------------------------------

  EffectInit: (version, modelJson) =>
    GeneratedApp.EffectInit(version, GeneratedApp.modelFromJson(preprocessModelJson(modelJson))),

  // Step returns tuple, convert to array for JS
  EffectStep: (effectState, event) => {
    const result = GeneratedApp.EffectStep(effectState, event);
    return [result[0], result[1]];
  },

  // Event constructors - JSON-accepting variants
  EffectEvent: {
    UserAction: (action) => GeneratedApp.EffectUserAction(action),
    DispatchAccepted: (version, modelJson) =>
      GeneratedApp.EffectDispatchAccepted(version, GeneratedApp.modelFromJson(preprocessModelJson(modelJson))),
    DispatchConflict: (version, modelJson) =>
      GeneratedApp.EffectDispatchConflict(version, GeneratedApp.modelFromJson(preprocessModelJson(modelJson))),
    DispatchRejected: (version, modelJson) =>
      GeneratedApp.EffectDispatchRejected(version, GeneratedApp.modelFromJson(preprocessModelJson(modelJson))),
    NetworkError: () => GeneratedApp.EffectNetworkError(),
    NetworkRestored: () => GeneratedApp.EffectNetworkRestored(),
    ManualGoOffline: () => GeneratedApp.EffectManualGoOffline(),
    ManualGoOnline: () => GeneratedApp.EffectManualGoOnline(),
    Tick: () => GeneratedApp.EffectTick(),
  },

  // Command inspection - just aliases
  EffectCommand: {
    isNoOp: (cmd) => GeneratedApp.EffectIsNoOp(cmd),
    isSendDispatch: (cmd) => GeneratedApp.EffectIsSendDispatch(cmd),
    getBaseVersion: (cmd) => GeneratedApp.EffectGetBaseVersion(cmd),
    getAction: (cmd) => GeneratedApp.EffectGetAction(cmd),
  },

  // EffectState accessors - just aliases
  EffectState: {
    getClient: (es) => GeneratedApp.EffectGetClient(es),
    getServerVersion: (es) => GeneratedApp.EffectGetServerVersion(es),
    isOnline: (es) => GeneratedApp.EffectIsOnline(es),
    isIdle: (es) => GeneratedApp.EffectIsIdle(es),
    isDispatching: (es) => es.dtor_mode.is_Dispatching,
    hasPending: (es) => GeneratedApp.EffectHasPending(es),
    getPendingCount: (es) => GeneratedApp.EffectPendingCount(es),
  },

  // Handle realtime update with JSON
  HandleRealtimeUpdate: (client, serverVersion, serverModelJson) =>
    GeneratedApp.HandleRealtimeUpdate(client, serverVersion, GeneratedApp.modelFromJson(preprocessModelJson(serverModelJson))),
};

// ============================================================================
// Domain Adapter (for useCollaborativeProject hook)
// ============================================================================

export const todoDomain = {
  // Try applying an action to a model
  TryStep: (model, action) => {
    const result = TodoDomain.__default.TryStep(model, action);
    return {
      is_Ok: result.is_Ok,
      dtor_value: result.is_Ok ? result.dtor_value : null
    };
  },

  // JSON conversion (with null Option handling)
  modelFromJson: (json) => GeneratedApp.modelFromJson(preprocessModelJson(json)),
  modelToJson: GeneratedApp.modelToJson,
  actionToJson: GeneratedApp.actionToJson,
  actionFromJson: GeneratedApp.actionFromJson,
};

// Export Option helpers for use elsewhere
export { optionToJs, jsToOption };

export default App;
