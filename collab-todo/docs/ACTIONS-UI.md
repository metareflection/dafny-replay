# Actions UI Status

This document tracks which Dafny spec actions have corresponding UI components in `src/App.jsx`.

---

## Fully Implemented

| Action | UI Component | Handler |
|--------|--------------|---------|
| AddList | `TodoBoard` form | `handleAddList` |
| RenameList | `TaskList` header click | `handleRenameList` |
| DeleteList | `TaskList` delete button | `handleDeleteList` |
| AddTask | `TaskList` form | `handleAddTask` |
| EditTask | `TaskItem` inline edit | `onEdit` callback |
| DeleteTask | `TaskItem` delete button | `onDelete` callback |
| MoveTask | `TaskItem` move menu | `onMove` callback (moves to end only) |
| CompleteTask | `TaskItem` checkbox | `onComplete` callback |
| UncompleteTask | `TaskItem` checkbox | `onComplete` callback |
| StarTask | `TaskItem` star button | `onStar` callback |
| UnstarTask | `TaskItem` star button | `onStar` callback |
| CreateTag | `TagsPanel` form | `handleCreateTag` |
| DeleteTag | `TagsPanel` delete button | `onClick` inline |

---

## Missing UI Components

| Action | Description | Priority |
|--------|-------------|----------|
| **MoveList** | Reorder lists within project | Medium |
| **RestoreTask** | Undelete soft-deleted tasks | Low (Optional trash view) |
| **SetDueDate** | Set/clear task due date | High |
| **AssignTask** | Assign member to task | High |
| **UnassignTask** | Remove assignee from task | High |
| **AddTagToTask** | Attach tag to task | High |
| **RemoveTagFromTask** | Remove tag from task | High |
| **RenameTag** | Rename existing tag | Low |
| **MakeCollaborative** | Convert Personal to Collaborative | Medium |

---

## Partially Implemented

| Action | Issue |
|--------|-------|
| **AddMember** | `MembersPanel` manages Supabase `project_members` table via hooks, but doesn't dispatch Dafny actions to update the model's `members` set |
| **RemoveMember** | Same as above - works at DB level, not through verified spec |

**Note:** The membership actions may need synchronization between the Supabase database membership records and the Dafny model's `members` set.

---

## Display-Only (No Edit UI)

These fields are displayed in the UI but cannot be modified:

| Field | Displays In | Missing UI |
|-------|-------------|------------|
| Due Date | `TaskItem` (formatted date, overdue styling) | Date picker to set/clear |
| Tags on Task | `TaskItem` (tag badges) | Tag selector to add/remove |
| Assignees | `TaskItem` (user badges) | Member selector to assign/unassign |

---

## Summary

- **13 actions** fully implemented
- **9 actions** missing UI entirely
- **2 actions** partially implemented (DB-level only)

Last updated: 2026-01-01
