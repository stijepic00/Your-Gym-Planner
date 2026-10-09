// Actual UI functions/markup; synthetic profile and local mock persistence only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.GYMLEADER_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'javascript.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const parser = { exports: {}, module: {} };
vm.runInNewContext(process.binding('natives')['internal/deps/acorn/acorn/dist/acorn'], parser);
const ast = parser.exports.parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
const names = ['getCurrentLanguage', 'translateUiText', 'getCurrentLocale', 'formatLocalizedNumber', 'getCanonicalTranslationSource', 'localizeElement', 'localizeTextNode', 'localizeSubtree', 'observeLocalization', 'getRoutineDisplayName', 'getGeneratedPlanDisplayName', 'getGeneratedExerciseDisplayName', 'getExerciseInputValue', 'localizeExerciseNameInput', 'normalizeRoutineExercise', 'readExerciseSetting', 'inferRepRangeFromName', 'getExerciseProgressionDefaults', 'getExerciseMeasurementType', 'isDurationExercise', 'resetRoutineExerciseBuilder', 'addRoutineExerciseRow', 'syncRoutineExerciseSettingsVisibility', 'getRoutineExercisesFromList', 'getRoutineExerciseValidationMessage', 'renderGeneratedPlanSuggestions', 'showSavedRoutineActions', 'exerciseLibraryLabel', 'normalizeLibrarySearch', 'fillExerciseLibraryFilters', 'getExerciseLibraryTypeLabel', 'renderExerciseLibraryPicker'];
const variables = ['localizedTextSources', 'localizedTextLastApplied', 'localizedAttributeSources', 'localizedAttributeLastApplied', 'exerciseInputSources', 'exerciseLibraryLabels', 'routineWeekdayLabels'];
const actions = ['openCreateRoutineModal', 'addLibraryExerciseToRoutine', 'removeRoutineExercise', 'editGeneratedPlan', 'submitNewRoutine', 'saveGeneratedPlan', 'saveAllGeneratedPlans'];
const selected = ast.body.filter(n =>
  n.type === 'FunctionDeclaration' && names.includes(n.id.name) ||
  n.type === 'VariableDeclaration' && n.declarations.every(d => variables.includes(d.id.name)) ||
  n.type === 'ExpressionStatement' && n.expression.type === 'AssignmentExpression' && n.expression.left.object?.name === 'window' && actions.includes(n.expression.left.property?.name));
const definitions = selected.map(n => source.slice(n.start, n.end)).join('\n');
const markup = html.match(/<body[^>]*>([\s\S]*?)<\/body>/)[1].replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const fixture = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/styles.css"><style>#auth-boot-screen{display:none!important}</style></head><body>${markup}<script type="module">
import {TRANSLATIONS} from '/translations.js';
import {translateText,canonicalUiText,formatUiMessage,LOCALES,SUPPORTED_LANGUAGES} from '/ui-i18n.js';
import {EXERCISE_LIBRARY,getLibraryExerciseById,getLibraryExerciseName,getLibraryExerciseDisplayName,getDisplayLibraryExercise,getExerciseDisplayName,getLibraryExerciseTrainingPlaces,resolveLibraryExercise} from '/exercise-library.js';
import {libraryExerciseId} from '/exercise-history.js';
${definitions}
const escapeHtml=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const currentUser={uid:'fixture-A'};
let userRoutines=[],pendingGeneratedPlanId=null,generatedPlanSuggestions=[],generatedPlanViewIndex=0,generatedPlanSaveInProgress=false,generatedPlanWarning='';
const getEffectiveCurrentProfile=()=>({sessionMinutes:45});
const getRoutineScheduleSortValue=()=>0;
const writeRoutineCache=()=>{};
window.writes=[];window.messages=[];
const createUserDocument=async(collection,data)=>{window.writes.push({collection,data});return {id:'saved-'+window.writes.length,queued:window.queued};};
const ShowToast=(message,type)=>window.messages.push({message,type});
window.renderWorkouts=()=>{};
window.switchTab=tab=>{window.activeTab=tab;};
window.setLocale=code=>{localStorage.setItem('gym-language',code);localizeSubtree();};
window.seedPreview=(count=1)=>{const proposal={id:'proposal',name:'Noge',groupTitle:'Noge',emoji:'',scheduleDays:['2'],exercises:EXERCISE_LIBRARY.slice(0,8).map(x=>({name:x.names.sr,libraryExerciseId:x.id,measurementType:x.measurementType,setCount:3,...x.defaults}))};generatedPlanSuggestions=Array.from({length:count},(_,index)=>({...proposal,id:'proposal-'+index}));renderGeneratedPlanSuggestions();document.getElementById('plan-generator-modal').style.display='flex';};
window.resetFixture=()=>{document.querySelectorAll('.modal').forEach(x=>x.style.display='none');window.writes=[];window.messages=[];userRoutines=[];window.queued=false;};
document.addEventListener('click',event=>{const b=event.target.closest('[data-action]');if(!b)return;switch(b.dataset.action){case 'add-library-exercise':window.addLibraryExerciseToRoutine(b.dataset.exerciseId,b.dataset.targetList);break;case 'remove-routine-exercise':window.removeRoutineExercise(b);break;case 'edit-generated-plan':window.editGeneratedPlan(b.dataset.generatedPlanId);break;case 'submit-new-routine':void window.submitNewRoutine();break;case 'save-generated-plan':void window.saveGeneratedPlan(b.dataset.generatedPlanId);break;}});
document.addEventListener('input',event=>{if(event.target.matches('.exercise-library-search'))renderExerciseLibraryPicker(event.target.closest('.exercise-library-picker'));});
observeLocalization();window.fixtureReady=true;
</script></body></html>`;
const browser = await chromium.launch({ headless: true, executablePath: process.env.GYMLEADER_BROWSER_EXECUTABLE });
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
try {
  const context = await browser.newContext();
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'fixture.test') return route.abort();
    if (url.pathname === '/') return route.fulfill({body:fixture,contentType:'text/html'});
    const file = path.resolve(root, '.' + url.pathname);
    assert.ok(file.startsWith(root + path.sep));
    return route.fulfill({path:file,contentType:file.endsWith('.css')?'text/css':'text/javascript'});
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('https://fixture.test/');
  await page.waitForFunction(() => window.fixtureReady);
  for (const code of ['sr','bs','hr','en','de','fr','it','es']) {
    for (const width of [360,390,768,1024,1440]) {
      await page.setViewportSize({width,height:900});
      await page.evaluate(code=>{window.resetFixture();window.setLocale(code);window.openCreateRoutineModal();},code);
      check(!await page.locator('#createRoutineModal .exercise-library-filter-details').evaluate(x=>x.open), `${code}/${width}: filters collapsed`);
      await page.locator('#newRoutineNameInput').fill('Test noge');
      await page.locator('#createRoutineModal .exercise-library-search').fill('Leg press');
      await page.locator('#createRoutineModal [data-action="add-library-exercise"]').first().click();
      check(await page.locator('#new-routine-exercises-list .routine-exercise-row').count()===1,'actual library add');
      check(await page.locator('#new-routine-exercises-list .routine-exercise-settings').evaluate(x=>!x.open),'row advanced settings start closed');
      check(await page.locator('#new-routine-exercises-list .routine-exercise-main').count()===1,'exercise name stays in compact numbered row');
      check((await page.locator('.routine-exercise-summary').first().textContent()).includes('3'),'sets visible');
      await page.locator('#new-routine-exercises-list summary').click();
      await page.locator('.routine-exercise-set-count').first().fill('4');
      check((await page.locator('.routine-exercise-summary').first().textContent()).includes('4'),'summary updates after edit');
      check(await page.locator('#createRoutineModal').evaluate(x=>x.scrollWidth<=x.clientWidth+1),'manual modal no overflow');
      await page.locator('#createRoutineModal [data-action="submit-new-routine"]').click();
      await page.waitForFunction(()=>window.writes.length===1);
      check(await page.evaluate(()=>window.writes[0].data.exercises[0].setCount===4 && !!window.writes[0].data.exercises[0].libraryExerciseId),'save preserves settings and ID');
      check(await page.locator('#routine-save-feedback [data-action="start-routine"]').count()===1,'existing start offered');
      await page.evaluate(()=>window.seedPreview());
      check(await page.locator('.plan-generator-suggestion li').count()===8,'all preview exercises visible');
      const previewLayout=await page.evaluate(()=>{const card=document.querySelector('.plan-generator-suggestion'),header=card.querySelector('.plan-generator-carousel-navigation'),left=header.querySelector('.is-previous'),right=header.querySelector('.is-next'),title=header.querySelector('h4'),rows=[...card.querySelectorAll('li')];const c=card.getBoundingClientRect(),h=header.getBoundingClientRect(),l=left.getBoundingClientRect(),r=right.getBoundingClientRect(),t=title.getBoundingClientRect();return{width:c.width,header:h.height,aligned:l.top>=h.top&&l.bottom<=h.bottom&&r.top>=h.top&&r.bottom<=h.bottom&&t.top>=h.top&&t.bottom<=h.bottom,rows:rows.every(x=>x.getBoundingClientRect().height<115)}});
      check(previewLayout.width<=700&&previewLayout.aligned&&previewLayout.rows,'compact preview with arrows in header and readable rows');
      check(await page.locator('[data-action="save-all-generated-plans"]').count()===0,'one plan has one save action');
      await page.locator('[data-action="edit-generated-plan"]').click();
      await page.locator('#newRoutineNameInput').fill('Reviewed plan');
      await page.locator('#createRoutineModal [data-action="submit-new-routine"]').click();
      check(await page.evaluate(()=>window.writes.length===1),'editing proposal does not save it');
      check((await page.locator('.plan-generator-suggestion h4').textContent()).includes('Reviewed plan'),'edit returns to preview');
      check(await page.locator('#plan-generator-modal').evaluate(x=>x.scrollWidth<=x.clientWidth+1),'preview modal no overflow');
      await page.locator('[data-action="save-generated-plan"]').click();
      await page.waitForFunction(()=>window.writes.length===2);
      check(await page.evaluate(()=>window.writes[1].data.name==='Reviewed plan' && window.writes[1].data.userId==='fixture-A'),'explicit preview save');
      await page.evaluate(()=>window.seedPreview(4));
      check(await page.locator('.plan-generator-suggestion li').count()===8,'batch option keeps all exercises visible');
      check(await page.locator('[data-action="save-all-generated-plans"]').isVisible(),'four proposals show primary save all');
      check(await page.locator('[data-action="save-generated-plan"]').evaluate(x=>x.classList.contains('btn-secondary')),'single save is secondary when batch exists');
      check(await page.locator('.plan-generator-save-actions').evaluate(x=>x.scrollWidth<=x.clientWidth+1),'save actions fit viewport');
    }
  }
  check(errors.length===0, 'no browser errors: '+errors.join('; '));
  console.log('PASS: '+checks+' routine UI checks, eight languages, five widths; persistence mocked, no Firebase requests.');
} finally { await browser.close(); }
