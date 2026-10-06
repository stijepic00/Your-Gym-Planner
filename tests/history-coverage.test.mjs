import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { exerciseKey, maxExerciseWeight } from '../exercise-history.js';
import { TRANSLATIONS } from '../translations.js';

// Actual application pagination/cache/statistics, with a deterministic Firestore
// cursor double. No user data or production services are accessed.
const source = fs.readFileSync(new URL('../javascript.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, start);
  return source.slice(first, last);
}
const code = [
  section('function getHistoryCacheKey(', 'function renderPendingSyncStatus()'),
  section('  function getLocalWeekStart(', '  function getWeeklyGoalCopy('),
  section('  function getWorkoutTime(', '  function progressPeriodRange('),
  section('  function analyticsPeriodRange(', '  function progressDayKey('),
  section('  function getBodyMetricChange(', '  function renderBodyMeasurementsSummary('),
  section('  function renderProgressOverview()', '  function renderAnalyticsOverview()'),
  section('  window.checkPR =', '  function updateProgress('),
  section('  function getMaxWeightFromHistory(', '  function isDurationExercise(')
].join('\n');
const clone = value => JSON.parse(JSON.stringify(value));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { resolve, promise }; };
function workout(index, userId = 'A', date) {
  return { id: `workout-${String(index).padStart(4, '0')}`, userId,
    date: date || new Date(2026, 9, 5 - index, 12).toISOString(),
    name: 'Training', exercises: [{ name: 'Squat', sets: [{ weight: index + 1, reps: 10 }] }] };
}
function harness(rows = [], storage = new Map()) {
  const app = { rows, storage, calls: [], states: [], beforeRead: null };
  const c = {
    currentUser: { uid: 'A' }, pendingQueueSession: 1, cachedHistory: [], bodyMeasurements: [],
    exerciseKey, maxExerciseWeight,
    pendingWorkoutsMemory: [], pendingOperationsMemory: [],
    historyCoverage: { userId: '', complete: false, loading: false, fromCache: true, checkedAt: null },
    historyRequest: null, HISTORY_PAGE_SIZE: 30, HISTORY_CACHE_VERSION: 1,
    navigator: { onLine: true }, db: {}, setTimeout, clearTimeout,
    console: { error() {}, warn() {} },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, val) => storage.set(key, val) },
    isPendingQueueSession: (uid, session) => c.currentUser?.uid === uid && c.pendingQueueSession === session,
    collection: (_, name) => name, where: (...args) => ({ where: args }), orderBy: (...args) => ({ orderBy: args }),
    limit: size => ({ limit: size }), startAfter: doc => ({ after: doc.id }), query: (...args) => args,
    translateUiText: text => text, escapeHtml: text => String(text), getCurrentLocale: () => 'en-GB',
    formatDateClean: text => text.slice(0, 10)
  };
  c.window = c;
  c.getDocsFromServer = async constraints => {
    const uid = constraints.find(item => item.where)?.where[2];
    const after = constraints.find(item => item.after)?.after;
    const size = constraints.find(item => item.limit)?.limit;
    const rows = app.rows.filter(row => row.userId === uid)
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    const start = after ? rows.findIndex(row => row.id === after) + 1 : 0;
    const docs = rows.slice(start, start + size).map(row => ({ id: row.id, data: () => clone(row) }));
    app.calls.push({ uid, after, size });
    if (app.beforeRead) await app.beforeRead(app.calls.length);
    return { docs };
  };
  vm.createContext(c);
  vm.runInContext(code, c);
  c.renderHistoryConsumers = () => app.states.push({ count: c.cachedHistory.length, ...clone(c.historyCoverage) });
  app.c = c;
  app.login = uid => { c.resetHistoryCoverage(); c.currentUser = uid ? { uid } : null; c.pendingQueueSession++; };
  return app;
}
let passed = 0;
async function test(name, run) { await run(); passed++; console.log(`PASS: ${name}`); }

await test('History status and manual refresh are absent from Progress, history, charts and active workout render paths', () => {
  for (const phrase of ['Učitano treninga:', 'Posljednji potpuni dohvat:', 'Osvježi istoriju', 'reload-history']) {
    assert.ok(!html.includes(phrase));
    assert.ok(!source.includes(phrase), `${phrase} must not be rendered by JavaScript`);
  }
  assert.match(source, /for \(const id of \['progress', 'history', 'analytics', 'active-workout'\]\)/);
  const error = 'Historija trenutno nije dostupna. Pokušaj ponovo kasnije.';
  for (const language of ['sr', 'bs', 'hr', 'en', 'de', 'fr', 'it', 'es']) {
    assert.ok(language === 'sr' || TRANSLATIONS[language]?.[error], `Missing history error translation: ${language}`);
  }
});

for (const count of [0, 30, 31, 125]) {
  await test(`${count} workouts: complete cursor scan and full cache`, async () => {
    const a = harness(Array.from({ length: count }, (_, index) => workout(index)));
    await a.c.loadCloudData();
    assert.equal(a.c.cachedHistory.length, count);
    assert.equal(new Set(a.c.cachedHistory.map(row => row.id)).size, count);
    assert.equal(a.calls.length, Math.floor(count / 30) + 1);
    assert.equal(a.c.historyCoverage.complete, true);
    assert.equal(a.c.historyCoverage.loading, false);
    assert.equal(a.c.historyCoverage.fromCache, false);
    assert.equal(JSON.parse(a.storage.get('gym_history_cache_v1_A')).items.length, count);
    if (count >= 30) assert.ok(a.states.some(state => state.count === 30 && !state.complete && state.loading));
    const offline = harness([], a.storage);
    offline.c.navigator.onLine = false;
    await offline.c.loadCloudData();
    assert.equal(offline.c.cachedHistory.length, count);
    assert.equal(offline.c.historyCoverage.complete, true);
    assert.equal(offline.c.historyCoverage.fromCache, true);
    assert.equal(offline.calls.length, 0);
    assert.equal(offline.c.historyCoverageMarkup(), '');
  });
}

await test('Equal dates across page boundary use document snapshot cursor without duplicates', async () => {
  const a = harness(Array.from({ length: 95 }, (_, i) => workout(i, 'A', '2026-10-05')));
  await a.c.loadCloudData();
  assert.equal(a.c.cachedHistory.length, 95);
  assert.equal(new Set(a.c.cachedHistory.map(row => row.id)).size, 95);
  assert.ok(a.calls.slice(1).every(call => call.after));
  assert.equal(a.c.workoutsInRange(new Date(2026, 9, 1).getTime(), new Date(2026, 10, 1).getTime()).length, 95);
});

await test('Legacy 30-row cache is partial offline; foreign UID rows ignored', async () => {
  const storage = new Map([['gym_history_cache_v1_A', JSON.stringify([...Array.from({ length: 30 }, (_, i) => workout(i)), workout(99, 'B')])]]);
  const a = harness([], storage);
  a.c.navigator.onLine = false;
  await a.c.loadCloudData();
  assert.equal(a.c.cachedHistory.length, 30);
  assert.equal(a.c.historyCoverage.complete, false);
  assert.equal(a.c.historyCoverageMarkup(), '');
});

await test('Network failure on second page retains data and retry completes', async () => {
  const a = harness(Array.from({ length: 75 }, (_, i) => workout(i)));
  a.beforeRead = call => { if (call === 2) throw new Error('Network'); };
  await a.c.loadCloudData();
  assert.equal(a.c.cachedHistory.length, 30);
  assert.equal(a.c.historyCoverage.complete, false);
  assert.equal(a.c.historyCoverage.loading, false);
  assert.match(a.c.historyCoverageMarkup(), /Historija trenutno nije dostupna/);
  assert.doesNotMatch(a.c.historyCoverageMarkup(), /Učitano treninga|Posljednji potpuni dohvat|Osvježi istoriju|reload-history/);
  a.beforeRead = null;
  await a.c.loadCloudData();
  assert.equal(a.c.cachedHistory.length, 75);
  assert.equal(a.c.historyCoverage.complete, true);
  assert.equal(a.c.historyCoverageMarkup(), '');
});

await test('Going offline between pages preserves partial coverage', async () => {
  const a = harness(Array.from({ length: 31 }, (_, i) => workout(i)));
  a.beforeRead = () => { a.c.navigator.onLine = false; };
  await a.c.loadCloudData();
  assert.equal(a.calls.length, 1);
  assert.equal(a.c.cachedHistory.length, 30);
  assert.equal(a.c.historyCoverage.complete, false);
});

await test('A → B → A switch rejects stale response and cache writes', async () => {
  const a = harness([workout(1, 'A'), workout(2, 'B')]);
  const gate = deferred();
  a.beforeRead = call => call === 1 ? gate.promise : undefined;
  const first = a.c.loadCloudData();
  a.login('B');
  await a.c.loadCloudData();
  assert.ok(a.c.cachedHistory.every(row => row.userId === 'B'));
  a.login('A');
  a.rows = [workout(3, 'A')];
  await a.c.loadCloudData();
  const cache = a.storage.get('gym_history_cache_v1_A');
  gate.resolve();
  await first;
  assert.equal(a.c.cachedHistory[0].id, 'workout-0003');
  assert.equal(a.storage.get('gym_history_cache_v1_A'), cache);
});

await test('Refresh after mutation supersedes older in-flight history scan', async () => {
  const a = harness([workout(1)]), gate = deferred();
  a.beforeRead = call => call === 1 ? gate.promise : undefined;
  const first = a.c.loadCloudData();
  a.rows.push(workout(2));
  await a.c.loadCloudData();
  gate.resolve();
  await first;
  assert.equal(a.c.cachedHistory.length, 2);
});

await test('Pending workout/edit/delete survive pagination, with UID isolation and deduplication', async () => {
  const a = harness(Array.from({ length: 35 }, (_, i) => workout(i)));
  a.c.pendingWorkoutsMemory = [{ id: 'workout-0000', userId: 'A', data: workout(0) }, { id: 'foreign', userId: 'B', data: workout(50, 'B') }];
  a.c.pendingOperationsMemory = [
    { userId: 'A', kind: 'delete', path: 'workouts/workout-0001' },
    { userId: 'A', kind: 'set', path: 'workouts/workout-0002', data: { name: 'Offline edit' } },
    { userId: 'B', kind: 'delete', path: 'workouts/workout-0003' }
  ];
  await a.c.loadCloudData();
  assert.equal(a.c.cachedHistory.length, 34);
  assert.equal(a.c.cachedHistory.find(row => row._localId === 'workout-0000')._syncStatus, 'pending');
  assert.ok(!a.c.cachedHistory.some(row => row.id === 'workout-0001'));
  assert.equal(a.c.cachedHistory.find(row => row.id === 'workout-0002').name, 'Offline edit');
  assert.ok(a.c.cachedHistory.some(row => row.id === 'workout-0003'));
});

await test('Completed refresh removes remotely deleted cached records', async () => {
  const a = harness(Array.from({ length: 31 }, (_, i) => workout(i)));
  await a.c.loadCloudData();
  a.rows = [];
  await a.c.loadCloudData();
  assert.equal(a.c.cachedHistory.length, 0);
  assert.equal(a.c.historyCoverage.complete, true);
});

await test('Local calendar ranges, monthly totals and old personal records include all pages', async () => {
  const a = harness(Array.from({ length: 95 }, (_, i) => workout(i)));
  await a.c.loadCloudData();
  const now = new Date(2026, 9, 5, 8);
  const month = a.c.analyticsPeriodRange('month', now);
  assert.equal(new Date(month.start).getDate(), 1);
  assert.equal(a.c.workoutsInRange(month.start, month.end).length, 5);
  const three = a.c.analyticsPeriodRange('threeMonths', now);
  assert.equal(new Date(three.start).getMonth(), 7);
  const weekly = a.c.analyticsPeriodRange('week', now);
  assert.equal(a.c.workoutsInRange(weekly.start, weekly.end).length, 1);
  assert.equal(a.c.getPersonalRecords()[0].value, 95);
  assert.equal(a.c.summarizeWorkouts(a.c.cachedHistory).workouts, 95);
  assert.equal(a.c.summarizeWorkouts(a.c.cachedHistory).volume, 45600);
  // Date-only entries remain on the chosen local date, even before noon.
  a.c.cachedHistory = [workout(1, 'A', '2026-10-01'), workout(2, 'A', '2026-09-30'), workout(3, 'A', '2026-10-05')];
  assert.equal(a.c.workoutsInRange(month.start, month.end).length, 2);
});

await test('Streak spans more than 30 workouts and counts unique training days', async () => {
  const current = new Date(2026, 9, 5);
  const rows = [];
  for (let week = 1; week <= 40; week++) {
    const date = new Date(current); date.setDate(date.getDate() - 7 * week);
    rows.push(workout(week, 'A', date.toISOString()));
  }
  rows.push(workout(100, 'A', rows[0].date));
  const a = harness(rows);
  await a.c.loadCloudData();
  const counts = a.c.getWeeklyTrainingDayCounts();
  assert.equal(a.c.getWeeklyStreak(counts, 1, current, 0).weeks, 40);
  assert.equal(a.c.getWeeklyStreak(counts, 1, current, 0).reachedCacheLimit, false);
  assert.equal(a.c.getWeeklyStreak(counts, 2, current, 0), null);
  a.c.historyCoverage.complete = false;
  assert.equal(a.c.getWeeklyStreak(counts, 1, current, 0).reachedCacheLimit, true);
});

await test('Weight comparison: empty, single, equal and different measurements, including >30 rows', () => {
  const { c } = harness();
  const row = (weightKg, measuredAt) => ({ weightKg, measuredAt });
  assert.equal(c.getProgressWeightChange([]), null);
  assert.equal(c.getProgressWeightChange([row(80, '2026-10-01')]), null);
  assert.equal(c.getProgressWeightChange([row(80, '2026-10-01'), row(80, '2026-10-02')]), 0);
  assert.equal(c.getProgressWeightChange([row(79, '2026-10-02'), row(80, '2026-10-01')]), -1);
  const series = Array.from({ length: 31 }, (_, i) => row(90 - i, `2026-10-${String(i + 1).padStart(2, '0')}`));
  assert.equal(c.getProgressWeightChange(series), -30);
  c.bodyMeasurements = [row(80, '2026-10-01')];
  assert.equal(c.getBodyMetricChange('weightKg').delta, null);
  const root = { innerHTML: '' };
  Object.assign(c, {
    document: { getElementById: id => id === 'progress-overview' ? root : null },
    progressPeriodRange: () => ({ start: new Date(2026, 9, 1), end: new Date(2026, 9, 3), period: 'week' }),
    progressDays: () => [new Date(2026, 9, 1), new Date(2026, 9, 2)],
    progressDayKey: date => `2026-10-${String(date.getDate()).padStart(2, '0')}`,
    progressFoodUserId: '', cachedProgressFoodEntries: () => [],
    bodyTrackingEnabled: () => true, progressFoodTruncated: false, progressFoodComplete: true,
    formatLocalizedNumber: value => String(value), progressBars: () => '', progressWeightGraph: () => ''
  });
  for (const series of [[], [row(80, '2026-10-01')]]) {
    c.bodyMeasurements = series;
    c.renderProgressOverview();
    assert.match(root.innerHTML, /Potrebna su najmanje dva mjerenja/);
    assert.doesNotMatch(root.innerHTML, /Nema promjene za izabrani period/);
  }
  c.bodyMeasurements = [row(80, '2026-10-01'), row(80, '2026-10-02')];
  c.renderProgressOverview();
  assert.match(root.innerHTML, /Nema promjene za izabrani period/);
  assert.doesNotMatch(root.innerHTML, /Potrebna su najmanje dva mjerenja/);
  c.bodyMeasurements[1].weightKg = 79;
  c.renderProgressOverview();
  assert.match(root.innerHTML, /-1 kg/);
  assert.equal((root.innerHTML.match(/class="progress-panel /g) || []).length, 1);
  assert.match(root.innerHTML, /progress-activity-panel/);
  assert.doesNotMatch(root.innerHTML, /Napredak tjelesne težine|Pregled ishrane|Napredak u vježbama/);
});

await test('Active workout history hints refresh without overwriting entered sets or notes', () => {
  const { c } = harness();
  const previous = { innerHTML: '' }, badge = { textContent: '', hidden: true };
  const enteredSet = { value: '42' }, note = { value: 'My current note' };
  const block = {
    getAttribute: key => key === 'data-name' ? 'Squat' : null,
    querySelector: selector => ({ '.prev-perf': previous, '.target-badge': badge, '.set-kg': enteredSet, '.ex-note': note }[selector])
  };
  Object.assign(c, {
    document: { querySelectorAll: () => [block] }, normalizeRoutineExercise: value => value,
    getLatestExerciseLog: () => ({ sets: [{ weight: 75, reps: 5 }], notes: 'Old note' }),
    formatSetPerformance: set => `${set.weight} kg × ${set.reps}`, calculateTargetGoal: () => 'Next target'
  });
  c.refreshActiveWorkoutHistory();
  assert.match(previous.innerHTML, /75 kg × 5/);
  assert.match(previous.innerHTML, /Old note/);
  assert.equal(badge.textContent, 'Next target');
  assert.equal(enteredSet.value, '42');
  assert.equal(note.value, 'My current note');
});

await test('PR badge uses fresh complete history instead of stale rendered max weight', async () => {
  const a = harness([workout(99)]);
  const badge = { innerHTML: '' };
  const block = { getAttribute: key => key === 'data-name' ? 'Squat' : 'weight_reps', querySelector: () => badge };
  const input = { closest: () => block, value: '50' };
  a.c.checkPR(input);
  assert.equal(badge.innerHTML, '');
  await a.c.loadCloudData();
  a.c.checkPR(input);
  assert.equal(badge.innerHTML, '');
  input.value = '101';
  a.c.checkPR(input);
  assert.match(badge.innerHTML, /NOVI PR/);
  a.c.historyCoverage.loading = true;
  a.c.checkPR(input);
  assert.equal(badge.innerHTML, '');
});

console.log(`PASS: ${passed} history coverage, pagination, offline, statistics and measurement scenarios.`);
