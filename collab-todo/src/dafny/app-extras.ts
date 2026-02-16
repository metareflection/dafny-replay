// App-specific convenience wrappers for collab-todo
// This file adds aliases and helpers on top of the generated app.ts
// It supports BOTH single-project and multi-project operations.
//
// NOTE: Null-option preprocessing is now handled by generated app.ts
// when compiled with --null-options flag.

import GeneratedApp from './app.ts';
import BigNumber from 'bignumber.js';

// Cast _internal for access to Dafny runtime modules
const { _dafny, TodoDomain, TodoMultiProjectDomain, TodoMultiProjectEffectStateMachine, TodoMultiProjectEffectAppCore } = GeneratedApp._internal as any;

// -------------------------------------------------------------------------
// Helpers (re-export from generated for convenience)
// -------------------------------------------------------------------------

const toNumber = (bn: any): number => {
  if (bn && typeof bn.toNumber === 'function') {
    return bn.toNumber();
  }
  return bn;
};

const dafnyStringToJs = (seq: any): string => {
  if (typeof seq === 'string') return seq;
  if (seq.toVerbatimString) return seq.toVerbatimString(false);
  return Array.from(seq).join('');
};

const seqToArray = <T>(seq: any): T[] => {
  const arr: T[] = [];
  for (let i = 0; i < seq.length; i++) {
    arr.push(seq[i]);
  }
  return arr;
};

const dafnyMapToObject = <K, V>(dafnyMap: any, keyFn: (k: any) => K, valFn: (v: any) => V): Record<string, V> => {
  const result: Record<string, V> = {};
  if (dafnyMap && dafnyMap.Keys) {
    for (const k of dafnyMap.Keys.Elements) {
      result[keyFn(k) as string] = valFn(dafnyMap.get(k));
    }
  }
  return result;
};

const dafnySetToArray = <T>(dafnySet: any, elemFn: (e: any) => T): T[] => {
  if (!dafnySet || !dafnySet.Elements) return [];
  return Array.from(dafnySet.Elements).map(elemFn);
};

// -------------------------------------------------------------------------
// Option handling (for UI display - convert tagged to null-based)
// -------------------------------------------------------------------------

// Convert tagged Option JSON to null-based (for UI display)
const taggedOptionToNull = <T>(opt: { type: 'None' } | { type: 'Some'; value: T } | null | undefined): T | null => {
  if (opt && (opt as any).type === 'None') return null;
  if (opt && (opt as any).type === 'Some') return (opt as { type: 'Some'; value: T }).value;
  return opt as T | null;
};

// Convert task to plain JS with null-based Options (for UI)
const taskToPlainJs = (dafnyTask: any) => {
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

  TryStep: (model: any, action: any) => {
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
  GetListName: (m: any, listId: number) => GeneratedApp.GetListNames(m, listId) || '',

  // Get tasks in a list
  GetTasksInList: (m: any, listId: number) => GeneratedApp.GetTasks(m, listId) || [],

  // Get task data by ID (with proper null-based options)
  GetTask: (m: any, taskId: number) => {
    const dafnyKey = new BigNumber(taskId);
    if (m.dtor_taskData.contains(dafnyKey)) {
      return taskToPlainJs(m.dtor_taskData.get(dafnyKey));
    }
    return null;
  },

  // VERIFIED: Find which list contains a task (returns null if not found)
  FindListForTask: (m: any, taskId: number) => {
    const result = GeneratedApp.FindListForTask(m, taskId);
    if (result.is_Some) {
      return toNumber(result.dtor_value);
    }
    return null;
  },

  // Get tag name by ID
  GetTagName: (m: any, tagId: number) => {
    const tag = GeneratedApp.GetTags(m, tagId);
    return tag ? tag.name : '';
  },

  // Get all tags as object { id: { name } }
  GetAllTags: (m: any) => {
    const result: Record<number, { name: string }> = {};
    if (m.dtor_tags && m.dtor_tags.Keys) {
      for (const key of m.dtor_tags.Keys.Elements) {
        const tag = m.dtor_tags.get(key);
        result[toNumber(key)] = { name: dafnyStringToJs(tag) };
      }
    }
    return result;
  },

  // VERIFIED: Count priority tasks (starred, not completed, not deleted) in single model
  CountPriorityTasks: (m: any) => {
    if (!m) return 0;
    return toNumber(TodoDomain.__default.CountPriorityTasks(m));
  },

  // VERIFIED: Count logbook tasks (completed, not deleted) in single model
  CountLogbookTasks: (m: any) => {
    if (!m) return 0;
    return toNumber(TodoDomain.__default.CountLogbookTasks(m));
  },

  // -------------------------------------------------------------------------
  // Due date convenience methods
  // -------------------------------------------------------------------------

  SetDueDateValue: (taskId: number, year: number, month: number, day: number) => TodoDomain.Action.create_SetDueDate(
    new BigNumber(taskId),
    TodoDomain.Option.create_Some(
      TodoDomain.Date.create_Date(new BigNumber(year), new BigNumber(month), new BigNumber(day))
    )
  ),

  ClearDueDate: (taskId: number) => TodoDomain.Action.create_SetDueDate(
    new BigNumber(taskId),
    TodoDomain.Option.create_None()
  ),

  SomeDate: (year: number, month: number, day: number) => TodoDomain.Option.create_Some(
    TodoDomain.Date.create_Date(new BigNumber(year), new BigNumber(month), new BigNumber(day))
  ),

  // -------------------------------------------------------------------------
  // Effect State Machine wrappers
  // -------------------------------------------------------------------------

  // Step returns tuple, convert to array for JS
  EffectStep: (effectState: any, event: any) => {
    const result = GeneratedApp.EffectStep(effectState, event);
    return [result[0], result[1]];
  },

  // -------------------------------------------------------------------------
  // Event constructors - aliases for generated
  // -------------------------------------------------------------------------

  EffectEvent: {
    UserAction: (action: any) => GeneratedApp.EffectUserAction(action),
    SingleUserAction: (projectId: string, action: any) => GeneratedApp.EffectSingleUserAction(projectId, action),
    DispatchAccepted: (versionsJson: any, modelsJson: any) => GeneratedApp.EffectDispatchAccepted(versionsJson, modelsJson),
    DispatchConflict: (versionsJson: any, modelsJson: any) => GeneratedApp.EffectDispatchConflict(versionsJson, modelsJson),
    DispatchRejected: (versionsJson: any, modelsJson: any) => GeneratedApp.EffectDispatchRejected(versionsJson, modelsJson),
    RealtimeUpdate: (projectId: string, version: number, modelJson: any) =>
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
    isNoOp: (cmd: any) => GeneratedApp.EffectIsNoOp(cmd),
    isSendDispatch: (cmd: any) => GeneratedApp.EffectIsSendDispatch(cmd),
    isFetchFreshState: (cmd: any) => GeneratedApp.EffectIsFetchFreshState(cmd),
    getTouchedProjects: (cmd: any) => {
      const set = GeneratedApp.EffectGetTouchedProjects(cmd);
      return dafnySetToArray(set, dafnyStringToJs);
    },
    getBaseVersions: (cmd: any) => {
      const map = GeneratedApp.EffectGetBaseVersionsFromCmd(cmd);
      return dafnyMapToObject(map, dafnyStringToJs, toNumber);
    },
    getAction: (cmd: any) => GeneratedApp.EffectGetMultiAction(cmd),
    getActionJson: (cmd: any) => GeneratedApp.multiactionToJson(GeneratedApp.EffectGetMultiAction(cmd)),
  },

  // -------------------------------------------------------------------------
  // EffectState accessors
  // -------------------------------------------------------------------------

  EffectState: {
    getClient: (es: any) => GeneratedApp.EffectGetClient(es),
    getMultiModel: (es: any) => GeneratedApp.EffectGetMultiModel(es),
    getMultiModelJson: (es: any) => GeneratedApp.multimodelToJson(GeneratedApp.EffectGetMultiModel(es)),
    getBaseVersions: (es: any) => {
      const map = GeneratedApp.EffectGetBaseVersions(es);
      return dafnyMapToObject(map, dafnyStringToJs, toNumber);
    },
    getPending: (es: any) => GeneratedApp.EffectGetPending(es),
    isOnline: (es: any) => GeneratedApp.EffectIsOnline(es),
    isIdle: (es: any) => GeneratedApp.EffectIsIdle(es),
    isDispatching: (es: any) => GeneratedApp.EffectIsDispatching(es),
    hasPending: (es: any) => GeneratedApp.EffectHasPending(es),
    getPendingCount: (es: any) => GeneratedApp.EffectPendingCount(es),
  },

  // -------------------------------------------------------------------------
  // MultiAction constructors
  // -------------------------------------------------------------------------

  MultiAction: {
    Single: (projectId: string, action: any) => GeneratedApp.MakeSingleAction(projectId, action),
    MoveTaskTo: (srcProject: string, dstProject: string, taskId: number, dstList: number, anchor = GeneratedApp.AtEnd()) =>
      GeneratedApp.MakeMoveTaskTo(srcProject, dstProject, taskId, dstList, anchor),
    CopyTaskTo: (srcProject: string, dstProject: string, taskId: number, dstList: number) =>
      GeneratedApp.MakeCopyTaskTo(srcProject, dstProject, taskId, dstList),
    MoveListTo: (srcProject: string, dstProject: string, listId: number) =>
      GeneratedApp.MakeMoveListTo(srcProject, dstProject, listId),
    isSingle: (ma: any) => GeneratedApp.IsSingleAction(ma),
    isMoveTaskTo: (ma: any) => GeneratedApp.IsMoveTaskTo(ma),
    isCopyTaskTo: (ma: any) => GeneratedApp.IsCopyTaskTo(ma),
    isMoveListTo: (ma: any) => GeneratedApp.IsMoveListTo(ma),
    getTouchedProjects: (ma: any) => {
      const set = GeneratedApp.GetTouchedProjects(ma);
      return dafnySetToArray(set, dafnyStringToJs);
    },
    toJson: (ma: any) => GeneratedApp.multiactionToJson(ma),
    fromJson: (json: any) => GeneratedApp.multiactionFromJson(json),
  },

  // -------------------------------------------------------------------------
  // MultiModel helpers
  // -------------------------------------------------------------------------

  MultiModel: {
    getProject: (mm: any, projectId: string) => {
      if (!projectId || !mm) return null;
      const pid = _dafny.Seq.UnicodeFromString(projectId);
      if (TodoMultiProjectEffectAppCore.__default.HasProject(mm, pid)) {
        return TodoMultiProjectEffectAppCore.__default.GetProjectModel(mm, pid);
      }
      return null;
    },
    hasProject: (mm: any, projectId: string) => {
      if (!projectId || !mm) return false;
      return TodoMultiProjectEffectAppCore.__default.HasProject(mm, _dafny.Seq.UnicodeFromString(projectId));
    },
    getProjectIds: (mm: any) => {
      const set = TodoMultiProjectEffectAppCore.__default.GetProjectIds(mm);
      return dafnySetToArray(set, dafnyStringToJs);
    },
    // VERIFIED: Get all priority tasks across all projects
    getAllPriorityTasks: (mm: any) => {
      if (!mm) return [];
      const taggedSet = TodoMultiProjectDomain.__default.GetAllPriorityTasks(mm);
      return dafnySetToArray(taggedSet, (tagged: any) => ({
        projectId: dafnyStringToJs(tagged.dtor_projectId),
        taskId: toNumber(tagged.dtor_taskId)
      }));
    },
    // VERIFIED: Get all logbook tasks across all projects
    getAllLogbookTasks: (mm: any) => {
      if (!mm) return [];
      const taggedSet = TodoMultiProjectDomain.__default.GetAllLogbookTasks(mm);
      return dafnySetToArray(taggedSet, (tagged: any) => ({
        projectId: dafnyStringToJs(tagged.dtor_projectId),
        taskId: toNumber(tagged.dtor_taskId)
      }));
    },
    // VERIFIED: Get all visible (non-deleted) tasks across all projects
    getAllVisibleTasks: (mm: any) => {
      if (!mm) return [];
      const taggedSet = TodoMultiProjectDomain.__default.GetAllVisibleTasks(mm);
      return dafnySetToArray(taggedSet, (tagged: any) => ({
        projectId: dafnyStringToJs(tagged.dtor_projectId),
        taskId: toNumber(tagged.dtor_taskId)
      }));
    },
    countVisibleTasks: (mm: any) => {
      if (!mm) return 0;
      return toNumber(TodoMultiProjectDomain.__default.CountAllVisibleTasks(mm));
    },
    countPriorityTasks: (mm: any) => {
      if (!mm) return 0;
      return toNumber(TodoMultiProjectDomain.__default.CountAllPriorityTasks(mm));
    },
    countLogbookTasks: (mm: any) => {
      if (!mm) return 0;
      return toNumber(TodoMultiProjectDomain.__default.CountAllLogbookTasks(mm));
    },
    // VERIFIED: Check if user is authorized
    isAuthorized: (mm: any, actingUser: string, multiAction: any) => {
      if (!mm || !actingUser) return false;
      const userSeq = _dafny.Seq.UnicodeFromString(actingUser);
      return TodoMultiProjectDomain.__default.IsAuthorized(mm, userSeq, multiAction);
    },
    checkAuthorization: (mm: any, actingUser: string, multiAction: any) => {
      if (!mm || !actingUser) return "Missing model or user";
      const userSeq = _dafny.Seq.UnicodeFromString(actingUser);
      const result = TodoMultiProjectDomain.__default.CheckAuthorization(mm, userSeq, multiAction);
      return dafnyStringToJs(result);
    },
    toJson: (mm: any) => GeneratedApp.multimodelToJson(mm),
    fromJson: (json: any) => GeneratedApp.multimodelFromJson(json),
  },

  // -------------------------------------------------------------------------
  // Domain operations (multi-project)
  // -------------------------------------------------------------------------

  TryMultiStep: (mm: any, action: any) => {
    const result = TodoMultiProjectEffectAppCore.__default.TryMultiStep(mm, action);
    return {
      is_Ok: result.is_Ok,
      value: result.is_Ok ? result.dtor_value : null,
      error: result.is_Err ? GeneratedApp.multierrToJson(result.dtor_error) : null
    };
  },

  MultiRebase: (projectLogs: any, baseVersions: any, action: any) =>
    GeneratedApp.MultiRebase(projectLogs, baseVersions, action),

  MultiCandidates: (mm: any, action: any) => seqToArray(TodoMultiProjectEffectAppCore.__default.MultiCandidates(mm, action)).map((x: any) => GeneratedApp.multiactionToJson(x)),
};

// ============================================================================
// Domain Adapter (for useCollaborativeProject hook - backwards compatible)
// ============================================================================

export const todoDomain = {
  TryStep: (model: any, action: any) => {
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
