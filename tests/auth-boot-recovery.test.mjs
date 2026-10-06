import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../javascript.js', import.meta.url), 'utf8');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, `Missing boot section: ${start}`);
  return source.slice(first, last);
}
const code = section('  function hideAuthBootScreen()', '  const defaultWorkouts = [')
  + section('  let authObserved = false;', '  window.handleLogout =');
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };

function harness({ online = true, cached = null, readProfile, loadQueue } = {}) {
  const nodes = new Map();
  const node = (id) => {
    if (!nodes.has(id)) {
      const classes = new Set();
      nodes.set(id, { style: { display: '' }, textContent: '', innerText: '', hidden: true,
        classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name), contains: (name) => classes.has(name) } });
    }
    return nodes.get(id);
  };
  const calls = { tabs: [], queueStarted: 0, cloudStarted: 0 };
  let observer;
  const c = {
    window: null, document: { getElementById: node }, navigator: { onLine: online }, isLocalDevelopment: false,
    localAppCheckNeedsSetup: false,
    console: { error() {}, warn() {} }, setTimeout, clearTimeout,
    auth: { currentUser: null, authStateReady: async () => {} }, db: {},
    pendingQueueSession: 0, currentUser: null, currentProfileData: null, profileWizardReturnTo: '',
    profileReadSucceeded: false, pendingWorkoutsMemory: [], pendingOperationsMemory: [],
    pendingWorkoutsLoaded: false, pendingOperationsLoaded: false,
    bodyMeasurements: [], cachedHistory: [], progressFoodEntries: [], progressFoodUserId: '',
    progressFoodComplete: false, progressFoodTruncated: false, progressFoodLastFetch: 0,
    progressFoodFetch: null, activeMealPlan: null, activeMealPlanOptions: null,
    savedMealPlans: [], savedMealPlansLoaded: false, pendingMealPlanDeleteId: null,
    navigationGuardReady: false, userRoutines: [], routinesUnsubscribe: null,
    GymLeaderLoadingCopy: { en: { error: 'Loading failed. Try again.', offlineNoCache: 'Offline data unavailable.' } },
    getCurrentLanguage: () => 'en',
    onAuthStateChanged: (_, callback) => { observer = callback; },
    getDoc: readProfile || (async () => ({ exists: () => true, data: () => ({ fullName: 'Test', accepted: true }) })),
    doc: () => ({}), readProfileCache: () => cached,
    writeProfileCache() {}, hasAcceptedCurrentLegalVersion: () => true,
    writeLegalAcceptanceCache() {}, clearLegalAcceptanceCache() {},
    dismissFirstVisitPrompt() {}, resetActiveWorkoutState() {}, resetHistoryCoverage() {},
    clearPendingWorkoutSyncRetry() {}, restoreMealPlanDraft() {},
    showLegalAcceptanceIfRequired() {}, hasCurrentLegalAcceptance: () => true,
    showGenderProfileGateIfRequired() {}, renderMealPlan() {}, renderSavedMealPlans() {},
    listenToUserRoutines() {}, ensureInAppHistory() {}, showFirstVisitPromptIfNeeded() {},
    switchTab: (tab) => calls.tabs.push(tab),
    loadPendingWorkouts: async () => { calls.queueStarted++; if (loadQueue) await loadQueue(); },
    loadPendingOperations: async () => {}, syncPendingWorkouts: async () => {},
    loadCloudData: async () => { calls.cloudStarted++; }
  };
  c.window = c;
  vm.createContext(c);
  vm.runInContext(code, c);
  const emit = async (user = { uid: 'A', email: 'test@example.invalid' }) => {
    c.auth.currentUser = user;
    observer(user);
    await tick();
  };
  return { c, node, calls, emit };
}

// A stuck optional queue read cannot hold the loading screen open.
{
  const queue = deferred();
  const h = harness({ loadQueue: () => queue.promise });
  await h.emit();
  assert.equal(h.node('auth-boot-screen').classList.contains('is-hidden'), true);
  assert.equal(h.calls.queueStarted, 1);
  queue.resolve();
}

// 1. Normal first boot exposes the app and starts background loads.
{
  const h = harness();
  await h.emit();
  assert.equal(h.node('auth-boot-screen').classList.contains('is-hidden'), true);
  assert.deepEqual(h.calls.tabs, ['dashboard']);
  assert.equal(h.calls.queueStarted, 1);
  assert.equal(h.calls.cloudStarted, 1);
}

// 2. A stale, slow profile read cannot overwrite the later auth event.
{
  const slow = deferred();
  let reads = 0;
  const h = harness({ readProfile: () => ++reads === 1 ? slow.promise : Promise.resolve({ exists: () => true, data: () => ({ fullName: 'Current' }) }) });
  await h.emit();
  await h.emit();
  slow.resolve({ exists: () => true, data: () => ({ fullName: 'Stale' }) });
  await tick();
  assert.equal(h.node('auth-boot-screen').classList.contains('is-hidden'), true);
  assert.equal(h.node('user-email-display').innerText, 'Current');
  assert.deepEqual(h.calls.tabs, ['dashboard']);
}

// 3. A failed profile read shows a retry state; a later read recovers in place.
{
  let reads = 0;
  const h = harness({ readProfile: () => ++reads === 1 ? Promise.reject(new Error('network'))
    : Promise.resolve({ exists: () => true, data: () => ({ fullName: 'Recovered' }) }) });
  await h.emit();
  assert.equal(h.node('auth-boot-screen').classList.contains('is-error'), true);
  assert.equal(h.node('auth-boot-retry').hidden, false);
  await h.c.retryGymLeaderBoot();
  assert.equal(h.node('auth-boot-screen').classList.contains('is-hidden'), true);
  assert.equal(h.node('user-email-display').innerText, 'Recovered');
}

// 4. Offline boot uses a profile cached for the same UID, without a network call.
{
  const h = harness({ online: false, cached: { fullName: 'Offline Test' }, readProfile: () => { throw new Error('network must not run'); } });
  await h.emit();
  assert.equal(h.node('auth-boot-screen').classList.contains('is-hidden'), true);
  assert.equal(h.node('user-email-display').innerText, 'Offline Test');
}

// 5. If Firebase Auth is slow before it emits its first state, signed-out users
// can still reach the form instead of being trapped on a loading error.
{
  const h = harness();
  h.c.clearTimeout(vm.runInContext('authBootTimer', h.c));
  vm.runInContext('revealSignedOutAuthAfterBootTimeout()', h.c);
  assert.equal(h.node('auth-boot-screen').classList.contains('is-hidden'), true);
  assert.deepEqual(h.calls.tabs, ['login']);
}

// Local App Check rejection must identify the setup problem before a profile
// read can turn it into a misleading "check your connection" error.
{
  const h = harness();
  h.c.isLocalDevelopment = true;
  h.c.appCheck = {};
  h.c.getToken = async () => { throw { code: 'appCheck/fetch-status-error', customData: { httpStatus: 403 } }; };
  await h.emit(null);
  assert.equal(h.node('auth-boot-screen').classList.contains('is-error'), true);
  assert.match(h.node('auth-boot-text').textContent, /App Check debug token/);
  assert.deepEqual(h.calls.tabs, []);
}

console.log('PASS: first boot, duplicate auth, retry, offline boot, delayed Auth and local App Check diagnostics');
