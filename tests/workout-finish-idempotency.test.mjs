import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Actual application handlers; all storage, clocks and Firebase writes are doubles.
const source = fs.readFileSync(new URL('../javascript.js', import.meta.url), 'utf8');
function section(start, end) {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, `Missing section: ${start}`);
  return source.slice(first, last);
}
const handlers = [
  section('  function getWorkoutDraftKey(', '  window.removeExerciseBlock ='),
  section('  function createWorkoutId(', '  function getPendingWorkoutKey('),
  section('  function setDocWithNetworkTimeout(', '  function hasPendingWorkoutsForCurrentUser('),
  section('  function isPendingQueueSession(', '  // All writes are deltas.'),
  section('  window.finishWorkout =', 'function getHistoryCacheKey(')
].join('\n');
const clone = value => JSON.parse(JSON.stringify(value));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function until(check) {
  for (let i = 0; i < 50; i++) {
    if (check()) return;
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.fail('Expected asynchronous checkpoint was not reached');
}
class Element {
  constructor() { this.style = {}; this.children = []; this.attributes = {}; this.value = ''; this.className = ''; }
  set innerHTML(value) { this.html = value; this.children = []; }
  get innerHTML() { return this.html || ''; }
  get classList() { return { contains: name => this.className.split(' ').includes(name) }; }
  setAttribute(key, value) { this.attributes[key] = value; }
  getAttribute(key) { return this.attributes[key] ?? null; }
  appendChild(child) { this.children.push(child); }
  querySelector() { return null; }
  querySelectorAll() { return []; }
}
function exercise() {
  const block = new Element();
  block.className = 'exercise-block custom-cardio-block';
  for (const [key, value] of Object.entries({ name: 'Run', 'is-cardio': 'true', 'measurement-type': 'cardio', minutes: '12', calories: '80' })) block.setAttribute(`data-${key}`, value);
  return block;
}
function harness(storage = new Map(), cloud = new Map(), queue = new Map()) {
  let serial = 0;
  const nodes = new Map(['active-exercises-container', 'active-workout-title', 'workout-progress', 'active-draft-alert'].map(id => [id, new Element()]));
  const button = new Element();
  const timers = new Map();
  const calls = [];
  const a = { storage, cloud, queue, nodes, button, timers, calls, sendHook: null, queueHook: null };
  const c = {
    console: { error() {}, warn() {} }, currentUser: { uid: 'A', email: 'A@example.test' },
    auth: { currentUser: { uid: 'A' } }, currentWorkout: null, finishingWorkoutSessions: new Set(),
    pendingQueueSession: 0, activeWorkoutEditMode: false, customExType: 'existing', db: {},
    userRoutines: [{ id: 'routine', name: 'Run plan', exercises: [] }], defaultWorkouts: [],
    cachedHistory: [], pendingWorkoutsMemory: [], navigator: { onLine: true },
    crypto: { randomUUID: () => `session-${++serial}` },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key)
    },
    document: {
      getElementById: id => nodes.get(id) ?? null,
      querySelector: () => null, createElement: () => new Element(),
      querySelectorAll: selector => selector === '.exercise-block' ? nodes.get('active-exercises-container').children
        : selector === '[data-action="finish-workout"]' ? [button] : []
    },
    setTimeout: (callback, delay) => { const id = ++serial; timers.set(id, { callback, delay }); return id; },
    clearTimeout: id => timers.delete(id),
    normalizeRoutineExercise: value => value,
    getRoutineDisplayName: value => value, getGeneratedExerciseDisplayName: value => value,
    escapeHtml: value => String(value ?? ''), getMaxWeightFromHistory: () => 0,
    calculateTargetGoal: () => '', formatRestTime: () => '',
    translateUiText: value => value, updateProgress() {}, checkPR() {}, vibrate() {},
    renderActiveWorkoutUI: () => { nodes.get('active-exercises-container').children = [exercise()]; },
    switchTab: tab => { a.tab = tab; }, ShowToast: message => { a.toast = message; },
    loadCloudData: async () => {}, renderDashboard() {}, writeHistoryCache() {}, schedulePendingWorkoutSync() {},
    doc: (_, ...parts) => parts.join('/'),
    isOfflineError: error => error.code === 'unavailable'
  };
  c.setDoc = async (path, data) => {
    calls.push({ path, data: clone(data) });
    if (a.sendHook) await a.sendHook(path, clone(data));
    cloud.set(path, clone(data));
  };
  c.savePendingWorkouts = async (uid, rows) => {
    if (a.queueHook) await a.queueHook(uid, rows);
    rows.forEach(row => queue.set(row.id, clone(row)));
    if (c.currentUser?.uid === uid) c.pendingWorkoutsMemory = [...queue.values()].filter(row => row.userId === uid);
  };
  c.window = c;
  vm.createContext(c);
  vm.runInContext(handlers, c);
  a.c = c;
  a.start = () => c.startWorkout('routine');
  a.draft = () => JSON.parse(storage.get(c.getWorkoutDraftKey('A')));
  return a;
}

const tests = [];
function test(name, run) { tests.push({ name, run }); }

test('A session ID is created at start, persisted in draft and reused after refresh', async () => {
  const a = harness();
  a.start();
  const id = a.c.currentWorkout.sessionId;
  assert.equal(a.c.currentWorkout.id, 'routine', 'Routine ID retains its original meaning');
  assert.equal(a.draft().sessionId, id);
  const reload = harness(a.storage, a.cloud);
  reload.c.resumeDraftWorkout();
  assert.equal(reload.c.currentWorkout.sessionId, id);
  await reload.c.finishWorkout();
  assert.equal(reload.calls[0].path, `workouts/${id}`);
  assert.deepEqual(Object.keys(reload.calls[0].data).sort(), ['date', 'durationSeconds', 'exercises', 'name', 'userEmail', 'userId']);
});

test('Double click and repeated calls during slow saving send exactly one document', async () => {
  const a = harness();
  a.start();
  const gate = deferred();
  a.sendHook = () => gate.promise;
  const saving = a.c.finishWorkout();
  assert.equal(a.button.disabled, true);
  assert.equal(a.button.getAttribute('aria-busy'), 'true');
  await Promise.all([a.c.finishWorkout(), a.c.finishWorkout()]);
  assert.equal(a.calls.length, 1);
  gate.resolve();
  await saving;
  await a.c.finishWorkout();
  assert.equal(a.cloud.size, 1);
  assert.equal(a.c.currentWorkout, null);
  assert.equal(a.storage.has(a.c.getWorkoutDraftKey('A')), false);
  assert.equal(a.button.getAttribute('aria-busy'), 'false');
  assert.equal(a.tab, 'dashboard');
});

test('Failed network write can be retried with the same ID, end time and duration', async () => {
  const a = harness();
  a.start();
  a.sendHook = () => { throw Object.assign(new Error('permission denied'), { code: 'permission-denied' }); };
  await a.c.finishWorkout();
  assert.equal(a.button.disabled, false);
  assert.equal(a.c.finishingWorkoutSessions.size, 0);
  const first = a.calls[0];
  assert.equal(a.draft().sessionId, a.c.currentWorkout.sessionId);
  a.sendHook = null;
  await a.c.finishWorkout();
  assert.equal(a.calls[1].path, first.path);
  assert.deepEqual(a.calls[1].data, first.data);
  assert.equal(a.cloud.size, 1);
});

test('Lost acknowledgement and failed offline save retry after reload without another document', async () => {
  const a = harness();
  a.start();
  a.sendHook = (path, data) => {
    a.cloud.set(path, data);
    throw Object.assign(new Error('network failure'), { code: 'unavailable' });
  };
  a.queueHook = () => { throw new Error('storage full'); };
  await a.c.finishWorkout();
  assert.equal(a.button.disabled, false);
  assert.ok(a.c.currentWorkout);
  assert.equal(a.cloud.size, 1);
  const reload = harness(a.storage, a.cloud);
  reload.c.resumeDraftWorkout();
  await reload.c.finishWorkout();
  assert.equal(a.cloud.size, 1);
  assert.equal(reload.calls[0].path, a.calls[0].path);
  assert.deepEqual(reload.calls[0].data, a.calls[0].data);
});

test('Real timeout followed by offline queue and late network success share one ID', async () => {
  const a = harness();
  a.start();
  const gate = deferred();
  a.sendHook = () => gate.promise;
  const saving = a.c.finishWorkout();
  [...a.timers.values()].find(timer => timer.delay === 6000).callback();
  await saving;
  assert.equal(a.queue.size, 1);
  const item = [...a.queue.values()][0];
  assert.equal(`workouts/${item.id}`, a.calls[0].path);
  // Simulate the existing queue's setDoc at this preserved ID.
  a.cloud.set(`workouts/${item.id}`, clone(item.data));
  gate.resolve();
  await until(() => a.cloud.size === 1);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(a.cloud.size, 1);
  assert.deepEqual(a.cloud.get(a.calls[0].path), item.data);
});

test('Offline double click while local storage is slow produces one queue record', async () => {
  const a = harness();
  a.start();
  a.c.navigator.onLine = false;
  const gate = deferred();
  let queued = 0;
  a.queueHook = () => { queued++; return gate.promise; };
  const saving = a.c.finishWorkout();
  await until(() => queued === 1);
  await a.c.finishWorkout();
  assert.equal(queued, 1);
  assert.equal(a.button.disabled, true);
  gate.resolve();
  await saving;
  assert.equal(a.calls.length, 0);
  assert.equal(a.queue.size, 1);
  assert.equal(a.c.currentWorkout, null);
  assert.equal(a.tab, 'dashboard');
});

test('Offline storage failure unlocks the button and retry retains the session', async () => {
  const a = harness();
  a.start();
  const id = a.c.currentWorkout.sessionId;
  a.c.navigator.onLine = false;
  a.queueHook = () => { throw new Error('quota exceeded'); };
  await a.c.finishWorkout();
  assert.equal(a.button.disabled, false);
  assert.equal(a.draft().sessionId, id);
  a.queueHook = null;
  await a.c.finishWorkout();
  assert.deepEqual([...a.queue.keys()], [id]);
});

test('Failure to persist the ID prevents sending and allows a safe retry', async () => {
  const a = harness();
  a.start();
  const id = a.c.currentWorkout.sessionId;
  const save = a.c.localStorage.setItem;
  a.c.localStorage.setItem = () => { throw new Error('storage unavailable'); };
  await a.c.finishWorkout();
  assert.equal(a.calls.length, 0);
  assert.equal(a.button.disabled, false);
  a.c.localStorage.setItem = save;
  await a.c.finishWorkout();
  assert.equal(a.calls[0].path, `workouts/${id}`);
});

test('Successful save followed by cleanup failure retries cleanup without sending again', async () => {
  const a = harness();
  a.start();
  const remove = a.c.localStorage.removeItem;
  a.c.localStorage.removeItem = () => { throw new Error('storage unavailable'); };
  await a.c.finishWorkout();
  assert.equal(a.calls.length, 1);
  assert.equal(a.button.disabled, false);
  a.c.localStorage.removeItem = remove;
  await a.c.finishWorkout();
  assert.equal(a.calls.length, 1);
  assert.equal(a.c.currentWorkout, null);
});

test('Repeatedly resuming the same draft cannot bypass the in-flight lock', async () => {
  const a = harness();
  a.start();
  const gate = deferred();
  a.sendHook = () => gate.promise;
  const saving = a.c.finishWorkout();
  a.c.resumeDraftWorkout();
  await a.c.finishWorkout();
  assert.equal(a.calls.length, 1);
  assert.equal(a.button.disabled, true);
  gate.resolve();
  await saving;
  assert.equal(a.button.disabled, false);
  a.sendHook = null;
  await a.c.finishWorkout();
  assert.equal(a.cloud.size, 1);
  assert.equal(a.calls[1].path, a.calls[0].path);
});

test('Another workout on the same routine gets a different session ID', async () => {
  const a = harness();
  a.start();
  await a.c.finishWorkout();
  a.start();
  await a.c.finishWorkout();
  assert.notEqual(a.calls[0].path, a.calls[1].path);
  assert.equal(a.cloud.size, 2);
});

test('Older owned draft receives a session ID before sending; empty workout does not lock', async () => {
  const a = harness();
  a.storage.set(a.c.getWorkoutDraftKey('A'), JSON.stringify({ userId: 'A', id: 'routine', name: 'Older draft', date: new Date().toISOString(), exercises: [] }));
  a.c.resumeDraftWorkout();
  assert.ok(a.draft().sessionId);
  await a.c.finishWorkout();
  assert.equal(a.calls.length, 0);
  assert.equal(a.button.disabled, false);
  a.nodes.get('active-exercises-container').children = [exercise()];
  await a.c.finishWorkout();
  assert.equal(a.cloud.size, 1);
});

test('Slow history refresh does not disable or navigate away from a new session', async () => {
  const a = harness();
  a.start();
  const gate = deferred();
  let loading = false;
  a.c.loadCloudData = () => { loading = true; return gate.promise; };
  const saving = a.c.finishWorkout();
  await until(() => loading);
  a.start();
  const id = a.c.currentWorkout.sessionId;
  assert.equal(a.button.disabled, false);
  gate.resolve();
  await saving;
  assert.equal(a.c.currentWorkout.sessionId, id);
  assert.equal(a.tab, 'active-workout');
});

for (const [index, { name, run }] of tests.entries()) {
  await run();
  console.log(`PASS ${index + 1}: ${name}`);
}
console.log(`PASS: ${tests.length}/${tests.length} finish-workout regressions; no real Firebase or browser storage used.`);
