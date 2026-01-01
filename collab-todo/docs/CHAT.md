# Chat Log

This document summarizes design sessions for the collaborative Todo app.

---

## Session #1 - Initial Spec Design

**Date:** 2026-01-01

### Goals
Create a verified collaborative Todo app (like Things for macOS) using the dafny-replay framework, porting from the existing kanban-supabase project.

### Key Decisions Made

**Data Model:**
- Projects can be Personal or Collaborative
- Owner is immutable (transfer ownership deferred to LATER.md)
- Multiple assignees per task (set<UserId>)
- Tasks have: title, notes, completed, starred, dueDate, assignees, tags
- ListId is internal (nat), ListName is user-visible (string)
- Tags are project-scoped

**Soft Delete:**
- Tasks are soft-deleted (deleted flag + deletedBy + deletedFromList)
- RestoreTask restores to original list (falls back to first list if original deleted)
- DeleteList hard-deletes tasks (app layer warns user)

**Conflict Resolution (Rebase):**
- DeleteTask + local op on same task → NoOp (honor delete)
- RemoveMember + AssignTask to that member → NoOp
- MoveList + MoveList on same list → NoOp (remote wins)
- MoveTask conflicts → LWW for same task, degrade anchor for different tasks
- Other task operations → LWW

**Conflict Detection:**
- App layer compares orig vs rebased action
- If rebased == NoOp && orig != NoOp → conflict caused action to drop
- App layer responsible for notifications

**Date Validation:**
- ValidDate predicate with leap year support
- year >= 1970, valid month (1-12), valid day for month
- Timezone handling at app layer

### Files Created/Modified

| File | Status |
|------|--------|
| `TodoMultiCollaboration.dfy` | Created - main verified spec |
| `docs/PORT-PLAN.md` | Created - porting guide from Kanban |
| `docs/DESIGN.md` | Created - natural language spec |
| `docs/LATER.md` | Created - deferred features |
| `docs/CHAT.md` | Created - this file |

### Spec Verification
- **22 verified, 0 errors**
- Proof stubs use `assume {:axiom}` (proofs deferred)

### Open Items for Next Session
1. Build the JS adapter (`src/dafny/app.js`)
2. Build the React UI (`src/App.jsx`)
3. Update Supabase schema (`supabase/schema.sql`)
4. Update Edge Function bundle (`supabase/functions/dispatch/`)

### Questions Resolved
1. RestoreTask target → Original list (tracked in deletedFromList)
2. DeleteList behavior → Hard delete with app-layer warning
3. Conflict notifications → App layer detects via orig/rebased comparison
4. Permanent deletion → Deferred to LATER.md
