// Real meal renderer/catalogue/action handlers, isolated from Firebase.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.GYMLEADER_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'javascript.js'), 'utf8');
function fn(name) {
  const start = source.indexOf('  function ' + name + '(');
  assert.ok(start >= 0, name);
  const line = source.slice(start, source.indexOf('\n', start));
  if (line.trimEnd().endsWith('}')) return line;
  return source.slice(start, source.indexOf('\n  }', start) + 4);
}
function handler(name, next) {
  const start = source.indexOf('  window.' + name + ' =');
  const end = source.indexOf(next, start + 1);
  assert.ok(start >= 0 && end > start, name);
  return source.slice(start, end);
}
const helpers = ['escapeHtml', 'formatFoodNumber', 'mealPlanCurrencyAmount', 'formatMealPlanDate',
  'isNoMealRestriction', 'combinedMealAllergies', 'mealPlannerCopy', 'mealPlannerNavigationCopy',
  'mealPlannerFastCopy', 'mealPlannerFormCopy', 'mealPlanRecipeAllowed', 'renderMealPlan',
  'renderSavedMealPlans', 'localizeCopy', 'getMacroLabels'].map(fn).join('\n');
const handlers = [
  handler('replaceMealPlanMeal', '  window.saveMealPlan ='),
  handler('showSavedMealPlan', '  window.viewMealPlanDay ='),
  handler('viewMealPlanDay', '  window.openMealPlanShoppingList ='),
  handler('openMealPlanShoppingList', '  window.deleteMealPlan ='),
  handler('addMealPlanMealToDiary', '  async function setBodyTrackingEnabled(')
].join('\n');
const inputs = ['food-selected-date', 'food-entry-meal-type', 'food-entry-name', 'food-entry-quantity',
  'food-entry-unit', 'food-entry-calories', 'food-entry-protein', 'food-entry-carbs', 'food-entry-fat', 'food-entry-note'];
const fixture = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/styles.css"></head><body>
<main><div id="meal-planner-result" class="meal-planner-result"></div><div id="meal-planner-saved-list"></div></main>
<div hidden>${inputs.map(id => '<input id="' + id + '">').join('')}</div><script type="module">
import {MEAL_CURRENCIES,MEAL_DIETS,getMealRecipe,getMealRecipeName,recipeNutrition,recipeIngredients,eligibleMealRecipes,mealPlanTotals,buildMealPlan,replaceMealInPlan,validStoredMealPlan} from '/meal-planner.js';
import {translateText,canonicalUiText,LOCALES} from '/ui-i18n.js';
let language='sr',activeMealPlan=null,activeMealPlanOptions=null,activeMealPlanDayIndex=0,savedMealPlans=[];
const currentUser={uid:'test-A'},currentProfileData={foodAllergies:''};
const getCurrentLanguage=()=>language,getCurrentLocale=()=>LOCALES[language];
const translateUiText=(value,lang=language)=>translateText(value,lang),getCanonicalTranslationSource=canonicalUiText;
const ShowToast=()=>{},persistMealPlanDraft=()=>{window.draft=structuredClone({plan:activeMealPlan,dayIndex:activeMealPlanDayIndex});};
const loadFoodEntriesForSelectedDay=async()=>{};window.openFoodEntryModal=()=>{window.diaryOpened=true;};
${helpers}
${handlers}
const base={goal:'maintain',startDate:'2026-10-09',people:2,dayCount:7,mealCount:3,budget:1000,currency:'EUR',diet:'none',highProtein:false,simpleOnly:false,maxMinutes:60,allergies:'',disliked:''};
window.seed=(lang='sr',diet='none')=>{language=lang;document.documentElement.lang=lang;activeMealPlanOptions={...base,diet};activeMealPlan={...buildMealPlan(activeMealPlanOptions),...activeMealPlanOptions,userId:currentUser.uid,createdAt:'2026-10-09T12:00:00Z'};activeMealPlanDayIndex=0;renderMealPlan();};
window.state=()=>structuredClone({plan:activeMealPlan,dayIndex:activeMealPlanDayIndex});
window.reopen=()=>{savedMealPlans=[{...activeMealPlan,id:'saved-test'}];window.showSavedMealPlan('saved-test');};
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const d=Number(b.dataset.dayIndex),m=Number(b.dataset.mealIndex);switch(b.dataset.action){case 'view-previous-meal-plan-day':window.viewMealPlanDay(-1);break;case 'view-next-meal-plan-day':window.viewMealPlanDay(1);break;case 'replace-meal-plan-meal':window.replaceMealPlanMeal(d,m);break;case 'open-meal-plan-shopping-list':window.openMealPlanShoppingList();break;case 'add-meal-plan-meal-to-diary':window.addMealPlanMealToDiary(d,m);break;}});
window.seed();window.ready=true;
</script></body></html>`;
const browser = await chromium.launch({ headless:true, executablePath:process.env.GYMLEADER_BROWSER_EXECUTABLE });
let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
try {
  const context=await browser.newContext();
  const errors=[];
  await context.route('**/*', async route=>{
    const url=new URL(route.request().url());
    assert.equal(url.hostname,'gymleader.test','no external requests');
    if(url.pathname==='/')return route.fulfill({body:fixture,contentType:'text/html'});
    const local=path.resolve(root,'.'+url.pathname);
    assert.ok(local.startsWith(root+path.sep));
    return route.fulfill({path:local,contentType:local.endsWith('.css')?'text/css':'text/javascript'});
  });
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('https://gymleader.test/');
  await page.waitForFunction(()=>window.ready);
  for(const lang of ['sr','bs','hr','en','de','fr','it','es'])for(const width of [360,390,768,1024,1440]){
    await page.setViewportSize({width,height:900});
    await page.evaluate(lang=>window.seed(lang),lang);
    check(await page.locator('.meal-planner-day').count()===1,lang+' one visible day');
    check(await page.locator('.meal-planner-meal').count()===3,lang+' all meals visible');
    check(await page.locator('.meal-planner-meal-details[open]').count()===0,lang+' ingredients initially collapsed');
    const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
      clipped:[...document.querySelectorAll('#meal-planner-result button')].some(b=>b.scrollWidth>b.clientWidth),
      targets:[...document.querySelectorAll('.meal-planner-meal-actions button')].every(b=>b.getBoundingClientRect().height>=44),
      rows:[...document.querySelectorAll('.meal-planner-meal')].map(x=>x.getBoundingClientRect().top)}));
    check(!layout.overflow&&!layout.clipped&&layout.targets,lang+' readable actions at '+width);
    check(layout.rows.every((top,i)=>!i||top>layout.rows[i-1]),lang+' single-column meal rows at '+width);
    const before=await page.evaluate(()=>window.state());
    const summary=page.locator('.meal-planner-meal-details summary').first();
    await summary.focus();await page.keyboard.press('Enter');
    check(await page.locator('.meal-planner-meal-details[open]').count()===1,'keyboard opens ingredients');
    check(await page.locator('.meal-planner-meal-portions').first().isVisible(),'portions visible on selection');
    await page.keyboard.press('Enter');
    assert.deepEqual(await page.evaluate(()=>window.state()),before,'opening details does not alter plan');checks++;
    await page.locator('[data-action="view-next-meal-plan-day"]').click();
    check((await page.evaluate(()=>window.state())).dayIndex===1,'next day handler');
    check(await page.locator('[data-action="replace-meal-plan-meal"]').first().getAttribute('data-day-index')==='1','actions refer to selected day');
    check((await page.evaluate(()=>window.draft)).dayIndex===1,'day selection persisted');
    await page.locator('[data-action="view-previous-meal-plan-day"]').click();
    assert.deepEqual(await page.evaluate(()=>window.state()),before,'day navigation preserves plan');checks++;
  }
  for(const diet of ['none','vegetarian','vegan','halal','orthodox_fast_water','orthodox_fast_oil','orthodox_fast_fish']){
    await page.evaluate(diet=>window.seed('en',diet),diet);
    check(await page.locator('[data-action="replace-meal-plan-meal"]').count()===3,diet+' permitted meal actions');
    const before=await page.evaluate(()=>window.state());
    await page.locator('[data-action="replace-meal-plan-meal"]').first().click();
    const after=await page.evaluate(()=>window.state());
    check(before.plan.days[0].meals[0].recipeId!==after.plan.days[0].meals[0].recipeId,diet+' actual replacement');
    check(after.plan.diet===diet&&after.plan.userId==='test-A',diet+' restrictions/owner preserved');
  }
  await page.evaluate(()=>window.seed('en'));
  await page.locator('[data-action="open-meal-plan-shopping-list"]').click();
  check(await page.locator('.meal-shopping-list li').count()>0,'shopping list uses actual catalogue');
  check(await page.locator('.meal-shopping-list li').evaluateAll(items=>items.every(x=>x.querySelector('span').textContent.length>0)),'shopping quantities displayed');
  await page.evaluate(()=>document.getElementById('meal-planner-shopping-modal').remove());
  await page.locator('[data-action="add-meal-plan-meal-to-diary"]').first().click();
  await page.waitForFunction(()=>window.diaryOpened);
  check(Number(await page.locator('#food-entry-calories').inputValue())>0,'diary opens with catalogue calories');
  check(await page.locator('#food-selected-date').inputValue()==='2026-10-09','diary targets selected plan date');
  await page.evaluate(()=>window.reopen());
  check(await page.locator('[data-action="save-meal-plan"]').count()===0,'saved plan hides save action');
  check(await page.locator('.meal-planner-meal').count()===3,'saved plan reopens with all meals');
  assert.deepEqual(errors,[],'no browser errors');
  console.log('PASS: '+checks+' meal UI/action checks; eight languages, five widths, all seven diets. Firebase/storage integrations mocked.');
  await context.close();
} finally {await browser.close();}
