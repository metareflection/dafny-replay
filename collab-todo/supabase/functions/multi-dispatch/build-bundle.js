#!/usr/bin/env node
// Build script to bundle compiled Dafny multi-project code for Deno Edge Function
// Run: node build-bundle.js

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read the compiled Dafny code
const dafnyCodePath = join(__dirname, '../../../src/dafny/TodoMultiProjectEffect.cjs');
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
const bundle = `// Dafny Multi-Project Domain Bundle for Deno Edge Function
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
  return { _dafny, TodoDomain, TodoMultiCollaboration, TodoMultiProjectDomain, TodoMultiProjectEffectStateMachine, TodoMultiProjectEffectAppCore };
\`);

const { _dafny, TodoDomain, TodoMultiCollaboration, TodoMultiProjectDomain, TodoMultiProjectEffectStateMachine, TodoMultiProjectEffectAppCore } = initDafny(require, exports, module);

export { _dafny, TodoDomain, TodoMultiCollaboration, TodoMultiProjectDomain, TodoMultiProjectEffectStateMachine, TodoMultiProjectEffectAppCore, BigNumber };

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

// deno-lint-ignore no-explicit-any
const mapToObject = (dafnyMap: any, keyFn: (k: any) => string, valFn: (v: any) => any): Record<string, any> => {
  const result: Record<string, any> = {};
  if (dafnyMap && dafnyMap.Keys) {
    for (const k of dafnyMap.Keys.Elements) {
      result[keyFn(k)] = valFn(dafnyMap.get(k));
    }
  }
  return result;
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

// ============================================================================
// Action conversion (single-project)
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
    case 'AddList':
      return TodoDomain.Action.create_AddList(_dafny.Seq.UnicodeFromString(json.name));
    case 'RenameList':
      return TodoDomain.Action.create_RenameList(
        new BigNumber(json.listId),
        _dafny.Seq.UnicodeFromString(json.newName)
      );
    case 'DeleteList':
      return TodoDomain.Action.create_DeleteList(new BigNumber(json.listId));
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
        _dafny.Seq.UnicodeFromString(json.userId || '')
      );
    case 'MoveTask':
      return TodoDomain.Action.create_MoveTask(
        new BigNumber(json.taskId),
        new BigNumber(json.toList),
        placeFromJson(json.taskPlace)
      );
    case 'CompleteTask':
      return TodoDomain.Action.create_CompleteTask(new BigNumber(json.taskId));
    case 'UncompleteTask':
      return TodoDomain.Action.create_UncompleteTask(new BigNumber(json.taskId));
    case 'StarTask':
      return TodoDomain.Action.create_StarTask(new BigNumber(json.taskId));
    case 'UnstarTask':
      return TodoDomain.Action.create_UnstarTask(new BigNumber(json.taskId));
    case 'CreateTag':
      return TodoDomain.Action.create_CreateTag(_dafny.Seq.UnicodeFromString(json.name));
    case 'DeleteTag':
      return TodoDomain.Action.create_DeleteTag(new BigNumber(json.tagId));
    default:
      return TodoDomain.Action.create_NoOp();
  }
};

// ============================================================================
// MultiAction conversion
// ============================================================================

interface MultiAction {
  type: 'Single' | 'MoveTaskTo' | 'CopyTaskTo' | 'MoveListTo';
  project?: string;
  action?: Action;
  srcProject?: string;
  dstProject?: string;
  taskId?: number;
  listId?: number;
  dstList?: number;
  anchor?: Place;
}

// deno-lint-ignore no-explicit-any
export const multiActionFromJson = (json: MultiAction): any => {
  switch (json.type) {
    case 'Single':
      return TodoMultiProjectDomain.MultiAction.create_Single(
        _dafny.Seq.UnicodeFromString(json.project!),
        actionFromJson(json.action!)
      );
    case 'MoveTaskTo':
      return TodoMultiProjectDomain.MultiAction.create_MoveTaskTo(
        _dafny.Seq.UnicodeFromString(json.srcProject!),
        _dafny.Seq.UnicodeFromString(json.dstProject!),
        new BigNumber(json.taskId!),
        new BigNumber(json.dstList!),
        placeFromJson(json.anchor)
      );
    case 'CopyTaskTo':
      return TodoMultiProjectDomain.MultiAction.create_CopyTaskTo(
        _dafny.Seq.UnicodeFromString(json.srcProject!),
        _dafny.Seq.UnicodeFromString(json.dstProject!),
        new BigNumber(json.taskId!),
        new BigNumber(json.dstList!)
      );
    case 'MoveListTo':
      return TodoMultiProjectDomain.MultiAction.create_MoveListTo(
        _dafny.Seq.UnicodeFromString(json.srcProject!),
        _dafny.Seq.UnicodeFromString(json.dstProject!),
        new BigNumber(json.listId!)
      );
    default:
      // Default to NoOp wrapped in Single
      return TodoMultiProjectDomain.MultiAction.create_Single(
        _dafny.Seq.UnicodeFromString(''),
        TodoDomain.Action.create_NoOp()
      );
  }
};

// ============================================================================
// MultiModel conversion
// ============================================================================

interface MultiModelJson {
  projects: Record<string, Model>;
}

// deno-lint-ignore no-explicit-any
export const multiModelFromJson = (json: MultiModelJson): any => {
  let projects = _dafny.Map.Empty;
  for (const [projectId, model] of Object.entries(json.projects)) {
    projects = projects.update(
      _dafny.Seq.UnicodeFromString(projectId),
      modelFromJson(model)
    );
  }
  return TodoMultiProjectDomain.MultiModel.create_MultiModel(projects);
};

// deno-lint-ignore no-explicit-any
export const multiModelToJson = (mm: any): MultiModelJson => {
  const projects: Record<string, Model> = {};
  if (mm.dtor_projects && mm.dtor_projects.Keys) {
    for (const key of mm.dtor_projects.Keys.Elements) {
      projects[dafnyStringToJs(key)] = modelToJson(mm.dtor_projects.get(key));
    }
  }
  return { projects };
};

// ============================================================================
// Verified TryMultiStep
// ============================================================================

export interface MultiStepResult {
  status: 'accepted' | 'rejected';
  multiModel?: MultiModelJson;
  changedProjects?: string[];
  error?: string;
}

/**
 * Try a multi-project step using VERIFIED Dafny TryMultiStep.
 */
export function tryMultiStep(
  multiModelJson: MultiModelJson,
  multiActionJson: MultiAction
): MultiStepResult {
  try {
    const mm = multiModelFromJson(multiModelJson);
    const action = multiActionFromJson(multiActionJson);

    // Call VERIFIED TryMultiStep
    const result = TodoMultiProjectDomain.__default.TryMultiStep(mm, action);

    if (result.is_Ok) {
      const newMM = result.dtor_value;
      const newMMJson = multiModelToJson(newMM);

      // Compute changed projects
      const changedProjects: string[] = [];
      for (const [projectId, newModel] of Object.entries(newMMJson.projects)) {
        const oldModel = multiModelJson.projects[projectId];
        if (!oldModel || JSON.stringify(oldModel) !== JSON.stringify(newModel)) {
          changedProjects.push(projectId);
        }
      }

      return {
        status: 'accepted',
        multiModel: newMMJson,
        changedProjects
      };
    } else {
      // Rejected
      const err = result.dtor_error;
      let errorMsg = 'Unknown error';
      if (err.is_MissingProject) {
        errorMsg = \`Missing project: \${dafnyStringToJs(err.dtor_projectId)}\`;
      } else if (err.is_SingleProjectError) {
        errorMsg = \`Project error in \${dafnyStringToJs(err.dtor_projectId)}\`;
      } else if (err.is_CrossProjectError) {
        errorMsg = dafnyStringToJs(err.dtor_message);
      }

      return {
        status: 'rejected',
        error: errorMsg
      };
    }
  } catch (e) {
    return {
      status: 'rejected',
      error: String(e)
    };
  }
}

// ============================================================================
// Get touched projects from action
// ============================================================================

export function getTouchedProjects(multiActionJson: MultiAction): string[] {
  const action = multiActionFromJson(multiActionJson);
  const touchedSet = TodoMultiProjectDomain.__default.TouchedProjects(action);
  return setToArray(touchedSet).map(dafnyStringToJs);
}
`;

// Write the bundle
const outputPath = join(__dirname, 'dafny-bundle.ts');
writeFileSync(outputPath, bundle);
console.log(`Generated ${outputPath}`);
console.log('');
console.log('The bundle uses VERIFIED Dafny code:');
console.log('  - TodoMultiProjectDomain.TryMultiStep (verified multi-project step)');
console.log('  - TodoMultiProjectDomain.TouchedProjects (which projects are affected)');
console.log('');
console.log('Trust boundary: Only JSON conversion is unverified.');
