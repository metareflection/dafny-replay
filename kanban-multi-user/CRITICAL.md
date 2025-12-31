# Critical Assessment: kanban-multi-user

This document critically examines the kanban-multi-user implementation, focusing on the gap between what Dafny verifies and what remains unverified in JavaScript.

## Summary

The current architecture provides **verified authorization logic** (membership checks, owner-only operations) within Dafny, but significant security-critical code lives outside Dafny in unverified JavaScript. The verification guarantee is conditional on the JavaScript layer being correct.

---

## What Dafny Actually Verifies

### Verified Properties

1. **Invariant preservation**: `StepPreservesInv` - if a transition succeeds, the invariant holds
2. **Non-member rejection**: `NonMemberCannotEdit` - actors not in `members` cannot perform board actions
3. **Non-owner rejection**: `NonOwnerCannotInvite`, `NonOwnerCannotRemove` - only owner can manage membership
4. **Owner permanence**: `OwnerCannotBeRemoved` - owner cannot be removed from members
5. **Owner always member**: `OwnerAlwaysMember` - structural invariant

### The TrySync Limitation

The authorization check (`TrySync`) is explicitly called and returns a discriminated union:

```dafny
function TrySync(server: ServerState, actor: D.UserId): SyncReply
{
  if actor in server.present.members then
    SyncOk(version, model)
  else
    SyncDenied
}
```

**Problem**: Dafny proves this function is correct, but:
- It's **opt-in** - the JS code must call it
- Nothing prevents a buggy server from skipping the call
- The caller must correctly handle `SyncDenied`

---

## Unverified Attack Surface (JavaScript)

### 1. Authentication (server/supabase.js)

**Risk**: HIGH

Authentication happens entirely in JavaScript. Dafny sees `actor: UserId` as just a string.

```javascript
// server/supabase.js - The actual identity verification
export const requireAuth = async (req, res, next) => {
  // ... JWT verification or X-User-Id header ...
  req.userId = userEmail;  // This becomes the "actor"
}
```

**If this is wrong**: An attacker could impersonate any user. Dafny's authorization checks are useless if the actor identity is forged.

### 2. Actor Injection (server/kanban-core.js:165-186)

**Risk**: HIGH

The server injects the authenticated userId as the actor in every action:

```javascript
export const actionFromJson = (action, actor) => {
  const actorDafny = _dafny.Seq.UnicodeFromString(actor);
  // ... action.type determines which action, but actor is always injected ...
}
```

**Trust assumption**: The client cannot choose the actor. But this is enforced by JavaScript, not Dafny.

**If this is wrong**: A client could send `{ actor: "admin@example.com", ... }` and the server would trust it.

### 3. Version Constraint Checking (server/index.js:175-178)

**Risk**: MEDIUM

The Dafny `Dispatch` function has a precondition:

```dafny
function Dispatch(s: ServerState, baseVersion: nat, orig: D.Action): ...
  requires baseVersion <= Version(s)
```

This precondition is checked in JavaScript:

```javascript
if (baseVersion > currentVersion) {
  return res.status(400).json({ error: 'Invalid base version' });
}
```

**If this is wrong**: Calling Dafny's `Dispatch` with an invalid version violates the precondition. Compiled Dafny code doesn't check preconditions at runtime - behavior is undefined.

### 4. JSON Serialization/Deserialization (server/kanban-core.js)

**Risk**: HIGH

~200 lines of hand-written conversion between Dafny types and JSON:

```javascript
// Converting JS -> Dafny (could introduce malformed data)
const innerModelFromJson = (json) => {
  return KanbanDomain.Model.create_Model(
    seqFromStrings(json.cols),
    lanesMapFromJson(json.lanes),
    ...
  );
};

// Converting Dafny -> JS (could lose data or change semantics)
const innerModelToJs = (m) => { ... };
```

**Issues**:
- **Type mismatches**: JS numbers vs BigNumber, JS strings vs Dafny Seq
- **Null/undefined handling**: Dafny doesn't have null
- **Missing fields**: What if `json.lanes` is undefined?
- **Invariant violations**: The loaded state might not satisfy `Inv`

### 5. Persistence Layer (server/persistence.js)

**Risk**: HIGH

Server state is stored as JSON in Supabase:

```javascript
export const saveProject = async (projectId, state, ...) => {
  const json = serverStateToJson(state);
  await supabase.from('projects').upsert({ state: json, ... });
};

export const loadProject = async (projectId) => {
  const { data } = await supabase.from('projects').select('state')...;
  return { state: serverStateFromJson(data.state), ... };
};
```

**Issues**:
- **Database tampering**: If someone modifies the JSON directly, loaded state could violate `Inv`
- **No integrity check**: Loaded state is assumed to satisfy invariant
- **Schema evolution**: Old JSON format might not parse correctly

### 6. Membership Check Before Dispatch (server/index.js:157-161)

**Risk**: MEDIUM

```javascript
// Dafny-verified membership check (fail fast)
const syncCheck = trySync(state, userId);
if (!syncCheck.ok) {
  return res.status(403).json({ error: 'Not a member of this project' });
}
```

**This is good!** But it's duplicated - the `TryStep` will also check membership. The duplication suggests uncertainty about where the check "should" happen.

**Problem**: If this check is removed, authorization still works (Dafny will reject), but the error message becomes less clear.

### 7. Client-Side Optimistic Updates (src/App.jsx)

**Risk**: LOW (defense in depth)

The client applies actions optimistically:

```javascript
const newClient = App.LocalDispatch(client, action);
setClient(newClient);  // UI updates immediately
// ... then send to server
```

**The server re-validates**, so this is safe. But it means:
- Client state can diverge from server state
- Race conditions between optimistic updates and server responses

---

## Architectural Weaknesses

### 1. No End-to-End Type Safety

The boundary between Dafny and JavaScript requires manual marshalling:

```
Client JS -> JSON -> Server JS -> Dafny types -> Dafny logic -> Dafny types -> Server JS -> JSON -> Client JS
```

Each arrow is an opportunity for bugs. Dafny's type system doesn't extend across this boundary.

### 2. Invariant Not Checked on Load

When loading from persistence:

```javascript
return { state: serverStateFromJson(data.state), isNew: false };
```

Nothing verifies that the loaded state satisfies `Inv`. A corrupt database entry bypasses all Dafny guarantees.

**Mitigation**: Add a JS check that calls a Dafny `CheckInv` function (which exists but is ghost).

### 3. The "Actor" is a String

```dafny
type UserId = string
```

This means authorization is based on string equality. Issues:
- Case sensitivity: Is "Admin@example.com" the same as "admin@example.com"?
- Normalization: Unicode normalization forms
- Whitespace: "admin " vs "admin"

The Dafny proofs assume string equality is meaningful, but JS doesn't enforce any normalization.

### 4. Race Conditions Not Modeled

Dafny models state transitions as atomic. The actual system has:

```
Client A: sync (v=5) -> dispatch (base=5)
Client B: sync (v=5) -> dispatch (base=5)  // might arrive first
```

Both dispatches succeed, but with different server states. This is handled by rebasing, but the **race between sync and dispatch** isn't modeled - a client might dispatch based on stale information even within a single operation.

### 5. Audit Log Not Persisted

```javascript
const auditLog = _dafny.Seq.of(); // We don't persist audit log
```

The audit log is discarded on save. This removes forensic capability that the Dafny model provides.

---

## Comparison: What Would Be Better?

### Option A: Verify More in Dafny

Move the trust boundary closer to the edge:

1. **Verify JSON parsing**: Define a Dafny function `ParseAction(json: string): Option<Action>` and verify it
2. **Verify serialization round-trip**: `forall a :: ParseAction(ToJson(a)) == Some(a)`
3. **Runtime invariant check**: Make `Inv` compilable and check on load

**Downside**: Significant proof effort; JSON parsing in Dafny is painful.

### Option B: Stronger Integration Discipline

Accept the trust boundary but make it smaller and more auditable:

1. **Single point of actor injection**: One function, heavily reviewed
2. **Explicit precondition checks**: Wrapper that checks all Dafny preconditions before calling
3. **Type-safe API**: Generate TypeScript types from Dafny to catch mismatches

### Option C: Authentication in Dafny (Not Practical)

The ideal would be to have Dafny verify the entire auth flow, but:
- Cryptographic verification (JWT) is hard to prove
- Database access can't be modeled purely

---

## Specific Recommendations

### High Priority

1. **Add runtime invariant check on load**:
   ```javascript
   const state = serverStateFromJson(data.state);
   if (!checkInvariant(state)) {
     throw new Error('Corrupted state in database');
   }
   ```

2. **Centralize actor injection** with explicit documentation:
   ```javascript
   // SECURITY CRITICAL: This is the ONLY place actor is injected
   // The actor MUST come from authenticated session, never from request body
   const wrapWithActor = (action, authenticatedUserId) => { ... };
   ```

3. **Add integration tests** that specifically try to bypass authorization:
   - Send action with wrong actor in JSON (should be overwritten)
   - Send action to project user isn't member of
   - Send action after being removed from project

### Medium Priority

4. **Normalize user IDs** at the authentication boundary:
   ```javascript
   req.userId = userEmail.toLowerCase().trim();
   ```

5. **Persist audit log** or at least log rejected actions for security monitoring

6. **Add version precondition check explicitly**:
   ```javascript
   // Dafny REQUIRES this - undefined behavior if violated
   assert(baseVersion <= currentVersion, 'Precondition violation');
   ```

### Low Priority

7. **Generate TypeScript types** from Dafny datatype definitions
8. **Add property-based tests** for serialization round-trips

---

## Conclusion

The kanban-multi-user system demonstrates a **verified authorization kernel** inside Dafny, but the verification guarantees are conditional on the JavaScript integration being correct. The current implementation has:

- **Strong**: Invariant preservation, authorization logic soundness
- **Weak**: Trust in JSON marshalling, authentication, precondition checking

The architecture is reasonable for a demonstration, but production use would require:
1. Hardening the JS integration layer
2. Runtime invariant checking on state load
3. Comprehensive integration tests targeting the trust boundary

The fundamental tension is: **Dafny proves properties about Dafny code, but the system includes significant JavaScript that Dafny can't see.**
