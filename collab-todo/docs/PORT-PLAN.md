# Porting from Kanban to Todo

## Where You Need to Work

**Yes, you need to write a new Dafny spec.** Here's the layer breakdown:

### 1. Dafny Domain Spec (CREATE NEW) - `TodoMultiCollaboration.dfy`

This is where you define your Todo domain. You need to specify:

```dafny
module TodoDomain refines Domain {
  // Model: What state does a Todo app have?
  type Model = ???  // e.g., tasks, lists, tags, due dates, etc.

  // Actions: What operations can users perform?
  datatype Action =
    | AddTask(...)
    | CompleteTask(...)
    | MoveTask(...)
    | EditTask(...)
    | ...

  // Invariant: What must ALWAYS be true?
  predicate Inv(m: Model) { ... }

  // TryStep: How do actions modify state?
  function TryStep(m: Model, a: Action): Result<Model, Err>

  // Collaboration hooks: Rebase, Candidates, Explains
  // (for handling concurrent edits)
}
```

**Key design questions for your spec:**
- What's the data model? (Lists/projects? Tags? Due dates? Priorities?)
- What invariants matter? (e.g., no orphan tasks, task IDs unique, sort order valid)
- How should concurrent edits be resolved? (e.g., move conflicts, completion races)

### 2. After Dafny - These files need updates:

| File | Change Required |
|------|-----------------|
| `src/dafny/app.js` | Rewrite JSON conversion for Todo model/actions |
| `src/App.jsx` | Complete rewrite for Todo UI |
| `supabase/schema.sql` | Update default `state` JSON structure |
| `supabase/functions/dispatch/build-bundle.js` | Update module names |

### 3. Reusable as-is:

- `useCollaborativeProject.js` - Generic hook
- `supabase.js` - Client setup
- `index.ts` (Edge Function) - Domain-agnostic
- Vite/build config

---

## Recommended Workflow

1. **Design your Todo domain spec** in `TodoMultiCollaboration.dfy`
2. **Verify**: `dafny verify TodoMultiCollaboration.dfy`
3. **Compile to JS**: `dafny translate js --no-verify -o generated/TodoMulti --include-runtime TodoMultiCollaboration.dfy`
4. **Update adapter** in `collab-todo/src/dafny/app.js`
5. **Build React UI**

---

## Reference: Kanban Domain Structure

For reference, here's how the Kanban domain is structured in `KanbanMultiCollaboration.dfy`:

### Model
```dafny
datatype Model = Model(
  cols: seq<ColId>,                 // ordered columns
  lanes: map<ColId, seq<CardId>>,   // col -> ordered card IDs
  wip: map<ColId, nat>,             // col -> WIP limit
  cards: map<CardId, Card>,         // id -> card data
  nextId: nat                       // ID allocator
)
```

### Actions
```dafny
datatype Action =
  | NoOp
  | AddColumn(col: ColId, limit: nat)
  | SetWip(col: ColId, limit: nat)
  | AddCard(col: ColId, title: string)
  | MoveCard(id: CardId, toCol: ColId, place: Place)
  | EditTitle(id: CardId, title: string)
```

### Invariant (7 parts)
1. Columns are unique
2. lanes and wip defined exactly on cols
3. Every ID in any lane exists in cards
4. Every card ID occurs in exactly one lane (no duplicates, no orphans)
5. No duplicate IDs within any single lane
6. WIP respected: each lane length <= its limit
7. Allocator fresh: all card IDs < nextId

---

## Suggested Todo Domain Design

Here's a starting point for a Things-like Todo app:

### Model
```dafny
datatype Task = Task(
  title: string,
  notes: string,
  completed: bool,
  dueDate: Option<Date>,
  tags: set<TagId>
)

datatype Model = Model(
  lists: seq<ListId>,                    // ordered lists (Inbox, Projects, etc.)
  tasks: map<ListId, seq<TaskId>>,       // list -> ordered task IDs
  taskData: map<TaskId, Task>,           // id -> task data
  tags: map<TagId, string>,              // tag id -> tag name
  nextTaskId: nat,
  nextTagId: nat
)
```

### Possible Actions
```dafny
datatype Action =
  | AddTask(list: ListId, title: string)
  | EditTask(id: TaskId, title: string, notes: string)
  | CompleteTask(id: TaskId)
  | UncompleteTask(id: TaskId)
  | MoveTask(id: TaskId, toList: ListId, place: Place)
  | SetDueDate(id: TaskId, date: Option<Date>)
  | AddTag(id: TaskId, tag: TagId)
  | RemoveTag(id: TaskId, tag: TagId)
  | CreateList(name: string)
  | DeleteTask(id: TaskId)
```

### Possible Invariants
1. All task IDs in lists exist in taskData
2. Each task appears in exactly one list
3. No duplicate task IDs within a list
4. All tags referenced by tasks exist
5. Task IDs < nextTaskId, Tag IDs < nextTagId
6. Lists are unique
