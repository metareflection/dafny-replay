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

## See Also

- [LATER.md](LATER.md) - Future specs and enhancements to be added later
