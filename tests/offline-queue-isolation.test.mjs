import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the actual application functions, with isolated storage and Firebase
// doubles. No browser data, user accounts or network requests are touched.
const source = fs.readFileSync(new URL('../javascript.js', import.meta.url), 'utf8');
function section(start, end) {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, `Missing section: ${start}`);
  return source.slice(first, last);
}
const handlers = [
  section('  function getPendingWorkoutKey(', '  window.finishWorkout ='),
  section('  onAuthStateChanged(auth,', '  window.handleLogout ='),
  section('async function loadCloudData()', 'function renderPendingSyncStatus()')
].join('\n');
const clone = value => JSON.parse(JSON.stringify(value));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
async function until(check) {
  for (let i = 0; i < 100; i++) {
    if (check()) return;
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.fail('Expected asynchronous checkpoint was not reached');
}

// Transactions serialize and commit atomically, including injected aborts.
function fakeDatabase() {
  const stores = new Map(['pendingWorkouts', 'pendingOperations'].map(name => [name, new Map()]));
  let tail = Promise.resolve();
  const db = {
    failCommit: false, beforeCommit: null,
    rows: name => clone([...stores.get(name).values()]),
    seed(name, rows) { rows.forEach(row => stores.get(name).set(row.id, clone(row))); },
    transaction(name) {
      const request = {};
      let draft;
      let aborted = false;
      const transaction = {
        error: null,
        abort() { aborted = true; },
        objectStore() {
          return {
            getAll: () => request,
            put: row => draft.set(row.id, clone(row)),
            delete: id => draft.delete(id)
          };
        }
      };
      tail = tail.then(async () => {
        draft = new Map(stores.get(name));
        request.result = clone([...draft.values()]);
        request.onsuccess?.();
        if (db.beforeCommit) await db.beforeCommit(name);
        if (db.failCommit || aborted) {
          transaction.error = new Error('Injected transaction abort');
          transaction.onabort?.();
        } else {
          stores.set(name, draft);
          transaction.oncomplete?.();
        }
      });
      return transaction;
    }
  };
  return db;
}

function harness({ fallback = false, storage = new Map(), database = fakeDatabase() } = {}) {
  let serial = 0;
  const timers = new Map();
  const requests = [];
  const server = new Map();
  const app = { storage, database, requests, server, timers, idbUnavailable: fallback, sendHook: null };
  const c = {
    currentUser: null, auth: { currentUser: null }, db: {},
    pendingQueueSession: 0, pendingQueueWrites: new Map(), pendingDbPromise: null,
    pendingWorkoutsMemory: [], pendingOperationsMemory: [],
    pendingWorkoutsLoaded: false, pendingOperationsLoaded: false,
    pendingSyncRetryTimer: null, pendingSyncRetryDelayMs: 5000, pendingSyncInProgress: false,
    PENDING_SYNC_RETRY_MIN_MS: 5000, PENDING_SYNC_RETRY_MAX_MS: 60000,
    PENDING_OPERATIONS_STORE: 'pendingOperations', OFFLINE_DB_VERSION: 2,
    cachedHistory: [], currentProfileData: null, routinesUnsubscribe: null,
    navigator: { onLine: false }, crypto: { randomUUID: () => `operation-${++serial}` },
    console: { warn() {}, error() {} },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key)
    },
    document: { getElementById: () => null },
    setTimeout: (callback, delay) => { const id = ++serial; timers.set(id, { callback, delay }); return id; },
    clearTimeout: id => timers.delete(id),
    doc: (_, ...parts) => parts.join('/'), deleteField: () => '__DELETE__',
    getWorkoutDraftUserId: () => c.currentUser?.uid === c.auth.currentUser?.uid ? c.currentUser?.uid : null,
    renderPendingSyncStatus() {}, ShowToast() {}, writeHistoryCache() {}, readHistoryCache: () => [],
    checkDraftState() {}, renderDashboard() {}, renderProgressOverview() {}, renderHistory() {},
    query: (...args) => args, collection: (_, name) => name, where: (...args) => args,
    orderBy: (...args) => args, limit: value => value,
    getDocs: async () => ({ forEach() {} }),
    resetActiveWorkoutState() {}, dismissFirstVisitPrompt() {}, renderMealPlan() {}, renderSavedMealPlans() {},
    showLegalAcceptanceIfRequired() {}, hasCurrentLegalAcceptance: () => false,
    listenToUserRoutines() {}, switchTab() {}, ensureInAppHistory() {},
    showFirstVisitPromptIfNeeded() {}, hideAuthBootScreen() {},
    onAuthStateChanged: (_, handler) => { app.authChanged = handler; }
  };
  const send = async (kind, path, data) => {
    const call = { kind, path, data: data && clone(data), uid: c.auth.currentUser?.uid };
    requests.push(call);
    if (app.sendHook) await app.sendHook(call);
    if (kind === 'delete') server.delete(path);
    else server.set(path, call.data);
  };
  c.setDoc = (path, data) => send('set', path, data);
  c.deleteDoc = path => send('delete', path);
  c.window = c;
  vm.createContext(c);
  vm.runInContext(handlers, c);
  c.openPendingWorkoutsDb = async () => {
    if (app.idbUnavailable) throw new Error('Injected IndexedDB unavailability');
    return database;
  };
  app.c = c;
  app.login = async uid => {
    c.auth.currentUser = uid ? { uid, email: `${uid}@example.test` } : null;
    await app.authChanged(c.auth.currentUser);
  };
  app.workout = (id, uid = c.currentUser.uid, name = id) => ({ id, userId: uid, queuedAt: 1, status: 'pending', data: { userId: uid, name, exercises: [] } });
  app.addWorkout = (id, uid = c.currentUser.uid) => c.queueWorkoutForSync(id, { userId: uid, name: id, exercises: [] });
  app.addOperation = (id, path = `foodEntries/${id}`, data = { calories: 100 }) => c.queueOfflineOperation({ id, userId: c.currentUser.uid, kind: 'set', path, data });
  app.ids = name => clone((name === 'pendingWorkouts' ? c.pendingWorkoutsMemory : c.pendingOperationsMemory).map(row => row.id));
  return app;
}

const tests = [];
function test(name, run) { tests.push({ name, run }); }
for (const fallback of [false, true]) {
  const mode = fallback ? 'localStorage fallback' : 'IndexedDB';

  test(`${mode}: new workout and operation survive an in-flight batch and reload`, async () => {
    const a = harness({ fallback });
    await a.login('A');
    await a.addWorkout('w1');
    await a.addWorkout('w2');
    await a.addOperation('op1');
    const gate = deferred();
    a.sendHook = call => call.path === 'workouts/w1' ? gate.promise : undefined;
    a.c.navigator.onLine = true;
    const syncing = a.c.syncPendingWorkouts();
    await until(() => a.requests.length === 1);
    await a.addWorkout('w3');
    await a.addOperation('op2');
    gate.resolve();
    await syncing;
    assert.deepEqual(a.ids('pendingWorkouts'), ['w3']);
    assert.deepEqual(a.ids('pendingOperations'), ['op2']);
    assert.deepEqual(a.requests.map(row => row.path), ['workouts/w1', 'workouts/w2', 'foodEntries/op1']);
    assert.ok([...a.timers.values()].some(timer => timer.delay === 0), 'New batch is scheduled automatically');
    const reload = harness({ fallback, storage: a.storage, database: a.database });
    await reload.login('A');
    assert.deepEqual(reload.ids('pendingWorkouts'), ['w3']);
    assert.deepEqual(reload.ids('pendingOperations'), ['op2']);
    reload.c.navigator.onLine = true;
    await reload.c.syncPendingWorkouts();
    assert.deepEqual(reload.ids('pendingWorkouts'), []);
    assert.deepEqual(reload.ids('pendingOperations'), []);
  });

  test(`${mode}: connection lost between items, retry keeps original IDs`, async () => {
    const a = harness({ fallback });
    await a.login('A');
    await a.addWorkout('w1');
    await a.addWorkout('w2');
    await a.addOperation('op1');
    a.sendHook = () => { a.c.navigator.onLine = false; };
    a.c.navigator.onLine = true;
    await a.c.syncPendingWorkouts();
    assert.deepEqual(a.requests.map(row => row.path), ['workouts/w1']);
    assert.deepEqual(a.ids('pendingWorkouts'), ['w2']);
    assert.deepEqual(a.ids('pendingOperations'), ['op1']);
    a.sendHook = null;
    a.c.navigator.onLine = true;
    await a.c.syncPendingWorkouts();
    await a.c.syncPendingWorkouts();
    assert.deepEqual(a.requests.map(row => row.path), ['workouts/w1', 'workouts/w2', 'foodEntries/op1']);
    assert.equal(a.server.size, 3);
  });

  test(`${mode}: failure retains failed/unattempted records and retries idempotently`, async () => {
    const a = harness({ fallback });
    await a.login('A');
    await a.addWorkout('w1');
    await a.addWorkout('w2');
    a.sendHook = call => {
      // Simulate a server write whose acknowledgement was lost.
      a.server.set(call.path, call.data);
      throw Object.assign(new Error('network timeout'), { code: 'unavailable' });
    };
    a.c.navigator.onLine = true;
    await a.c.syncPendingWorkouts();
    assert.deepEqual(a.ids('pendingWorkouts'), ['w1', 'w2']);
    assert.equal(a.requests.length, 1);
    assert.ok(a.c.pendingSyncRetryDelayMs > 5000);
    a.sendHook = null;
    await a.c.syncPendingWorkouts();
    assert.deepEqual(a.requests.map(row => row.path), ['workouts/w1', 'workouts/w1', 'workouts/w2']);
    assert.equal(a.server.size, 2, 'Retries reuse the document ID');
  });

  for (const rejectOld of [false, true]) {
    test(`${mode}: A switches to B while old request ${rejectOld ? 'fails' : 'succeeds'}`, async () => {
      const a = harness({ fallback });
      await a.login('A');
      await a.addWorkout('A1');
      await a.addWorkout('A2');
      await a.addOperation('Aop');
      const gate = deferred();
      a.sendHook = () => gate.promise;
      a.c.navigator.onLine = true;
      const syncing = a.c.syncPendingWorkouts();
      await until(() => a.requests.length === 1);
      await a.login('B');
      assert.deepEqual(a.ids('pendingWorkouts'), []);
      assert.deepEqual(a.ids('pendingOperations'), []);
      await a.addWorkout('B1');
      await a.addOperation('Bop');
      if (rejectOld) gate.reject(Object.assign(new Error('offline'), { code: 'unavailable' }));
      else gate.resolve();
      await syncing;
      assert.deepEqual(a.ids('pendingWorkouts'), ['B1']);
      assert.deepEqual(a.ids('pendingOperations'), ['Bop']);
      assert.equal(a.requests.length, 1, 'Old series stops before A2/Aop');
      a.sendHook = null;
      await a.c.syncPendingWorkouts();
      assert.ok(a.requests.slice(1).every(call => call.uid === 'B' && !call.path.includes('A')));
      a.c.navigator.onLine = false;
      await a.login('A');
      assert.deepEqual(a.ids('pendingWorkouts'), ['A1', 'A2']);
      assert.deepEqual(a.ids('pendingOperations'), ['Aop']);
      a.c.navigator.onLine = true;
      await a.c.syncPendingWorkouts();
      assert.deepEqual(a.ids('pendingWorkouts'), []);
      assert.deepEqual(a.ids('pendingOperations'), []);
    });
  }

  test(`${mode}: logout and A→B→A invalidate old session even with same UID`, async () => {
    const a = harness({ fallback });
    await a.login('A');
    await a.addWorkout('A1');
    await a.addWorkout('A2');
    const gate = deferred();
    a.sendHook = () => gate.promise;
    a.c.navigator.onLine = true;
    const syncing = a.c.syncPendingWorkouts();
    await until(() => a.requests.length === 1);
    await a.login(null);
    assert.deepEqual(a.ids('pendingWorkouts'), []);
    assert.equal(a.c.pendingWorkoutsLoaded, false);
    await a.login('B');
    await a.login('A');
    gate.resolve();
    await syncing;
    assert.equal(a.requests.length, 1);
    assert.deepEqual(a.ids('pendingWorkouts'), ['A1', 'A2']);
  });

  test(`${mode}: same-path update supersedes in-flight operation without resurrection`, async () => {
    const a = harness({ fallback });
    await a.login('A');
    await a.addOperation('old', 'users/A', { name: 'old', weightKg: 80 });
    const gate = deferred();
    a.sendHook = () => gate.promise;
    a.c.navigator.onLine = true;
    const syncing = a.c.syncPendingWorkouts();
    await until(() => a.requests.length === 1);
    await a.addOperation('new', 'users/A', { name: 'new' });
    gate.reject(Object.assign(new Error('offline'), { code: 'unavailable' }));
    await syncing;
    assert.deepEqual(a.ids('pendingOperations'), ['new']);
    assert.deepEqual(clone(a.c.pendingOperationsMemory[0].data), { name: 'new', weightKg: 80 });
    a.sendHook = null;
    await a.c.syncPendingWorkouts();
    assert.deepEqual(a.server.get('users/A'), { name: 'new', weightKg: 80 });
  });

  test(`${mode}: acknowledgement cannot remove a newer payload with the same ID`, async () => {
    const a = harness({ fallback });
    await a.login('A');
    await a.c.savePendingWorkouts('A', [a.workout('same')]);
    const gate = deferred();
    a.sendHook = () => gate.promise;
    a.c.navigator.onLine = true;
    const syncing = a.c.syncPendingWorkouts();
    await until(() => a.requests.length === 1);
    await a.c.savePendingWorkouts('A', [a.workout('same', 'A', 'updated')]);
    gate.resolve();
    await syncing;
    assert.equal(a.c.pendingWorkoutsMemory[0].data.name, 'updated');
    a.sendHook = null;
    await a.c.syncPendingWorkouts();
    assert.equal(a.server.get('workouts/same').name, 'updated');
  });

  test(`${mode}: concurrent enqueues and stale snapshots do not delete newer entries`, async () => {
    const a = harness({ fallback });
    await a.login('A');
    await Promise.all([a.addWorkout('w1'), a.addWorkout('w2'), a.addOperation('op1'), a.addOperation('op2')]);
    await a.c.savePendingWorkouts('A', [a.workout('w1')]);
    await a.c.savePendingOperations('A', []);
    assert.deepEqual(a.ids('pendingWorkouts').sort(), ['w1', 'w2']);
    assert.deepEqual(a.ids('pendingOperations').sort(), ['op1', 'op2']);
    await assert.rejects(a.c.savePendingWorkouts('A', [a.workout('wrong', 'B')]));
    await assert.rejects(a.c.savePendingOperations('A', [{ id: 'wrong', userId: 'B' }]));
  });

  test(`${mode}: real document edit/delete calls join the next batch while online`, async () => {
    const a = harness({ fallback });
    await a.login('A');
    await a.addOperation('old', 'foodEntries/meal', { calories: 100 });
    const gate = deferred();
    a.sendHook = () => gate.promise;
    a.c.navigator.onLine = true;
    const syncing = a.c.syncPendingWorkouts();
    await until(() => a.requests.length === 1);
    assert.equal((await a.c.writeUserDocument('foodEntries/meal', { calories: 200 })).queued, true);
    assert.equal((await a.c.deleteUserDocument('foodEntries/other')).queued, true);
    assert.equal(a.requests.length, 1, 'New writes must not overtake the in-flight operation');
    gate.resolve();
    await syncing;
    assert.equal(a.c.pendingOperationsMemory.length, 2);
    a.sendHook = null;
    await a.c.syncPendingWorkouts();
    assert.equal(a.server.get('foodEntries/meal').calories, 200);
    assert.equal(a.requests.at(-1).kind, 'delete');
  });
}

test('A local commit finishing after switching to B remains durable only for A', async () => {
  const a = harness();
  await a.login('A');
  const gate = deferred();
  let entered = false;
  a.database.beforeCommit = name => {
    if (name === 'pendingWorkouts' && !entered) { entered = true; return gate.promise; }
  };
  const adding = a.addWorkout('A-late');
  await until(() => entered);
  const loginB = a.login('B');
  gate.resolve();
  await Promise.all([adding, loginB]);
  assert.deepEqual(a.ids('pendingWorkouts'), []);
  assert.deepEqual(clone(a.c.cachedHistory), []);
  assert.equal(a.database.rows('pendingWorkouts')[0].userId, 'A');
  await a.login('A');
  assert.deepEqual(a.ids('pendingWorkouts'), ['A-late']);
});

test('Invalid legacy records are preserved in storage but never reassigned to current UID', async () => {
  const a = harness();
  const foreign = a.workout('foreign', 'B');
  a.storage.set('gym_pending_workouts_v1_A', JSON.stringify([foreign]));
  await a.login('A');
  assert.deepEqual(a.ids('pendingWorkouts'), []);
  assert.deepEqual(JSON.parse(a.storage.get('gym_pending_workouts_v1_A')), [foreign]);
  assert.deepEqual(a.database.rows('pendingWorkouts'), []);
});

test('Malformed fallback fails without overwriting stored bytes', async () => {
  const a = harness({ fallback: true });
  a.storage.set('gym_pending_workouts_v1_A', '{broken');
  await assert.rejects(a.c.savePendingWorkouts('A', [a.workout('new', 'A')]));
  assert.equal(a.storage.get('gym_pending_workouts_v1_A'), '{broken');
});

test('IndexedDB migration commits before clearing legacy arrays; aborted commit retains fallback', async () => {
  const a = harness();
  a.storage.set('gym_pending_workouts_v1_A', JSON.stringify([a.workout('legacy', 'A')]));
  a.storage.set('gym_pending_operations_v1_A', JSON.stringify([{ id: 'legacy-op', kind: 'set', path: 'users/A', data: { name: 'A' } }]));
  a.database.failCommit = true;
  await a.login('A');
  assert.ok(a.storage.has('gym_pending_workouts_v1_A'));
  assert.ok(a.storage.has('gym_pending_operations_v1_A'));
  assert.deepEqual(a.ids('pendingOperations'), ['legacy-op']);
  a.database.failCommit = false;
  await a.c.loadPendingWorkouts('A');
  await a.c.loadPendingOperations('A');
  assert.equal(a.storage.has('gym_pending_workouts_v1_A'), false);
  assert.equal(a.storage.has('gym_pending_operations_v1_A'), false);
  assert.deepEqual(a.database.rows('pendingWorkouts').map(row => row.id), ['legacy']);
  assert.deepEqual(a.database.rows('pendingOperations').map(row => row.id), ['legacy-op']);
});

test('Fallback acknowledgements cannot resurrect old IDB records after database recovery', async () => {
  const a = harness();
  await a.login('A');
  await a.addWorkout('w1');
  await a.addOperation('op1');
  a.database.failCommit = true;
  a.c.navigator.onLine = true;
  await a.c.syncPendingWorkouts();
  assert.deepEqual(a.ids('pendingWorkouts'), []);
  assert.deepEqual(a.ids('pendingOperations'), []);
  assert.equal(a.database.rows('pendingWorkouts').length, 1, 'Old IDB row still exists after abort');
  a.database.failCommit = false;
  await a.c.loadPendingWorkouts('A');
  await a.c.loadPendingOperations('A');
  assert.deepEqual(a.database.rows('pendingWorkouts'), []);
  assert.deepEqual(a.database.rows('pendingOperations'), []);
  await a.c.syncPendingWorkouts();
  assert.equal(a.requests.length, 2, 'Acknowledged records must not be sent again');
});

test('UID collision never overwrites or removes another owner in shared stores', async () => {
  const a = harness();
  const b = a.workout('collision', 'B');
  a.database.seed('pendingWorkouts', [b]);
  const bop = { id: 'op-collision', userId: 'B', kind: 'set', path: 'users/B', data: { name: 'B' } };
  a.database.seed('pendingOperations', [bop]);
  await a.login('A');
  await assert.rejects(a.c.savePendingWorkouts('A', [a.workout('collision', 'A')]));
  await assert.rejects(a.addOperation('op-collision', 'users/A'));
  await a.c.savePendingWorkouts('A', [], { acknowledged: [b] });
  assert.deepEqual(a.database.rows('pendingWorkouts'), [b]);
  assert.deepEqual(a.database.rows('pendingOperations'), [bop]);
});

test('Delayed queue load cannot repopulate memory after logout', async () => {
  const a = harness();
  const gate = deferred();
  let entered = false;
  a.database.seed('pendingWorkouts', [a.workout('A1', 'A')]);
  a.database.beforeCommit = () => { entered = true; return gate.promise; };
  const login = a.login('A');
  await until(() => entered);
  await a.login(null);
  gate.resolve();
  await login;
  assert.deepEqual(a.ids('pendingWorkouts'), []);
  assert.equal(a.c.pendingWorkoutsLoaded, false);
  assert.equal(a.database.rows('pendingWorkouts')[0].userId, 'A');
});

test('Delayed history refresh cannot cache A history under B after sync', async () => {
  const a = harness();
  await a.login('A');
  const gate = deferred();
  let started = false;
  a.c.getDocs = () => { started = true; return gate.promise; };
  const loading = a.c.loadCloudData();
  await until(() => started);
  a.c.getDocs = async () => ({ forEach() {} });
  await a.login('B');
  let writes = 0;
  a.c.writeHistoryCache = () => { writes++; };
  gate.resolve({ forEach: visit => visit({ id: 'A1', data: () => ({ userId: 'A', date: '2026-10-05', exercises: [{}] }) }) });
  await loading;
  assert.equal(writes, 0);
  assert.deepEqual(clone(a.c.cachedHistory), []);
});

test('A slow post-sync history read does not block the next owner or queue batch', async () => {
  const a = harness();
  await a.login('A');
  await a.addWorkout('A1');
  const gate = deferred();
  let reading = false;
  a.c.getDocs = () => { reading = true; return gate.promise; };
  a.c.navigator.onLine = true;
  const syncing = a.c.syncPendingWorkouts();
  await until(() => reading);
  assert.equal(a.c.pendingSyncInProgress, false);
  a.c.getDocs = async () => ({ forEach() {} });
  await a.login('B');
  await a.addWorkout('B1');
  await a.c.syncPendingWorkouts();
  assert.ok(a.server.has('workouts/B1'));
  gate.resolve({ forEach() {} });
  await syncing;
  assert.deepEqual(a.ids('pendingWorkouts'), []);
});

test('Operation network timeout stops the batch and keeps delete/set operations for retry', async () => {
  const a = harness();
  await a.login('A');
  await a.c.queueOfflineOperation({ id: 'delete', userId: 'A', path: 'foodEntries/deleted', kind: 'delete' });
  await a.addOperation('next');
  const gate = deferred();
  a.sendHook = () => gate.promise;
  a.c.navigator.onLine = true;
  const syncing = a.c.syncPendingWorkouts();
  await until(() => a.requests.length === 1);
  [...a.timers.values()].find(timer => timer.delay === 6000).callback();
  await syncing;
  assert.deepEqual(a.ids('pendingOperations'), ['delete', 'next']);
  assert.equal(a.requests.length, 1);
  gate.resolve();
  a.sendHook = null;
  await a.c.syncPendingWorkouts();
  assert.deepEqual(a.ids('pendingOperations'), []);
});

let passed = 0;
for (const { name, run } of tests) {
  await run();
  passed++;
  console.log(`PASS ${passed}: ${name}`);
}
console.log(`PASS: ${passed}/${tests.length} offline queue regressions; no real Firebase/storage access.`);
