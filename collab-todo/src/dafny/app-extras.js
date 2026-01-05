// App-specific convenience wrappers for collab-todo
// This file adds aliases and helpers on top of the generated app.js
// It supports BOTH single-project and multi-project operations.
//
// NOTE: Null-option preprocessing is now handled by generated app.js
// when compiled with --null-options flag.

import GeneratedApp from './app.js';
import BigNumber from 'bignumber.js';

const { _dafny, TodoDomain, TodoMultiProjectDomain, TodoMultiProjectEffectStateMachine, TodoMultiProjectEffectAppCore } = GeneratedApp._internal;

// -------------------------------------------------------------------------
// Helpers (re-export from generated for convenience)
// -------------------------------------------------------------------------

const toNumber = (bn) => {
  if (bn && typeof bn.toNumber === 'function') {
    return bn.toNumber();
  }
  return bn;
};

const dafnyStringToJs = (seq) => {
  if (typeof seq === 'string') return seq;
  if (seq.toVerbatimString) return seq.toVerbatimString(false);
  return Array.from(seq).join('');
};

const seqToArray = (seq) => {
  const arr = [];
  for (let i = 0; i < seq.length; i++) {
    arr.push(seq[i]);
  }
  return arr;
};

const dafnyMapToObject = (dafnyMap, keyFn, valFn) => {
  const result = {};
  if (dafnyMap && dafnyMap.Keys) {
    for (const k of dafnyMap.Keys.Elements) {
      result[keyFn(k)] = valFn(dafnyMap.get(k));
    }
  }
  return result;
};

const dafnySetToArray = (dafnySet, elemFn) => {
  if (!dafnySet || !dafnySet.Elements) return [];
  return Array.from(dafnySet.Elements).map(elemFn);
};

// -------------------------------------------------------------------------
// Option handling (for UI display - convert tagged to null-based)
// -------------------------------------------------------------------------

// Convert tagged Option JSON to null-based (for UI display)
const taggedOptionToNull = (opt) => {
  if (opt && opt.type === 'None') return null;
  if (opt && opt.type === 'Some') return opt.value;
  return opt;
};

// Convert task to plain JS with null-based Options (for UI)
const taskToPlainJs = (dafnyTask) => {
  const json = GeneratedApp.taskToJson(dafnyTask);
  return {
    ...json,
    dueDate: taggedOptionToNull(json.dueDate),
    deletedBy: taggedOptionToNull(json.deletedBy),
    deletedFromList: taggedOptionToNull(json.deletedFromList)
  };
};

// -------------------------------------------------------------------------
// Re-export everything from generated app, plus extras
// -------------------------------------------------------------------------

const App = {
  ...GeneratedApp,

  // -------------------------------------------------------------------------
  // Domain TryStep (for single-project optimistic updates)
  // -------------------------------------------------------------------------

  TryStep: (model, action) => {
    const result = TodoDomain.__default.TryStep(model, action);
    return {
      is_Ok: result.is_Ok,
      dtor_value: result.is_Ok ? result.dtor_value : null
    };
  },

  // -------------------------------------------------------------------------
  // Model accessors (convenience aliases for single Model)
  // -------------------------------------------------------------------------

  // Get list name by ID
  GetListName: (m, listId) => GeneratedApp.GetListNames(m, listId) || '',

  // Get tasks in a list
  GetTasksInList: (m, listId) => GeneratedApp.GetTasks(m, listId) || [],

  // Get task data by ID (with proper null-based options)
  GetTask: (m, taskId) => {
    const dafnyKey = new BigNumber(taskId);
    if (m.dtor_taskData.contains(dafnyKey)) {
      return taskToPlainJs(m.dtor_taskData.get(dafnyKey));
    }
    return null;
  },

  // VERIFIED: Find which list contains a task (returns null if not found)
  FindListForTask: (m, taskId) => {
    const result = GeneratedApp.FindListForTask(m, taskId);
    if (result.is_Some) {
      return toNumber(result.dtor_value);
    }
    return null;
  },

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

  // VERIFIED: Count priority tasks (starred, not completed, not deleted) in single model
  CountPriorityTasks: (m) => {
    if (!m) return 0;
    return toNumber(TodoDomain.__default.CountPriorityTasks(m));
  },

  // VERIFIED: Count logbook tasks (completed, not deleted) in single model
  CountLogbookTasks: (m) => {
    if (!m) return 0;
    return toNumber(TodoDomain.__default.CountLogbookTasks(m));
  },

  // -------------------------------------------------------------------------
  // Due date convenience methods
  // -------------------------------------------------------------------------

  SetDueDateValue: (taskId, year, month, day) => TodoDomain.Action.create_SetDueDate(
    new BigNumber(taskId),
    TodoDomain.Option.create_Some(
      TodoDomain.Date.create_Date(new BigNumber(year), new BigNumber(month), new BigNumber(day))
    )
  ),

  ClearDueDate: (taskId) => TodoDomain.Action.create_SetDueDate(
    new BigNumber(taskId),
    TodoDomain.Option.create_None()
  ),

  SomeDate: (year, month, day) => TodoDomain.Option.create_Some(
    TodoDomain.Date.create_Date(new BigNumber(year), new BigNumber(month), new BigNumber(day))
  ),

  // -------------------------------------------------------------------------
  // Effect State Machine wrappers
  // -------------------------------------------------------------------------

  // Step returns tuple, convert to array for JS
  EffectStep: (effectState, event) => {
    const result = GeneratedApp.EffectStep(effectState, event);
    return [result[0], result[1]];
  },

  // -------------------------------------------------------------------------
  // Event constructors - aliases for generated
  // -------------------------------------------------------------------------

  EffectEvent: {
    UserAction: (action) => GeneratedApp.EffectUserAction(action),
    SingleUserAction: (projectId, action) => GeneratedApp.EffectSingleUserAction(projectId, action),
    DispatchAccepted: (versionsJson, modelsJson) => GeneratedApp.EffectDispatchAccepted(versionsJson, modelsJson),
    DispatchConflict: (versionsJson, modelsJson) => GeneratedApp.EffectDispatchConflict(versionsJson, modelsJson),
    DispatchRejected: (versionsJson, modelsJson) => GeneratedApp.EffectDispatchRejected(versionsJson, modelsJson),
    RealtimeUpdate: (projectId, version, modelJson) =>
      GeneratedApp.EffectRealtimeUpdate(projectId, version, GeneratedApp.modelFromJson(modelJson)),
    NetworkError: () => GeneratedApp.EffectNetworkError(),
    NetworkRestored: () => GeneratedApp.EffectNetworkRestored(),
    ManualGoOffline: () => GeneratedApp.EffectManualGoOffline(),
    ManualGoOnline: () => GeneratedApp.EffectManualGoOnline(),
    Tick: () => GeneratedApp.EffectTick(),
  },

  // -------------------------------------------------------------------------
  // Command inspection
  // -------------------------------------------------------------------------

  EffectCommand: {
    isNoOp: (cmd) => GeneratedApp.EffectIsNoOp(cmd),
    isSendDispatch: (cmd) => GeneratedApp.EffectIsSendDispatch(cmd),
    isFetchFreshState: (cmd) => GeneratedApp.EffectIsFetchFreshState(cmd),
    getTouchedProjects: (cmd) => {
      const set = GeneratedApp.EffectGetTouchedProjects(cmd);
      return dafnySetToArray(set, dafnyStringToJs);
    },
    getBaseVersions: (cmd) => {
      const map = GeneratedApp.EffectGetBaseVersionsFromCmd(cmd);
      return dafnyMapToObject(map, dafnyStringToJs, toNumber);
    },
    getAction: (cmd) => GeneratedApp.EffectGetMultiAction(cmd),
    getActionJson: (cmd) => GeneratedApp.multiactionToJson(GeneratedApp.EffectGetMultiAction(cmd)),
  },

  // -------------------------------------------------------------------------
  // EffectState accessors
  // -------------------------------------------------------------------------

  EffectState: {
    getClient: (es) => GeneratedApp.EffectGetClient(es),
    getMultiModel: (es) => GeneratedApp.EffectGetMultiModel(es),
    getMultiModelJson: (es) => GeneratedApp.multimodelToJson(GeneratedApp.EffectGetMultiModel(es)),
    getBaseVersions: (es) => {
      const map = GeneratedApp.EffectGetBaseVersions(es);
      return dafnyMapToObject(map, dafnyStringToJs, toNumber);
    },
    getPending: (es) => GeneratedApp.EffectGetPending(es),
    isOnline: (es) => GeneratedApp.EffectIsOnline(es),
    isIdle: (es) => GeneratedApp.EffectIsIdle(es),
    isDispatching: (es) => GeneratedApp.EffectIsDispatching(es),
    hasPending: (es) => GeneratedApp.EffectHasPending(es),
    getPendingCount: (es) => GeneratedApp.EffectPendingCount(es),
  },

  // -------------------------------------------------------------------------
  // MultiAction constructors
  // -------------------------------------------------------------------------

  MultiAction: {
    Single: (projectId, action) => GeneratedApp.MakeSingleAction(projectId, action),
    MoveTaskTo: (srcProject, dstProject, taskId, dstList, anchor = GeneratedApp.AtEnd()) =>
      GeneratedApp.MakeMoveTaskTo(srcProject, dstProject, taskId, dstList, anchor),
    CopyTaskTo: (srcProject, dstProject, taskId, dstList) =>
      GeneratedApp.MakeCopyTaskTo(srcProject, dstProject, taskId, dstList),
    MoveListTo: (srcProject, dstProject, listId) =>
      GeneratedApp.MakeMoveListTo(srcProject, dstProject, listId),
    isSingle: (ma) => GeneratedApp.IsSingleAction(ma),
    isMoveTaskTo: (ma) => GeneratedApp.IsMoveTaskTo(ma),
    isCopyTaskTo: (ma) => GeneratedApp.IsCopyTaskTo(ma),
    isMoveListTo: (ma) => GeneratedApp.IsMoveListTo(ma),
    getTouchedProjects: (ma) => {
      const set = GeneratedApp.GetTouchedProjects(ma);
      return dafnySetToArray(set, dafnyStringToJs);
    },
    toJson: (ma) => GeneratedApp.multiactionToJson(ma),
    fromJson: (json) => GeneratedApp.multiactionFromJson(json),
  },

  // -------------------------------------------------------------------------
  // MultiModel helpers
  // -------------------------------------------------------------------------

  MultiModel: {
    getProject: (mm, projectId) => {
      if (!projectId || !mm) return null;
      if (GeneratedApp.HasProject(mm, projectId)) {
        return GeneratedApp.GetProjectModel(mm, projectId);
      }
      return null;
    },
    hasProject: (mm, projectId) => {
      if (!projectId || !mm) return false;
      return GeneratedApp.HasProject(mm, projectId);
    },
    getProjectIds: (mm) => {
      const set = GeneratedApp.GetProjectIds(mm);
      return dafnySetToArray(set, dafnyStringToJs);
    },
    // VERIFIED: Get all priority tasks across all projects
    getAllPriorityTasks: (mm) => {
      if (!mm) return [];
      const taggedSet = TodoMultiProjectDomain.__default.GetAllPriorityTasks(mm);
      return dafnySetToArray(taggedSet, (tagged) => ({
        projectId: dafnyStringToJs(tagged.dtor_projectId),
        taskId: toNumber(tagged.dtor_taskId)
      }));
    },
    // VERIFIED: Get all logbook tasks across all projects
    getAllLogbookTasks: (mm) => {
      if (!mm) return [];
      const taggedSet = TodoMultiProjectDomain.__default.GetAllLogbookTasks(mm);
      return dafnySetToArray(taggedSet, (tagged) => ({
        projectId: dafnyStringToJs(tagged.dtor_projectId),
        taskId: toNumber(tagged.dtor_taskId)
      }));
    },
    // VERIFIED: Get all visible (non-deleted) tasks across all projects
    getAllVisibleTasks: (mm) => {
      if (!mm) return [];
      const taggedSet = TodoMultiProjectDomain.__default.GetAllVisibleTasks(mm);
      return dafnySetToArray(taggedSet, (tagged) => ({
        projectId: dafnyStringToJs(tagged.dtor_projectId),
        taskId: toNumber(tagged.dtor_taskId)
      }));
    },
    countVisibleTasks: (mm) => {
      if (!mm) return 0;
      return toNumber(TodoMultiProjectDomain.__default.CountAllVisibleTasks(mm));
    },
    countPriorityTasks: (mm) => {
      if (!mm) return 0;
      return toNumber(TodoMultiProjectDomain.__default.CountAllPriorityTasks(mm));
    },
    countLogbookTasks: (mm) => {
      if (!mm) return 0;
      return toNumber(TodoMultiProjectDomain.__default.CountAllLogbookTasks(mm));
    },
    // VERIFIED: Check if user is authorized
    isAuthorized: (mm, actingUser, multiAction) => {
      if (!mm || !actingUser) return false;
      const userSeq = _dafny.Seq.UnicodeFromString(actingUser);
      return TodoMultiProjectDomain.__default.IsAuthorized(mm, userSeq, multiAction);
    },
    checkAuthorization: (mm, actingUser, multiAction) => {
      if (!mm || !actingUser) return "Missing model or user";
      const userSeq = _dafny.Seq.UnicodeFromString(actingUser);
      const result = TodoMultiProjectDomain.__default.CheckAuthorization(mm, userSeq, multiAction);
      return dafnyStringToJs(result);
    },
    toJson: (mm) => GeneratedApp.multimodelToJson(mm),
    fromJson: (json) => GeneratedApp.multimodelFromJson(json),
  },

  // -------------------------------------------------------------------------
  // Domain operations (multi-project)
  // -------------------------------------------------------------------------

  TryMultiStep: (mm, action) => {
    const result = GeneratedApp.TryMultiStep(mm, action);
    return {
      is_Ok: result.is_Ok,
      value: result.is_Ok ? result.dtor_value : null,
      error: result.is_Err ? GeneratedApp.multierrToJson(result.dtor_error) : null
    };
  },

  MultiRebase: (projectLogs, baseVersions, action) =>
    GeneratedApp.MultiRebase(projectLogs, baseVersions, action),

  MultiCandidates: (mm, action) => GeneratedApp.MultiCandidates(mm, action),
};

// ============================================================================
// Domain Adapter (for useCollaborativeProject hook - backwards compatible)
// ============================================================================

export const todoDomain = {
  TryStep: (model, action) => {
    const result = TodoDomain.__default.TryStep(model, action);
    return {
      is_Ok: result.is_Ok,
      dtor_value: result.is_Ok ? result.dtor_value : null
    };
  },
  modelFromJson: GeneratedApp.modelFromJson,
  modelToJson: GeneratedApp.modelToJson,
  actionToJson: GeneratedApp.actionToJson,
  actionFromJson: GeneratedApp.actionFromJson,
};

// ============================================================================
// Export helpers for consumers that need them
// ============================================================================

export { taggedOptionToNull, taskToPlainJs };

export default App;
