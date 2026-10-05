import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../javascript.js', import.meta.url), 'utf8');
function section(start, end) {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, `Missing source section: ${start}`);
  return source.slice(first, last);
}
const profileCode = section('  const BASIC_PROFILE_GOALS =', '  function getProfileCacheKey(');
const profileGateCode = section('  function showGenderProfileGateIfRequired()', '  function updateGenderSaveButton(');
const draftCode = section('  const PROFILE_WIZARD_DRAFT_PREFIX =', '  function ensureProfilePreferenceMarkup(');
const wizardCode = section('  function getProfileWizardMissingFields(', '  function renderProfileWizardControls(');
const saveCode = section('  window.saveRequiredProfile = async function()', '  window.saveProfileDetails =');
const reviewCode = section('  function renderProfileWizardReview()', '  function populateRequiredProfileForm()');
const generatorEntryCode = section('  window.openPlanGenerator = function()', '  window.generatePersonalizedPlans =');
const mealEntryCode = section('  window.openMealPlanner = function()', '  window.generateMealPlan =');
const readFormCode = section('  function readRequiredProfileForm()', '  window.saveRequiredProfile =');
assert.equal(source.match(/window\.openOnboardingModal = function\(\)/g)?.length, 1);
assert.ok(!source.includes('KORAK 1 OD 4'), 'The old four-screen welcome guide should be gone');
assert.ok(!source.includes('renderOnboardingStep'), 'No stale welcome-guide handler should remain');

function context(extra = {}) {
  const c = {
    window: null, currentUser: { uid: 'A', email: 'a@example.invalid' },
    currentProfileData: {}, profileRequiredEditMode: false, pendingNewUserOnboarding: false,
    profileWizardReturnTo: '',
    VALID_GENDER_VALUES: new Set(['male', 'female', 'unspecified']),
    document: { getElementById: () => null },
    ...extra
  };
  c.window = c;
  vm.createContext(c);
  vm.runInContext(profileCode + draftCode, c);
  return c;
}

// New account: three questions and review; old full profile still counts as complete.
{
  const steps = [];
  const modal = {
    querySelectorAll(selector) { return selector === '.profile-wizard-step' ? steps : []; }
  };
  const c = context({ document: { getElementById: () => modal } });
  c.renderProfileWizardControls = () => {};
  vm.runInContext(wizardCode, c);
  assert.equal(c.isProfileComplete({ fullName: 'Ana', goal: 'maintain', trainingFrequency: 3 }), true);
  assert.equal(c.isProfileComplete({ fullName: 'Ana', goal: 'maintain' }), false);
  assert.equal(c.isProfileComplete({ fullName: 'Ana', goal: 'maintain', trainingFrequency: 0 }), false);
  c.configureProfileWizard({}, true);
  assert.deepEqual(Array.from(vm.runInContext('profileWizardState.steps', c)), ['name', 'goal', 'frequency', 'review']);
  c.configureProfileWizard({ fullName: 'Ana', goal: 'maintain', trainingFrequency: 3 }, true);
  assert.deepEqual(Array.from(vm.runInContext('profileWizardState.steps', c)), ['name', 'goal', 'frequency', 'review']);
  vm.runInContext("profileWizardState.scope = 'generator'", c);
  c.configureProfileWizard({ fullName: 'Ana', goal: 'maintain', trainingFrequency: 3 }, true);
  assert.deepEqual(Array.from(vm.runInContext('profileWizardState.steps', c)), ['focus', 'location', 'experience', 'minutes', 'avoided', 'review']);
  vm.runInContext("profileWizardState.scope = 'meal'", c);
  c.configureProfileWizard({ fullName: 'Ana', goal: 'maintain', trainingFrequency: 3 }, true);
  assert.deepEqual(Array.from(vm.runInContext('profileWizardState.steps', c)), ['food', 'review']);
  assert.equal(c.isGeneratorProfileReady({ fullName: 'Ana', goal: 'maintain', trainingFrequency: 3 }), false);
}

// A previously completed profile must not see onboarding again.
{
  const modal = { style: { display: 'none' } };
  const c = context({
    document: { getElementById: () => modal, querySelector: () => null },
    profileReadSucceeded: true,
    hasCurrentLegalAcceptance: () => true,
    getEffectiveCurrentProfile: () => ({ fullName: 'Old member', goal: 'maintain', trainingFrequency: 4,
      gender: 'male', age: 30, heightCm: 180, weightKg: 80, foodAllergies: 'Peanuts' })
  });
  vm.runInContext(profileGateCode, c);
  c.showGenderProfileGateIfRequired();
  assert.equal(modal.style.display, 'none');
}

// Final review contains optional profile data whenever it was provided.
{
  const review = { innerHTML: '' };
  const c = context({
    document: { getElementById: () => review },
    readRequiredProfileForm: () => ({ fullName: 'Ana', gender: 'female', age: 28, heightCm: 170,
      weightKg: 68, goal: 'maintain', trainingFocus: 'strength', trainingFrequency: 3,
      trainingLocation: 'gym', experienceLevel: 'beginner', sessionMinutes: 45,
      targetMuscleGroups: ['legs'], preferredExercises: 'Squat', avoidedExercises: 'Lunges', foodAllergies: 'Peanuts' }),
    getProfileValueLabel: (value) => value,
    formatLocalizedNumber: (value) => String(value),
    escapeHtml: (value) => String(value)
  });
  vm.runInContext("profileWizardState.steps = ['name', 'review']; profileWizardState.current = 1", c);
  vm.runInContext(reviewCode, c);
  c.renderProfileWizardReview();
  for (const value of ['female', '170 cm', '68 kg', 'Squat', 'Lunges', 'Peanuts']) {
    assert.ok(review.innerHTML.includes(value), `Review should include ${value}`);
  }
}

// Interrupted onboarding: draft survives refresh for the same UID and is isolated from B.
{
  const storage = new Map();
  const c = context({
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) },
    readRequiredProfileForm: () => ({ fullName: 'Ana', goal: 'maintain', trainingFrequency: 3, age: null })
  });
  c.saveProfileWizardDraft();
  assert.equal(c.readProfileWizardDraft().fullName, 'Ana');
  c.currentUser = { uid: 'B' };
  assert.equal(c.readProfileWizardDraft().fullName, undefined);
  c.currentUser = { uid: 'A' };
  assert.equal(c.readProfileWizardDraft().trainingFrequency, 3);
}

// Empty optional number inputs must remain absent, rather than becoming invented zeroes.
{
  const c = context({
    document: {
      getElementById: () => ({ value: '' }),
      querySelector: () => null,
      querySelectorAll: () => []
    }
  });
  vm.runInContext(readFormCode, c);
  const values = c.readRequiredProfileForm();
  for (const field of ['age', 'heightCm', 'weightKg', 'trainingFrequency', 'sessionMinutes']) {
    assert.equal(values[field], null, `${field} should remain unset`);
  }
}

async function saveHarness(scope, steps, values, existing = {}, draft = {}) {
  const writes = [];
  let opened = '';
  const c = context({
    currentProfileData: existing,
    readRequiredProfileForm: () => values,
    readProfileWizardDraft: () => draft,
    getEffectiveCurrentProfile: () => existing,
    document: { getElementById: () => ({ style: {}, textContent: '', disabled: false }) },
    writeUserDocument: async (path, data, options) => { writes.push({ path, data, options }); return { queued: false }; },
    clearProfileWizardDraft() {}, renderProfileSettings() {}, renderDashboard() {}, ShowToast() {},
    hasPendingNewUserOnboarding: () => false,
    openPlanGenerator: () => { opened = 'generator'; },
    openMealPlanner: () => { opened = 'meal'; },
    uiMessage: (text) => text, translateUiText: (text) => text,
    console
  });
  vm.runInContext(`profileWizardState = { steps: ${JSON.stringify(steps)}, scope: ${JSON.stringify(scope)}, current: ${steps.length - 1} }; profileWizardReturnTo = ${JSON.stringify(scope === 'generator' ? 'generator' : scope === 'meal' ? 'meal' : '')}`, c);
  vm.runInContext(saveCode, c);
  await c.saveRequiredProfile();
  return { writes, opened, profile: c.currentProfileData };
}

const blank = {
  fullName: '', gender: '', age: null, heightCm: null, weightKg: null,
  goal: '', trainingFocus: '', trainingFrequency: null, trainingLocation: '',
  experienceLevel: '', sessionMinutes: null, targetMuscleGroups: [],
  preferredExercises: '', avoidedExercises: '', foodAllergies: ''
};

// Minimal save keeps old optional values and carries valid answers from an old draft.
{
  const existing = { gender: 'female', weightKg: 68, preferredExercises: 'Squat' };
  const h = await saveHarness('onboarding', ['name', 'goal', 'frequency', 'review'],
    { ...blank, fullName: 'Ana', goal: 'maintain', trainingFrequency: 3, gender: 'female', weightKg: 68 }, existing);
  assert.equal(h.writes.length, 1);
  assert.equal(h.writes[0].path, 'users/A');
  assert.equal(h.writes[0].data.fullName, 'Ana');
  assert.equal(h.writes[0].data.weightKg, undefined);
  assert.equal(h.profile.preferredExercises, 'Squat');
  const legacyDraft = await saveHarness('onboarding', ['name', 'goal', 'frequency', 'review'],
    { ...blank, fullName: 'Marko', goal: 'maintain', trainingFrequency: 2,
      gender: 'male', heightCm: 180, weightKg: 80, avoidedExercises: 'Burpees', foodAllergies: 'Peanuts' },
    { fullName: 'Marko' });
  assert.equal(legacyDraft.writes[0].data.heightCm, 180);
  assert.equal(legacyDraft.writes[0].data.avoidedExercises, 'Burpees');
  assert.equal(legacyDraft.writes[0].data.foodAllergies, 'Peanuts');
  const invalidLegacyDraft = await saveHarness('onboarding', ['name', 'goal', 'frequency', 'review'],
    { ...blank, fullName: 'Marko', goal: 'maintain', trainingFrequency: 2,
      preferredExercises: 'x'.repeat(1001) }, { fullName: 'Marko' });
  assert.equal(invalidLegacyDraft.writes.length, 0);
}

// Generator asks for its own inputs, then resumes; meal setup saves an explicit restriction answer.
{
  const base = { fullName: 'Ana', goal: 'maintain', trainingFrequency: 3 };
  const g = await saveHarness('generator', ['focus', 'location', 'experience', 'minutes', 'avoided', 'review'],
    { ...blank, ...base, trainingFocus: 'strength', trainingLocation: 'home', experienceLevel: 'beginner', sessionMinutes: 45, avoidedExercises: 'No exercises to avoid.' }, base);
  assert.equal(g.writes.length, 1);
  assert.equal(g.writes[0].data.trainingLocation, 'home');
  assert.equal(g.writes[0].data.foodAllergies, undefined);
  assert.equal(g.opened, 'generator');
  const m = await saveHarness('meal', ['food', 'review'],
    { ...blank, ...base, foodAllergies: 'Nemam alergije ni ograničenja hrane.' }, base);
  assert.equal(m.writes[0].data.foodAllergies, 'Nemam alergije ni ograničenja hrane.');
  assert.equal(m.opened, 'meal');
  const missing = await saveHarness('meal', ['food', 'review'], { ...blank, ...base }, base);
  assert.equal(missing.writes.length, 0);
}

// Entry points request deferred answers only when needed.
{
  let opened = '';
  const basic = { fullName: 'Ana', goal: 'maintain', trainingFrequency: 3 };
  const c = context({
    getEffectiveCurrentProfile: () => basic,
    hasCurrentLegalAcceptance: () => true,
    showLegalAcceptanceIfRequired() {}, ShowToast() {},
    openProfileDetailsEditor: (scope) => { opened = scope; }
  });
  vm.runInContext(generatorEntryCode + mealEntryCode, c);
  c.openPlanGenerator();
  assert.equal(opened, 'generator');
  opened = '';
  c.openMealPlanner();
  assert.equal(opened, 'meal');
  assert.equal(vm.runInContext('profileWizardReturnTo', c), 'meal');
}

console.log('Profile onboarding regression checks passed.');
