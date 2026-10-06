import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Run the actual application handlers with in-memory browser/Firebase doubles.
// No real account, localStorage, IndexedDB or network is accessed.
const source = fs.readFileSync(new URL('../javascript.js', import.meta.url), 'utf8');
function section(start, end) {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, `Missing application section: ${start}`);
  return source.slice(first, last);
}
const handlers = [
  section('  function getWorkoutDraftKey(', '  window.removeExerciseBlock ='),
  section('  window.cancelWorkout =', '  function createWorkoutId('),
  section('  window.finishWorkout =', 'function getHistoryCacheKey('),
  section('  async function queueWorkoutForSync(', '  function hasPendingWorkoutsForCurrentUser('),
  section('  function isPendingQueueSession(', '  // All writes are deltas.'),
  section('  async function clearLocalUserData(', '  window.deleteAccount ='),
  section('  let authObserved = false;', '  window.handleLogout =')
].join('\n');

class Element {
  constructor() { this.style = { setProperty(key, value) { this[key] = value; } }; this.children = []; this.attributes = {}; this.value = ''; this.textContent = ''; this.className = ''; }
  set innerHTML(value) { this.html = value; this.children = []; this.setsContainer = value.includes('class="sets-container"') ? new Element() : null; }
  get innerHTML() { return this.html || ''; }
  get classList() { return { contains: name => this.className.split(' ').includes(name) }; }
  setAttribute(key, value) { this.attributes[key] = value; }
  getAttribute(key) { return this.attributes[key] ?? null; }
  appendChild(child) { this.children.push(child); }
  querySelector(selector) {
    if (selector === '.sets-container') return this.setsContainer;
    const className = selector.startsWith('.') ? selector.slice(1) : '';
    const input = className && this.innerHTML.match(new RegExp(`<input[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*value="([^"]*)"`));
    return input ? { value: input[1] } : null;
  }
  querySelectorAll(selector) {
    if (selector === '.set-row' && this.setsContainer) return [new Element(), ...this.setsContainer.children];
    return [];
  }
}
function cardio(name = 'A private exercise') {
  const block = new Element();
  block.className = 'exercise-block custom-cardio-block';
  for (const [key, value] of Object.entries({ name, 'is-cardio': 'true', 'measurement-type': 'cardio', minutes: '12', calories: '80' })) block.setAttribute(`data-${key}`, value);
  block.testNote = 'A private note';
  block.querySelector = selector => selector === '.ex-note' ? { value: block.testNote } : null;
  return block;
}
function strength() {
  const block = new Element();
  block.className = 'exercise-block';
  block.setAttribute('data-name', 'Squat');
  block.setAttribute('data-measurement-type', 'weight_reps');
  block.testWeight = '42.5';
  block.testReps = '8';
  block.testNote = 'A strength note';
  block.querySelector = () => ({ value: block.testNote });
  block.querySelectorAll = () => [new Element(), { querySelector: selector => ({ value: selector === '.set-kg' ? block.testWeight : block.testReps }) }];
  return block;
}
function harness(storage = new Map(), sessionDrafts = new Map()) {
  let failPersistentWrites = false;
  const nodes = new Map(['active-exercises-container', 'active-workout-title', 'workout-progress', 'active-draft-alert', 'custom-ex-modal', 'custom-existing-select', 'user-email-display'].map(id => [id, new Element()]));
  const modalInput = { value: '' };
  nodes.get('custom-ex-modal').querySelectorAll = () => [modalInput];
  const editButton = new Element();
  const addButton = new Element();
  const context = {
    console: { error() {}, warn() {} }, currentUser: null, currentWorkout: null, finishingWorkoutSessions: new Set(),
    activeWorkoutEditMode: false, customExType: 'existing', auth: { currentUser: null }, db: {}, isLocalDevelopment: false,
    currentProfileData: null, userRoutines: [], cachedHistory: [], routinesUnsubscribe: null,
    pendingWorkoutsMemory: [], pendingOperationsMemory: [], defaultWorkouts: [], navigator: { onLine: true },
    pendingQueueSession: 0, setTimeout, clearTimeout, clearPendingWorkoutSyncRetry() {},
    resetHistoryCoverage() { context.cachedHistory = []; },
    restoreMealPlanDraft() {}, clearMealPlanDraft() {},
    getWorkoutTime: workout => new Date(workout.date || '').getTime() || 0,
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => {
        if (failPersistentWrites) throw new Error('Persistent storage temporarily unavailable');
        storage.set(key, value);
      }, removeItem: key => storage.delete(key),
      get length() { return storage.size; }, key: index => [...storage.keys()][index]
    },
    sessionStorage: {
      getItem: key => sessionDrafts.get(key) ?? null,
      setItem: (key, value) => sessionDrafts.set(key, value), removeItem: key => sessionDrafts.delete(key)
    },
    document: {
      getElementById: id => nodes.get(id) ?? null, createElement: () => new Element(),
      querySelectorAll: selector => selector === '.exercise-block' ? nodes.get('active-exercises-container').children : [],
      querySelector: selector => selector.includes('toggle-custom-modal') ? addButton : editButton
    },
    normalizeRoutineExercise: exercise => exercise,
    getRoutineDisplayName: name => name, getGeneratedExerciseDisplayName: exercise => exercise.name || exercise,
    escapeHtml: value => String(value ?? ''), getMaxWeightFromHistory: () => 0, getLatestExerciseLog: () => null,
    latestExerciseNote: () => '', libraryExerciseId: () => '',
    calculateTargetGoal: () => '', formatRestTime: () => '', updateProgress() {}, checkPR() {},
    translateUiText: text => text, renderActiveWorkoutUI() {},
    switchTab: tab => { context.lastTab = tab; }, ShowToast: text => { context.lastToast = text; },
    dismissFirstVisitPrompt() {}, renderMealPlan() {}, renderSavedMealPlans() {},
    showLegalAcceptanceIfRequired() {}, hasCurrentLegalAcceptance: () => false,
    getDoc: async () => ({ exists: () => true, data: () => ({ fullName: 'Test' }) }),
    readProfileCache: () => null, writeProfileCache() {}, hasAcceptedCurrentLegalVersion: () => true,
    writeLegalAcceptanceCache() {}, clearLegalAcceptanceCache() {}, showGenderProfileGateIfRequired() {},
    loadPendingWorkouts: async () => {}, loadPendingOperations: async () => {}, syncPendingWorkouts: async () => {},
    loadCloudData: async () => { context.checkDraftState(); }, listenToUserRoutines() {},
    ensureInAppHistory() {}, showFirstVisitPromptIfNeeded() {}, hideAuthBootScreen() {},
    onAuthStateChanged: () => { context.authChanged = user => context.processAuthState(user); },
    showConfirm: async () => true, createWorkoutId: () => 'completed-id',
    doc: (...args) => args, setDocWithNetworkTimeout: async () => {}, vibrate() {},
    isOfflineError: error => error.code === 'unavailable',
    savePendingWorkouts: async () => {}, writeHistoryCache() {}, schedulePendingWorkoutSync() {},
    openPendingWorkoutsDb: async () => { throw new Error('No real IndexedDB in this test'); }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(handlers, context);
  return {
    context, nodes, storage, sessionDrafts, modalInput,
    failPersistentWrites: value => { failPersistentWrites = value; },
    async login(uid) {
      const user = uid ? { uid, email: `${uid}@example.test` } : null;
      context.auth.currentUser = user;
      await context.authChanged(user);
    },
    start(name) {
      context.userRoutines = [{ id: 'routine', name, exercises: [] }];
      context.startWorkout('routine');
      nodes.get('active-exercises-container').children = [cardio(), strength()];
      context.saveWorkoutDraft();
    }
  };
}
const A = 'test-A', B = 'test-B';
const lifecycleCode = section('  function setupEventHandlers() {', "    document.addEventListener('change', event => {") + '  }';
const lifecycleHandlers = new Map();
let lifecycleCheckpoints = 0;
const lifecycle = {
  window: { addEventListener: (name, handler) => lifecycleHandlers.set(name, handler) },
  document: { visibilityState: 'visible', addEventListener: (name, handler) => lifecycleHandlers.set(name, handler) },
  checkpointActiveWorkout: () => { lifecycleCheckpoints++; }
};
vm.createContext(lifecycle);
vm.runInContext(lifecycleCode, lifecycle);
lifecycle.setupEventHandlers();
lifecycleHandlers.get('pagehide')();
lifecycleHandlers.get('visibilitychange')();
assert.equal(lifecycleCheckpoints, 1);
lifecycle.document.visibilityState = 'hidden';
lifecycleHandlers.get('visibilitychange')();
assert.equal(lifecycleCheckpoints, 2);
const refreshCheck = harness();
await refreshCheck.login(A);
refreshCheck.start('Refresh recovery');
const refreshKey = refreshCheck.context.getWorkoutDraftKey(A);
const initialPersistentDraft = refreshCheck.storage.get(refreshKey);
refreshCheck.nodes.get('active-exercises-container').children[0].testNote = 'Note entered just before refresh';
const editedSet = refreshCheck.nodes.get('active-exercises-container').children[1];
editedSet.testWeight = '55';
editedSet.testReps = '6';
editedSet.testNote = 'Set note entered just before refresh';
refreshCheck.context.navigator.onLine = false;
refreshCheck.failPersistentWrites(true);
refreshCheck.context.checkpointActiveWorkout();
assert.equal(refreshCheck.storage.get(refreshKey), initialPersistentDraft);
assert.equal(JSON.parse(refreshCheck.sessionDrafts.get(refreshKey)).exercises[1].sets[0].weight, '55');
const afterRefresh = harness(refreshCheck.storage, refreshCheck.sessionDrafts);
await afterRefresh.login(A);
assert.equal(afterRefresh.nodes.get('active-draft-alert').style.display, 'block');
assert.equal(afterRefresh.context.readWorkoutDraft().exercises[0].notes, 'Note entered just before refresh');
assert.equal(afterRefresh.context.readWorkoutDraft().exercises[1].sets[0].reps, '6');
assert.equal(afterRefresh.context.readWorkoutDraft().exercises[1].notes, 'Set note entered just before refresh');
afterRefresh.context.resumeDraftWorkout();
assert.equal(afterRefresh.context.currentWorkout.userId, A);
assert.equal(afterRefresh.context.lastTab, 'active-workout');
assert.equal(afterRefresh.nodes.get('active-exercises-container').children.length, 2);
assert.match(afterRefresh.nodes.get('active-exercises-container').children[1].setsContainer.children[0].innerHTML, /value="55"/);
assert.match(afterRefresh.nodes.get('active-exercises-container').children[1].innerHTML, /Set note entered just before refresh/);
await afterRefresh.login(B);
assert.equal(afterRefresh.context.readWorkoutDraft(), null);
assert.equal(afterRefresh.nodes.get('active-draft-alert').style.display, 'none');
await afterRefresh.login(A);
assert.equal(afterRefresh.nodes.get('active-draft-alert').style.display, 'block');
assert.equal(afterRefresh.context.readWorkoutDraft().exercises[1].sets[0].weight, '55');
afterRefresh.context.clearWorkoutDraft();
assert.equal(refreshCheck.storage.has(refreshKey), false);
assert.equal(refreshCheck.sessionDrafts.has(refreshKey), false);

const app = harness();
const { context: c, nodes, storage } = app;
await app.login(A);
app.start('Plan A');
const keyA = c.getWorkoutDraftKey(A), keyB = c.getWorkoutDraftKey(B);
const rawA = storage.get(keyA);
const draftA = JSON.parse(rawA);
assert.equal(draftA.userId, A);
assert.equal(draftA.exercises[0].notes, 'A private note');
assert.deepEqual(draftA.exercises[1].sets, [{ weight: '42.5', reps: '8' }]);
assert.equal(storage.has('active_workout_draft'), false);

// The real auth callback must erase rendered inputs and memory immediately.
app.modalInput.value = 'A unsaved custom note';
nodes.get('custom-existing-select').innerHTML = 'A exercise history';
c.activeWorkoutEditMode = true;
await app.login(null);
assert.equal(c.currentWorkout, null);
assert.equal(c.activeWorkoutEditMode, false);
assert.equal(nodes.get('active-exercises-container').children.length, 0);
assert.equal(nodes.get('active-workout-title').textContent, '');
assert.equal(nodes.get('custom-existing-select').innerHTML, '');
assert.equal(app.modalInput.value, '');
assert.equal(storage.get(keyA), rawA);
assert.equal(c.readWorkoutDraft(), null);
await app.login(B);
assert.equal(nodes.get('active-draft-alert').style.display, 'none');
c.resumeDraftWorkout();
assert.equal(c.currentWorkout, null);
app.start('Plan B');
const rawB = storage.get(keyB);
assert.equal(storage.get(keyA), rawA);

// Direct A/B switches and page reloads must preserve separate owner drafts.
await app.login(A);
assert.equal(c.currentWorkout, null);
assert.equal(nodes.get('active-draft-alert').style.display, 'block');
assert.equal(c.readWorkoutDraft().name, 'Plan A');
const reload = harness(storage, app.sessionDrafts);
await reload.login(A);
assert.equal(reload.context.readWorkoutDraft().exercises[1].sets[0].weight, '42.5');
// Use the real cardio resume renderer to verify ownership on currentWorkout.
storage.set(keyA, JSON.stringify({ ...draftA, exercises: [draftA.exercises[0]] }));
reload.context.resumeDraftWorkout();
assert.equal(reload.context.currentWorkout.userId, A);
assert.equal(reload.context.lastTab, 'active-workout');
assert.equal(reload.nodes.get('active-exercises-container').children.length, 1);
assert.match(reload.nodes.get('active-exercises-container').children[0].innerHTML, /A private note/);
await reload.context.cancelWorkout();
assert.equal(storage.has(keyA), false);
assert.equal(app.sessionDrafts.has(keyA), false);
assert.equal(storage.get(keyB), rawB);

// Reject mismatched payloads, malformed JSON and legacy unowned drafts.
await app.login(B);
for (const bad of [rawA, '{broken', 'null', JSON.stringify({ ...draftA, userId: B, exercises: [null] })]) {
  storage.set(keyB, bad);
  app.sessionDrafts.set(keyB, bad);
  c.checkDraftState();
  c.resumeDraftWorkout();
  assert.equal(c.currentWorkout, null);
  assert.equal(nodes.get('active-draft-alert').style.display, 'none');
}
storage.delete(keyB);
app.sessionDrafts.delete(keyB);
storage.set('active_workout_draft', JSON.stringify({ name: 'Unknown owner', date: '2026-10-05', exercises: [] }));
const legacy = storage.get('active_workout_draft');
for (const uid of [A, B]) {
  await app.login(uid);
  assert.equal(c.readWorkoutDraft(), null);
  c.resumeDraftWorkout();
  c.clearWorkoutDraft();
  assert.equal(c.currentWorkout, null);
  assert.equal(storage.get('active_workout_draft'), legacy);
}

// Firebase identity can change before its async auth callback reaches the UI.
await app.login(A);
app.start('Plan A');
const before = storage.get(keyA);
c.auth.currentUser = { uid: B };
c.saveWorkoutDraft();
c.resumeDraftWorkout();
await c.finishWorkout();
c.clearWorkoutDraft();
assert.equal(storage.get(keyA), before);
assert.equal(storage.has(keyB), false);
c.currentUser = { uid: B };
c.saveWorkoutDraft();
assert.equal(storage.has(keyB), false, 'Stale A in-memory workout must not be written as B');

// A pending completion/confirmation must never touch the new account session.
for (const failure of [false, true]) {
  await app.login(A);
  app.start('Plan A');
  let complete;
  c.setDocWithNetworkTimeout = () => new Promise((resolve, reject) => { complete = () => failure ? reject({ code: 'unavailable' }) : resolve(); });
  const finishing = c.finishWorkout();
  await app.login(B);
  app.start('Plan B');
  const sessionB = c.currentWorkout;
  const beforeB = storage.get(keyB);
  complete();
  await finishing;
  assert.equal(c.currentWorkout, sessionB);
  assert.equal(storage.get(keyB), beforeB);
  assert.equal(c.pendingWorkoutsMemory.length, 0, 'Do not enqueue A under B after an old failure');
}
let confirm;
c.showConfirm = () => new Promise(resolve => { confirm = resolve; });
const cancelling = c.cancelWorkout();
await app.login(A);
app.start('Plan A');
confirm(true);
await cancelling;
assert.equal(c.currentWorkout.userId, A);
assert.ok(storage.has(keyA));

// Normal save keeps the existing finished-workout schema and clears only A.
const retainedB = storage.get(keyB);
let completedData;
c.setDocWithNetworkTimeout = async (reference, data) => { completedData = data; };
await c.finishWorkout();
assert.equal(c.currentWorkout, null);
assert.equal(storage.has(keyA), false);
assert.equal(storage.get(keyB), retainedB);
assert.deepEqual(Object.keys(completedData).sort(), ['date', 'durationSeconds', 'exercises', 'name', 'userEmail', 'userId']);
assert.equal(completedData.userId, A);
assert.equal(completedData.exercises[1].sets[0].weight, 42.5);

// An offline enqueue that was already started must not update B's history.
await app.login(A);
app.start('Plan A');
let saveQueue;
c.savePendingWorkouts = () => new Promise(resolve => { saveQueue = resolve; });
let historyWrites = 0;
c.writeHistoryCache = () => { historyWrites++; };
const queueing = c.queueWorkoutForSync('pending-A', { userId: A, name: 'Plan A' });
await app.login(B);
c.cachedHistory = [{ name: 'B history' }];
saveQueue();
await queueing;
assert.equal(historyWrites, 0);
assert.equal(c.cachedHistory[0].name, 'B history');

// Deleting one account's local data must preserve the other draft and legacy.
const preservedA = storage.get(keyA);
await app.login(B);
await c.clearLocalUserData(B);
assert.equal(storage.has(keyB), false);
assert.equal(storage.get(keyA), preservedA);
assert.equal(storage.get('active_workout_draft'), legacy);
await app.login(null);
c.startWorkout('routine');
c.saveWorkoutDraft();
assert.equal(c.currentWorkout, null);
assert.equal(storage.get(keyA), preservedA);
console.log('PASS: draft A/B isolation, auth cleanup, refresh/resume, legacy rejection, ownership guards and delayed completions.');
