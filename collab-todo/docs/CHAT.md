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

---

## Session #2 - Proof Completion

**Date:** 2026-01-01

### Goals
Complete Dafny proofs for invariant preservation across all actions, particularly the complex list/task counting invariants.

### Work Completed

**DeleteListPreservesInv:**
- Proved invariants A, B, C, D, D' fully
- Added `SeqMembershipEquivSeqContains` lemma to connect `x in s` to `SeqContains(s, x)`
- Added `CountInListsHelper_HasTwo` lemma for proof by contradiction (task in two lists → count ≥ 2)
- Created `DeleteListPreservesInvF` axiom for invariant F (Dafny SMT limitation with forall over RemoveFirst)

**MoveListPreservesInv:**
- Proved invariants A, B, C fully
- Created `MoveListPreservesInvCount` axiom for D/D' (list reordering doesn't change counts)
- Created `MoveListPreservesInvF` axiom for invariant F

**Helper Lemmas Added:**
- `CountInLists_AfterRemoveList` - count unchanged for tasks not in removed list
- `CountInListsHelper_RemoveList` - recursive helper for list removal
- `CountInListsHelper_TasksSubset` - count unchanged when using subset of tasks map

### Final Verification Status
- **89 verified, 0 errors**
- 9 axiom helpers in proof file (SMT limitations with map comprehensions)
- 2 axioms in main spec (`Inv(m2)` in Step, `CandidatesComplete`)

### Key Technical Insights

**Why axioms were needed:**
1. **Map comprehension unification** - Dafny can't unify `map l | l in tasks :: RemoveFirst(tasks[l], id)` with a local variable bound to the same expression
2. **Forall over modified sequences** - Dafny struggles to connect `m2.lists` to `RemoveFirst(m.lists, listId)` in quantified contexts
3. **Count preservation across reordering** - Proving `CountInListsHelper` is order-independent requires induction Dafny doesn't find automatically

**Proof strategies used:**
- Proof by contradiction for uniqueness (task in two lists → count ≥ 2 → contradicts invariant D)
- Wrapper lemmas to avoid map comprehensions in postconditions
- Explicit type annotations (`: ListId`) to help Dafny's type inference

### Files Modified

| File | Changes |
|------|---------|
| `TodoMultiCollaborationProof.dfy` | Added ~200 lines of helper lemmas and completed preservation proofs |
| `docs/PROVED.md` | Updated to reflect 89 verified, documented all axioms |

### What "Trusted" Means

Discussed the three categories of unverified properties:
1. **CandidatesComplete** - Semantic equivalence of conflict-resolved actions (requires `assume {:axiom}`)
2. **Generated JS** - Dafny's `translate js` compiler is trusted, not verified
3. **UI integration** - Runtime code calling spec functions isn't verified by Dafny

### Open Items
1. Build JS adapter and React UI
2. Supabase schema and Edge Functions
3. (Optional) Prove remaining axioms with manual induction lemmas

---

## Session #3 - UI Integration & Supabase Setup

**Date:** 2026-01-01

### Goals
Compile Dafny spec to JavaScript, create the JS adapter, build React UI components, and update Supabase schema for the Todo domain.

### Work Completed

**Dafny Compilation:**
- Compiled `TodoMultiCollaboration.dfy` to JavaScript (~128KB)
- Generated modules: `TodoDomain`, `TodoMultiCollaboration`, `TodoAppCore`
- Updated `compile.sh` to include collab-todo project

**JS Adapter (`src/dafny/app.js`):**
- Type conversions for Task, Date, Option, Place, ListPlace
- Model JSON serialization (`modelToJson`/`modelFromJson`)
- Action JSON serialization for all 22+ action types
- `todoDomain` export for `useCollaborativeProject` hook
- `App` API with action constructors and model accessors

**React UI (`src/App.jsx`):**
- `TaskItem` - Checkbox, star, notes, due date, tags, assignees, move/delete
- `TaskList` - Collapsible lists with add/rename/delete, task count
- `TagsPanel` - Create and manage project tags
- `TodoBoard` - Main layout with sidebar (projects, members, tags) and board
- `ProjectSelector` - Create/select projects
- `MembersPanel` - View/invite/remove members
- `Toast` - Error notifications

**Supabase Schema (`supabase/schema.sql`):**
- Updated default state to Todo model structure:
  ```json
  {
    "mode": "Personal",
    "owner": "",
    "members": [],
    "lists": [],
    "listNames": {},
    "tasks": {},
    "taskData": {},
    "tags": {},
    "nextListId": 0,
    "nextTaskId": 0,
    "nextTagId": 0
  }
  ```
- Updated `create_project()` function to initialize owner in Dafny model state
- Added migration comment for existing Kanban data

**Edge Function (`supabase/functions/dispatch/`):**
- Rewrote `build-bundle.js` for Todo domain types
- Updated `index.ts` comment to reference TodoMultiCollaboration
- Regenerated `dafny-bundle.ts` with Todo-specific:
  - Task/Date/Option conversions
  - Model conversion (11 fields)
  - Action conversion (22+ action types)
  - Place/ListPlace conversions
  - ServerState/AuditRecord conversions

### Files Created/Modified

| File | Changes |
|------|---------|
| `src/dafny/TodoMulti.cjs` | Generated - compiled Dafny code |
| `src/dafny/app.js` | Rewritten - Todo-specific adapter |
| `src/App.jsx` | Rewritten - Todo UI components |
| `src/App.css` | Extended - Task/List/Tag styles |
| `package.json` | Updated name to `collab-todo` |
| `supabase/schema.sql` | Updated for Todo model |
| `supabase/functions/dispatch/build-bundle.js` | Rewritten for Todo |
| `supabase/functions/dispatch/dafny-bundle.ts` | Regenerated |
| `supabase/functions/dispatch/index.ts` | Updated comment |
| `compile.sh` (root) | Added collab-todo compilation step |

### Testing
- `npm install` - success
- `npm run dev` - Vite server started successfully
- Edge Function bundle generated successfully

### Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                         React UI                                │
│  (App.jsx: TaskItem, TaskList, TagsPanel, TodoBoard)           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      JS Adapter (app.js)                        │
│  - Action constructors (AddTask, CompleteTask, etc.)           │
│  - Model accessors (GetLists, GetTask, etc.)                   │
│  - JSON conversion (modelToJson, actionFromJson, etc.)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Compiled Dafny (TodoMulti.cjs)                  │
│  - TodoDomain: Model, Action, TryStep, Rebase                  │
│  - TodoMultiCollaboration: ServerState, Dispatch               │
│  - TodoAppCore: ClientState, ClientLocalDispatch               │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │ Client (optimistic)     │ Server (verified) │
        ▼                         ▼
┌───────────────────┐   ┌─────────────────────────────┐
│ useCollaborative  │   │ Edge Function (dispatch)     │
│ ProjectOffline    │   │ - dafny-bundle.ts           │
│ - pending queue   │◄─►│ - Verified Dispatch         │
│ - offline support │   │ - Supabase persistence      │
└───────────────────┘   └─────────────────────────────┘
```

### Open Items
1. Deploy to Supabase and test end-to-end
2. Add due date picker UI
3. Add tag assignment UI on tasks
4. Add member assignment UI on tasks
5. (Optional) Trash view for soft-deleted tasks

---

## Session #4 - Edge Function Deployment & Debugging

**Date:** 2026-01-01

### Goals
Deploy the Edge Function to Supabase and debug runtime errors to get end-to-end functionality working.

### Issues Encountered & Resolved

**1. CORS Error (Function Not Deployed)**
- Initial error: `Response to preflight request doesn't pass access control check`
- Cause: Edge Function wasn't actually deployed to Supabase
- Fix: Required Docker Desktop running, then `supabase functions deploy dispatch`

**2. 500 Error - IsAccepted Not a Function**
- Error: `TypeError: TodoAppCore.__default.IsAccepted is not a function`
- Cause: `dafny-bundle.ts` was calling a non-existent helper function
- Root cause: The `build-bundle.js` generated code assumed a helper `IsAccepted()` existed in TodoAppCore, but Dafny compiles datatype discriminators as properties, not functions

**Fix Applied:**
```typescript
// Before (incorrect)
if (TodoAppCore.__default.IsAccepted(reply)) {

// After (correct - using Dafny datatype discriminator property)
if (reply.is_Accepted) {
```

### Files Modified

| File | Changes |
|------|---------|
| `supabase/functions/dispatch/index.ts` | Added try/catch around dispatch call with detailed error logging |
| `supabase/functions/dispatch/dafny-bundle.ts` | Fixed `is_Accepted` check (line 4319) |

### Key Technical Insight

**Dafny Datatype Discriminators:**
- Dafny compiles datatype variants with `is_VariantName` properties (not functions)
- For `datatype Reply = Accepted(...) | Rejected(...)`:
  - `reply.is_Accepted` → boolean property
  - `reply.is_Rejected` → boolean property
- Similarly for destructors: `reply.dtor_fieldName`

### Deployment Commands
```bash
cd collab-todo
supabase link --project-ref <project-ref>
supabase functions deploy dispatch --project-ref <project-ref>
```

### Open Items
1. Verify end-to-end list creation works
2. Test full CRUD operations (tasks, tags, etc.)
3. Add due date picker UI
4. Add tag/member assignment UI on tasks
5. (Optional) Trash view for soft-deleted tasks

---

## Session #5 - Bug in Dafny -> JS Compiler

**Date:** 2026-01-01

See BUGS.md in org repo

---

## Session #6 - Unique List Names Constraint

**Date:** 2026-01-01

### Goals
Add validation to prevent duplicate list names within a project.

### Issue Identified
User could create multiple lists with identical names (e.g., two "Shopping" lists). The spec had a `DuplicateList` error defined but never used.

### Changes Made

**1. Added Invariant M** (line 250-252):
```dafny
// M: List names are unique within the project
&& (forall l1, l2 :: l1 in m.listNames && l2 in m.listNames && l1 != l2
      ==> m.listNames[l1] != m.listNames[l2])
```

**2. Added Case-Insensitive Comparison** (lines 405-427):
```dafny
function ToLowerChar(c: char): char
function ToLower(s: string): string
predicate EqIgnoreCase(a: string, b: string)
```

**3. Added `ListNameExists` Predicate** (lines 429-432):
```dafny
predicate ListNameExists(m: Model, name: string, excludeList: Option<ListId>)
{
  exists l :: l in m.listNames &&
    (excludeList.None? || l != excludeList.value) &&
    EqIgnoreCase(m.listNames[l], name)
}
```

**4. Updated `AddList`** (line 448-449):
```dafny
case AddList(name) =>
  if ListNameExists(m, name, None) then Err(DuplicateList)
  else ...
```

**5. Updated `RenameList`** (line 463):
```dafny
else if ListNameExists(m, newName, Some(listId)) then Err(DuplicateList)
```

### Bug Fix: IsAccepted Not a Function

During deployment, encountered error:
```
TypeError: TodoAppCore.__default.IsAccepted is not a function
```

**Fix in `build-bundle.js`:**
```javascript
// Before (incorrect)
if (TodoAppCore.__default.IsAccepted(reply)) {

// After (correct - using Dafny datatype discriminator property)
if (reply.is_Accepted) {
```

### Verification Status
- **25 verified, 0 errors**

### Files Modified

| File | Changes |
|------|---------|
| `TodoMultiCollaboration.dfy` | Added invariant M, case-insensitive helpers, `ListNameExists`, updated `AddList`/`RenameList` |
| `supabase/functions/dispatch/build-bundle.js` | Fixed `is_Accepted` property access |

### Behavior
- "Shopping" and "shopping" are now treated as duplicates (case-insensitive)
- Adding duplicate returns `DuplicateList` error
- Renaming to existing name returns `DuplicateList` error
- Renaming to same name (idempotent) succeeds

---

## Session #7 - Unique Task Titles & Tag Names

**Date:** 2026-01-01

### Goals
Extend uniqueness constraints to task titles (within each list) and tag names (project-scoped).

### Analysis of Potential Duplicates

| Item | Status Before | Status After |
|------|---------------|--------------|
| List names | Fixed (Session #6) | Fixed |
| Task titles within list | NOT ENFORCED | Fixed |
| Tag names | NOT ENFORCED | Fixed |
| Member userIds | OK (set prevents dups) | OK |

### Changes Made

**1. New Error Types** (lines 126-127):
```dafny
| DuplicateTask        // Task with same title already exists in list
| DuplicateTag         // Tag with same name already exists in project
```

**2. New Helper Predicates**:
- `TaskTitleExistsInList(m, listId, title, excludeTask)` - case-insensitive check for task title in a specific list
- `TagNameExists(m, name, excludeTag)` - case-insensitive check for tag name in project

**3. New Invariants**:
- **N**: Task titles are unique within each list (case-insensitive)
- **O**: Tag names are unique within the project (case-insensitive)
- Also updated **M** to use `EqIgnoreCase` for consistency

**4. Updated Actions**:
- `AddTask` - fails with `DuplicateTask` if title exists in list
- `EditTask` - fails with `DuplicateTask` if new title exists in task's current list
- `MoveTask` - fails with `DuplicateTask` if title exists in destination list
- `RestoreTask` - fails with `DuplicateTask` if title now conflicts in target list
- `CreateTag` - fails with `DuplicateTag` if name exists
- `RenameTag` - fails with `DuplicateTag` if new name exists

### Verification Status
- **27 verified, 0 errors**

### Files Modified

| File | Changes |
|------|---------|
| `TodoMultiCollaboration.dfy` | Added DuplicateTask/DuplicateTag errors, helper predicates, invariants N/O, updated 6 actions |
| `docs/DESIGN.md` | Updated to reflect new uniqueness constraints |

### Behavior Summary
- "Buy milk" and "buy MILK" in same list are now treated as duplicates
- Moving task to list with same title fails
- Restoring deleted task fails if title now conflicts
- "urgent" and "URGENT" tags are treated as duplicates
- All comparisons are case-insensitive

---

## Session #8 - UI Coverage Audit & Runtime Check Analysis

**Date:** 2026-01-01

### Goals
Audit which Dafny spec actions have corresponding UI components, and analyze whether runtime checks in TryStep could be replaced with ghost invariants.

### Work Completed

**UI Coverage Audit:**

Compared all actions in `TodoMultiCollaboration.dfy` against UI components in `src/App.jsx`.

| Status | Count | Actions |
|--------|-------|---------|
| Fully Implemented | 13 | AddList, RenameList, DeleteList, AddTask, EditTask, DeleteTask, MoveTask, CompleteTask, UncompleteTask, StarTask, UnstarTask, CreateTag, DeleteTag |
| Missing UI | 9 | MoveList, RestoreTask, SetDueDate, AssignTask, UnassignTask, AddTagToTask, RemoveTagFromTask, RenameTag, MakeCollaborative |
| Partial (DB-only) | 2 | AddMember, RemoveMember (via Supabase hooks, not Dafny actions) |

**Display-Only Fields:**
- Due dates display but can't be set
- Tags on tasks display but can't be added/removed
- Assignees display but can't be assigned/unassigned

**Runtime Check Analysis:**

Analyzed all runtime checks in `TryStep` to determine if any could be ghost-only invariants.

**Conclusion: All runtime checks are necessary.**

| Check Category | Examples | Why Runtime Required |
|----------------|----------|---------------------|
| Existence | MissingList, MissingTask, MissingTag | User can pass any ID |
| Uniqueness | DuplicateList, DuplicateTask, DuplicateTag | User can create duplicates |
| State | TaskDeleted | User can reference deleted items |
| Validation | InvalidDate | User can pass malformed data |
| Permission | NotAMember, CannotRemoveOwner | User can attempt unauthorized ops |
| Anchor | BadAnchor | User can reference moved anchors |

**Key Insight:**
- **Invariants** validate Model → Model (internal consistency)
- **Runtime checks** validate Action → Model (user input against state)

Since actions come from untrusted sources (UI, remote collaborators, potentially malicious clients), the server must validate all action parameters at runtime. Invariants guarantee the model stays valid after valid actions, but can't prevent invalid actions from being submitted.

### Files Created

| File | Description |
|------|-------------|
| `docs/ACTIONS-UI.md` | Documents which actions have UI, which are missing, priority levels |

### Open Items
1. Implement missing high-priority UI: SetDueDate, AssignTask, AddTagToTask
2. Wire AddMember/RemoveMember to dispatch Dafny actions (currently DB-only)
3. (Optional) MoveList drag-and-drop
4. (Optional) Trash view for RestoreTask

---

## Session #9 - UI Refactor to Things-like Design

**Date:** 2026-01-02

### Goals
Refactor the app to:
1. Match Things for Mac aesthetic (light theme, minimal, compact, no rounded corners)
2. Make it highly modular with separated components and concerns
3. Add smart list views (Priority, Logbook)
4. Support toggling between single project and all projects view

### Design Decisions

**Simplified Smart Lists (vs Full Things):**
- Removed: Inbox, Someday, Upcoming, Trash
- Kept: Priority (starred tasks), Logbook (completed tasks)
- Reason: Work with existing spec without modifications

**View Mode Toggle:**
- Single: Load one project at a time (existing behavior)
- All: Load all projects, aggregate tasks for smart lists

**Styling:**
- Light theme (white/gray background)
- No rounded corners
- Compact spacing
- Minimal color use (accent blue, star gold, danger red)
- No gradients

**Top Bar (not Bottom):**
- Contains: Add list form, sync controls, offline toggle, user info

### Files Created

**Folder Structure:**
```
src/
├── components/
│   ├── auth/
│   │   ├── AuthForm.jsx
│   │   ├── auth.css
│   │   └── index.js
│   ├── common/
│   │   ├── Badge.jsx
│   │   ├── Toast.jsx
│   │   ├── common.css
│   │   └── index.js
│   ├── layout/
│   │   ├── TopBar.jsx
│   │   ├── Sidebar.jsx
│   │   ├── MainContent.jsx
│   │   ├── layout.css
│   │   └── index.js
│   ├── sidebar/
│   │   ├── SidebarItem.jsx
│   │   ├── SmartLists.jsx
│   │   ├── ProjectList.jsx
│   │   ├── sidebar.css
│   │   └── index.js
│   ├── tasks/
│   │   ├── TaskItem.jsx
│   │   ├── TaskList.jsx
│   │   ├── TaskInput.jsx
│   │   ├── tasks.css
│   │   └── index.js
│   └── project/
│       ├── ProjectHeader.jsx
│       ├── FilterTabs.jsx
│       ├── project.css
│       └── index.js
├── hooks/
│   └── useAllProjects.js (new)
├── styles/
│   ├── variables.css
│   └── global.css
└── App.jsx (rewritten)
```

### Component Architecture

| Component | Purpose |
|-----------|---------|
| `AuthForm` | Login/signup with email or Google |
| `TopBar` | App header with controls and user info |
| `Sidebar` | Contains SmartLists + ProjectList + view toggle |
| `SmartLists` | Priority and Logbook navigation items |
| `ProjectList` | Expandable project tree with lists |
| `SidebarItem` | Reusable sidebar row with icon, label, count |
| `MainContent` | Main content area container |
| `TaskList` | Collapsible list with header, add form, tasks |
| `TaskItem` | Individual task with checkbox, star, menu |
| `TaskInput` | Add task input field |
| `ProjectHeader` | Project/view title with icon |
| `FilterTabs` | All/Important filter tabs |
| `Badge` | Small label/count badge |
| `Toast` | Notification popup |

### Hooks

| Hook | Purpose |
|------|---------|
| `useAllProjects` | Load multiple projects, aggregate tasks, create dispatchers per project |

### Key Implementation Details

**View Modes:**
- `viewMode: 'single' | 'all'` - Toggle in sidebar
- Single mode uses `useCollaborativeProjectOffline` for one project
- All mode uses `useAllProjects` to load all project IDs

**Smart List Filtering:**
- Priority: `task.starred && !task.completed && !task.deleted`
- Logbook: `task.completed && !task.deleted`
- Works in both single and all modes

**Dispatch Routing:**
- In all mode, `createDispatch(projectId)` returns a dispatch function for that project
- Task actions include `projectId` to route correctly

### CSS Design Tokens

```css
--color-bg: #ffffff;
--color-bg-secondary: #f5f5f7;
--color-accent: #007aff;
--color-star: #ff9f0a;
--color-success: #30d158;
--color-danger: #ff3b30;
--radius-*: 0; /* No rounded corners */
--space-*: compact values (2px, 4px, 8px, 12px, 16px)
```

### Verification
- Vite dev server starts successfully
- No compile errors
- App loads without runtime errors

### Open Items
1. Test with actual Supabase data
2. Fine-tune styling details
3. Add keyboard shortcuts
4. (Optional) Drag-and-drop for task reordering
5. (Optional) Members panel in sidebar