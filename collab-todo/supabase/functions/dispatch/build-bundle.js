#!/usr/bin/env node
// Build script to bundle compiled Dafny code for Deno Edge Function
// Run: node build-bundle.js

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read the compiled Dafny code
const dafnyCodePath = join(__dirname, '../../../src/dafny/TodoMulti.cjs');
let dafnyCode;
try {
  dafnyCode = readFileSync(dafnyCodePath, 'utf-8');
} catch (e) {
  console.error(`Error: Could not read ${dafnyCodePath}`);
  console.error('Run ./compile.sh from project root first.');
  process.exit(1);
}

// Escape backticks and $ for template literal
const escapedCode = dafnyCode
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$/g, '\\$');

// Generate the Deno-compatible bundle
const bundle = `// Dafny Todo Domain Bundle for Deno Edge Function
// AUTO-GENERATED - DO NOT EDIT
// Regenerate with: node build-bundle.js

import BigNumber from 'https://esm.sh/bignumber.js@9.1.2';

BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });

// Dafny runtime mock for require
const require = (mod: string) => {
  if (mod === 'bignumber.js') return BigNumber;
  throw new Error(\`Unknown module: \${mod}\`);
};

// deno-lint-ignore no-unused-vars
const exports = {};
// deno-lint-ignore no-unused-vars
const module = { exports };

// Evaluate Dafny code
const initDafny = new Function('require', 'exports', 'module', \`
${escapedCode}
  return { _dafny, TodoDomain, TodoMultiCollaboration, TodoAppCore };
\`);

const { _dafny, TodoDomain, TodoMultiCollaboration, TodoAppCore } = initDafny(require, exports, module);

export { _dafny, TodoDomain, TodoMultiCollaboration, TodoAppCore, BigNumber };

// ============================================================================
// Helper functions
// ============================================================================

// deno-lint-ignore no-explicit-any
const seqToArray = (seq: any): any[] => {
  const arr = [];
  for (let i = 0; i < seq.length; i++) {
    arr.push(seq[i]);
  }
  return arr;
};

// deno-lint-ignore no-explicit-any
const toNumber = (bn: any): number => {
  if (bn && typeof bn.toNumber === 'function') {
    return bn.toNumber();
  }
  return bn;
};

// deno-lint-ignore no-explicit-any
const dafnyStringToJs = (seq: any): string => {
  if (typeof seq === 'string') return seq;
  if (seq.toVerbatimString) return seq.toVerbatimString(false);
  return Array.from(seq).join('');
};

// deno-lint-ignore no-explicit-any
const setToArray = (set: any): any[] => {
  if (!set || !set.Elements) return [];
  return Array.from(set.Elements);
};

// ============================================================================
// Option helpers
// ============================================================================

// deno-lint-ignore no-explicit-any
const optionToJs = (opt: any, converter: (x: any) => any = (x) => x): any => {
  if (opt.is_None) return null;
  return converter(opt.dtor_value);
};

// deno-lint-ignore no-explicit-any
const jsToOption = (val: any, converter: (x: any) => any = (x) => x): any => {
  if (val === null || val === undefined) {
    return TodoDomain.Option.create_None();
  }
  return TodoDomain.Option.create_Some(converter(val));
};

// ============================================================================
// Date conversion
// ============================================================================

interface DateJson {
  year: number;
  month: number;
  day: number;
}

// deno-lint-ignore no-explicit-any
const dateToJs = (date: any): DateJson => {
  return {
    year: toNumber(date.dtor_year),
    month: toNumber(date.dtor_month),
    day: toNumber(date.dtor_day)
  };
};

const jsToDate = (obj: DateJson): any => {
  return TodoDomain.Date.create_Date(
    new BigNumber(obj.year),
    new BigNumber(obj.month),
    new BigNumber(obj.day)
  );
};

// ============================================================================
// Task conversion
// ============================================================================

interface TaskJson {
  title: string;
  notes: string;
  completed: boolean;
  starred: boolean;
  dueDate: DateJson | null;
  assignees: string[];
  tags: number[];
  deleted: boolean;
  deletedBy: string | null;
  deletedFromList: number | null;
}

// deno-lint-ignore no-explicit-any
const taskToJs = (task: any): TaskJson => {
  return {
    title: dafnyStringToJs(task.dtor_title),
    notes: dafnyStringToJs(task.dtor_notes),
    completed: task.dtor_completed,
    starred: task.dtor_starred,
    dueDate: optionToJs(task.dtor_dueDate, dateToJs),
    assignees: setToArray(task.dtor_assignees).map(dafnyStringToJs),
    tags: setToArray(task.dtor_tags).map(toNumber),
    deleted: task.dtor_deleted,
    deletedBy: optionToJs(task.dtor_deletedBy, dafnyStringToJs),
    deletedFromList: optionToJs(task.dtor_deletedFromList, toNumber)
  };
};

// ============================================================================
// Model conversion
// ============================================================================

interface Model {
  mode: 'Personal' | 'Collaborative';
  owner: string;
  members: string[];
  lists: number[];
  listNames: Record<number, string>;
  tasks: Record<number, number[]>;
  taskData: Record<number, TaskJson>;
  tags: Record<number, { name: string }>;
  nextListId: number;
  nextTaskId: number;
  nextTagId: number;
}

// deno-lint-ignore no-explicit-any
export const modelFromJson = (json: Model): any => {
  // Mode
  const mode = json.mode === 'Collaborative'
    ? TodoDomain.ProjectMode.create_Collaborative()
    : TodoDomain.ProjectMode.create_Personal();

  // Owner and members
  const owner = _dafny.Seq.UnicodeFromString(json.owner || '');
  let members = _dafny.Set.Empty;
  for (const m of (json.members || [])) {
    members = members.Union(_dafny.Set.fromElements(_dafny.Seq.UnicodeFromString(m)));
  }

  // Lists
  const lists = _dafny.Seq.of(...(json.lists || []).map((id: number) => new BigNumber(id)));

  // ListNames
  let listNames = _dafny.Map.Empty;
  for (const [id, name] of Object.entries(json.listNames || {})) {
    listNames = listNames.update(new BigNumber(id), _dafny.Seq.UnicodeFromString(name));
  }

  // Tasks (listId -> seq<taskId>)
  let tasks = _dafny.Map.Empty;
  for (const [listId, taskIds] of Object.entries(json.tasks || {})) {
    const key = new BigNumber(listId);
    const value = _dafny.Seq.of(...(taskIds as number[]).map((id: number) => new BigNumber(id)));
    tasks = tasks.update(key, value);
  }

  // TaskData
  let taskData = _dafny.Map.Empty;
  for (const [taskId, task] of Object.entries(json.taskData || {})) {
    const key = new BigNumber(taskId);
    const t = task as TaskJson;

    // Convert assignees to Dafny set of strings
    let assignees = _dafny.Set.Empty;
    for (const a of (t.assignees || [])) {
      assignees = assignees.Union(_dafny.Set.fromElements(_dafny.Seq.UnicodeFromString(a)));
    }

    // Convert tags to Dafny set of nats
    let tags = _dafny.Set.Empty;
    for (const tagId of (t.tags || [])) {
      tags = tags.Union(_dafny.Set.fromElements(new BigNumber(tagId)));
    }

    // Convert dueDate
    const dueDate = t.dueDate
      ? TodoDomain.Option.create_Some(jsToDate(t.dueDate))
      : TodoDomain.Option.create_None();

    // Convert deletedBy
    const deletedBy = t.deletedBy
      ? TodoDomain.Option.create_Some(_dafny.Seq.UnicodeFromString(t.deletedBy))
      : TodoDomain.Option.create_None();

    // Convert deletedFromList
    const deletedFromList = t.deletedFromList !== null && t.deletedFromList !== undefined
      ? TodoDomain.Option.create_Some(new BigNumber(t.deletedFromList))
      : TodoDomain.Option.create_None();

    const value = TodoDomain.Task.create_Task(
      _dafny.Seq.UnicodeFromString(t.title || ''),
      _dafny.Seq.UnicodeFromString(t.notes || ''),
      t.completed || false,
      t.starred || false,
      dueDate,
      assignees,
      tags,
      t.deleted || false,
      deletedBy,
      deletedFromList
    );
    taskData = taskData.update(key, value);
  }

  // Tags
  let tagsMap = _dafny.Map.Empty;
  for (const [tagId, tag] of Object.entries(json.tags || {})) {
    const key = new BigNumber(tagId);
    const value = TodoDomain.Tag.create_Tag(_dafny.Seq.UnicodeFromString((tag as { name: string }).name || ''));
    tagsMap = tagsMap.update(key, value);
  }

  return TodoDomain.Model.create_Model(
    mode,
    owner,
    members,
    lists,
    listNames,
    tasks,
    taskData,
    tagsMap,
    new BigNumber(json.nextListId || 0),
    new BigNumber(json.nextTaskId || 0),
    new BigNumber(json.nextTagId || 0)
  );
};

// deno-lint-ignore no-explicit-any
export const modelToJson = (m: any): Model => {
  const mode = m.dtor_mode.is_Collaborative ? 'Collaborative' : 'Personal';
  const owner = dafnyStringToJs(m.dtor_owner);
  const members = setToArray(m.dtor_members).map(dafnyStringToJs);
  const lists = seqToArray(m.dtor_lists).map(toNumber);

  const listNames: Record<number, string> = {};
  if (m.dtor_listNames && m.dtor_listNames.Keys) {
    for (const key of m.dtor_listNames.Keys.Elements) {
      listNames[toNumber(key)] = dafnyStringToJs(m.dtor_listNames.get(key));
    }
  }

  const tasks: Record<number, number[]> = {};
  if (m.dtor_tasks && m.dtor_tasks.Keys) {
    for (const key of m.dtor_tasks.Keys.Elements) {
      tasks[toNumber(key)] = seqToArray(m.dtor_tasks.get(key)).map(toNumber);
    }
  }

  const taskData: Record<number, TaskJson> = {};
  if (m.dtor_taskData && m.dtor_taskData.Keys) {
    for (const key of m.dtor_taskData.Keys.Elements) {
      taskData[toNumber(key)] = taskToJs(m.dtor_taskData.get(key));
    }
  }

  const tags: Record<number, { name: string }> = {};
  if (m.dtor_tags && m.dtor_tags.Keys) {
    for (const key of m.dtor_tags.Keys.Elements) {
      tags[toNumber(key)] = { name: dafnyStringToJs(m.dtor_tags.get(key).dtor_name) };
    }
  }

  return {
    mode: mode as 'Personal' | 'Collaborative',
    owner,
    members,
    lists,
    listNames,
    tasks,
    taskData,
    tags,
    nextListId: toNumber(m.dtor_nextListId),
    nextTaskId: toNumber(m.dtor_nextTaskId),
    nextTagId: toNumber(m.dtor_nextTagId)
  };
};

// ============================================================================
// Place conversion
// ============================================================================

interface Place {
  type: 'AtEnd' | 'Before' | 'After';
  anchor?: number;
}

interface ListPlace {
  type: 'ListAtEnd' | 'ListBefore' | 'ListAfter';
  anchor?: number;
}

const placeFromJson = (json: Place | undefined): any => {
  if (!json || json.type === 'AtEnd') {
    return TodoDomain.Place.create_AtEnd();
  } else if (json.type === 'Before') {
    return TodoDomain.Place.create_Before(new BigNumber(json.anchor!));
  } else if (json.type === 'After') {
    return TodoDomain.Place.create_After(new BigNumber(json.anchor!));
  }
  return TodoDomain.Place.create_AtEnd();
};

// deno-lint-ignore no-explicit-any
const placeToJson = (place: any): Place => {
  if (place.is_AtEnd) return { type: 'AtEnd' };
  if (place.is_Before) return { type: 'Before', anchor: toNumber(place.dtor_anchor) };
  if (place.is_After) return { type: 'After', anchor: toNumber(place.dtor_anchor) };
  return { type: 'AtEnd' };
};

const listPlaceFromJson = (json: ListPlace | undefined): any => {
  if (!json || json.type === 'ListAtEnd') {
    return TodoDomain.ListPlace.create_ListAtEnd();
  } else if (json.type === 'ListBefore') {
    return TodoDomain.ListPlace.create_ListBefore(new BigNumber(json.anchor!));
  } else if (json.type === 'ListAfter') {
    return TodoDomain.ListPlace.create_ListAfter(new BigNumber(json.anchor!));
  }
  return TodoDomain.ListPlace.create_ListAtEnd();
};

// deno-lint-ignore no-explicit-any
const listPlaceToJson = (place: any): ListPlace => {
  if (place.is_ListAtEnd) return { type: 'ListAtEnd' };
  if (place.is_ListBefore) return { type: 'ListBefore', anchor: toNumber(place.dtor_anchor) };
  if (place.is_ListAfter) return { type: 'ListAfter', anchor: toNumber(place.dtor_anchor) };
  return { type: 'ListAtEnd' };
};

// ============================================================================
// Action conversion
// ============================================================================

interface Action {
  type: string;
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}

// deno-lint-ignore no-explicit-any
export const actionFromJson = (json: Action): any => {
  switch (json.type) {
    case 'NoOp':
      return TodoDomain.Action.create_NoOp();

    // List operations
    case 'AddList':
      return TodoDomain.Action.create_AddList(_dafny.Seq.UnicodeFromString(json.name));
    case 'RenameList':
      return TodoDomain.Action.create_RenameList(
        new BigNumber(json.listId),
        _dafny.Seq.UnicodeFromString(json.newName)
      );
    case 'DeleteList':
      return TodoDomain.Action.create_DeleteList(new BigNumber(json.listId));
    case 'MoveList':
      return TodoDomain.Action.create_MoveList(
        new BigNumber(json.listId),
        listPlaceFromJson(json.listPlace)
      );

    // Task CRUD
    case 'AddTask':
      return TodoDomain.Action.create_AddTask(
        new BigNumber(json.listId),
        _dafny.Seq.UnicodeFromString(json.title)
      );
    case 'EditTask':
      return TodoDomain.Action.create_EditTask(
        new BigNumber(json.taskId),
        _dafny.Seq.UnicodeFromString(json.title),
        _dafny.Seq.UnicodeFromString(json.notes || '')
      );
    case 'DeleteTask':
      return TodoDomain.Action.create_DeleteTask(
        new BigNumber(json.taskId),
        _dafny.Seq.UnicodeFromString(json.userId)
      );
    case 'RestoreTask':
      return TodoDomain.Action.create_RestoreTask(new BigNumber(json.taskId));
    case 'MoveTask':
      return TodoDomain.Action.create_MoveTask(
        new BigNumber(json.taskId),
        new BigNumber(json.toList),
        placeFromJson(json.taskPlace)
      );

    // Task status
    case 'CompleteTask':
      return TodoDomain.Action.create_CompleteTask(new BigNumber(json.taskId));
    case 'UncompleteTask':
      return TodoDomain.Action.create_UncompleteTask(new BigNumber(json.taskId));
    case 'StarTask':
      return TodoDomain.Action.create_StarTask(new BigNumber(json.taskId));
    case 'UnstarTask':
      return TodoDomain.Action.create_UnstarTask(new BigNumber(json.taskId));

    // Due date
    case 'SetDueDate':
      return TodoDomain.Action.create_SetDueDate(
        new BigNumber(json.taskId),
        jsToOption(json.dueDate, jsToDate)
      );

    // Assignment
    case 'AssignTask':
      return TodoDomain.Action.create_AssignTask(
        new BigNumber(json.taskId),
        _dafny.Seq.UnicodeFromString(json.userId)
      );
    case 'UnassignTask':
      return TodoDomain.Action.create_UnassignTask(
        new BigNumber(json.taskId),
        _dafny.Seq.UnicodeFromString(json.userId)
      );

    // Tags on tasks
    case 'AddTagToTask':
      return TodoDomain.Action.create_AddTagToTask(
        new BigNumber(json.taskId),
        new BigNumber(json.tagId)
      );
    case 'RemoveTagFromTask':
      return TodoDomain.Action.create_RemoveTagFromTask(
        new BigNumber(json.taskId),
        new BigNumber(json.tagId)
      );

    // Tag CRUD
    case 'CreateTag':
      return TodoDomain.Action.create_CreateTag(_dafny.Seq.UnicodeFromString(json.name));
    case 'RenameTag':
      return TodoDomain.Action.create_RenameTag(
        new BigNumber(json.tagId),
        _dafny.Seq.UnicodeFromString(json.newName)
      );
    case 'DeleteTag':
      return TodoDomain.Action.create_DeleteTag(new BigNumber(json.tagId));

    // Project mode
    case 'MakeCollaborative':
      return TodoDomain.Action.create_MakeCollaborative();

    // Membership
    case 'AddMember':
      return TodoDomain.Action.create_AddMember(_dafny.Seq.UnicodeFromString(json.userId));
    case 'RemoveMember':
      return TodoDomain.Action.create_RemoveMember(_dafny.Seq.UnicodeFromString(json.userId));

    default:
      return TodoDomain.Action.create_NoOp();
  }
};

// deno-lint-ignore no-explicit-any
export const actionToJson = (action: any): Action => {
  if (action.is_NoOp) return { type: 'NoOp' };

  // List operations
  if (action.is_AddList) return { type: 'AddList', name: dafnyStringToJs(action.dtor_name) };
  if (action.is_RenameList) return {
    type: 'RenameList',
    listId: toNumber(action.dtor_listId),
    newName: dafnyStringToJs(action.dtor_newName)
  };
  if (action.is_DeleteList) return { type: 'DeleteList', listId: toNumber(action.dtor_listId) };
  if (action.is_MoveList) return {
    type: 'MoveList',
    listId: toNumber(action.dtor_listId),
    listPlace: listPlaceToJson(action.dtor_listPlace)
  };

  // Task CRUD
  if (action.is_AddTask) return {
    type: 'AddTask',
    listId: toNumber(action.dtor_listId),
    title: dafnyStringToJs(action.dtor_title)
  };
  if (action.is_EditTask) return {
    type: 'EditTask',
    taskId: toNumber(action.dtor_taskId),
    title: dafnyStringToJs(action.dtor_title),
    notes: dafnyStringToJs(action.dtor_notes)
  };
  if (action.is_DeleteTask) return {
    type: 'DeleteTask',
    taskId: toNumber(action.dtor_taskId),
    userId: dafnyStringToJs(action.dtor_userId)
  };
  if (action.is_RestoreTask) return { type: 'RestoreTask', taskId: toNumber(action.dtor_taskId) };
  if (action.is_MoveTask) return {
    type: 'MoveTask',
    taskId: toNumber(action.dtor_taskId),
    toList: toNumber(action.dtor_toList),
    taskPlace: placeToJson(action.dtor_taskPlace)
  };

  // Task status
  if (action.is_CompleteTask) return { type: 'CompleteTask', taskId: toNumber(action.dtor_taskId) };
  if (action.is_UncompleteTask) return { type: 'UncompleteTask', taskId: toNumber(action.dtor_taskId) };
  if (action.is_StarTask) return { type: 'StarTask', taskId: toNumber(action.dtor_taskId) };
  if (action.is_UnstarTask) return { type: 'UnstarTask', taskId: toNumber(action.dtor_taskId) };

  // Due date
  if (action.is_SetDueDate) return {
    type: 'SetDueDate',
    taskId: toNumber(action.dtor_taskId),
    dueDate: optionToJs(action.dtor_dueDate, dateToJs)
  };

  // Assignment
  if (action.is_AssignTask) return {
    type: 'AssignTask',
    taskId: toNumber(action.dtor_taskId),
    userId: dafnyStringToJs(action.dtor_userId)
  };
  if (action.is_UnassignTask) return {
    type: 'UnassignTask',
    taskId: toNumber(action.dtor_taskId),
    userId: dafnyStringToJs(action.dtor_userId)
  };

  // Tags on tasks
  if (action.is_AddTagToTask) return {
    type: 'AddTagToTask',
    taskId: toNumber(action.dtor_taskId),
    tagId: toNumber(action.dtor_tagId)
  };
  if (action.is_RemoveTagFromTask) return {
    type: 'RemoveTagFromTask',
    taskId: toNumber(action.dtor_taskId),
    tagId: toNumber(action.dtor_tagId)
  };

  // Tag CRUD
  if (action.is_CreateTag) return { type: 'CreateTag', name: dafnyStringToJs(action.dtor_name) };
  if (action.is_RenameTag) return {
    type: 'RenameTag',
    tagId: toNumber(action.dtor_tagId),
    newName: dafnyStringToJs(action.dtor_newName)
  };
  if (action.is_DeleteTag) return { type: 'DeleteTag', tagId: toNumber(action.dtor_tagId) };

  // Project mode
  if (action.is_MakeCollaborative) return { type: 'MakeCollaborative' };

  // Membership
  if (action.is_AddMember) return { type: 'AddMember', userId: dafnyStringToJs(action.dtor_userId) };
  if (action.is_RemoveMember) return { type: 'RemoveMember', userId: dafnyStringToJs(action.dtor_userId) };

  return { type: 'NoOp' };
};

// ============================================================================
// ServerState conversion (for verified Dispatch)
// ============================================================================

interface ServerStateJson {
  present: Model;
  appliedLog: Action[];
  auditLog?: AuditRecord[];
}

interface AuditRecord {
  baseVersion: number;
  orig: Action;
  rebased: Action;
  chosen: Action;
  outcome: {
    type: 'accepted' | 'rejected';
    applied?: Action;
    noChange?: boolean;
    reason?: string;
  };
}

// deno-lint-ignore no-explicit-any
export const serverStateFromJson = (json: ServerStateJson): any => {
  const present = modelFromJson(json.present);

  // Convert appliedLog: Action[] -> Dafny seq<Action>
  const appliedActions = (json.appliedLog || []).map(actionFromJson);
  const appliedLog = _dafny.Seq.of(...appliedActions);

  // Convert auditLog: AuditRecord[] -> Dafny seq<RequestRecord>
  const auditRecords = (json.auditLog || []).map((rec: AuditRecord) => {
    const outcome = rec.outcome.type === 'accepted'
      ? TodoMultiCollaboration.RequestOutcome.create_AuditAccepted(
          actionFromJson(rec.outcome.applied!),
          rec.outcome.noChange || false
        )
      : TodoMultiCollaboration.RequestOutcome.create_AuditRejected(
          TodoMultiCollaboration.RejectReason.create_DomainInvalid(),
          actionFromJson(rec.outcome.applied || rec.rebased)
        );

    return TodoMultiCollaboration.RequestRecord.create_Req(
      new BigNumber(rec.baseVersion),
      actionFromJson(rec.orig),
      actionFromJson(rec.rebased),
      actionFromJson(rec.chosen),
      outcome
    );
  });
  const auditLog = _dafny.Seq.of(...auditRecords);

  return TodoMultiCollaboration.ServerState.create_ServerState(
    present,
    appliedLog,
    auditLog
  );
};

// deno-lint-ignore no-explicit-any
export const serverStateToJson = (s: any): ServerStateJson => {
  const present = modelToJson(s.dtor_present);

  // Convert appliedLog: Dafny seq<Action> -> Action[]
  const appliedLog = seqToArray(s.dtor_appliedLog).map(actionToJson);

  // Convert auditLog: Dafny seq<RequestRecord> -> AuditRecord[]
  // deno-lint-ignore no-explicit-any
  const auditLog = seqToArray(s.dtor_auditLog).map((rec: any) => {
    const outcome = rec.dtor_outcome;
    return {
      baseVersion: toNumber(rec.dtor_baseVersion),
      orig: actionToJson(rec.dtor_orig),
      rebased: actionToJson(rec.dtor_rebased),
      chosen: actionToJson(rec.dtor_chosen),
      outcome: outcome.is_AuditAccepted
        ? {
            type: 'accepted' as const,
            applied: actionToJson(outcome.dtor_applied),
            noChange: outcome.dtor_noChange
          }
        : {
            type: 'rejected' as const,
            reason: 'DomainInvalid',
            applied: actionToJson(outcome.dtor_rebased)
          }
    };
  });

  return { present, appliedLog, auditLog };
};

// ============================================================================
// Verified Dispatch (uses TodoMultiCollaboration.Dispatch directly)
// ============================================================================

export interface DispatchResult {
  status: 'accepted' | 'rejected';
  state?: Model;
  appliedAction?: Action;
  newVersion?: number;
  noChange?: boolean;
  appliedLog?: Action[];
  auditLog?: AuditRecord[];
  reason?: string;
}

/**
 * Dispatch using the VERIFIED Dafny MultiCollaboration.Dispatch function.
 *
 * This uses the Dafny-verified Dispatch function, which handles:
 * - Rebasing through the suffix
 * - Generating candidates
 * - Choosing the first valid candidate
 * - Preserving invariants (proven)
 */
export function dispatch(
  stateJson: Model,
  appliedLog: Action[],
  baseVersion: number,
  actionJson: Action,
  auditLog?: AuditRecord[]
): DispatchResult {
  // Build ServerState from JSON
  const serverState = serverStateFromJson({
    present: stateJson,
    appliedLog: appliedLog,
    auditLog: auditLog || []
  });

  // Call VERIFIED Dispatch
  const action = actionFromJson(actionJson);
  const result = TodoMultiCollaboration.__default.Dispatch(
    serverState,
    new BigNumber(baseVersion),
    action
  );

  // Result is a tuple: [newServerState, reply]
  const newServerState = result[0];
  const reply = result[1];

  // Extract new state
  const newStateJson = serverStateToJson(newServerState);

  // Check reply type using Dafny datatype discriminator property
  if (reply.is_Accepted) {
    return {
      status: 'accepted',
      state: newStateJson.present,
      newVersion: toNumber(reply.dtor_newVersion),
      appliedAction: actionToJson(reply.dtor_applied),
      noChange: reply.dtor_noChange,
      appliedLog: newStateJson.appliedLog,
      auditLog: newStateJson.auditLog
    };
  } else {
    // Rejected
    return {
      status: 'rejected',
      reason: 'DomainInvalid',
      // Include the rebased action for debugging
      appliedAction: actionToJson(reply.dtor_rebased)
    };
  }
}
`;

// Write the bundle
const outputPath = join(__dirname, 'dafny-bundle.ts');
writeFileSync(outputPath, bundle);
console.log(`Generated ${outputPath}`);
console.log('');
console.log('The bundle uses VERIFIED Dafny code:');
console.log('  - TodoMultiCollaboration.Dispatch (full verified reconciliation)');
console.log('  - Reply.is_Accepted property (Dafny datatype discriminator)');
console.log('');
console.log('Trust boundary: Only JSON conversion is unverified.');
