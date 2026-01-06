# Todo App Domain Design

This document describes the verified domain specification for the collaborative Todo app in natural language. All decisions here are reflected in `TodoMultiCollaboration.dfy`.

---

## Data Model

### Project
- Each project has a **mode**: Personal or Collaborative
- Each project has exactly one **owner** (immutable)
- Each project has a set of **members** (includes owner)
- Personal projects have only the owner as member
- Collaborative projects can have multiple members

### Lists
- Lists are ordered within a project
- Each list has an internal **ListId** (nat, auto-allocated)
- Each list has a user-visible **ListName** (string, editable)
- **List names must be unique** within the project (case-insensitive)
- Lists can be reordered using anchor-based placement (AtEnd, Before, After)

### Tasks
- Tasks belong to exactly one list (when not deleted)
- **Task titles must be unique** within each list (case-insensitive)
- Each task has:
  - **title** (string)
  - **notes** (string)
  - **completed** (boolean) - task stays in place when completed
  - **starred** (boolean) - surfaces task as priority (UI sorts/filters)
  - **dueDate** (optional Date) - must be valid if present
  - **assignees** (set of UserIds) - multiple users can be assigned
  - **tags** (set of TagIds) - links to project-level tags
  - **deleted** (boolean) - soft delete flag
  - **deletedBy** (optional UserId) - who deleted it
  - **deletedFromList** (optional ListId) - which list it was in before deletion

### Tags
- Tags are project-scoped (not global)
- Each tag has a **name** (string)
- **Tag names must be unique** within the project (case-insensitive)
- Tags can be attached to multiple tasks
- Deleting a tag removes it from all tasks

### Dates
- Dates have year, month, day (natural numbers)
- Valid dates: year >= 1970, month 1-12, day valid for month
- Leap years handled correctly
- Timezone conversion happens at app layer (client provides local date)

---

## Actions

### List Operations
- **AddList(name)** - Creates a new list with the given name (fails with DuplicateList if name exists)
- **RenameList(listId, newName)** - Changes the display name (fails with DuplicateList if name exists)
- **DeleteList(listId)** - Removes list and all its tasks (idempotent)
- **MoveList(listId, place)** - Reorders list using anchor placement

### Task CRUD
- **AddTask(listId, title)** - Creates task at end of list (fails with DuplicateTask if title exists in list)
- **EditTask(taskId, title, notes)** - Updates title and notes (fails with DuplicateTask if title exists in list)
- **DeleteTask(taskId, userId)** - Soft deletes (marks deleted, records who and which list)
- **RestoreTask(taskId)** - Restores to original list (fails with DuplicateTask if title now conflicts)
- **MoveTask(taskId, toList, place)** - Moves between/within lists (fails with DuplicateTask if title exists in destination)

### Task Status
- **CompleteTask(taskId)** - Marks as completed (stays in place)
- **UncompleteTask(taskId)** - Marks as not completed
- **StarTask(taskId)** - Marks as starred/priority
- **UnstarTask(taskId)** - Removes star

### Task Properties
- **SetDueDate(taskId, date)** - Sets or clears due date (validates date)
- **AssignTask(taskId, userId)** - Adds user to assignees (must be member)
- **UnassignTask(taskId, userId)** - Removes user from assignees
- **AddTagToTask(taskId, tagId)** - Attaches existing tag
- **RemoveTagFromTask(taskId, tagId)** - Detaches tag

### Tag Operations
- **CreateTag(name)** - Creates new project-level tag (fails with DuplicateTag if name exists)
- **RenameTag(tagId, newName)** - Changes tag name (fails with DuplicateTag if name exists)
- **DeleteTag(tagId)** - Removes tag from project and all tasks

### Project Operations
- **MakeCollaborative** - Converts Personal to Collaborative (one-way)
- **AddMember(userId)** - Adds member (collaborative only)
- **RemoveMember(userId)** - Removes member, clears their assignments (cannot remove owner)

---

## Invariants (Always True)

1. **Lists are unique** - No duplicate list IDs in the ordered list
2. **Maps match lists** - listNames and tasks maps defined exactly on existing lists
3. **Tasks exist** - Every taskId in a list exists in taskData
4. **No orphans or duplicates** - Each non-deleted task appears in exactly one list
5. **No duplicate tasks in list** - Each list has unique task IDs
6. **Tags exist** - All tags referenced by tasks exist in the project
7. **Allocators fresh** - All IDs are less than their respective nextId allocator
8. **Assignees are members** - Task assignees must be project members
9. **Owner is member** - Owner is always in the members set
10. **Personal mode constraint** - Personal projects have exactly one member (owner)
11. **Collaborative mode constraint** - Collaborative projects have at least one member
12. **Valid dates** - All due dates are valid calendar dates
13. **Unique list names** - No two lists have the same name (case-insensitive)
14. **Unique task titles per list** - No two tasks in the same list have the same title (case-insensitive)
15. **Unique tag names** - No two tags have the same name (case-insensitive)

---

## Conflict Resolution (Rebase)

### DeleteTask Conflicts
- If remote deletes a task and local operates on it (edit, move, complete, etc.):
  - **Honor the delete** - local operation becomes NoOp
  - **App layer notifies both users** of the conflict
  - **Task stays in database** for potential restore

### RemoveMember Conflicts
- If remote removes a member and local assigns task to that member:
  - **Member is removed**
  - **Assignment becomes NoOp**
  - **App layer notifies** user who tried to assign

### MoveList Conflicts
- If both users move the same list concurrently:
  - **Remote wins** - local move becomes NoOp
  - **App layer warns local user** their move wasn't applied

### MoveTask Conflicts
- If both users move the same task: **Last-Write-Wins (LWW)**
- If moving different tasks and anchor is affected: **Degrade to AtEnd**

### Other Conflicts
- EditTask, CompleteTask, StarTask, SetDueDate, AssignTask: **LWW**

---

## Soft Delete Semantics

- DeleteTask marks task as `deleted: true`, records `deletedBy` and `deletedFromList`
- Deleted tasks are removed from their list but stay in taskData
- RestoreTask clears the deleted flag and adds task back to original list
- If original list was deleted, falls back to first available list
- This enables conflict notification and undo functionality
- Permanent deletion (cleanup) is a separate concern (not in spec)

---

## Conflict Detection (App Layer)

The app layer detects conflicts by comparing actions in the dispatch result:

1. **Compare orig vs rebased** - If rebased != orig, the action was transformed
2. **Check for NoOp** - If rebased == NoOp && orig != NoOp, a conflict caused the action to be dropped

### Actions that become NoOp on conflict:
- **DeleteTask + local op** - Task was deleted by another user
- **RemoveMember + AssignTask** - Member was removed by another user
- **MoveList + MoveList** - Same list moved by another user (remote wins)

### App layer responsibilities:
- Detect when rebased != orig
- Show notification to user explaining what happened
- For soft-deleted tasks, offer restore option
- DeleteList should warn user that tasks will be permanently deleted

---

## Resolved Decisions

1. **RestoreTask target** - Restores to original list (tracked in deletedFromList), falls back to first list if original was deleted
2. **DeleteList warning** - App layer warns user that tasks will be permanently deleted (not soft-deleted)
3. **Conflict notifications** - App layer detects and notifies; spec provides data via orig/rebased comparison

---

## View Layer

The view layer is fully specced in Dafny and compiled to JavaScript. The UI should call these functions directly - no filtering/counting logic in React code.

### View Mode
- **AllProjects** - Default mode, aggregates tasks across all loaded projects
- **SingleProject** - View one project at a time

### Smart Lists
Smart lists filter tasks across all loaded projects (in AllProjects mode) or the current project (in SingleProject mode).

- **All Tasks** - Tasks that are not completed AND not deleted (all visible incomplete tasks)
- **Priority** - Tasks that are starred AND not completed AND not deleted
- **Logbook** - Tasks that are completed AND not deleted

### Sidebar Selection
What the user has selected in the sidebar:
- **NoSelection** - Nothing selected
- **SmartListSelected(smartList)** - Priority or Logbook selected
- **ProjectSelected(projectId)** - A project selected (shows all lists)
- **ListSelected(projectId, listId)** - A specific list selected

### View State
The complete view state is a single Dafny datatype:
```
ViewState(
  viewMode: ViewMode,           // Single or All
  selection: SidebarSelection,  // What's selected
  loadedProjects: MultiModel    // All loaded project data
)
```

Initial state: `ViewState(AllProjects, NoSelection, EmptyMultiModel())`

### Key Functions (all compiled, used by UI)

**Smart List Predicates:**
- `IsPriorityTask(t)` - Is this task a priority task?
- `IsLogbookTask(t)` - Is this task in the logbook?
- `IsVisibleTask(t)` - Is this task visible (not deleted)?
- `MatchesSmartList(t, smartList)` - Does task match filter?

**Single-Project Queries:**
- `GetVisibleTaskIds(m)` - All non-deleted task IDs
- `GetPriorityTaskIds(m)` - Task IDs matching Priority filter
- `GetLogbookTaskIds(m)` - Task IDs matching Logbook filter
- `CountPriorityTasks(m)` - Count of priority tasks
- `CountLogbookTasks(m)` - Count of logbook tasks
- `GetTasksInList(m, listId)` - Ordered task IDs in a list (visible only)

**Task Accessors:**
- `GetTask(m, taskId)` - Get task (None if deleted or missing)
- `GetTaskIncludingDeleted(m, taskId)` - Get task even if deleted
- `GetListName(m, listId)` - Get list name
- `GetLists(m)` - Get ordered list IDs
- `GetTagName(m, tagId)` - Get tag name
- `GetTags(m)` - Get all tag IDs

**Multi-Project Aggregation:**
- `TaggedTaskId(projectId, taskId)` - Task ID with project context
- `GetAllVisibleTasks(mm)` - All visible (non-deleted, incomplete) tasks across projects
- `GetAllPriorityTasks(mm)` - All priority tasks across projects
- `GetAllLogbookTasks(mm)` - All logbook tasks across projects
- `CountAllVisibleTasks(mm)` - Total visible task count
- `CountAllPriorityTasks(mm)` - Total priority count
- `CountAllLogbookTasks(mm)` - Total logbook count

**View State Transitions:**
- `InitViewState()` - Initial state (AllProjects, no selection)
- `SetViewMode(vs, mode)` - Change view mode
- `SelectSmartList(vs, smartList)` - Select Priority or Logbook
- `SelectProject(vs, projectId)` - Select a project
- `SelectList(vs, projectId, listId)` - Select a list
- `ClearSelection(vs)` - Clear selection
- `LoadProject(vs, projectId, model)` - Load project data
- `UnloadProject(vs, projectId)` - Unload project data

**View State Queries:**
- `GetTasksToDisplay(vs)` - Tasks to show based on selection
- `GetSmartListCount(vs, smartList)` - Count for smart list badge
- `IsProjectLoaded(vs, projectId)` - Is project loaded?

### Ghost Invariants

**ViewStateConsistent(vs):**
- Selection must refer to loaded data
- If ProjectSelected, that project must be loaded
- If ListSelected, that project and list must be loaded

**CountMatchesTasks(vs, smartList):**
- The count displayed equals the actual number of tasks
- Prevents "count shows N but no tasks displayed" bugs

---

## Offline Mode (WIP)

**Status:** Disabled pending conflict resolution implementation

### Current State
- Offline detection infrastructure exists in `MultiProjectEffectManager.js`
- Dafny state machine supports offline state and action queuing
- **UI blocks all actions when offline** (overlay + dispatch rejection)

### Problem
The current rebasing approach doesn't handle temporal ordering:
- User A goes offline, makes changes over 24 hours
- User B makes changes online (more recent)
- User A comes online → B's changes get overwritten by A's stale changes

### Planned Solution
1. No reliance on client timestamps (can't trust client clocks)
2. Auto-apply non-conflicting changes
3. User resolves actual conflicts (like git merge)

### Infrastructure Preserved
- `EffectState` datatype with online/offline status
- `EffectEvent.NetworkError()` / `NetworkRestored()` events
- Action queuing in pending state
- Manual `toggleOffline()` method (unused in UI)

See [CHAT.md](CHAT.md) for full discussion.

---

## See Also

- [LATER.md](LATER.md) - Future specs and enhancements to be added later
