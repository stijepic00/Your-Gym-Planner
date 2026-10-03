// Generates an isolated DOM harness from the actual UI functions and markup.
// No Firebase code, account data, IndexedDB or service worker runs in the harness.
import fs from 'node:fs';
import vm from 'node:vm';
const parser={exports:{},module:{}};
vm.runInNewContext(process.binding('natives')['internal/deps/acorn/acorn/dist/acorn'],parser);
const source=fs.readFileSync(new URL('../javascript.js',import.meta.url),'utf8');
const ast=parser.exports.parse(source,{ecmaVersion:'latest',sourceType:'module'});
const functions=['getCurrentLanguage','getCurrentLocale','formatLocalizedNumber','formatDateClean','translateUiText','getCanonicalTranslationSource','uiMessage','localizeCopy','getMacroLabels','localizeElement','localizeSubtree','localizeTextNode','observeLocalization','getRoutineDisplayName','getGeneratedExerciseDisplayName','getExerciseMeasurementType','isDurationExercise','formatSetPerformance','renderHistory','renderDashboard','getDashboardGreeting','getOnboardingGreeting','genderText','getProfileGender','getProfileValueLabel','getWeeklyGoalCopy','mealPlannerCopy','mealPlannerNavigationCopy','mealPlannerFastCopy','getExerciseInputValue','localizeExerciseNameInput','showConfirm','refreshExerciseNameDisplays','getGeneratedPlanDisplayName','renderGeneratedPlanSuggestions','exerciseLibraryLabel','normalizeLibrarySearch','fillExerciseLibraryFilters','getExerciseLibraryTypeLabel','renderExerciseLibraryPicker'];
const variables=['localizedTextSources','localizedTextLastApplied','localizedAttributeSources','localizedAttributeLastApplied','exerciseInputSources','VALID_GENDER_VALUES','exerciseLibraryLabels','routineWeekdayLabels'];
const selected=ast.body.filter(n=>(n.type==='FunctionDeclaration'&&functions.includes(n.id.name))||(n.type==='VariableDeclaration'&&n.declarations.every(d=>variables.includes(d.id.name))));
const definitions=selected.map(n=>source.slice(n.start,n.end)).join('\n');
const fragments=[];
function walk(node){if(!node||typeof node!=='object')return;let text;if(node.type==='Literal'&&typeof node.value==='string')text=node.value;if(node.type==='TemplateLiteral')text=node.quasis.map(q=>q.value.cooked||'').join('0');if(text&&/<[a-z][^>]*>/i.test(text))fragments.push(text);for(const [key,value]of Object.entries(node)){if(key==='loc')continue;if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);}}
walk(ast);
const page=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const body=page.match(/<body[^>]*>([\s\S]*?)<\/body>/i)[1].replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const script=`
import {translateText,canonicalUiText,formatUiMessage,LOCALES,SUPPORTED_LANGUAGES} from '../ui-i18n.js?v=20261003-i18n-v111';
import {TRANSLATIONS} from '../translations.js?v=20261003-i18n-v111';
import {EXERCISE_LIBRARY,getExerciseDisplayName,getDisplayLibraryExercise,getLibraryExerciseName,getLibraryExerciseDisplayName,getLibraryExerciseTrainingPlaces,resolveLibraryExercise} from '../exercise-library.js?v=20261003-i18n-v111';
${definitions}
const currentUser={uid:'fixture-only',displayName:'Jelena Test'};
const currentProfileData={gender:'female',fullName:'Jelena Test'};
const cachedHistory=[{id:'fixture-history',userId:currentUser.uid,name:'Donji dio A',date:'2026-10-02T12:00:00Z',exercises:[{name:'Bugarski iskorak',measurementType:'weight_reps',sets:[{weight:22.5,reps:2},{weight:22.5,reps:2}],notes:'Moja bilješka: Save this plan'},{name:'Moj poseban pokret',sets:[{weight:10,reps:5}]}]}];
const initialHistory=JSON.stringify(cachedHistory);
const currentWorkout={name:'Donji dio A'};
const getEffectiveCurrentProfile=()=>({sessionMinutes:60});
let generatedPlanViewIndex=0,generatedPlanSaveInProgress=false,generatedPlanWarning='';
const generatedPlanSuggestions=[{id:'fixture-plan',name:'Donji dio A',groupTitle:'Donji dio A',emoji:'🏋️',scheduleDays:[1],exercises:EXERCISE_LIBRARY.slice().sort((a,b)=>b.names.fr.length-a.names.fr.length).slice(0,8).map(item=>({name:item.names.sr,measurementType:item.measurementType,setCount:3,...item.defaults}))}];

const renderDashboardPrimaryAction=()=>{},renderWeeklyGoalCard=()=>{},renderPendingSyncStatus=()=>{};
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let checks=0;const failures=[];const assert=(condition,message)=>{checks++;if(!condition)failures.push(message);};
const result=document.getElementById('fixture-result');
const staticRoot=document.getElementById('app-fixture');
const untranslated=[];
function inspect(root,label){const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode()){if(n.parentElement?.closest('script,style,textarea,code,[data-no-translate]'))continue;const text=n.nodeValue.trim();if(text&&/[čćšđžČĆŠĐŽ]/.test(text)&&translateText(text,'fr')===text)untranslated.push(label+': '+text);}}
inspect(staticRoot,'HTML');
for(const [i,fragment] of ${JSON.stringify(fragments)}.entries()){const t=document.createElement('div');t.innerHTML=fragment;inspect(t,'dynamic '+i);}
const input=document.createElement('input');input.className='routine-exercise-name';input.value='Bugarski iskorak';document.getElementById('editor-probe').append(input);
const protectedText=document.createElement('p');protectedText.dataset.noTranslate='';protectedText.textContent='Sačuvaj ovaj plan';document.getElementById('editor-probe').append(protectedText);
const picker=document.querySelector('[data-library-picker-for]');
const query=picker.querySelector('.exercise-library-search');
observeLocalization();
for(const language of [...SUPPORTED_LANGUAGES,...SUPPORTED_LANGUAGES].reverse()){
 localStorage.setItem('gym-language',language);
 localizeSubtree(staticRoot);renderHistory();renderDashboard();localizeExerciseNameInput(input);localizeSubtree(staticRoot);
 renderGeneratedPlanSuggestions();
 assert(document.querySelectorAll('.plan-generator-suggestion li').length===8,language+': all exercises visible');
 for(const term of ['Potisak nogama','Leg press']){query.value=term;renderExerciseLibraryPicker(picker);assert(picker.querySelector('.exercise-library-result h4')?.textContent===getExerciseDisplayName('Potisak nogama',language),language+': actual search '+term);}
 refreshExerciseNameDisplays();
 const expected=getExerciseDisplayName('Bugarski iskorak',language);
 assert(document.getElementById('history-container').textContent.includes(expected),language+': history exercise');
 assert(document.getElementById('last-workout-container').textContent.includes(expected),language+': last workout exercise');
 assert(document.getElementById('history-container').textContent.includes(getRoutineDisplayName('Donji dio A')),language+': history plan');
 assert(document.getElementById('history-container').textContent.includes('Moj poseban pokret'),language+': custom history name');
 assert(document.getElementById('history-container').textContent.includes('Moja bilješka: Save this plan'),language+': history notes');
 assert(getExerciseInputValue(input)==='Bugarski iskorak',language+': editor changed saved name');
 assert(protectedText.textContent==='Sačuvaj ovaj plan',language+': protected user content');
 let confirmation='';window.confirm=message=>{confirmation=message;return false;};await showConfirm('Odustati od treninga?');assert(confirmation===translateText('Odustati od treninga?',language),language+': confirmation');
 const late=document.createElement('p');late.textContent='Sačuvaj sve planove';staticRoot.append(late);await new Promise(resolve=>setTimeout(resolve,0));
 assert(late.textContent===translateText('Sačuvaj sve planove',language),language+': late content');
 late.textContent='Uredi ovaj plan';await new Promise(resolve=>setTimeout(resolve,0));assert(late.textContent===translateText('Uredi ovaj plan',language),language+': changed text stale');late.remove();
 const attribute=document.createElement('input');attribute.placeholder='Pronađi vježbe';staticRoot.append(attribute);await new Promise(resolve=>setTimeout(resolve,0));attribute.placeholder='Naziv vježbe';await new Promise(resolve=>setTimeout(resolve,0));assert(attribute.placeholder===translateText('Naziv vježbe',language),language+': changed attribute stale');attribute.remove();
 const copy=mealPlannerCopy();assert(copy.replace===translateText('Zamijeni',language),language+': meal replacement label');
 assert(JSON.stringify(cachedHistory)===initialHistory,language+': history mutated');
}
input.value='Moj novi pokret';localizeExerciseNameInput(input);assert(getExerciseInputValue(input)==='Moj novi pokret','custom editor change lost');
localStorage.setItem('gym-language','fr');renderHistory();renderDashboard();localizeSubtree(staticRoot);
renderGeneratedPlanSuggestions();
const preview=document.getElementById('visual-preview');
const plan=document.getElementById('plan-generator-results');preview.append(plan);
const history=document.getElementById('history-container');preview.append(history);
query.value='Leg press';renderExerciseLibraryPicker(picker);picker.hidden=false;preview.append(picker);
localizeSubtree(preview);
result.textContent=JSON.stringify({checks,failures,untranslated:[...new Set(untranslated)],view:'French history and last workout'},null,2);
result.dataset.status=failures.length?'fail':'pass';
document.title=failures.length?'FAIL i18n fixture':'PASS i18n fixture';
`;
fs.mkdirSync(new URL('../.i18n-check/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('../.i18n-check/fixture.js',import.meta.url),script);
fs.writeFileSync(new URL('../.i18n-check/index.html',import.meta.url),`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="../styles.css?v=20261003-i18n-v111"><style>body{padding:16px}.view{display:block!important}#app-fixture{display:none!important}#visual-preview{width:100%;max-width:900px;margin:auto}.fixture-preview{max-width:420px;margin:auto}#fixture-result{white-space:pre-wrap;overflow-wrap:anywhere}#editor-probe{max-width:400px}.modal{display:none!important}</style></head><body><details><summary>Isolated i18n checks</summary><pre id="fixture-result">Running…</pre></details><div id="visual-preview"></div><div id="editor-probe"></div><div id="app-fixture">${body}</div><script type="module" src="./fixture.js"></script></body></html>`);
console.log('Generated .i18n-check/index.html; all UI test data is synthetic.');
