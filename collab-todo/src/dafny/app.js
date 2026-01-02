// Dafny Todo Domain Adapter
// Wraps compiled Dafny code with JSON conversion helpers

import BigNumber from 'bignumber.js';

// Configure BigNumber as Dafny expects
BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });

// Import the generated code as raw text
import todoCode from './TodoMulti.cjs?raw';

// Set up the environment and evaluate the Dafny code
const require = (mod) => {
  if (mod === 'bignumber.js') return BigNumber;
  throw new Error(`Unknown module: ${mod}`);
};

// Create a function that evaluates the code with proper scope
const initDafny = new Function('require', `
  ${todoCode}
  return { _dafny, TodoDomain, TodoMultiCollaboration, TodoAppCore };
`);

const { _dafny, TodoDomain, TodoAppCore } = initDafny(require);

// ============================================================================
// Helpers
// ============================================================================

// Convert Dafny seq to JS array
const seqToArray = (seq) => {
  const arr = [];
  for (let i = 0; i < seq.length; i++) {
    arr.push(seq[i]);
  }
  return arr;
};

// Convert BigNumber to JS number
const toNumber = (bn) => {
  if (bn && typeof bn.toNumber === 'function') {
    return bn.toNumber();
  }
  return bn;
};

// Convert Dafny string to JS string
const dafnyStringToJs = (seq) => {
  if (typeof seq === 'string') return seq;
  if (seq.toVerbatimString) return seq.toVerbatimString(false);
  return Array.from(seq).join('');
};

// Convert Dafny set to JS array
const setToArray = (set) => {
  if (!set || !set.Elements) return [];
  return Array.from(set.Elements);
};

// ============================================================================
// Option Helpers
// ============================================================================

const optionToJs = (opt, converter = (x) => x) => {
  if (opt.is_None) return null;
  return converter(opt.dtor_value);
};

const jsToOption = (val, converter = (x) => x) => {
  if (val === null || val === undefined) {
    return TodoDomain.Option.create_None();
  }
  return TodoDomain.Option.create_Some(converter(val));
};

// ============================================================================
// Date Conversion
// ============================================================================

const dateToJs = (date) => {
  return {
    year: toNumber(date.dtor_year),
    month: toNumber(date.dtor_month),
    day: toNumber(date.dtor_day)
  };
};

const jsToDate = (obj) => {
  return TodoDomain.Date.create_Date(
    new BigNumber(obj.year),
    new BigNumber(obj.month),
    new BigNumber(obj.day)
  );
};

// ============================================================================
// Task Conversion
// ============================================================================

const taskToJs = (task) => {
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
// Model Conversion
// ============================================================================

// Convert JSON model to Dafny Model
const modelFromJson = (json) => {
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
  const lists = _dafny.Seq.of(...(json.lists || []).map(id => new BigNumber(id)));

  // ListNames
  let listNames = _dafny.Map.Empty;
  for (const [id, name] of Object.entries(json.listNames || {})) {
    listNames = listNames.update(new BigNumber(id), _dafny.Seq.UnicodeFromString(name));
  }

  // Tasks (listId -> seq<taskId>)
  let tasks = _dafny.Map.Empty;
  for (const [listId, taskIds] of Object.entries(json.tasks || {})) {
    const key = new BigNumber(listId);
    const value = _dafny.Seq.of(...taskIds.map(id => new BigNumber(id)));
    tasks = tasks.update(key, value);
  }

  // TaskData
  let taskData = _dafny.Map.Empty;
  for (const [taskId, task] of Object.entries(json.taskData || {})) {
    const key = new BigNumber(taskId);

    // Convert assignees to Dafny set of strings
    let assignees = _dafny.Set.Empty;
    for (const a of (task.assignees || [])) {
      assignees = assignees.Union(_dafny.Set.fromElements(_dafny.Seq.UnicodeFromString(a)));
    }

    // Convert tags to Dafny set of nats
    let tags = _dafny.Set.Empty;
    for (const t of (task.tags || [])) {
      tags = tags.Union(_dafny.Set.fromElements(new BigNumber(t)));
    }

    // Convert dueDate
    const dueDate = task.dueDate
      ? TodoDomain.Option.create_Some(jsToDate(task.dueDate))
      : TodoDomain.Option.create_None();

    // Convert deletedBy
    const deletedBy = task.deletedBy
      ? TodoDomain.Option.create_Some(_dafny.Seq.UnicodeFromString(task.deletedBy))
      : TodoDomain.Option.create_None();

    // Convert deletedFromList
    const deletedFromList = task.deletedFromList !== null && task.deletedFromList !== undefined
      ? TodoDomain.Option.create_Some(new BigNumber(task.deletedFromList))
      : TodoDomain.Option.create_None();

    const value = TodoDomain.Task.create_Task(
      _dafny.Seq.UnicodeFromString(task.title || ''),
      _dafny.Seq.UnicodeFromString(task.notes || ''),
      task.completed || false,
      task.starred || false,
      dueDate,
      assignees,
      tags,
      task.deleted || false,
      deletedBy,
      deletedFromList
    );
    taskData = taskData.update(key, value);
  }

  // Tags
  let tagsMap = _dafny.Map.Empty;
  for (const [tagId, tag] of Object.entries(json.tags || {})) {
    const key = new BigNumber(tagId);
    const value = TodoDomain.Tag.create_Tag(_dafny.Seq.UnicodeFromString(tag.name || ''));
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

// Convert Dafny Model to JSON
const modelToJson = (m) => {
  const mode = m.dtor_mode.is_Collaborative ? 'Collaborative' : 'Personal';
  const owner = dafnyStringToJs(m.dtor_owner);
  const members = setToArray(m.dtor_members).map(dafnyStringToJs);
  const lists = seqToArray(m.dtor_lists).map(toNumber);

  const listNames = {};
  if (m.dtor_listNames && m.dtor_listNames.Keys) {
    for (const key of m.dtor_listNames.Keys.Elements) {
      listNames[toNumber(key)] = dafnyStringToJs(m.dtor_listNames.get(key));
    }
  }

  const tasks = {};
  if (m.dtor_tasks && m.dtor_tasks.Keys) {
    for (const key of m.dtor_tasks.Keys.Elements) {
      tasks[toNumber(key)] = seqToArray(m.dtor_tasks.get(key)).map(toNumber);
    }
  }

  const taskData = {};
  if (m.dtor_taskData && m.dtor_taskData.Keys) {
    for (const key of m.dtor_taskData.Keys.Elements) {
      taskData[toNumber(key)] = taskToJs(m.dtor_taskData.get(key));
    }
  }

  const tags = {};
  if (m.dtor_tags && m.dtor_tags.Keys) {
    for (const key of m.dtor_tags.Keys.Elements) {
      tags[toNumber(key)] = { name: dafnyStringToJs(m.dtor_tags.get(key).dtor_name) };
    }
  }

  return {
    mode,
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
// Place Conversion
// ============================================================================

const placeFromJson = (json) => {
  if (!json || json.type === 'AtEnd') {
    return TodoDomain.Place.create_AtEnd();
  } else if (json.type === 'Before') {
    return TodoDomain.Place.create_Before(new BigNumber(json.anchor));
  } else if (json.type === 'After') {
    return TodoDomain.Place.create_After(new BigNumber(json.anchor));
  }
  return TodoDomain.Place.create_AtEnd();
};

const placeToJson = (place) => {
  if (place.is_AtEnd) return { type: 'AtEnd' };
  if (place.is_Before) return { type: 'Before', anchor: toNumber(place.dtor_anchor) };
  if (place.is_After) return { type: 'After', anchor: toNumber(place.dtor_anchor) };
  return { type: 'AtEnd' };
};

const listPlaceFromJson = (json) => {
  if (!json || json.type === 'ListAtEnd') {
    return TodoDomain.ListPlace.create_ListAtEnd();
  } else if (json.type === 'ListBefore') {
    return TodoDomain.ListPlace.create_ListBefore(new BigNumber(json.anchor));
  } else if (json.type === 'ListAfter') {
    return TodoDomain.ListPlace.create_ListAfter(new BigNumber(json.anchor));
  }
  return TodoDomain.ListPlace.create_ListAtEnd();
};

const listPlaceToJson = (place) => {
  if (place.is_ListAtEnd) return { type: 'ListAtEnd' };
  if (place.is_ListBefore) return { type: 'ListBefore', anchor: toNumber(place.dtor_anchor) };
  if (place.is_ListAfter) return { type: 'ListAfter', anchor: toNumber(place.dtor_anchor) };
  return { type: 'ListAtEnd' };
};

// ============================================================================
// Action Conversion
// ============================================================================

// Convert JSON action to Dafny Action
const actionFromJson = (json) => {
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

// Convert Dafny Action to JSON
const actionToJson = (action) => {
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

  // JSON conversion
  modelFromJson,
  modelToJson,
  actionToJson,
  actionFromJson,
};

// ============================================================================
// Client-Side API (for optimistic updates and UI)
// ============================================================================

const App = {
  // -------------------------------------------------------------------------
  // ClientState management (for offline support)
  // -------------------------------------------------------------------------

  // Initialize a new client state from server sync response
  InitClient: (version, modelJson) => {
    const model = modelFromJson(modelJson);
    return TodoAppCore.ClientState.create_ClientState(
      new BigNumber(version),
      model,
      _dafny.Seq.of()
    );
  },

  // Client-side local dispatch (optimistic update)
  LocalDispatch: (client, action) => {
    return TodoAppCore.__default.ClientLocalDispatch(client, action);
  },

  // Get pending actions count
  GetPendingCount: (client) => toNumber(TodoAppCore.__default.PendingCount(client)),

  // Get client base version
  GetBaseVersion: (client) => toNumber(TodoAppCore.__default.ClientVersion(client)),

  // Get client present model (with pending actions applied)
  GetPresent: (client) => TodoAppCore.__default.ClientModel(client),

  // Get pending actions as array
  GetPendingActions: (client) => seqToArray(client.dtor_pending),

  // -------------------------------------------------------------------------
  // Place constructors
  // -------------------------------------------------------------------------

  AtEnd: () => TodoDomain.Place.create_AtEnd(),
  Before: (anchorId) => TodoDomain.Place.create_Before(new BigNumber(anchorId)),
  After: (anchorId) => TodoDomain.Place.create_After(new BigNumber(anchorId)),

  ListAtEnd: () => TodoDomain.ListPlace.create_ListAtEnd(),
  ListBefore: (anchorId) => TodoDomain.ListPlace.create_ListBefore(new BigNumber(anchorId)),
  ListAfter: (anchorId) => TodoDomain.ListPlace.create_ListAfter(new BigNumber(anchorId)),

  // -------------------------------------------------------------------------
  // Option constructors
  // -------------------------------------------------------------------------

  None: () => TodoDomain.Option.create_None(),
  Some: (value) => TodoDomain.Option.create_Some(value),
  SomeDate: (year, month, day) => TodoDomain.Option.create_Some(
    TodoDomain.Date.create_Date(new BigNumber(year), new BigNumber(month), new BigNumber(day))
  ),

  // -------------------------------------------------------------------------
  // Action constructors
  // -------------------------------------------------------------------------

  NoOp: () => TodoDomain.Action.create_NoOp(),

  // List operations
  AddList: (name) => TodoDomain.Action.create_AddList(_dafny.Seq.UnicodeFromString(name)),
  RenameList: (listId, newName) => TodoDomain.Action.create_RenameList(
    new BigNumber(listId),
    _dafny.Seq.UnicodeFromString(newName)
  ),
  DeleteList: (listId) => TodoDomain.Action.create_DeleteList(new BigNumber(listId)),
  MoveList: (listId, listPlace) => TodoDomain.Action.create_MoveList(new BigNumber(listId), listPlace),

  // Task CRUD
  AddTask: (listId, title) => TodoDomain.Action.create_AddTask(
    new BigNumber(listId),
    _dafny.Seq.UnicodeFromString(title)
  ),
  EditTask: (taskId, title, notes) => TodoDomain.Action.create_EditTask(
    new BigNumber(taskId),
    _dafny.Seq.UnicodeFromString(title),
    _dafny.Seq.UnicodeFromString(notes || '')
  ),
  DeleteTask: (taskId, userId) => TodoDomain.Action.create_DeleteTask(
    new BigNumber(taskId),
    _dafny.Seq.UnicodeFromString(userId)
  ),
  RestoreTask: (taskId) => TodoDomain.Action.create_RestoreTask(new BigNumber(taskId)),
  MoveTask: (taskId, toList, taskPlace) => TodoDomain.Action.create_MoveTask(
    new BigNumber(taskId),
    new BigNumber(toList),
    taskPlace
  ),

  // Task status
  CompleteTask: (taskId) => TodoDomain.Action.create_CompleteTask(new BigNumber(taskId)),
  UncompleteTask: (taskId) => TodoDomain.Action.create_UncompleteTask(new BigNumber(taskId)),
  StarTask: (taskId) => TodoDomain.Action.create_StarTask(new BigNumber(taskId)),
  UnstarTask: (taskId) => TodoDomain.Action.create_UnstarTask(new BigNumber(taskId)),

  // Due date
  SetDueDate: (taskId, dateOption) => TodoDomain.Action.create_SetDueDate(
    new BigNumber(taskId),
    dateOption
  ),
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

  // Assignment
  AssignTask: (taskId, userId) => TodoDomain.Action.create_AssignTask(
    new BigNumber(taskId),
    _dafny.Seq.UnicodeFromString(userId)
  ),
  UnassignTask: (taskId, userId) => TodoDomain.Action.create_UnassignTask(
    new BigNumber(taskId),
    _dafny.Seq.UnicodeFromString(userId)
  ),

  // Tags on tasks
  AddTagToTask: (taskId, tagId) => TodoDomain.Action.create_AddTagToTask(
    new BigNumber(taskId),
    new BigNumber(tagId)
  ),
  RemoveTagFromTask: (taskId, tagId) => TodoDomain.Action.create_RemoveTagFromTask(
    new BigNumber(taskId),
    new BigNumber(tagId)
  ),

  // Tag CRUD
  CreateTag: (name) => TodoDomain.Action.create_CreateTag(_dafny.Seq.UnicodeFromString(name)),
  RenameTag: (tagId, newName) => TodoDomain.Action.create_RenameTag(
    new BigNumber(tagId),
    _dafny.Seq.UnicodeFromString(newName)
  ),
  DeleteTag: (tagId) => TodoDomain.Action.create_DeleteTag(new BigNumber(tagId)),

  // Project mode
  MakeCollaborative: () => TodoDomain.Action.create_MakeCollaborative(),

  // Membership
  AddMember: (userId) => TodoDomain.Action.create_AddMember(_dafny.Seq.UnicodeFromString(userId)),
  RemoveMember: (userId) => TodoDomain.Action.create_RemoveMember(_dafny.Seq.UnicodeFromString(userId)),

  // -------------------------------------------------------------------------
  // Model accessors
  // -------------------------------------------------------------------------

  // Project metadata
  GetMode: (m) => m.dtor_mode.is_Collaborative ? 'Collaborative' : 'Personal',
  GetOwner: (m) => dafnyStringToJs(m.dtor_owner),
  GetMembers: (m) => setToArray(m.dtor_members).map(dafnyStringToJs),

  // Lists
  GetLists: (m) => seqToArray(m.dtor_lists).map(toNumber),
  GetListName: (m, listId) => {
    const key = new BigNumber(listId);
    if (m.dtor_listNames.contains(key)) {
      return dafnyStringToJs(m.dtor_listNames.get(key));
    }
    return '';
  },

  // Tasks in a list
  GetTasksInList: (m, listId) => {
    const key = new BigNumber(listId);
    if (m.dtor_tasks.contains(key)) {
      return seqToArray(m.dtor_tasks.get(key)).map(toNumber);
    }
    return [];
  },

  // Task data
  GetTask: (m, taskId) => {
    const key = new BigNumber(taskId);
    if (m.dtor_taskData.contains(key)) {
      return taskToJs(m.dtor_taskData.get(key));
    }
    return null;
  },

  // Tags
  GetTags: (m) => {
    const result = {};
    if (m.dtor_tags && m.dtor_tags.Keys) {
      for (const key of m.dtor_tags.Keys.Elements) {
        result[toNumber(key)] = { name: dafnyStringToJs(m.dtor_tags.get(key).dtor_name) };
      }
    }
    return result;
  },
  GetTagName: (m, tagId) => {
    const key = new BigNumber(tagId);
    if (m.dtor_tags.contains(key)) {
      return dafnyStringToJs(m.dtor_tags.get(key).dtor_name);
    }
    return '';
  },

  // Allocators (for debugging)
  GetNextListId: (m) => toNumber(m.dtor_nextListId),
  GetNextTaskId: (m) => toNumber(m.dtor_nextTaskId),
  GetNextTagId: (m) => toNumber(m.dtor_nextTagId),

  // -------------------------------------------------------------------------
  // Action serialization
  // -------------------------------------------------------------------------

  actionToJson,
  actionFromJson,
};

export default App;
