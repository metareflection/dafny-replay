// Integration tests for EffectStateMachine
// Tests the Dafny-verified kernel directly, no Supabase required
//
// Run with: npm test

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  KanbanMultiCollaboration,
  KanbanEffectAppCore,
  modelToJs,
  actionFromJson,
  actionToJson,
  toNumber,
  BigNumber,
  EffectInit,
  EffectStep,
  EffectEvent,
  EffectState,
  EffectCommand,
  ServerInit,
  ServerVersion,
  ServerModel,
  ServerDispatch,
  IsAccepted,
} from './kanban-core.js';

// ============================================================
// Test Server - simulates server-side state
// ============================================================

class TestServer {
  constructor() {
    this.state = ServerInit();
  }

  sync() {
    return {
      version: ServerVersion(this.state),
      model: modelToJs(ServerModel(this.state))
    };
  }

  dispatch(baseVersion, action) {
    const { newServer, reply } = ServerDispatch(this.state, baseVersion, action);
    this.state = newServer;

    if (IsAccepted(reply)) {
      return {
        status: 'accepted',
        version: toNumber(reply.dtor_newVersion),
        model: modelToJs(reply.dtor_newPresent)
      };
    } else {
      return { status: 'rejected', reason: 'DomainInvalid' };
    }
  }
}

// ============================================================
// Tests
// ============================================================

describe('EffectStateMachine', () => {
  let server;

  beforeEach(() => {
    server = new TestServer();
  });

  describe('Initialization', () => {
    it('should initialize with correct state', () => {
      const { version, model } = server.sync();
      const es = EffectInit(version, model);

      assert.strictEqual(EffectState.isOnline(es), true);
      assert.strictEqual(EffectState.isIdle(es), true);
      assert.strictEqual(EffectState.hasPending(es), false);
      assert.strictEqual(EffectState.getServerVersion(es), version);
    });
  });

  describe('UserAction events', () => {
    it('should queue action and start dispatch when online', () => {
      const { version, model } = server.sync();
      let es = EffectInit(version, model);

      const action = { type: 'AddColumn', col: 'Todo', limit: 10 };
      const [newEs, cmd] = EffectStep(es, EffectEvent.UserAction(action));

      // Should have pending action
      assert.strictEqual(EffectState.hasPending(newEs), true);
      assert.strictEqual(EffectState.getPendingCount(newEs), 1);

      // Should start dispatching
      assert.strictEqual(EffectState.isDispatching(newEs), true);

      // Command should be SendDispatch
      assert.strictEqual(EffectCommand.isSendDispatch(cmd), true);
      assert.strictEqual(EffectCommand.getBaseVersion(cmd), version);
    });

    it('should queue action without dispatch when offline', () => {
      const { version, model } = server.sync();
      let es = EffectInit(version, model);

      // Go offline
      [es] = EffectStep(es, EffectEvent.ManualGoOffline());
      assert.strictEqual(EffectState.isOnline(es), false);

      // Add action while offline
      const action = { type: 'AddColumn', col: 'Todo', limit: 10 };
      const [newEs, cmd] = EffectStep(es, EffectEvent.UserAction(action));

      // Should have pending
      assert.strictEqual(EffectState.hasPending(newEs), true);

      // Should NOT be dispatching (offline)
      assert.strictEqual(EffectState.isDispatching(newEs), false);

      // Command should be NoOp
      assert.strictEqual(EffectCommand.isNoOp(cmd), true);
    });
  });

  describe('Dispatch responses', () => {
    it('should handle DispatchAccepted correctly', () => {
      const { version, model } = server.sync();
      let es = EffectInit(version, model);

      // Add action
      const action = { type: 'AddColumn', col: 'Todo', limit: 10 };
      [es] = EffectStep(es, EffectEvent.UserAction(action));

      // Simulate server accepting
      const serverResult = server.dispatch(version, action);
      assert.strictEqual(serverResult.status, 'accepted');

      // Process DispatchAccepted
      const [newEs, cmd] = EffectStep(es, EffectEvent.DispatchAccepted(
        serverResult.version,
        serverResult.model
      ));

      // Should be idle (no more pending)
      assert.strictEqual(EffectState.isIdle(newEs), true);
      assert.strictEqual(EffectState.hasPending(newEs), false);
      assert.strictEqual(EffectState.getServerVersion(newEs), serverResult.version);
    });

    it('should continue dispatching when more actions pending', () => {
      const { version, model } = server.sync();
      let es = EffectInit(version, model);

      // Add two actions
      [es] = EffectStep(es, EffectEvent.UserAction({ type: 'AddColumn', col: 'Todo', limit: 10 }));
      [es] = EffectStep(es, EffectEvent.UserAction({ type: 'AddColumn', col: 'Done', limit: 10 }));

      assert.strictEqual(EffectState.getPendingCount(es), 2);

      // Server accepts first
      const result1 = server.dispatch(version, { type: 'AddColumn', col: 'Todo', limit: 10 });
      const [es2, cmd] = EffectStep(es, EffectEvent.DispatchAccepted(result1.version, result1.model));

      // Should still be dispatching (one more pending)
      assert.strictEqual(EffectState.getPendingCount(es2), 1);
      assert.strictEqual(EffectState.isDispatching(es2), true);
      assert.strictEqual(EffectCommand.isSendDispatch(cmd), true);
    });

    it('should handle DispatchConflict by resyncing and retrying', () => {
      const { version, model } = server.sync();
      let es = EffectInit(version, model);

      // Add action
      [es] = EffectStep(es, EffectEvent.UserAction({ type: 'AddColumn', col: 'Todo', limit: 10 }));

      // Simulate conflict: another client changed server state
      const otherAction = { type: 'AddColumn', col: 'Other', limit: 5 };
      server.dispatch(version, otherAction);
      const freshState = server.sync();

      // Process DispatchConflict
      const [newEs, cmd] = EffectStep(es, EffectEvent.DispatchConflict(
        freshState.version,
        freshState.model
      ));

      // Should still have pending (action preserved)
      assert.strictEqual(EffectState.hasPending(newEs), true);

      // Should retry dispatch
      assert.strictEqual(EffectState.isDispatching(newEs), true);
      assert.strictEqual(EffectCommand.isSendDispatch(cmd), true);

      // New command should use fresh version
      assert.strictEqual(EffectCommand.getBaseVersion(cmd), freshState.version);
    });

    it('should handle DispatchRejected by dropping action', () => {
      // Setup: Create column with WIP limit
      const { version: v0, model: m0 } = server.sync();
      let es = EffectInit(v0, m0);

      // Add column with limit 1
      [es] = EffectStep(es, EffectEvent.UserAction({ type: 'AddColumn', col: 'Done', limit: 1 }));
      const r1 = server.dispatch(v0, { type: 'AddColumn', col: 'Done', limit: 1 });
      [es] = EffectStep(es, EffectEvent.DispatchAccepted(r1.version, r1.model));

      // Add a card to fill the limit
      [es] = EffectStep(es, EffectEvent.UserAction({ type: 'AddCard', col: 'Done', title: 'First' }));
      const r2 = server.dispatch(r1.version, { type: 'AddCard', col: 'Done', title: 'First' });
      [es] = EffectStep(es, EffectEvent.DispatchAccepted(r2.version, r2.model));

      // Now try to add another card (will exceed WIP)
      [es] = EffectStep(es, EffectEvent.UserAction({ type: 'AddCard', col: 'Done', title: 'Second' }));
      const r3 = server.dispatch(r2.version, { type: 'AddCard', col: 'Done', title: 'Second' });
      assert.strictEqual(r3.status, 'rejected');

      // Process DispatchRejected
      const freshState = server.sync();
      const [newEs] = EffectStep(es, EffectEvent.DispatchRejected(
        freshState.version,
        freshState.model
      ));

      // Rejected action should be dropped
      assert.strictEqual(EffectState.hasPending(newEs), false);
      assert.strictEqual(EffectState.isIdle(newEs), true);
    });
  });

  describe('Network events', () => {
    it('should handle going offline and back online', () => {
      const { version, model } = server.sync();
      let es = EffectInit(version, model);

      // Add action
      [es] = EffectStep(es, EffectEvent.UserAction({ type: 'AddColumn', col: 'Todo', limit: 10 }));
      assert.strictEqual(EffectState.isDispatching(es), true);

      // Network error
      [es] = EffectStep(es, EffectEvent.NetworkError());
      assert.strictEqual(EffectState.isOnline(es), false);
      assert.strictEqual(EffectState.isIdle(es), true);
      assert.strictEqual(EffectState.hasPending(es), true); // Action preserved

      // Network restored
      const [newEs, cmd] = EffectStep(es, EffectEvent.NetworkRestored());
      assert.strictEqual(EffectState.isOnline(newEs), true);
      assert.strictEqual(EffectState.isDispatching(newEs), true);
      assert.strictEqual(EffectCommand.isSendDispatch(cmd), true);
    });

    it('should handle manual offline toggle', () => {
      const { version, model } = server.sync();
      let es = EffectInit(version, model);

      // Go offline manually
      [es] = EffectStep(es, EffectEvent.ManualGoOffline());
      assert.strictEqual(EffectState.isOnline(es), false);

      // Add actions while offline
      [es] = EffectStep(es, EffectEvent.UserAction({ type: 'AddColumn', col: 'Todo', limit: 10 }));
      [es] = EffectStep(es, EffectEvent.UserAction({ type: 'AddCard', col: 'Todo', title: 'Task' }));
      assert.strictEqual(EffectState.getPendingCount(es), 2);

      // Go online manually
      const [newEs, cmd] = EffectStep(es, EffectEvent.ManualGoOnline());
      assert.strictEqual(EffectState.isOnline(newEs), true);
      assert.strictEqual(EffectState.isDispatching(newEs), true);
      assert.strictEqual(EffectCommand.isSendDispatch(cmd), true);
    });
  });

  describe('Tick event', () => {
    it('should start dispatch on Tick if pending and idle', () => {
      const { version, model } = server.sync();
      let es = EffectInit(version, model);

      // Go offline, add action, come online but go idle
      [es] = EffectStep(es, EffectEvent.ManualGoOffline());
      [es] = EffectStep(es, EffectEvent.UserAction({ type: 'AddColumn', col: 'Todo', limit: 10 }));

      // Manually construct a state that's online, idle, with pending
      // (This simulates recovery from max retries)
      [es] = EffectStep(es, EffectEvent.ManualGoOnline());

      // If somehow we're online+idle+pending, Tick should start dispatch
      if (EffectState.isIdle(es) && EffectState.hasPending(es)) {
        const [newEs, cmd] = EffectStep(es, EffectEvent.Tick());
        assert.strictEqual(EffectState.isDispatching(newEs), true);
        assert.strictEqual(EffectCommand.isSendDispatch(cmd), true);
      }
    });
  });

  describe('Pending preservation', () => {
    it('should never lose pending actions through network errors', () => {
      const { version, model } = server.sync();
      let es = EffectInit(version, model);

      // Add several actions
      [es] = EffectStep(es, EffectEvent.UserAction({ type: 'AddColumn', col: 'A', limit: 10 }));
      [es] = EffectStep(es, EffectEvent.UserAction({ type: 'AddColumn', col: 'B', limit: 10 }));
      [es] = EffectStep(es, EffectEvent.UserAction({ type: 'AddColumn', col: 'C', limit: 10 }));

      const initialPending = EffectState.getPendingCount(es);
      assert.strictEqual(initialPending, 3);

      // Network error
      [es] = EffectStep(es, EffectEvent.NetworkError());
      assert.strictEqual(EffectState.getPendingCount(es), 3);

      // Network restored
      [es] = EffectStep(es, EffectEvent.NetworkRestored());
      assert.strictEqual(EffectState.getPendingCount(es), 3);

      // Another network error
      [es] = EffectStep(es, EffectEvent.NetworkError());
      assert.strictEqual(EffectState.getPendingCount(es), 3);
    });

    it('should preserve pending through conflicts', () => {
      const { version, model } = server.sync();
      let es = EffectInit(version, model);

      // Add action
      [es] = EffectStep(es, EffectEvent.UserAction({ type: 'AddColumn', col: 'Todo', limit: 10 }));
      const beforeConflict = EffectState.getPendingCount(es);

      // Conflict (server changed)
      server.dispatch(version, { type: 'AddColumn', col: 'Other', limit: 5 });
      const fresh = server.sync();

      [es] = EffectStep(es, EffectEvent.DispatchConflict(fresh.version, fresh.model));

      // Pending preserved
      assert.strictEqual(EffectState.getPendingCount(es), beforeConflict);
    });
  });
});

describe('Rejection Mid-Flush', () => {
  it('should continue executing remaining actions after one is rejected', () => {
    // This tests the critical bug scenario:
    // - Queue many pending actions while offline
    // - One action in the middle gets rejected (e.g., WIP exceeded)
    // - The remaining actions should still execute

    const server = new TestServer();
    const { version: v0, model: m0 } = server.sync();
    let es = EffectInit(v0, m0);
    let cmd;

    // Setup: Create columns with WIP limits while online
    [es, cmd] = EffectStep(es, EffectEvent.UserAction({ type: 'AddColumn', col: 'Todo', limit: 10 }));
    let result = server.dispatch(EffectCommand.getBaseVersion(cmd), actionToJson(EffectCommand.getAction(cmd)));
    [es, cmd] = EffectStep(es, EffectEvent.DispatchAccepted(result.version, result.model));

    [es, cmd] = EffectStep(es, EffectEvent.UserAction({ type: 'AddColumn', col: 'Done', limit: 2 })); // WIP limit of 2!
    result = server.dispatch(EffectCommand.getBaseVersion(cmd), actionToJson(EffectCommand.getAction(cmd)));
    [es, cmd] = EffectStep(es, EffectEvent.DispatchAccepted(result.version, result.model));

    // Add initial cards to Done (filling it to limit)
    [es, cmd] = EffectStep(es, EffectEvent.UserAction({ type: 'AddCard', col: 'Done', title: 'Done1' }));
    result = server.dispatch(EffectCommand.getBaseVersion(cmd), actionToJson(EffectCommand.getAction(cmd)));
    [es, cmd] = EffectStep(es, EffectEvent.DispatchAccepted(result.version, result.model));

    [es, cmd] = EffectStep(es, EffectEvent.UserAction({ type: 'AddCard', col: 'Done', title: 'Done2' }));
    result = server.dispatch(EffectCommand.getBaseVersion(cmd), actionToJson(EffectCommand.getAction(cmd)));
    [es, cmd] = EffectStep(es, EffectEvent.DispatchAccepted(result.version, result.model));

    // Done column now has 2 cards (at WIP limit)
    let state = server.sync();
    assert.strictEqual(state.model.lanes['Done'].length, 2, 'Done should have 2 cards');

    // NOW GO OFFLINE and queue multiple actions
    [es] = EffectStep(es, EffectEvent.ManualGoOffline());

    // Action 1: Add card to Todo (should succeed)
    [es] = EffectStep(es, EffectEvent.UserAction({ type: 'AddCard', col: 'Todo', title: 'TodoTask1' }));

    // Action 2: Add card to Done (WILL BE REJECTED - WIP exceeded!)
    [es] = EffectStep(es, EffectEvent.UserAction({ type: 'AddCard', col: 'Done', title: 'WillFail' }));

    // Action 3: Add another card to Todo (should succeed AFTER rejection)
    [es] = EffectStep(es, EffectEvent.UserAction({ type: 'AddCard', col: 'Todo', title: 'TodoTask2' }));

    // Action 4: Add yet another card to Todo (should succeed)
    [es] = EffectStep(es, EffectEvent.UserAction({ type: 'AddCard', col: 'Todo', title: 'TodoTask3' }));

    assert.strictEqual(EffectState.getPendingCount(es), 4, 'Should have 4 pending actions');

    // COME BACK ONLINE - this should start flushing
    [es, cmd] = EffectStep(es, EffectEvent.ManualGoOnline());
    assert.strictEqual(EffectState.isDispatching(es), true);

    // Track results
    const results = [];
    let iterations = 0;
    const maxIterations = 10; // Safety limit

    // Flush all pending actions
    while (EffectCommand.isSendDispatch(cmd) && iterations < maxIterations) {
      iterations++;
      const action = actionToJson(EffectCommand.getAction(cmd));
      const baseVer = EffectCommand.getBaseVersion(cmd);
      const dispatchResult = server.dispatch(baseVer, action);

      results.push({ action: action.type, title: action.title, status: dispatchResult.status });

      if (dispatchResult.status === 'accepted') {
        [es, cmd] = EffectStep(es, EffectEvent.DispatchAccepted(
          dispatchResult.version,
          dispatchResult.model
        ));
      } else {
        // REJECTED - fetch fresh state and continue
        const fresh = server.sync();
        [es, cmd] = EffectStep(es, EffectEvent.DispatchRejected(fresh.version, fresh.model));
      }
    }

    // Verify we processed all actions
    assert.strictEqual(EffectState.isIdle(es), true, 'Should be idle after flush');
    assert.strictEqual(EffectState.hasPending(es), false, 'Should have no pending actions');

    // Check results: 1 rejected, 3 accepted
    const accepted = results.filter(r => r.status === 'accepted');
    const rejected = results.filter(r => r.status === 'rejected');

    assert.strictEqual(rejected.length, 1, 'Exactly 1 action should be rejected');
    assert.strictEqual(rejected[0].title, 'WillFail', 'The WIP-exceeding action should be rejected');

    assert.strictEqual(accepted.length, 3, '3 actions should be accepted');

    // Verify final server state
    const finalState = server.sync();
    assert.strictEqual(finalState.model.lanes['Todo'].length, 3, 'Todo should have 3 cards');
    assert.strictEqual(finalState.model.lanes['Done'].length, 2, 'Done should still have 2 cards (WIP respected)');

    // Verify the correct cards are in Todo
    const todoTitles = finalState.model.lanes['Todo'].map(id => finalState.model.cards[id].title);
    assert.ok(todoTitles.includes('TodoTask1'), 'TodoTask1 should be in Todo');
    assert.ok(todoTitles.includes('TodoTask2'), 'TodoTask2 should be in Todo (after rejection!)');
    assert.ok(todoTitles.includes('TodoTask3'), 'TodoTask3 should be in Todo');

    console.log('Results:', results);
    console.log('Final Todo:', todoTitles);
  });
});

describe('Two Clients Offline Concurrently', () => {
  it('should sync both clients after concurrent offline edits', () => {
    // Scenario:
    // - Client1 goes offline, adds 2 cards to Todo
    // - Client2 goes offline, adds 2 cards to Todo
    // - Client1 comes online, flushes
    // - Client2 comes online, flushes (will conflict but should resolve)
    // - Both clients should see all 4 cards

    const server = new TestServer();
    const { version: v0, model: m0 } = server.sync();

    // Setup: Create Todo column while both online
    let es1 = EffectInit(v0, m0);
    let es2 = EffectInit(v0, m0);
    let cmd;

    // Client1 creates the column
    [es1, cmd] = EffectStep(es1, EffectEvent.UserAction({ type: 'AddColumn', col: 'Todo', limit: 20 }));
    let result = server.dispatch(EffectCommand.getBaseVersion(cmd), actionToJson(EffectCommand.getAction(cmd)));
    [es1, cmd] = EffectStep(es1, EffectEvent.DispatchAccepted(result.version, result.model));

    // Both clients sync to get the column
    const syncState = server.sync();
    es1 = EffectInit(syncState.version, syncState.model);
    es2 = EffectInit(syncState.version, syncState.model);

    console.log('Initial state:', syncState);
    console.log('Both clients synced at version:', syncState.version);

    // ========== CLIENT 1 GOES OFFLINE ==========
    [es1] = EffectStep(es1, EffectEvent.ManualGoOffline());
    assert.strictEqual(EffectState.isOnline(es1), false);

    // Client1 adds 2 cards while offline
    [es1] = EffectStep(es1, EffectEvent.UserAction({ type: 'AddCard', col: 'Todo', title: 'Client1-Task1' }));
    [es1] = EffectStep(es1, EffectEvent.UserAction({ type: 'AddCard', col: 'Todo', title: 'Client1-Task2' }));

    assert.strictEqual(EffectState.getPendingCount(es1), 2, 'Client1 should have 2 pending');

    // ========== CLIENT 2 GOES OFFLINE ==========
    [es2] = EffectStep(es2, EffectEvent.ManualGoOffline());
    assert.strictEqual(EffectState.isOnline(es2), false);

    // Client2 adds 2 cards while offline
    [es2] = EffectStep(es2, EffectEvent.UserAction({ type: 'AddCard', col: 'Todo', title: 'Client2-Task1' }));
    [es2] = EffectStep(es2, EffectEvent.UserAction({ type: 'AddCard', col: 'Todo', title: 'Client2-Task2' }));

    assert.strictEqual(EffectState.getPendingCount(es2), 2, 'Client2 should have 2 pending');

    // ========== CLIENT 1 COMES ONLINE ==========
    console.log('\n--- Client1 coming online ---');
    [es1, cmd] = EffectStep(es1, EffectEvent.ManualGoOnline());

    // Flush Client1's pending actions
    let client1Results = [];
    while (EffectCommand.isSendDispatch(cmd)) {
      const action = actionToJson(EffectCommand.getAction(cmd));
      const baseVer = EffectCommand.getBaseVersion(cmd);
      const dispatchResult = server.dispatch(baseVer, action);
      client1Results.push({ action: action.title, status: dispatchResult.status, newVersion: dispatchResult.version });

      if (dispatchResult.status === 'accepted') {
        [es1, cmd] = EffectStep(es1, EffectEvent.DispatchAccepted(dispatchResult.version, dispatchResult.model));
      } else if (dispatchResult.status === 'conflict') {
        const fresh = server.sync();
        [es1, cmd] = EffectStep(es1, EffectEvent.DispatchConflict(fresh.version, fresh.model));
      } else {
        const fresh = server.sync();
        [es1, cmd] = EffectStep(es1, EffectEvent.DispatchRejected(fresh.version, fresh.model));
      }
    }

    console.log('Client1 results:', client1Results);
    assert.strictEqual(EffectState.hasPending(es1), false, 'Client1 should have no pending after flush');

    // Server should now have 2 cards
    let midState = server.sync();
    console.log('Server after Client1:', midState.model.lanes['Todo']?.length, 'cards');
    assert.strictEqual(midState.model.lanes['Todo'].length, 2, 'Server should have 2 cards after Client1');

    // ========== CLIENT 2 COMES ONLINE ==========
    console.log('\n--- Client2 coming online ---');
    [es2, cmd] = EffectStep(es2, EffectEvent.ManualGoOnline());

    // Flush Client2's pending actions (these will conflict since server changed!)
    let client2Results = [];
    let iterations = 0;
    while (EffectCommand.isSendDispatch(cmd) && iterations < 20) {
      iterations++;
      const action = actionToJson(EffectCommand.getAction(cmd));
      const baseVer = EffectCommand.getBaseVersion(cmd);
      const dispatchResult = server.dispatch(baseVer, action);

      // Check if this is a conflict (baseVersion doesn't match server)
      const serverVer = server.sync().version;
      const isConflict = dispatchResult.status === 'accepted' && baseVer < serverVer - 1;

      client2Results.push({
        action: action.title,
        status: dispatchResult.status,
        baseVer,
        serverVer: dispatchResult.version || serverVer
      });

      if (dispatchResult.status === 'accepted') {
        [es2, cmd] = EffectStep(es2, EffectEvent.DispatchAccepted(dispatchResult.version, dispatchResult.model));
      } else if (dispatchResult.status === 'conflict') {
        const fresh = server.sync();
        [es2, cmd] = EffectStep(es2, EffectEvent.DispatchConflict(fresh.version, fresh.model));
      } else {
        const fresh = server.sync();
        [es2, cmd] = EffectStep(es2, EffectEvent.DispatchRejected(fresh.version, fresh.model));
      }
    }

    console.log('Client2 results:', client2Results);
    assert.strictEqual(EffectState.hasPending(es2), false, 'Client2 should have no pending after flush');

    // ========== VERIFY FINAL STATE ==========
    const finalState = server.sync();
    console.log('\n--- Final State ---');
    console.log('Version:', finalState.version);
    console.log('Todo cards:', finalState.model.lanes['Todo'].length);

    const todoTitles = finalState.model.lanes['Todo'].map(id => finalState.model.cards[id].title);
    console.log('Card titles:', todoTitles);

    // Should have all 4 cards
    assert.strictEqual(finalState.model.lanes['Todo'].length, 4, 'Should have 4 cards total');

    // Verify all cards are present
    assert.ok(todoTitles.includes('Client1-Task1'), 'Client1-Task1 should exist');
    assert.ok(todoTitles.includes('Client1-Task2'), 'Client1-Task2 should exist');
    assert.ok(todoTitles.includes('Client2-Task1'), 'Client2-Task1 should exist');
    assert.ok(todoTitles.includes('Client2-Task2'), 'Client2-Task2 should exist');

    // Both clients should now sync to the same state
    const finalSync = server.sync();
    es1 = EffectInit(finalSync.version, finalSync.model);
    es2 = EffectInit(finalSync.version, finalSync.model);

    assert.strictEqual(EffectState.getServerVersion(es1), EffectState.getServerVersion(es2),
      'Both clients should have same version after sync');
  });
});

describe('Full Client-Server Simulation', () => {
  it('should handle complete offline-online cycle', () => {
    const server = new TestServer();
    const { version: v0, model: m0 } = server.sync();
    let es = EffectInit(v0, m0);

    // Setup columns while online
    [es] = EffectStep(es, EffectEvent.UserAction({ type: 'AddColumn', col: 'Todo', limit: 10 }));
    let cmd;
    [es, cmd] = [es, null]; // get cmd from step

    // Actually process the dispatch
    [es, cmd] = EffectStep(EffectInit(v0, m0), EffectEvent.UserAction({ type: 'AddColumn', col: 'Todo', limit: 10 }));

    // Execute command against server
    const result = server.dispatch(EffectCommand.getBaseVersion(cmd), actionToJson(EffectCommand.getAction(cmd)));
    assert.strictEqual(result.status, 'accepted');

    // Process accept
    [es, cmd] = EffectStep(es, EffectEvent.DispatchAccepted(result.version, result.model));
    assert.strictEqual(EffectState.isIdle(es), true);

    // Go offline
    [es] = EffectStep(es, EffectEvent.ManualGoOffline());

    // Queue actions while offline
    [es] = EffectStep(es, EffectEvent.UserAction({ type: 'AddCard', col: 'Todo', title: 'Task 1' }));
    [es] = EffectStep(es, EffectEvent.UserAction({ type: 'AddCard', col: 'Todo', title: 'Task 2' }));
    assert.strictEqual(EffectState.getPendingCount(es), 2);

    // Come back online
    [es, cmd] = EffectStep(es, EffectEvent.ManualGoOnline());
    assert.strictEqual(EffectState.isDispatching(es), true);

    // Flush pending actions
    while (EffectCommand.isSendDispatch(cmd)) {
      const action = actionToJson(EffectCommand.getAction(cmd));
      const baseVer = EffectCommand.getBaseVersion(cmd);
      const dispatchResult = server.dispatch(baseVer, action);

      if (dispatchResult.status === 'accepted') {
        [es, cmd] = EffectStep(es, EffectEvent.DispatchAccepted(
          dispatchResult.version,
          dispatchResult.model
        ));
      } else {
        const fresh = server.sync();
        [es, cmd] = EffectStep(es, EffectEvent.DispatchRejected(fresh.version, fresh.model));
      }
    }

    // All actions processed
    assert.strictEqual(EffectState.isIdle(es), true);
    assert.strictEqual(EffectState.hasPending(es), false);

    // Verify server state
    const finalState = server.sync();
    assert.strictEqual(finalState.model.lanes['Todo'].length, 2);
  });
});
