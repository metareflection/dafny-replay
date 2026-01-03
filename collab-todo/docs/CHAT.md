# Chat Summaries

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
