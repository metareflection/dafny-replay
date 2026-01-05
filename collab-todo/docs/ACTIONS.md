# Actions: Spec vs UI Coverage

This document compares actions defined in the Dafny spec against what is currently exposed in the collab-todo UI.

## Summary

| Category | Spec Actions | Used in UI | Missing |
|----------|-------------|------------|---------|
| Single-Project | 24 | 19 | 5 |
| Multi-Project | 3 | 1 | 2 |
| **Total** | **27** | **20** | **7** |

---

## Single-Project Actions (from TodoMultiCollaboration.dfy)

### Used in UI

| Action | Parameters | UI Location | Trigger |
|--------|-----------|-------------|---------|
| AddTask | listId, title | TaskList | "Add task..." input field |
| EditTask | taskId, title, notes | TaskItem | Click task content to edit |
| DeleteTask | taskId, userId | TaskItem | Context menu "Delete" |
| CompleteTask | taskId | TaskItem | Checkbox (check) |
| UncompleteTask | taskId | TaskItem | Checkbox (uncheck) |
| StarTask | taskId | TaskItem | Star icon button |
| UnstarTask | taskId | TaskItem | Star icon button (toggle off) |
| MoveTask | taskId, toList, taskPlace | TaskItem | "Move to..." context menu |
| AddList | name | ProjectList | "+" button next to project |
| RenameList | listId, newName | TaskList | Click list name to edit |
| DeleteList | listId | TaskList | "X" button in list header |
| AddTagToTask | taskId, tagId | TagPicker | Click tag icon, select tag |
| RemoveTagFromTask | taskId, tagId | TagPicker | Click tag icon, deselect tag |
| CreateTag | name | TagPicker | Type new name, click "Create" |
| MoveList | listId, listPlace | TaskList | Arrow button dropdown, select target list |
| MakeCollaborative | - | ProjectView | "Make Collaborative" button (Personal projects) |
| AddMember | userId | MemberInvite | Enter email, click "Invite" |
| RemoveMember | userId | MemberList | "X" button on member row |
| SetDueDate | taskId, dueDate | DueDatePicker | Calendar icon button, select date or clear |

### Not Used in UI

| Action | Parameters | Notes |
|--------|-----------|-------|
| NoOp | - | Internal use only (rebasing) |
| **RestoreTask** | taskId | No undo for soft-deleted tasks |
| **AssignTask** | taskId, userId | No assignee UI |
| **UnassignTask** | taskId, userId | No assignee UI |
| **RenameTag** | tagId, newName | No tag rename UI (can delete and recreate) |
| **DeleteTag** | tagId | No tag management panel |

---

## Multi-Project Actions (from TodoMultiProjectDomain.dfy)

### Used in UI

| Action | Parameters | UI Location | Trigger |
|--------|-----------|-------------|---------|
| MoveListTo | srcProject, dstProject, listId | TaskList | Send icon dropdown, select target project |

### Not Used in UI

| Action | Parameters | Notes |
|--------|-----------|-------|
| **MoveTaskTo** | srcProject, dstProject, taskId, dstList, anchor | API exists in MultiProjectEffectManager, no UI |
| **CopyTaskTo** | srcProject, dstProject, taskId, dstList | API exists in MultiProjectEffectManager, no UI |

---

## Feature Gaps by Category

### High Value Missing Features

1. **Cross-Project Task Operations**
   - `MoveTaskTo` - Move task between projects
   - `CopyTaskTo` - Copy task to another project
   - Infrastructure ready (effect manager has `moveTaskToProject` and `copyTaskToProject` methods)
   - Note: `MoveListTo` (move entire list with tasks) is now implemented

2. **Task Assignment**
   - `AssignTask` / `UnassignTask` - Collaborative task assignment
   - Foundation for team collaboration

### Medium Value Missing Features

3. **Task Restoration**
   - `RestoreTask` - Undo soft delete
   - Would enable "Recently Deleted" view

4. **Tag Management Panel**
   - `RenameTag` / `DeleteTag` - Full tag CRUD in settings
   - Basic tag create/assign implemented via TagPicker

---

## Files Reference

| File | Purpose |
|------|---------|
| [TodoMultiCollaboration.dfy](../../TodoMultiCollaboration.dfy#L162) | Single-project Action datatype |
| [TodoMultiProjectDomain.dfy](../../TodoMultiProjectDomain.dfy#L28) | Multi-project MultiAction datatype |
| [app-extras.js](../src/dafny/app-extras.js#L310) | JS MultiAction constructors |
| [MultiProjectEffectManager.js](../src/hooks/MultiProjectEffectManager.js#L256) | Cross-project dispatch methods |
