import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { buildMealPlan, validStoredMealPlan } from '../meal-planner.js';

const source = fs.readFileSync(new URL('../javascript.js', import.meta.url), 'utf8');
const start = source.indexOf('  function getMealPlanDraftKey(');
const end = source.indexOf('  function mealPlanOptionsFromForm()', start);
assert.ok(start >= 0 && end > start, 'Meal Planner draft helpers must exist');
const helpers = source.slice(start, end);
const DRAFT_PREFIX = 'gymleader-meal-plan-draft-v1:';

function planFor(userId) {
  const options = {
    goal: 'maintain', startDate: '2026-10-05', people: 1, dayCount: 3, mealCount: 3,
    budget: 1000, currency: 'EUR', diet: 'none', highProtein: false, simpleOnly: false,
    maxMinutes: 60, allergies: '', disliked: ''
  };
  return { ...buildMealPlan(options), ...options, userId, createdAt: '2026-10-05T12:00:00.000Z' };
}

function storage() {
  const values = new Map();
  return {
    values,
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
}

function harness(userId, localStorage = storage()) {
  const c = {
    MEAL_PLAN_DRAFT_PREFIX: DRAFT_PREFIX,
    currentUser: userId ? { uid: userId } : null,
    activeMealPlan: null,
    activeMealPlanOptions: null,
    activeMealPlanDayIndex: 0,
    localStorage,
    validStoredMealPlan,
    renderMealPlan() { c.rendered = true; },
    console: { warn() {} }
  };
  vm.createContext(c);
  vm.runInContext(helpers, c);
  return c;
}

let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; }

const local = storage();
const accountA = harness('account-A', local);
accountA.activeMealPlan = planFor('account-A');
accountA.activeMealPlanDayIndex = 2;
check(accountA.persistMealPlanDraft(), 'An unsaved proposal is stored');
const draftKeyA = `${DRAFT_PREFIX}account-A`;
const rawDraft = JSON.parse(local.getItem(draftKeyA));
check(rawDraft.userId === 'account-A' && rawDraft.plan.userId === 'account-A', 'Draft owner is stored twice for validation');
check(rawDraft.dayIndex === 2 && validStoredMealPlan(rawDraft.plan), 'Plan shape and selected day survive storage');

const restoredA = harness('account-A', local);
check(restoredA.restoreMealPlanDraft('account-A'), 'The same account restores its proposal');
check(restoredA.activeMealPlan?.userId === 'account-A' && restoredA.activeMealPlanDayIndex === 2, 'Restored proposal belongs to A and keeps its day');
check(restoredA.rendered === true, 'Restoring renders the proposal');

const accountB = harness('account-B', local);
check(!accountB.restoreMealPlanDraft('account-B'), 'A proposal is never restored for another account');
check(accountB.activeMealPlan === null && local.values.has(draftKeyA), 'B does not receive or delete A proposal');

const savedPlan = planFor('account-A');
savedPlan.id = 'firestore-plan-id';
accountA.activeMealPlan = savedPlan;
check(!accountA.persistMealPlanDraft(), 'A saved plan is not also kept as an unsaved draft');
check(!local.values.has(draftKeyA), 'Saving/removing a proposal clears its local draft');

local.setItem(draftKeyA, JSON.stringify({ userId: 'account-A', plan: planFor('account-B'), dayIndex: 0 }));
const mismatchedOwner = harness('account-A', local);
check(!mismatchedOwner.restoreMealPlanDraft('account-A'), 'Mismatched owner draft is rejected');
check(!local.values.has(draftKeyA), 'Mismatched owner draft is removed only from its own key');

local.setItem(draftKeyA, '{not-json');
const malformed = harness('account-A', local);
check(!malformed.restoreMealPlanDraft('account-A'), 'Malformed draft is rejected');
check(!local.values.has(draftKeyA), 'Malformed draft is removed');

console.log(`PASS: ${checks} Meal Planner draft persistence and account-isolation checks.`);
