// App-specific convenience wrappers for collab-todo
// This file adds aliases and helpers on top of the generated app.js
// It supports BOTH single-project and multi-project operations.

import GeneratedApp from './app.js';
import BigNumber from 'bignumber.js';

const { _dafny, TodoDomain, TodoMultiProjectDomain, TodoMultiProjectEffectStateMachine, TodoMultiProjectEffectAppCore } = GeneratedApp._internal;

// -------------------------------------------------------------------------
// Basic Helpers
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
// Option handling (null-based, matching existing DB data)
// -------------------------------------------------------------------------

// Convert tagged Option JSON to null-based (for UI display)
const taggedOptionToNull = (opt) => {
  if (opt && opt.type === 'None') return null;
  if (opt && opt.type === 'Some') return opt.value;
  return opt;
};

// Helper to convert null to { type: 'None' }
const fixOption = (val) => {
  if (val === null || val === undefined) return { type: 'None' };
  if (val && val.type) return val; // Already in correct format
  return { type: 'Some', value: val };
};

// Preprocess model JSON: convert null Option fields to { type: 'None' } format
// and provide default values for missing fields
const preprocessModelJson = (json) => {
  if (!json) return json;

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

  return {
    ...json,
    taskData,
    // Default mode to 'Collaborative' for existing data without mode field
    mode: json.mode ?? 'Collaborative'
  };
};

// Preprocess models map (for multi-project)
const preprocessModelsJson = (modelsJson) => {
  if (!modelsJson) return modelsJson;
  const result = {};
  for (const [projectId, model] of Object.entries(modelsJson)) {
    result[projectId] = preprocessModelJson(model);
  }
  return result;
};

// Convert task JSON to null-based Options (for UI)
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
  // Model preprocessing (for DB data with null Options)
  // -------------------------------------------------------------------------

  modelFromJson: (json) => GeneratedApp.modelFromJson(preprocessModelJson(json)),

  multimodelFromJson: (json) => {
    if (!json || !json.projects) return GeneratedApp.multimodelFromJson(json);
    return GeneratedApp.multimodelFromJson({
      ...json,
      projects: preprocessModelsJson(json.projects)
    });
  },

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
  // Effect State Machine - JSON-accepting wrappers
  // -------------------------------------------------------------------------

  // Initialize with JSON versions and models
  EffectInit: (versionsJson, modelsJson) =>
    GeneratedApp.EffectInit(versionsJson, preprocessModelsJson(modelsJson)),

  // Step returns tuple, convert to array for JS
  EffectStep: (effectState, event) => {
    const result = GeneratedApp.EffectStep(effectState, event);
    return [result[0], result[1]];
  },

  // -------------------------------------------------------------------------
  // Event constructors - JSON-accepting variants
  // -------------------------------------------------------------------------

  EffectEvent: {
    UserAction: (action) => GeneratedApp.EffectUserAction(action),

    // Single-project action convenience (wraps in MultiAction.Single)
    SingleUserAction: (projectId, action) => GeneratedApp.EffectSingleUserAction(projectId, action),

    DispatchAccepted: (versionsJson, modelsJson) =>
      GeneratedApp.EffectDispatchAccepted(versionsJson, preprocessModelsJson(modelsJson)),

    DispatchConflict: (versionsJson, modelsJson) =>
      GeneratedApp.EffectDispatchConflict(versionsJson, preprocessModelsJson(modelsJson)),

    DispatchRejected: (versionsJson, modelsJson) =>
      GeneratedApp.EffectDispatchRejected(versionsJson, preprocessModelsJson(modelsJson)),

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

    // Get command details (for SendDispatch)
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
    // Wrap a single-project action
    Single: (projectId, action) => GeneratedApp.MakeSingleAction(projectId, action),

    // Cross-project: move task
    MoveTaskTo: (srcProject, dstProject, taskId, dstList, anchor = GeneratedApp.AtEnd()) =>
      GeneratedApp.MakeMoveTaskTo(srcProject, dstProject, taskId, dstList, anchor),

    // Cross-project: copy task
    CopyTaskTo: (srcProject, dstProject, taskId, dstList) =>
      GeneratedApp.MakeCopyTaskTo(srcProject, dstProject, taskId, dstList),

    // Check type
    isSingle: (ma) => GeneratedApp.IsSingleAction(ma),
    isMoveTaskTo: (ma) => GeneratedApp.IsMoveTaskTo(ma),
    isCopyTaskTo: (ma) => GeneratedApp.IsCopyTaskTo(ma),

    // Get touched projects as array
    getTouchedProjects: (ma) => {
      const set = GeneratedApp.GetTouchedProjects(ma);
      return dafnySetToArray(set, dafnyStringToJs);
    },

    // Convert to JSON
    toJson: (ma) => GeneratedApp.multiactionToJson(ma),
    fromJson: (json) => GeneratedApp.multiactionFromJson(json),
  },

  // -------------------------------------------------------------------------
  // MultiModel helpers
  // -------------------------------------------------------------------------

  MultiModel: {
    // Get a project's model
    getProject: (mm, projectId) => {
      if (!projectId || !mm) return null;
      if (GeneratedApp.HasProject(mm, projectId)) {
        return GeneratedApp.GetProjectModel(mm, projectId);
      }
      return null;
    },

    // Check if project exists
    hasProject: (mm, projectId) => {
      if (!projectId || !mm) return false;
      return GeneratedApp.HasProject(mm, projectId);
    },

    // Get all project IDs
    getProjectIds: (mm) => {
      const set = GeneratedApp.GetProjectIds(mm);
      return dafnySetToArray(set, dafnyStringToJs);
    },

    // VERIFIED: Get all priority tasks across all projects
    // Returns array of { projectId, taskId }
    getAllPriorityTasks: (mm) => {
      if (!mm) return [];
      const taggedSet = TodoDomain.__default.GetAllPriorityTasks(mm);
      return dafnySetToArray(taggedSet, (tagged) => ({
        projectId: dafnyStringToJs(tagged.dtor_projectId),
        taskId: toNumber(tagged.dtor_taskId)
      }));
    },

    // VERIFIED: Get all logbook tasks across all projects
    // Returns array of { projectId, taskId }
    getAllLogbookTasks: (mm) => {
      if (!mm) return [];
      const taggedSet = TodoDomain.__default.GetAllLogbookTasks(mm);
      return dafnySetToArray(taggedSet, (tagged) => ({
        projectId: dafnyStringToJs(tagged.dtor_projectId),
        taskId: toNumber(tagged.dtor_taskId)
      }));
    },

    // VERIFIED: Count priority tasks
    countPriorityTasks: (mm) => {
      if (!mm) return 0;
      return toNumber(TodoDomain.__default.CountAllPriorityTasks(mm));
    },

    // VERIFIED: Count logbook tasks
    countLogbookTasks: (mm) => {
      if (!mm) return 0;
      return toNumber(TodoDomain.__default.CountAllLogbookTasks(mm));
    },

    // Convert to JSON
    toJson: (mm) => GeneratedApp.multimodelToJson(mm),
    fromJson: (json) => App.multimodelFromJson(json),
  },

  // -------------------------------------------------------------------------
  // Domain operations (multi-project)
  // -------------------------------------------------------------------------

  // Try a multi-step (returns result with is_Ok)
  TryMultiStep: (mm, action) => {
    const result = GeneratedApp.TryMultiStep(mm, action);
    return {
      is_Ok: result.is_Ok,
      value: result.is_Ok ? result.dtor_value : null,
      error: result.is_Err ? GeneratedApp.multierrToJson(result.dtor_error) : null
    };
  },

  // Rebase action through project logs
  MultiRebase: (projectLogs, baseVersions, action) =>
    GeneratedApp.MultiRebase(projectLogs, baseVersions, action),

  // Get candidates for action
  MultiCandidates: (mm, action) => GeneratedApp.MultiCandidates(mm, action),
};

// ============================================================================
// Domain Adapter (for useCollaborativeProject hook - backwards compatible)
// ============================================================================

export const todoDomain = {
  // Try applying an action to a model (single-project)
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

// ============================================================================
// Export helpers
// ============================================================================

export { taggedOptionToNull, preprocessModelJson, preprocessModelsJson, taskToPlainJs };

export default App;
