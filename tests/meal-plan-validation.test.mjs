import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { MEAL_DIETS, MEAL_CATALOG_VERSION, validMealPlanOptions, validStoredMealPlan, buildMealPlan, eligibleMealRecipes, getMealRecipe, replaceMealInPlan } from '../meal-planner.js';

const source = fs.readFileSync(new URL('../javascript.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const rules = fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const expectedDiets = ['none', 'vegetarian', 'vegan', 'halal', 'orthodox_fast_water', 'orthodox_fast_oil', 'orthodox_fast_fish'];
const ruleDiets = [...rules.match(/data\.diet in \[([^\]]+)\]/)[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
const uiDiets = [...html.match(/<select id="meal-plan-diet"[^>]*>([\s\S]*?)<\/select>/)[1].matchAll(/value="([^"]+)"/g)].map(match => match[1]);
assert.deepEqual([...MEAL_DIETS], expectedDiets);
assert.deepEqual(ruleDiets, expectedDiets);
assert.deepEqual(uiDiets, expectedDiets);
assert.match(html, /meal-planner-basics-title/);
assert.match(html, /meal-planner-restrictions-title/);
assert.match(html, /meal-planner-advanced/);
assert.match(html, /meal-planner-method-note/);
assert.ok(source.includes('tačan kalorijski cilj se ne računa') || source.includes('no exact calorie target is calculated'), 'UI must not promise exact calorie optimization');

export function optionsFor(diet = 'none') {
  return { goal: 'maintain', startDate: '2026-10-05', people: 1, dayCount: 3, mealCount: 3,
    budget: 1000, currency: 'EUR', diet, highProtein: false, simpleOnly: false,
    maxMinutes: 60, allergies: '', disliked: '' };
}
function documentFor(diet = 'none') {
  const options = optionsFor(diet);
  return { ...buildMealPlan(options), ...options, userId: 'test-A', createdAt: '2026-10-05T12:00:00.000Z' };
}
function section(start, end) {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, start);
  return source.slice(first, last);
}
const handlers = [
  section('  function mealPlanOptionsFromForm()', '  const MEAL_PLAN_REQUIRED_FIELD_IDS'),
  section('  function isNoMealRestriction(', '  function mealPlannerNavigationCopy('),
  section('  function mealPlanRecipeAllowed(', '  function renderSavedMealPlans('),
  section('  window.generateMealPlan =', '  window.replaceMealPlanMeal ='),
  section('  window.saveMealPlan =', '  window.showSavedMealPlan =')
].join('\n');
function harness(diet, queued = false) {
  const options = { ...optionsFor(), diet };
  const nodes = new Map();
  const fieldKeys = { goal: 'goal', startDate: 'start', people: 'people', dayCount: 'days', mealCount: 'count',
    budget: 'budget', currency: 'currency', diet: 'diet', maxMinutes: 'minutes', allergies: 'allergies', disliked: 'disliked' };
  for (const [key, suffix] of Object.entries(fieldKeys)) nodes.set(`meal-plan-${suffix}`, { value: String(options[key]) });
  for (const id of ['meal-planner-form-status', 'meal-planner-save-status', 'meal-planner-modal', 'meal-planner-result']) nodes.set(id, { style: {}, textContent: '', scrollIntoView() {} });
  const button = { disabled: false };
  const writes = [];
  const c = {
    console: { error() {} }, currentUser: { uid: 'test-A' },
    currentProfileData: { foodAllergies: 'Nemam alergije ni ograničenja hrane.' },
    getEffectiveCurrentProfile: () => ({ foodAllergies: 'Nemam alergije ni ograničenja hrane.' }),
    activeMealPlan: null, activeMealPlanOptions: null, activeMealPlanDayIndex: 0,
    savedMealPlansLoaded: true, savedMealPlans: [], validMealPlanOptions, validStoredMealPlan,
    buildMealPlan, eligibleMealRecipes, getMealRecipe,
    getCanonicalTranslationSource: value => value,
    document: { getElementById: id => nodes.get(id), querySelector: () => button },
    validateMealPlanForm: () => true,
    mealPlannerCopy: () => ({ badForm: 'invalid form', tooLong: 'too long', unknown: value => `unknown: ${value}`,
      noRecipes: 'no recipes', lowBudget: () => 'budget', changesUnsafe: 'unsafe', saved: 'saved', saveFailed: 'failed' }),
    mealPlanCurrencyAmount: value => value,
    renderMealPlan() {}, renderSavedMealPlans() {}, loadSavedMealPlans: async () => {},
    persistMealPlanDraft() {}, clearMealPlanDraft() {},
    ShowToast: message => { c.lastToast = message; },
    createUserDocument: async (path, data) => {
      writes.push({ path, data: structuredClone(data) });
      return { id: `plan-${writes.length}`, queued };
    }
  };
  c.window = c;
  vm.createContext(c);
  vm.runInContext(handlers, c);
  c.generateMealPlan();
  return { c, writes, nodes, button };
}
let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; }

for (const diet of expectedDiets) {
  for (let dayCount = 1; dayCount <= 7; dayCount++) {
    for (let mealCount = 2; mealCount <= 5; mealCount++) {
      const options = { ...optionsFor(diet), dayCount, mealCount };
      const result = buildMealPlan(options);
      check(!result.error, `${diet}: generate ${dayCount} days / ${mealCount} meals`);
      check(validStoredMealPlan({ ...result, ...options, userId: 'test-A', createdAt: '2026-10-05' }), `${diet}: stored validation`);
    }
  }
  for (const queued of [false, true]) {
    const a = harness(diet, queued);
    check(validStoredMealPlan(a.c.activeMealPlan), `${diet}: actual generate handler`);
    await a.c.saveMealPlan();
    check(a.writes.length === 1, `${diet}: save handler ${queued ? 'offline' : 'online'}`);
    check(a.writes[0].path === 'users/test-A/mealPlans', 'Owner collection preserved');
    check(a.writes[0].data.userId === 'test-A' && a.writes[0].data.diet === diet, 'UID and selected diet preserved');
    check(!Object.hasOwn(a.writes[0].data, 'id') && validStoredMealPlan(a.writes[0].data), 'Valid document shape; local ID excluded');
    await a.c.saveMealPlan();
    check(a.writes.length === 1, 'Already saved plan is not submitted again');
  }
  const waterOrOil = diet === 'orthodox_fast_water' || diet === 'orthodox_fast_oil';
  if (diet.startsWith('orthodox_fast_')) {
    const meals = documentFor(diet).days.flatMap(day => day.meals).map(meal => getMealRecipe(meal.recipeId));
    check(meals.every(item => item.diet === 'vegan' || (!waterOrOil && item.diet === 'fish')), `${diet}: recipe diet respected`);
    if (diet === 'orthodox_fast_water') check(meals.every(item => !item.ingredients.some(ingredient => ingredient.foodId === 'olive-oil')), 'Water fast: no added oil');
  }
}

for (const advanced of [
  { highProtein: true, simpleOnly: true },
  { highProtein: false, simpleOnly: true },
  { highProtein: true, simpleOnly: false },
  { highProtein: false, simpleOnly: false }
]) {
  const options = { ...optionsFor('none'), ...advanced };
  const result = buildMealPlan(options);
  check(!result.error, `Advanced options generate a plan: ${JSON.stringify(advanced)}`);
  check(validStoredMealPlan({ ...result, ...options, userId: 'test-A', createdAt: '2026-10-05T12:00:00.000Z' }), 'Advanced options keep stored plan shape');
}

check(buildMealPlan({ ...optionsFor('none'), budget: 1 }).error === 'budget', 'Budget guard rejects an unrealistically low estimate');
const replacement = replaceMealInPlan(documentFor('none'), 0, 0, optionsFor('none'));
check(Boolean(replacement) && validStoredMealPlan({ ...replacement, userId: 'test-A', createdAt: '2026-10-05T12:00:00.000Z' }), 'Meal replacement keeps a valid plan shape');

for (const badDiet of ['xx', 'balanced', '', null, undefined]) {
  const options = { ...optionsFor(), diet: badDiet };
  check(!validMealPlanOptions(options), 'Unknown diet rejected by options');
  check(buildMealPlan(options).error === 'invalid-options', 'Unknown diet does not generate unrestricted recipes');
  check(eligibleMealRecipes(options).recipes.length === 0, 'Unknown diet has no eligible recipes');
  check(!validStoredMealPlan({ ...documentFor(), diet: badDiet }), 'Unknown diet rejected for storage');
  check(replaceMealInPlan(documentFor(), 0, 0, options) === null, 'Unknown diet cannot replace meals');
  const a = harness(badDiet);
  check(a.c.activeMealPlan === null, 'Form generation rejects unknown diet');
  a.c.activeMealPlan = { ...documentFor(), diet: badDiet };
  a.c.activeMealPlanOptions = optionsFor();
  await a.c.saveMealPlan();
  check(a.writes.length === 0, 'Unknown diet never reaches a write');
}

const invalidChanges = [
  { budget: 0.5 }, { budget: 1000001 }, { budget: Infinity }, { estimatedCostEur: 100001 },
  { estimatedCostEur: -1 }, { allergies: 'x'.repeat(1001) }, { disliked: 'x'.repeat(1001) },
  { highProtein: 'true' }, { simpleOnly: 0 }, { catalogVersion: MEAL_CATALOG_VERSION + 1 },
  { createdAt: '' }, { createdAt: 'x'.repeat(41) }, { userId: null }, { extraField: true },
  { currency: 'toString' }, { dayCount: 8 }, { dayCount: 1.5 }, { people: 0 }, { people: 11 },
  { mealCount: 6 }, { maxMinutes: 181 }, { days: [null] }, { startDate: 20261005 }
];
for (const changes of invalidChanges) {
  const data = { ...documentFor(), ...changes };
  check(!validStoredMealPlan(data), `Reject incompatible fields: ${JSON.stringify(changes)}`);
  const a = harness('none');
  a.c.activeMealPlan = data;
  await a.c.saveMealPlan();
  check(a.writes.length === 0, 'Invalid fields rejected before sending');
}
for (const field of Object.keys(documentFor())) {
  const data = documentFor();
  delete data[field];
  check(!validStoredMealPlan(data), `Required field: ${field}`);
}
check(validStoredMealPlan({ ...documentFor(), id: 'local-document-id' }), 'Loaded document may carry its local ID');
check(validStoredMealPlan({ ...documentFor(), budget: 1, estimatedCostEur: 0 }), 'Lower numeric limits accepted');
check(validStoredMealPlan({ ...documentFor(), budget: 1000000, estimatedCostEur: 100000, allergies: 'x'.repeat(1000), disliked: 'x'.repeat(1000) }), 'Upper schema limits accepted');

const wrongOwner = harness('none');
wrongOwner.c.activeMealPlan.userId = 'test-B';
await wrongOwner.c.saveMealPlan();
check(wrongOwner.writes.length === 0, 'A cannot submit B plan');
for (const diet of expectedDiets) {
  const a = harness(diet);
  const ingredient = getMealRecipe(a.c.activeMealPlan.days[0].meals[0].recipeId).ingredients[0].foodId;
  a.c.currentProfileData.foodAllergies = ingredient;
  await a.c.saveMealPlan();
  check(a.writes.length === 0, `${diet}: newly added profile restriction blocks unsafe save`);
}
const unknownAllergy = harness('none');
unknownAllergy.c.currentProfileData.foodAllergies = 'unknown-allergen-xyz';
await unknownAllergy.c.saveMealPlan();
check(unknownAllergy.writes.length === 0, 'Unknown mandatory restriction still blocks save');
const mismatchedOptions = harness('none');
mismatchedOptions.c.activeMealPlan.diet = 'orthodox_fast_water';
await mismatchedOptions.c.saveMealPlan();
check(mismatchedOptions.writes.length === 0, 'Save validates recipes against document diet, not stale UI options');

console.log(`PASS: ${checks} Meal Planner checks, all seven diets, generation/save handlers, invalid fields, restrictions and UID isolation.`);
console.log('PASS: UI/client/Firestore diet enum agreement (static check; real rule execution is a separate emulator test).');
