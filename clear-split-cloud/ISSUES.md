# Known Issues

## 1. Member additions bypass Dafny verification

**Status:** Technical debt

**Problem:**
The invite acceptance flow (`worker/src/invites.ts`) mutates the group state directly in TypeScript instead of going through the verified Dafny dispatch.

```ts
// invites.ts - directly mutates state
state.members.push(trimmedName)
state.memberList.push(trimmedName)
state.balances[trimmedName] = 0
```

**Root cause:**
The original ClearSplit Dafny spec assumes all members are known at creation time:

```dafny
// ClearSplit.dfy
datatype Action =
  | AddExpense(e: Expense)
  | AddSettlement(s: Settlement)
  // No AddMember action
```

The invite system was added for the cloud version without updating the Dafny spec.

**Impact:**
- Member additions are not verified by Dafny
- Invariants could theoretically be violated (e.g., duplicate members)
- Inconsistency with how expenses/settlements are handled

**Proper fix:**
1. Add `AddMember(name: PersonId)` to Action datatype in `ClearSplit.dfy`
2. Implement `TryStep` case for `AddMember`
3. Add invariant preservation lemmas
4. Have invite acceptance call `dispatch` with `AddMember` action
5. Recompile Dafny to JS

**Workaround:**
The TypeScript code manually maintains the invariants (no duplicate members, initialize balance to 0). This works but is unverified.

## 2. Init() wrapper doesn't match Dafny signature

**Status:** Workaround in place

**Problem:**
The `dafny2js --cloudflare` emitter generates an `init()` wrapper that calls `ClearSplit.Init()` without the required `memberList` parameter.

**Root cause:**
ClearSplit's Init takes a parameter unlike other apps:
```dafny
method Init(memberList: seq<PersonId>) returns (result: Result<Model, Err>)
```

**Workaround:**
`groups.ts` hardcodes the initial state instead of calling `init()`.
