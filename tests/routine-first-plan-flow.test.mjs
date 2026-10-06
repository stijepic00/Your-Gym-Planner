import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { translateText } from '../ui-i18n.js';
import { TRANSLATIONS } from '../translations.js';

const js = fs.readFileSync(new URL('../javascript.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function section(start, end) {
  const first = js.indexOf(start);
  const last = js.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, `Missing section: ${start}`);
  return js.slice(first, last);
}

const list = { innerHTML: '', querySelectorAll: () => [] };
const c = {
  window: null,
  document: { getElementById: (id) => id === 'workout-list' ? list : null },
  currentUser: { uid: 'A' }, userRoutines: [], routineEditMode: false, showArchivedRoutines: false,
  writeRoutineCache() {}, translateUiText: (value) => value,
  escapeHtml: (value) => String(value), getCurrentLanguage: () => 'sr'
};
c.window = c;
vm.createContext(c);
vm.runInContext(section('  window.renderWorkouts = function()', '  // UČITAVANJE UŽIVO'), c);

// A new account sees both direct paths in the empty card, with no duplicate toolbar.
c.renderWorkouts();
assert.match(list.innerHTML, /data-action="choose-manual-plan"/);
assert.match(list.innerHTML, /data-action="open-plan-generator"/);
assert.match(list.innerHTML, /Plan za noge — jedan trening koji možeš ponavljati/);
assert.doesNotMatch(list.innerHTML, /class="routine-toolbar"/);

// Archived plans remain reachable, and the empty message does not claim all plans are gone.
c.userRoutines = [{ id: 'old', name: 'Old', isArchived: true, exercises: [] }];
c.renderWorkouts();
assert.match(list.innerHTML, /Nema aktivnih planova treninga/);
assert.match(list.innerHTML, /data-action="toggle-routine-edit-mode"/);

// Existing routine list keeps its start action and existing toolbar.
c.userRoutines = [{ id: 'legs', name: 'Noge', isArchived: false, exercises: [{ name: 'Čučanj' }] }];
c.getEmojiForRoutine = () => '🦵';
c.getRoutineDisplayName = (value) => value;
c.isRoutinePendingSync = () => false;
vm.runInContext("const routineWeekdayLabels = ['Nedjelja', 'Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota']", c);
c.renderWorkouts();
assert.match(list.innerHTML, /data-action="start-routine" data-routine-id="legs"/);
assert.match(list.innerHTML, /class="routine-toolbar"/);

assert.match(js, /case 'choose-manual-plan':\s*document\.getElementById\('plan-creation-choice-modal'\).*?window\.openCreateRoutineModal\(\)/s);
assert.match(js, /case 'open-plan-generator':\s*window\.openPlanGenerator\(\)/);

// Generator requests its missing profile data at entry, then previews without saving.
const modal = { style: { display: 'none', setProperty(name, value) { this[name] = value; } } };
const results = { hidden: false, innerHTML: '' };
let requestedScope = '';
let writes = 0;
Object.assign(c, {
  document: {
    getElementById: (id) => ({ 'plan-generator-modal': modal, 'plan-generator-results': results })[id] ?? null,
    querySelector: () => null,
    querySelectorAll: () => []
  },
  hasCurrentLegalAcceptance: () => true,
  getEffectiveCurrentProfile: () => ({ fullName: 'Ana', goal: 'maintain', trainingFrequency: 3 }),
  isProfileComplete: () => true,
  isGeneratorProfileReady: () => false,
  openProfileDetailsEditor: (scope) => { requestedScope = scope; },
  updatePlanGeneratorConfiguration() {}, profileUsesFullBody: () => false,
  createUserDocument: async () => { writes += 1; return { id: 'saved-1', queued: false }; },
  ShowToast() {}, renderGeneratedPlanSuggestions() {}, console
});
vm.runInContext('let generatedPlanSuggestions = []; let generatedPlanWarning = ""; let generatedPlanViewIndex = 0; let generatedPlanSaveInProgress = false; let profileWizardReturnTo = "";', c);
vm.runInContext(section('  window.openPlanGenerator = function()', '  window.generatePersonalizedPlans ='), c);
c.openPlanGenerator();
assert.equal(requestedScope, 'generator');
assert.equal(writes, 0);
c.isGeneratorProfileReady = () => true;
c.openPlanGenerator();
assert.equal(modal.style.display, 'flex');
assert.equal(writes, 0);
vm.runInContext('generatedPlanSuggestions = [{ id: "suggestion-1", name: "Noge", emoji: "", exercises: [{ name: "Čučanj" }], scheduleDays: ["2"] }]', c);
assert.equal(writes, 0, 'A generated suggestion must not be saved before confirmation');
vm.runInContext(section('  window.saveGeneratedPlan = async function(planId)', '  window.saveAllGeneratedPlans ='), c);
await c.saveGeneratedPlan('suggestion-1');
assert.equal(writes, 1);
assert.equal(c.userRoutines.at(-1).name, 'Noge');
assert.equal(c.userRoutines.at(-1).userId, 'A');

for (const language of ['sr', 'bs', 'hr', 'en', 'de', 'fr', 'it', 'es']) {
  for (const source of [
    'Napravi svoju rutinu',
    'Nemam svoju rutinu — napravi plan za mene',
    'Plan za noge — jedan trening koji možeš ponavljati.',
    'Sačuvaš ga jednom i pokreneš kada želiš. Dane možeš podesiti kasnije.',
    'Ne praviš ga ponovo svake sedmice. Uobičajene dane možeš podesiti jednom u opciji „Uredi plan” i kasnije ih promijeniti.',
    'GymLeader koristi tvoj cilj, fokus, raspoloživo vrijeme, iskustvo i mjesto treninga. Pregledaj prijedlog, po potrebi ga uredi, pa odluči želiš li ga sačuvati.'
  ]) {
    assert.ok(translateText(source, language).trim(), `${language}: missing ${source}`);
    if (language !== 'sr') assert.ok(TRANSLATIONS[language][source], `${language}: missing key ${source}`);
    if (language !== 'sr' && language !== 'bs' && language !== 'hr') {
      assert.notEqual(translateText(source, language), source, `${language}: untranslated ${source}`);
    }
  }
}
assert.match(html, /Ne praviš ga ponovo svake sedmice/);
assert.match(html, /Pregledaj prijedlog, po potrebi ga uredi/);
console.log('Routine first-plan flow: passed');
