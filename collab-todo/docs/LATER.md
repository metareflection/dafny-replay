# Future Specs (To Be Added Later)

This document tracks features and specs that are intentionally deferred for future implementation.

---

## Ownership & Permissions

### Transfer Ownership
- **TransferOwnership(newOwner: UserId)** - Transfer project ownership to another member
- New owner must already be a member
- Old owner becomes regular member (not removed)
- One-way action (no undo in spec)

### Per-Action Permissions
- Some actions could be restricted to owner only:
  - DeleteList
  - MakeCollaborative
  - RemoveMember
  - ~~MoveListTo (cross-project)~~ ✓ Implemented via `IsAuthorized` predicate
  - Possibly DeleteTag
- For remaining actions: would require adding `actingUser` parameter to TryStep

### Cross-Project Move Restrictions
- **Implemented**: `IsAuthorized(mm, actingUser, action)` predicate in `TodoMultiProjectDomain.dfy`
  - MoveListTo: only source project owner can move lists out
  - Other actions: currently allowed (can add checks later)
- **Future considerations** (stricter rules beyond owner-only):
  - Only allow moves to projects with identical member sets
  - Require approval from destination project owner if mover is just a member
  - Block moves entirely if destination has members not in source project
- Tradeoff: flexibility vs. preventing unintended content sharing

---

## Task Management

### Permanent Deletion / Cleanup
- **PermanentlyDeleteTask(taskId)** - Remove soft-deleted task from database entirely
- Alternative: Background cleanup policy (delete tasks soft-deleted > N days)
- Consideration: How to handle conflicts if user tries to restore after permanent delete?

### Archive vs Complete
- Add **archived** boolean to Task (separate from completed)
- **ArchiveTask(taskId)** / **UnarchiveTask(taskId)** actions
- Archived tasks hidden from main views but still searchable
- Could archive entire lists too

### Subtasks
- Add parent-child relationship between tasks
- **parentTaskId: Option<TaskId>** field
- Invariant: no cycles, parent must exist
- Completing parent could auto-complete children (or vice versa)

---

## Activity & History

### Activity Log
- Track who made each change with timestamp
- Store in Model or separate log structure
- Useful for: audit trail, undo history, activity feed
- Consideration: Log size growth

### Undo/Redo
- **UndoLastAction(userId)** - Revert user's last action
- Would require storing inverse actions or snapshots
- Complex with concurrent edits

---

## List Features

### Soft Delete for Lists
- Instead of hard-deleting lists, mark as deleted
- **RestoreList(listId)** action
- Tasks in deleted list would be hidden but restorable
- Consideration: What happens to deletedFromList references?

### List Visibility/Permissions
- Per-list visibility (owner only, specific members, all)
- Would complicate invariants and conflict resolution

---

## Tag Enhancements

### Tag Colors
- Add **color: string** to Tag datatype
- **SetTagColor(tagId, color)** action

### Tag Hierarchy
- Parent-child relationships for tags
- e.g., "Work" > "Project A", "Project B"

---

## Date/Time Features

### Time Component
- Extend Date to include hour, minute
- **DateTime** datatype with full timestamp
- More complex validation

### Recurring Tasks
- Tasks that repeat on schedule
- **RecurrenceRule** datatype (daily, weekly, monthly, etc.)
- Auto-create next instance when completed

### Reminders
- **reminder: Option<DateTime>** field on Task
- App layer handles notification

---

## Collaboration Features

### Comments on Tasks
- **Comment** datatype with author, timestamp, text
- **comments: seq<Comment>** on Task
- **AddComment(taskId, text)** / **DeleteComment(taskId, commentId)** actions

### Mentions in Notes
- Parse @username in task notes
- Could auto-assign mentioned users
- App layer feature (not spec)

### Presence/Cursors
- Real-time indicators of who's viewing/editing what
- Ephemeral state (not in verified Model)
- Supabase Realtime feature

---

## Notes

When implementing any of these:
1. Update `TodoMultiCollaboration.dfy` with new types/actions
2. Add invariants as needed
3. Update `Rebase` for new conflict cases
4. Update `DESIGN.md` to reflect the changes
5. Remove the item from this file
