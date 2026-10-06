import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildUsageReport, collectUsageReport, createAdminUsageHandler, isConfiguredOwner } from '../api/admin-usage-core.js';

const users = [
  { uid: 'owner', email: 'owner@example.test', metadata: { creationTime: '2026-01-01', lastSignInTime: '2026-02-01' } },
  { uid: 'active', email: 'active@example.test', metadata: { creationTime: '2026-01-02' } },
  { uid: 'empty', email: 'empty@example.test', metadata: { creationTime: '2026-01-03' } }
];

test('unique users and percentages use all current Auth accounts as denominator', () => {
  const report = buildUsageReport(users, ['owner', 'owner', 'active', 'deleted'], ['active', 'active'], new Map([
    ['owner', true], ['active', false], ['empty', false]
  ]));
  assert.equal(report.totals.accounts, 3);
  assert.equal(report.totals.routineUsers, 2);
  assert.equal(report.totals.routinePercent, 66.7);
  assert.equal(report.totals.workoutUsers, 1);
  assert.equal(report.totals.workoutPercent, 33.3);
  assert.equal(report.totals.savedMealPlanUsers, 1);
  assert.equal(report.totals.noRecordedRoutineOrWorkout, 1);
  assert.equal(report.accounts.find((account) => account.uid === 'empty').noRecordedRoutineOrWorkout, true);
  assert.equal(report.totals.shoppingListUsers, null);
  assert.equal(report.totals.returnUsers, null);
});

test('missing or unavailable saved plans remain unknown, never falsely unused', () => {
  const report = buildUsageReport(users, ['owner'], [], new Map([['owner', true], ['active', false]]));
  assert.equal(report.accounts.find((account) => account.uid === 'empty').savedMealPlan, null);
  assert.equal(report.totals.unknownMealPlanUsers, 1);
  assert.equal(report.totals.savedMealPlanUsers, null);
  assert.equal(report.totals.savedMealPlanPercent, null);
});

test('percentages are unavailable when there are no registered accounts', () => {
  const report = buildUsageReport([], ['deleted'], ['deleted'], new Map());
  assert.equal(report.totals.accounts, 0);
  assert.equal(report.totals.routinePercent, null);
  assert.equal(report.totals.workoutPercent, null);
});

test('owner check fails closed without a configured UID', () => {
  assert.equal(isConfiguredOwner({ uid: 'owner' }, undefined), false);
  assert.equal(isConfiguredOwner({ uid: 'owner' }, 'owner'), true);
  assert.equal(isConfiguredOwner({ uid: 'other' }, 'owner'), false);
});

function mockResponse() {
  return {
    headers: {}, statusCode: 200, body: undefined,
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; }
  };
}

function mockDb({ failMealFor = null } = {}) {
  return {
    collection(name) {
      if (name === 'routines' || name === 'workouts') {
        const owners = name === 'routines' ? ['owner', 'owner', 'active'] : ['active', 'active'];
        return { select(field) {
          assert.equal(field, 'userId');
          return { async get() { return { docs: owners.map((uid) => ({ get: () => uid })) }; } };
        } };
      }
      assert.equal(name, 'users');
      return { doc(uid) {
        return { collection(subcollection) {
          assert.equal(subcollection, 'mealPlans');
          return { limit(n) {
            assert.equal(n, 1);
            return { async get() {
              if (uid === failMealFor) throw new Error('temporary Firestore error');
              return { empty: uid !== 'owner' };
            } };
          } };
        } };
      } };
    }
  };
}

function mockAuth(tokenUid = 'owner') {
  return {
    async verifyIdToken(token, checkRevoked) {
      assert.equal(token, 'valid-token');
      assert.equal(checkRevoked, true);
      return { uid: tokenUid };
    },
    async listUsers(pageSize, pageToken) {
      assert.equal(pageSize, 1000);
      return pageToken ? { users: users.slice(2) } : { users: users.slice(0, 2), pageToken: 'next' };
    }
  };
}

test('pagination and saved plan read produce the current report without writes', async () => {
  const report = await collectUsageReport(mockAuth(), mockDb());
  assert.equal(report.totals.accounts, 3);
  assert.equal(report.totals.routineUsers, 2);
  assert.equal(report.totals.workoutUsers, 1);
  assert.equal(report.totals.savedMealPlanUsers, 1);
});

test('a failed Meal Planner read does not turn into a negative usage claim', async () => {
  const report = await collectUsageReport(mockAuth(), mockDb({ failMealFor: 'active' }));
  assert.equal(report.accounts.find((account) => account.uid === 'active').savedMealPlan, null);
  assert.equal(report.totals.savedMealPlanUsers, null);
});

test('only verified owner can call report; ordinary and unconfigured accounts cannot', async () => {
  let reads = 0;
  const makeHandler = (tokenUid, ownerUid) => createAdminUsageHandler({
    getAuth: () => ({
      ...mockAuth(tokenUid),
      async listUsers(...args) { reads++; return mockAuth(tokenUid).listUsers(...args); }
    }),
    getDb: () => mockDb(),
    verifyAppCheck: async () => true,
    ownerUid,
    allowedOrigins: ['https://gymleader.app']
  });
  const req = { method: 'GET', headers: { origin: 'https://gymleader.app', authorization: 'Bearer valid-token' } };
  const ordinary = mockResponse();
  await makeHandler('active', 'owner')(req, ordinary);
  assert.equal(ordinary.statusCode, 403);
  assert.equal(reads, 0);
  const unconfigured = mockResponse();
  await makeHandler('owner', '')(req, unconfigured);
  assert.equal(unconfigured.statusCode, 503);
  assert.equal(reads, 0);
  const owner = mockResponse();
  await makeHandler('owner', 'owner')(req, owner);
  assert.equal(owner.statusCode, 200);
  assert.equal(owner.body.totals.accounts, 3);
  assert.equal(owner.headers['Cache-Control'], 'private, no-store, max-age=0');
});

test('missing token, unapproved origin and failed App Check are denied before reads', async () => {
  let reads = 0;
  const handler = createAdminUsageHandler({
    getAuth: () => { reads++; return mockAuth(); },
    getDb: () => mockDb(),
    verifyAppCheck: async () => false,
    ownerUid: 'owner',
    allowedOrigins: ['https://gymleader.app']
  });
  for (const req of [
    { method: 'GET', headers: { origin: 'https://evil.test', authorization: 'Bearer valid-token' } },
    { method: 'GET', headers: { origin: 'https://gymleader.app' } },
    { method: 'GET', headers: { origin: 'https://gymleader.app', authorization: 'Bearer valid-token' } }
  ]) {
    const res = mockResponse();
    await handler(req, res);
    assert.ok(res.statusCode === 401 || res.statusCode === 403);
  }
  assert.equal(reads, 0);
});

test('invalid ID token cannot read data even when App Check succeeds', async () => {
  let databaseOpened = false;
  const handler = createAdminUsageHandler({
    getAuth: () => ({ async verifyIdToken() { throw new Error('invalid token'); } }),
    getDb: () => { databaseOpened = true; return mockDb(); },
    verifyAppCheck: async () => true,
    ownerUid: 'owner',
    allowedOrigins: ['https://gymleader.app']
  });
  const res = mockResponse();
  await handler({ method: 'GET', headers: { origin: 'https://gymleader.app', authorization: 'Bearer invalid-token' } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(databaseOpened, false);
});

test('private page is not linked from normal app and service worker does not cache it', () => {
  const appHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const serviceWorker = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.doesNotMatch(appHtml, /admin\.html/);
  assert.match(serviceWorker, /url\.pathname === '\/admin\.html'/);
});
