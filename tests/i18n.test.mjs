import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { TRANSLATIONS } from '../translations.js';
import { translateText, formatUiMessage, LOCALES, SUPPORTED_LANGUAGES } from '../ui-i18n.js';
import { EXERCISE_LIBRARY, getLibraryExerciseById, getLibraryExerciseDisplayName, getExerciseDisplayName, findLibraryExerciseByName } from '../exercise-library.js';
import { FOOD_LIBRARY, FOOD_LIBRARY_CATEGORIES, getFoodLibraryName } from '../food-library.js';
import { MEAL_RECIPES, getMealRecipeName, eligibleMealRecipes } from '../meal-planner.js';

let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks++; }
const referenceKeys = Object.keys(TRANSLATIONS.en);
for (const language of SUPPORTED_LANGUAGES.filter(x => x !== 'sr')) {
  for (const key of referenceKeys) {
    check(typeof TRANSLATIONS[language][key] === 'string' && TRANSLATIONS[language][key].length > 0, `${language}: missing ${key}`);
    const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
    assert.deepEqual(placeholders(TRANSLATIONS[language][key]), placeholders(key), `${language}: placeholders ${key}`);
  }
}
for (const language of SUPPORTED_LANGUAGES) {
  for (const item of EXERCISE_LIBRARY) {
    check(Boolean(item.names[language]), `${language}: exercise ${item.id}`);
    check(findLibraryExerciseByName(item.names[language])?.id === item.id, `${language}: search ${item.id}`);
    const display = getLibraryExerciseDisplayName(item, language);
    check(display.startsWith(item.names[language]), `${language}: primary name ${item.id}`);
    if (language === 'en' || item.names[language].toLowerCase() === item.names.en.toLowerCase()) check(display === item.names[language], `duplicate English ${item.id}`);
    else check(display.endsWith(' · ' + item.names.en), `English subtitle ${item.id}`);
    if (language !== 'sr') check(translateText(item.instruction, language) !== item.instruction, `${language}: instructions ${item.id}`);
  }
  for (const food of FOOD_LIBRARY) check(getFoodLibraryName(food, language) === food.names[language] && Boolean(food.names[language]), `${language}: food ${food.id}`);
  for (const recipe of MEAL_RECIPES) check(Boolean(getMealRecipeName(recipe, language)) && (language === 'sr' || getMealRecipeName(recipe, language) !== recipe.name), `${language}: recipe ${recipe.id}`);
  for (const category of FOOD_LIBRARY_CATEGORIES) check(language === 'sr' || translateText(category.labels.sr, language) !== category.labels.sr, `${language}: category ${category.id}`);
  const custom = { name: 'Moja vježba — Jelena 42', notes: 'Ne prevodi moje bilješke.' };
  check(getExerciseDisplayName(custom, language) === custom.name, `${language}: custom exercise changed`);
  const original = JSON.stringify(custom); getExerciseDisplayName(custom, language); check(JSON.stringify(custom) === original, 'Mutated custom data');
  check(translateText('Sljedeći dan', language) === (language === 'sr' ? 'Sljedeći dan' : TRANSLATIONS[language]['Sljedeći dan']), 'Numeric template matched ordinary text');
  check(formatUiMessage('Plan {current} od {total}', {current: 2, total: 5}, language).includes('2'), 'plan template');
  check(!translateText('Pitanje 3 od 14', language).includes('{'), 'question template');
  const confirm = translateText('Odustati od treninga?', language);
  check(language === 'sr' || confirm !== 'Odustati od treninga?', `${language}: stop workout confirmation`);
}
const legPress = getLibraryExerciseById('leg-press');
assert.equal(getLibraryExerciseDisplayName(legPress, 'sr'), 'Potisak nogama · Leg press');
assert.equal(getLibraryExerciseDisplayName(legPress, 'en'), 'Leg press');
assert.equal(getLibraryExerciseDisplayName(legPress, 'fr'), 'Presse à cuisses · Leg press');
assert.equal(getLibraryExerciseDisplayName(legPress, 'it'), 'Pressa per le gambe · Leg press');
assert.equal(getExerciseDisplayName('Leg press', 'sr'), 'Potisak nogama · Leg press');
assert.equal(getExerciseDisplayName({libraryExerciseId:'leg-press', name:'Moja posebna sprava'}, 'fr'), 'Moja posebna sprava');
assert.equal(getLibraryExerciseDisplayName({names:{sr:'Moja vježba'}}, 'sr'), 'Moja vježba');
assert.equal(getLibraryExerciseDisplayName({names:{sr:'PLANK',en:'Plank'}}, 'sr'), 'PLANK');
assert.equal(translateText('👨 Muško', 'fr'), '👨 ' + translateText('Muško', 'fr'));
assert.equal(formatUiMessage('Nedostaje: {fields}.', {fields:'Jelena $& {x}'}, 'fr'), 'À compléter : Jelena $& {x}.');

// Boot the actual language bootstrap in a fresh storage/DOM double. No account,
// Firebase, browser profile or IndexedDB is touched by these checks.
const boot = fs.readFileSync(new URL('../language-boot.js', import.meta.url), 'utf8');
for (const language of SUPPORTED_LANGUAGES) {
  for (const saved of [true, false]) {
    const storage = new Map(saved ? [['gym-language', language]] : []);
    const document = { documentElement: {}, getElementById: () => null };
    const context = { document, navigator: { languages: [language + '-XX'], onLine: true }, localStorage: {getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)}, window:{addEventListener(){},setTimeout(){}} };
    vm.runInNewContext(boot, context);
    check(storage.get('gym-language') === language, `boot persistence ${language}`);
    check(document.documentElement.lang === (language === 'sr' ? 'sr-Latn' : language), `document language ${language}`);
    check(Boolean(context.window.GymLeaderLoadingCopy[language].offline), `offline loader ${language}`);
  }
}
for (const [language, terms] of Object.entries({fr:'lait, œufs',it:'latte, uova',es:'leche, huevos'})) {
  const result=eligibleMealRecipes({diet:'balanced',allergies:terms,maxMinutes:60});
  check(result.unknown.length===0, `${language}: localized allergens`);
  check(result.recipes.every(recipe=>recipe.ingredients.every(({foodId})=>!FOOD_LIBRARY.find(food=>food.id===foodId)?.allergens.some(a=>['milk','eggs'].includes(a)))),`${language}: allergen filter`);
}
assert.equal(new Intl.NumberFormat(LOCALES.fr).format(72.5),'72,5');
assert.equal(new Intl.NumberFormat(LOCALES.it).format(72.5),'72,5');
assert.equal(new Intl.NumberFormat(LOCALES.es).format(72.5),'72,5');
console.log(`PASS: ${checks} translation, catalogue, bilingual display, search, locale, bootstrap and restriction checks; ${referenceKeys.length} keys across five dictionaries plus Serbian source.`);
