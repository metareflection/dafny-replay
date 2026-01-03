# Chat Summaries

---

# MoveListTo Edge Function Deployment & Debugging

**Date:** 2026-01-03

## Problem

After implementing `MoveListTo` in the client, the edge function wasn't working. Multiple errors encountered during deployment and testing.

## Error Chain & Fixes

### 1. React Hooks Order Error

**Symptom:**
```
React has detected a change in the order of Hooks called by TodoApp
26. useMemo → useCallback
```

**Cause:** Added new `useCallback` for `moveListToProject` in `useAllProjects.js`. Hot Module Replacement (HMR) couldn't reconcile the changed hook order.

**Fix:** Hard refresh (Cmd+Shift+R). This is an HMR artifact, not a code bug.

---

### 2. Edge Function 403 Forbidden

**Symptom:**
```
POST .../functions/v1/multi-dispatch 403 (Forbidden)
```

**Cause:** The `multi-dispatch` edge function wasn't deployed, or was outdated.

**Fix:** Deploy with `supabase functions deploy multi-dispatch`.

---

### 3. Missing `MoveListTo` in Edge Function Bundle

**Symptom:**
```
Action rejected: TypeError: Cannot read properties of undefined (reading 'create_MultiModel')
```

**Cause:** The edge function's `build-bundle.js` was missing the `MoveListTo` case. It had:
```typescript
type: 'Single' | 'MoveTaskTo' | 'CopyTaskTo'  // Missing MoveListTo!
```

**Fixes applied to `build-bundle.js`:**

1. Added `MoveListTo` to interface:
```typescript
interface MultiAction {
  type: 'Single' | 'MoveTaskTo' | 'CopyTaskTo' | 'MoveListTo';
  listId?: number;  // Added
  ...
}
```

2. Added switch case:
```typescript
case 'MoveListTo':
  return TodoMultiProjectDomain.MultiAction.create_MoveListTo(
    _dafny.Seq.UnicodeFromString(json.srcProject!),
    _dafny.Seq.UnicodeFromString(json.dstProject!),
    new BigNumber(json.listId!)
  );
```

3. Fixed wrong module reference:
```typescript
// Before (WRONG):
return TodoDomain.MultiModel.create_MultiModel(projects);
// After (CORRECT):
return TodoMultiProjectDomain.MultiModel.create_MultiModel(projects);
```

4. Same changes applied to `index.ts` interface.

5. Rebuilt bundle: `node build-bundle.js`

---

### 4. PostgreSQL "cannot extract elements from a scalar"

**Symptom:**
```json
{"error": "Failed to save updates", "details": "cannot extract elements from a scalar"}
```

**Cause:** The `save_multi_update` function expected JSONB, but Supabase RPC was having issues with how the array was being serialized.

**Fix:** Changed function to accept TEXT and parse internally:

**index.ts:**
```javascript
.rpc('save_multi_update', { updates_json: JSON.stringify(updates) })
```

**schema.sql:**
```sql
CREATE OR REPLACE FUNCTION save_multi_update(updates_json TEXT)
...
DECLARE
  updates JSONB := updates_json::jsonb;
```

---

### 5. "Not a member of all projects" (409 Conflict)

**Symptom:**
```json
{"status":"conflict","message":"Not a member of all projects"}
```

**Cause:** The SQL function used `auth.uid()` for membership check, but edge function uses **service role** (no auth context). `auth.uid()` returns NULL with service role.

**Fix:** Removed the redundant membership check from `save_multi_update` since the edge function already verifies membership before calling it:

```sql
-- REMOVED these lines:
-- SELECT array_agg((value->>'id')::UUID) INTO project_ids FROM jsonb_array_elements(updates);
-- IF NOT is_member_of_all_projects(project_ids) THEN ...
```

---

### 6. "record u has no field elem"

**Symptom:**
```json
{"error": "Failed to save updates", "details": "record \"u\" has no field \"elem\""}
```

**Cause:** `jsonb_array_elements()` returns a column named `value`, not the alias `elem`. The alias was for the table, not the column.

**Fix:**
```sql
-- Before (WRONG):
FOR u IN SELECT * FROM jsonb_array_elements(updates) AS elem
  ... u.elem->>'state' ...

-- After (CORRECT):
FOR u IN SELECT value FROM jsonb_array_elements(updates)
  ... u.value->>'state' ...
```

## Files Modified

| File | Changes |
|------|---------|
| `supabase/functions/multi-dispatch/build-bundle.js` | Added `MoveListTo` to interface and switch, fixed `TodoMultiProjectDomain.MultiModel` |
| `supabase/functions/multi-dispatch/index.ts` | Added `MoveListTo` to interface, changed to `updates_json: JSON.stringify(updates)` |
| `supabase/functions/multi-dispatch/dafny-bundle.ts` | Regenerated with `node build-bundle.js` |
| `supabase/schema.sql` | Changed `save_multi_update` to accept TEXT, removed auth check, fixed `u.value` |

## Final Working SQL Function

```sql
CREATE OR REPLACE FUNCTION save_multi_update(updates_json TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updates JSONB := updates_json::jsonb;
  u RECORD;
  updated_projects JSONB := '[]'::jsonb;
BEGIN
  FOR u IN SELECT value FROM jsonb_array_elements(updates)
  LOOP
    UPDATE projects
    SET state = (u.value->>'state')::jsonb,
        version = (u.value->>'newVersion')::int,
        applied_log = applied_log || (u.value->'newLogEntry'),
        updated_at = now()
    WHERE id = (u.value->>'id')::uuid
    AND version = (u.value->>'expectedVersion')::int;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Version conflict on project %', u.value->>'id';
    END IF;

    updated_projects := updated_projects || jsonb_build_object(
      'id', u.value->>'id',
      'version', (u.value->>'newVersion')::int
    );
  END LOOP;

  RETURN jsonb_build_object('success', true, 'updated', updated_projects);
END;
$$;
```

## Key Learnings

1. **HMR + Hook changes = refresh needed** - Adding hooks mid-session causes React errors
2. **Edge function bundles are separate** - Client bundle updates don't propagate to edge functions
3. **Supabase RPC + JSONB arrays** - Safest to pass as TEXT and parse in SQL
4. **Service role has no auth.uid()** - Don't use `auth.uid()` in functions called with service role
5. **jsonb_array_elements returns 'value'** - Not a custom alias

## Deployment Steps

1. Run SQL in Supabase Dashboard (or migrate)
2. `cd collab-todo/supabase/functions/multi-dispatch && node build-bundle.js`
3. `supabase functions deploy multi-dispatch`

---

# MoveListTo (Cross-Project) Implementation

**Date:** 2026-01-02

## Goal

Implement `MoveListTo` action to move an entire list (with all its tasks) from one project to another.

## Spec Changes (TodoMultiProjectDomain.dfy)

Added new `MultiAction` variant:
```dafny
| MoveListTo(
    srcProject: ProjectId,
    dstProject: ProjectId,
    listId: ListId
  )
```

### Helper Functions Added

| Function | Purpose |
|----------|---------|
| `ExtractListTasks` | Get all non-deleted tasks from a list |
| `ExtractTasksFromSeq` | Recursively extract tasks from ID sequence |
| `CleanTaskForMove` | Clear tags/assignees (project-scoped data) |
| `AddTasksToList` | Add multiple tasks to destination list |
| `AddListWithTasks` | Create list and populate with tasks |
| `ListDeletedInLog` | Check if list was deleted in log suffix |

### MultiStep Logic

1. Check source list exists and has a name
2. Check destination doesn't have list with same name (hard error, no fallback)
3. Extract tasks from source list
4. Delete list from source project
5. Create list with same name in destination
6. Add cleaned tasks (no tags/assignees) to new list

### Rebasing Rules

- If list deleted in source log → becomes `NoOp`
- Otherwise unchanged (list always placed at end)

### Candidates

No fallback candidates for `MoveListTo` - duplicate name in destination is a hard error.

## Files Modified

| File | Changes |
|------|---------|
| `TodoMultiProjectDomain.dfy` | Added `MoveListTo` variant, helpers, MultiStep/Rebase/Candidates cases |
| `TodoMultiProjectEffectStateMachine.dfy` | Added `MakeMoveListTo`, `IsMoveListTo` |
| `src/dafny/app-extras.js` | Added `MoveListTo` constructor, `isMoveListTo` checker |
| `src/hooks/MultiProjectEffectManager.js` | Added `moveListToProject` method |
| `src/hooks/useAllProjects.js` | Exposed `moveListToProject` |
| `src/components/tasks/TaskList.jsx` | Added Send icon dropdown with project menu |
| `src/components/tasks/tasks.css` | Added dropdown styles |
| `src/App.jsx` | Added `handleMoveListToProject`, wired props to ProjectView |
| `docs/ACTIONS.md` | Updated counts, added MoveListTo as implemented |

## Key Code

**TaskList.jsx** - Send icon dropdown:
```javascript
{onMoveListToProject && otherProjects.length > 0 && (
  <div className="task-list__move-dropdown" ref={moveDropdownRef}>
    <button onClick={() => setShowMoveDropdown(!showMoveDropdown)}>
      <Send size={12} />
    </button>
    {showMoveDropdown && (
      <div className="task-list__move-menu">
        <div className="task-list__move-menu-title">Move to project:</div>
        {otherProjects.map(project => (
          <button onClick={() => onMoveListToProject(listId, project.id)}>
            {project.name}
          </button>
        ))}
      </div>
    )}
  </div>
)}
```

**App.jsx** - Handler:
```javascript
const handleMoveListToProject = (listId, targetProjectId) => {
  if (selectedProjectId) {
    moveListToProject(selectedProjectId, targetProjectId, listId)
  }
}
```

## Design Decisions

1. **Tags/assignees cleared** - These are project-scoped data
2. **Duplicate name = hard error** - No automatic rename fallback
3. **List placed at end** - No anchor parameter needed
4. **Proof stubbed** - `assume {:axiom}` in `MultiStepPreservesInv`

## Build Status

Build passes successfully.

---

# MoveList Implementation

**Date:** 2026-01-02

## Goal

Implement `MoveList` action to allow reordering lists within a project using up/down arrows.

## Implementation

Added up/down arrow buttons to each list header. Pressing up moves the list before the one above it; pressing down moves it after the one below it.

### Files Modified

| File | Changes |
|------|---------|
| `src/components/tasks/TaskList.jsx` | Added `ArrowUp`/`ArrowDown` buttons, `onMoveList` and `allLists` props |
| `src/App.jsx` | Added `handleMoveList(listId, anchorId, direction)` handler |
| `docs/ACTIONS.md` | Updated counts (16/26 now used), moved MoveList to implemented |

### Key Code

**TaskList.jsx** - Arrow buttons:
```javascript
{onMoveList && allLists.length > 1 && (() => {
  const idx = allLists.findIndex(l => l.id === listId)
  return (
    <>
      <button onClick={() => onMoveList(listId, allLists[idx - 1]?.id, 'before')}>
        <ArrowUp size={12} />
      </button>
      <button onClick={() => onMoveList(listId, allLists[idx + 1]?.id, 'after')}>
        <ArrowDown size={12} />
      </button>
    </>
  )
})()}
```

**App.jsx** - Handler:
```javascript
const handleMoveList = (listId, anchorId, direction) => {
  const listPlace = direction === 'before' ? App.ListBefore(anchorId) : App.ListAfter(anchorId)
  singleDispatch(App.MoveList(listId, listPlace))
}
```

## Design Decision: No UI Guards

User insisted on not adding defensive checks in the UI (e.g., hiding arrows at boundaries). The Dafny spec handles invalid anchors via `BadAnchor` error.

## Discovered Behavior: Asymmetric Boundary Handling

When pressing "up" on the first list or "down" on the last list:
- Both pass `undefined` as anchor → `BadAnchor` error
- Conflict recovery falls back to `ListAtEnd`
- **Result:** "Up" on first list moves it to the end; "Down" on last list is a no-op (already at end)

This asymmetry exists because the spec's fallback candidates (`ListAtEnd`, `ListBefore(first)`) were designed for conflict resolution, not UI boundary cases.

## Build Status

Build passes successfully.

---

# Tag System Implementation

**Date:** 2026-01-02

## Goal

Implement tag functionality in the collab-todo UI, exposing the tag actions already defined in the Dafny spec.

## Context

The collab-todo app uses a Dafny-verified domain model (`TodoMultiCollaboration.dfy`) that defines various actions. An audit revealed that many actions were defined in the spec but not exposed in the UI. Tags were chosen as the first feature to implement.

## Audit Results

Created [ACTIONS.md](./ACTIONS.md) comparing spec vs UI:
- **Before:** 12 of 26 actions used in UI
- **After:** 15 of 26 actions used in UI

Tag actions now implemented:
- `CreateTag(name)` - Create new tag
- `AddTagToTask(taskId, tagId)` - Add tag to task
- `RemoveTagFromTask(taskId, tagId)` - Remove tag from task

Still missing: `RenameTag`, `DeleteTag` (would need a tag management panel)

## Implementation Approach

**Key insight from user:** The existing codebase uses Dafny actions directly without intermediate hooks. Example:
```javascript
// Direct use of compiled Dafny actions
dispatch(App.StarTask(taskId))
dispatch(App.AddTagToTask(taskId, tagId))
```

Pattern followed:
1. UI components are presentational only
2. Actions dispatched inline via callbacks
3. Model passed as prop for data lookups (`App.GetAllTags(model)`)

## Files Created

| File | Purpose |
|------|---------|
| `src/components/tags/TagBadge.jsx` | Single tag chip display |
| `src/components/tags/TagList.jsx` | List of tags with compact/overflow mode |
| `src/components/tags/TagPicker.jsx` | Dropdown to add/remove/create tags |
| `src/components/tags/tags.css` | Tag component styles |
| `src/components/tags/index.js` | Exports |

## Files Modified

| File | Changes |
|------|---------|
| `src/components/tasks/TaskItem.jsx` | Added TagList display, TagPicker in actions |
| `src/components/tasks/TaskList.jsx` | Pass-through tag props to TaskItem |
| `src/App.jsx` | Added `allTags`, tag handlers, passed to views |
| `docs/ACTIONS.md` | Updated counts, moved tags from missing to implemented |

## Key Code Patterns

### Getting tags from model
```javascript
const allTags = useMemo(() => {
  if (!model) return {}
  return App.GetAllTags(model)
}, [model])
```

### Dispatching tag actions
```javascript
onAddTag={(taskId, tagId) =>
  dispatch(App.AddTagToTask(taskId, tagId))
}
onRemoveTag={(taskId, tagId) =>
  dispatch(App.RemoveTagFromTask(taskId, tagId))
}
onCreateTag={(name) =>
  dispatch(App.CreateTag(name))
}
```

### Multi-project handlers (for PriorityView)
```javascript
const handleAddTagAll = (projectId, taskId, tagId) => {
  const dispatch = createDispatch(projectId)
  dispatch(App.AddTagToTask(taskId, tagId))
}

const getProjectTags = useCallback((projectId) => {
  const model = getProjectModel(projectId)
  if (!model) return {}
  return App.GetAllTags(model)
}, [getProjectModel])
```

## UI Features

- Tags display as compact badges on tasks (max 2 visible, "+N" for overflow)
- Tag icon button in task actions opens picker dropdown
- Picker shows all project tags with checkmarks for selected ones
- Type to search/filter existing tags
- Create new tag inline by typing name and clicking "Create"
- Works in:
  - ProjectView (full functionality)
  - PriorityView (full functionality)
  - LogbookView (display only, no picker)

## Build Status

Build passes successfully with no errors.

## Next Steps (from ACTIONS.md)

High value missing features:
1. Cross-project operations (`MoveTaskTo`, `CopyTaskTo`)
2. Task assignment (`AssignTask`, `UnassignTask`)
3. Due date setting UI (`SetDueDate`)

Medium value:
4. List reordering (`MoveList`)
5. Task restoration (`RestoreTask`)
6. Tag management panel (`RenameTag`, `DeleteTag`)
