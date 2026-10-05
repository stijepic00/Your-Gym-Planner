import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MEAL_DIETS, buildMealPlan } from '../meal-planner.js';

// Start a local Firestore emulator with this project's firestore.rules.
// PowerShell: $env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8189'; node tests/meal-plan-firestore.test.mjs
// Loopback-only host and fixed demo project prevent production access.
const host = process.env.FIRESTORE_EMULATOR_HOST;
assert.match(host || '', /^(127\.0\.0\.1|localhost):\d+$/, 'Set FIRESTORE_EMULATOR_HOST to a local emulator');
const projectId = 'demo-gymleader-meal-plans';
const base = `http://${host}/v1/projects/${projectId}/databases/(default)/documents`;
const runId = randomUUID();
let checks = 0;
function token(uid, verified = true) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    iss: `https://securetoken.google.com/${projectId}`, aud: projectId,
    sub: uid, user_id: uid, email: `${uid}@example.test`, email_verified: verified,
    iat: now, exp: now + 3600, auth_time: now, firebase: { sign_in_provider: 'password', identities: {} }
  })}.`;
}
function value(input) {
  if (input === null) return { nullValue: 'NULL_VALUE' };
  if (typeof input === 'string') return { stringValue: input };
  if (typeof input === 'boolean') return { booleanValue: input };
  if (typeof input === 'number') return Number.isInteger(input) ? { integerValue: String(input) } : { doubleValue: input };
  if (Array.isArray(input)) return { arrayValue: { values: input.map(value) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(input).map(([key, entry]) => [key, value(entry)])) } };
}
function documentFor(diet = 'none') {
  const options = { diet, goal: 'maintain', startDate: '2026-10-05', people: 1, dayCount: 3, mealCount: 3,
    budget: 1000, currency: 'EUR', highProtein: false, simpleOnly: false, maxMinutes: 60, allergies: '', disliked: '' };
  return { ...buildMealPlan(options), ...options, userId: 'test-A', createdAt: '2026-10-05T12:00:00.000Z' };
}
async function request(path, { method = 'GET', data, uid = 'test-A', verified = true } = {}) {
  const response = await fetch(`${base}/${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(uid ? { Authorization: `Bearer ${token(uid, verified)}` } : {}) },
    ...(data ? { body: JSON.stringify(value(data).mapValue) } : {}), signal: AbortSignal.timeout(15000)
  });
  return { status: response.status, body: await response.json() };
}
async function create(data, expected, { owner = 'test-A', uid = 'test-A', verified = true, collection = 'mealPlans' } = {}) {
  const id = `${runId}-${checks}`;
  const result = await request(`users/${owner}/${collection}?documentId=${id}`, { method: 'POST', data, uid, verified });
  assert.equal(result.status, expected, JSON.stringify(result.body));
  checks++;
  return id;
}
for (const diet of MEAL_DIETS) {
  const data = documentFor(diet);
  const id = await create(data, 200);
  const read = await request(`users/test-A/mealPlans/${id}`);
  assert.equal(read.status, 200);
  assert.equal(read.body.fields.diet.stringValue, diet);
  checks++;
  assert.equal((await request(`users/test-A/mealPlans/${id}`, { uid: 'test-B' })).status, 403);
  checks++;
  assert.equal((await request(`users/test-A/mealPlans/${id}`, { method: 'PATCH', data })).status, 403, 'Update restriction must remain');
  checks++;
}
for (const changes of [
  { diet: 'xx' }, { diet: 'balanced' }, { diet: '' }, { diet: null },
  { budget: 0.5 }, { budget: 1000001 }, { estimatedCostEur: 100001 },
  { allergies: 'x'.repeat(1001) }, { disliked: 'x'.repeat(1001) },
  { highProtein: 'true' }, { simpleOnly: 1 }, { catalogVersion: 2 },
  { createdAt: '' }, { createdAt: 'x'.repeat(41) }, { userId: 'test-B' },
  { extraField: true }, { id: 'local-only' }, { people: 0 }, { people: 11 },
  { dayCount: 8 }, { dayCount: 1.5 }, { mealCount: 6 }, { maxMinutes: 181 }, { currency: 'USD' }
]) await create({ ...documentFor(), ...changes }, 403);
for (const field of Object.keys(documentFor())) {
  const data = documentFor();
  delete data[field];
  await create(data, 403);
}
await create(documentFor(), 403, { uid: 'test-B' });
await create(documentFor(), 403, { owner: 'test-B' });
await create(documentFor(), 403, { uid: null });
await create(documentFor(), 403, { verified: false });
await create(documentFor(), 403, { collection: 'unapprovedCollection' });
await create({ ...documentFor(), budget: 1, estimatedCostEur: 0 }, 200);
await create({ ...documentFor(), budget: 1000000, estimatedCostEur: 100000, allergies: 'x'.repeat(1000), disliked: 'x'.repeat(1000) }, 200);
console.log(`PASS: ${checks} real Firestore emulator checks; seven diets saved/read; invalid enums/fields, UID, anonymous/unverified users, updates and unapproved collections denied.`);
