import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { translateText } from '../ui-i18n.js';
import { formatUiMessage } from '../ui-i18n.js';
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
assert.ok(list.innerHTML.indexOf('open-plan-generator') < list.innerHTML.indexOf('choose-manual-plan'));
assert.match(list.innerHTML, /Preporuči mi plan/);
assert.match(list.innerHTML, /Napravit ću ga ručno/);
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
  ShowToast() {}, showSavedRoutineActions(id) { c.lastSavedAction = id; }, renderGeneratedPlanSuggestions() {},
  console: { error(...args) { throw new Error(args.join(' ')); } }
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
assert.equal(c.lastSavedAction, 'saved-1');

// The real preview renders every exercise, a single primary save action,
// and a collapsed batch-save option only when there are multiple routines.
Object.assign(c, {
  formatUiMessage, getGeneratedPlanDisplayName: (value) => value,
  getGeneratedExerciseDisplayName: (exercise) => exercise.name
});
vm.runInContext(section('  function renderGeneratedPlanSuggestions()', '  window.openPlanGenerator ='), c);
for (const language of ['sr', 'bs', 'hr', 'en', 'de', 'fr', 'it', 'es']) {
  c.getCurrentLanguage = () => language;
  c.translateUiText = (text) => translateText(text, language);
  vm.runInContext('generatedPlanSuggestions = [{id:"one",name:"Noge",emoji:"",groupTitle:"Noge",exercises:Array.from({length:8},(_,i)=>({name:"Exercise "+i,measurementType:"reps",setCount:3,repRangeMin:8,repRangeMax:12,restSeconds:60}))}];', c);
  c.renderGeneratedPlanSuggestions();
  assert.equal((results.innerHTML.match(/<li>/g) || []).length, 8);
  assert.doesNotMatch(results.innerHTML, /save-all-generated-plans/);
  assert.match(results.innerHTML, /data-action="edit-generated-plan"/);
  vm.runInContext('generatedPlanSuggestions.push({...generatedPlanSuggestions[0],id:"two"})', c);
  c.renderGeneratedPlanSuggestions();
  assert.match(results.innerHTML, /class="btn plan-generator-save-all"/);
  assert.match(results.innerHTML, /save-all-generated-plans/);
  assert.match(results.innerHTML, /Čuva sve generisane planove|Saves all suggested plans|Speichert alle vorgeschlagenen Pläne|Enregistre tous les programmes proposés|Salva tutti i programmi proposti|Guarda todos los planes sugeridos|Sprema sve predložene planove/);
  assert.match(results.innerHTML, /view-saved-routines/);
  assert.ok(results.innerHTML.includes(formatUiMessage('Plan {current} od {total}', {current:1,total:2}, language)));
}
assert.equal(writes, 1, 'Rendering and browsing suggestions cannot write routines');
c.getRoutineScheduleSortValue = () => 0;
c.createUserDocument = async () => { writes += 1; return {id:`saved-${writes}`,queued:false}; };
vm.runInContext(section('  window.saveAllGeneratedPlans = async function()', '  function showSavedRoutineActions('), c);
await c.saveAllGeneratedPlans();
assert.equal(writes, 3, 'Explicit batch confirmation saves both routines separately');
assert.equal(c.userRoutines.at(-1).userId, 'A');

for (const language of ['sr', 'bs', 'hr', 'en', 'de', 'fr', 'it', 'es']) {
  for (const source of [
    'Napravi svoju rutinu',
    'Preporuči mi plan', 'Napravit ću ga ručno',
    'Sačuvaj cijeli skup rutina',
    'Svaki prijedlog se čuva kao zasebna rutina koju možeš ponavljati.',
    'Pregledaš jednu rutinu. Dugme ispod čuva samo prikazanu rutinu.',
    'Sačuvano u tvojim planovima',
    'Odaberi rutinu ispod i pokreni trening kada želiš.',
    'Čuva sve generisane planove', 'Čuva samo ovaj plan',
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
