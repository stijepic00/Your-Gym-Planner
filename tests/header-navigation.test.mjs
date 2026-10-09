// Isolated browser component test: real header/CSS/locale functions, mocked
// business renderers. All requests are local fixtures; no Firebase or accounts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.GYMLEADER_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'javascript.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const header=html.match(/<header class="app-header">[\s\S]*?<\/header>/)[0];
const names=['getCurrentLanguage','getCanonicalTranslationSource','translateUiText','localizeElement','localizeSubtree','localizeTextNode','observeLocalization','getLoadingCopy','applyLanguage','changeAppLanguage','initializeHeaderNavigation'];
const functions=names.map(name=>{
  const start=source.indexOf('  function '+name+'(');
  const firstLine=source.slice(start,source.indexOf('\n',start)).trimEnd();
  if(firstLine.endsWith('}'))return firstLine;
  const match=source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'));
  assert.ok(match,'actual function found: '+name); return match[0];
}).join('\n');
assert.match(source,/case 'set-language':\s*changeAppLanguage\(button.dataset.language\)/);
const fixture=`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/styles.css"><script>window.GymLeaderBootHandlerInstalled=true</script><script src="/language-boot.js"></script></head><body class="app-navigation-shell">${header}<main style="min-height:1800px"><h1 id="fixture-heading">Jezik aplikacije</h1><button class="language-option" data-action="set-language" data-language="en">English</button><button id="outside">Outside</button></main><script type="module">
import {SUPPORTED_LANGUAGES,translateText,canonicalUiText} from '/ui-i18n.js';
const localizedTextSources=new WeakMap(),localizedTextLastApplied=new WeakMap(),localizedAttributeSources=new WeakMap(),localizedAttributeLastApplied=new WeakMap();
const activeMealPlan=null,generatedPlanSuggestions=[];
const noop=()=>{};
const applyTheme=noop,updateAuthModePresentation=noop,renderDashboard=noop,renderSavedMealPlans=noop,refreshLanguageSensitiveSettingsSummaries=noop,refreshMealPlannerFastCopy=noop,updatePlanGeneratorConfiguration=noop,renderProfileWizardControls=noop,renderProfileWizardReview=noop,updateProfilePreferenceButtons=noop,renderExerciseLibraryPicker=noop,refreshExerciseNameDisplays=noop;
${functions}
applyLanguage(getCurrentLanguage());localizeSubtree();initializeHeaderNavigation();observeLocalization();
// Same existing delegated set-language branch; unrelated app flows excluded.
document.addEventListener('click',event=>{const button=event.target.closest('[data-action="set-language"]');if(button)changeAppLanguage(button.dataset.language);});
window.fixtureReady=true;
</script></body></html>`;
const browser=await chromium.launch({headless:true,executablePath:process.env.GYMLEADER_BROWSER_EXECUTABLE});
let checks=0;const errors=[];
const check=(x,m)=>{assert.ok(x,m);checks++;};
try {
 const ctx=await browser.newContext({viewport:{width:390,height:800},locale:'en-GB'});
 await ctx.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='info.gymleader.app'){
   if(u.pathname==='/language.js')return route.fulfill({path:path.join(root,'public-site/language.js'),contentType:'text/javascript'});
   return route.fulfill({body:'<!doctype html><html lang="it"><head><script src="/language.js"></script></head><body>Info</body></html>',contentType:'text/html'});
  }
  if(u.pathname==='/')return route.fulfill({body:fixture,contentType:'text/html'});
  const local=path.resolve(root,'.'+u.pathname);assert.ok(local.startsWith(root+path.sep));
  return route.fulfill({path:local,contentType:local.endsWith('.css')?'text/css':local.endsWith('.js')?'text/javascript':'image/png'});
 });
 const page=await ctx.newPage();page.on('pageerror',e=>{errors.push(e.message);console.error('Fixture error:',e.message);});
 await page.goto('https://gymleader.app/');await page.waitForFunction(()=>window.fixtureReady);
 const nativeNames={bs:'Bosanski',sr:'Srpski',hr:'Hrvatski',en:'English',de:'Deutsch',fr:'Français',it:'Italiano',es:'Español'};
 for(const [code,nativeName] of Object.entries(nativeNames)){
  await page.locator('#app-menu-toggle').click();await page.locator('#app-header-language summary').click();
  await page.locator(`.header-language-choice[data-language="${code}"]`).click();
  check(await page.evaluate(()=>localStorage.getItem('gym-language'))===code,'real handler updates existing storage: '+code);
  check((await ctx.cookies()).find(x=>x.name==='gymleader-language').value===code,'shared cookie: '+code);
  check(await page.locator('#app-header-language-name').textContent()===nativeName,'native selected name: '+code);
  check(await page.locator('.header-language-choice[aria-pressed="true"]').count()===1,'one selected locale: '+code);
  check(await page.locator('#app-menu-toggle').getAttribute('aria-expanded')==='false','selection closes menu: '+code);
  check(await page.locator('#app-menu-toggle').evaluate(x=>x===document.activeElement),'selection returns focus: '+code);
  await page.locator('#app-menu-toggle').click();
  check(await page.locator('#app-info-link').textContent().then(x=>x.includes('GymLeader')),'translated info label: '+code);
  const state=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth,cut:[...document.querySelectorAll('.app-header summary,.app-info-link,.header-language-choice')].some(x=>x.scrollWidth>x.clientWidth+1)}));
  check(state.scroll<=state.width&&!state.cut,'header readable without overflow: '+code);
  await page.keyboard.press('Escape');
 }
 for(const width of [360,390,768,1024,1440]){
  await page.setViewportSize({width,height:800});
  if(width<=1000){
   await page.evaluate(()=>window.scrollTo({top:200,behavior:'instant'}));
   const position=()=>page.evaluate(()=>({y:window.scrollY,h:document.querySelector('.app-header').getBoundingClientRect().height,main:document.querySelector('main').getBoundingClientRect().top}));
   const before=await position();await page.locator('#app-menu-toggle').focus();await page.keyboard.press('Enter');
   assert.deepEqual(await position(),before,'opening preserves layout '+width);checks++;
   const summaryBox=await page.locator('#app-header-language summary').boundingBox();await page.mouse.click(summaryBox.x+summaryBox.width/2,summaryBox.y+summaryBox.height/2);assert.deepEqual(await position(),before,'nested list overlays '+width);checks++;
   await page.keyboard.press('Escape');check(await page.locator('#app-menu-toggle').getAttribute('aria-expanded')==='true','first Escape closes locale');
   await page.keyboard.press('Escape');assert.deepEqual(await position(),before,'closing preserves scroll '+width);checks++;
   await page.locator('#app-menu-toggle').click();await page.locator('#outside').click();check(await page.locator('#app-menu-toggle').getAttribute('aria-expanded')==='false','outside click closes '+width);
   await page.locator('#app-menu-toggle').click();await page.locator('#outside').focus();check(await page.locator('#app-menu-toggle').getAttribute('aria-expanded')==='false','focus exits panel '+width);
  }else{
   await page.locator('#app-header-navigation').waitFor({state:'visible'});
   check(await page.locator('#app-menu-toggle').isHidden(),'desktop hamburger hidden');check(await page.locator('#app-header-navigation').isVisible(),'desktop navigation visible');
   await page.locator('#app-header-language summary').click();await page.locator('.header-language-choice[data-language="fr"]').click();
   check(await page.locator('#fixture-heading').textContent()==='Langue de l’application','actual translation immediately applied');
  }
  check(await page.evaluate(()=>document.querySelector('.app-header').scrollWidth<=document.querySelector('.app-header').clientWidth),'header fits '+width);
 }
 await page.setViewportSize({width:1024,height:800});
 await page.locator('#app-header-navigation').waitFor({state:'visible'});
 for(const [code,nativeName] of Object.entries(nativeNames)){
  await page.locator('#app-header-language summary').click();
  await page.locator(`.header-language-choice[data-language="${code}"]`).click();
  check(await page.locator('#app-header-language-name').textContent()===nativeName,'desktop locale: '+code);
  check(await page.locator('.app-header').evaluate(x=>x.scrollWidth<=x.clientWidth),'desktop header fits: '+code);
  check(await page.locator('#app-info-link').evaluate(x=>x.scrollWidth<=x.clientWidth),'desktop link readable: '+code);
 }
 await page.locator('#user-email-display').evaluate(x=>{x.style.display='';x.textContent='Long user nickname for layout check';});
 await page.setViewportSize({width:360,height:800});
 await page.locator('#app-menu-toggle').waitFor({state:'visible'});
 check(await page.locator('.app-header').evaluate(x=>x.scrollWidth<=x.clientWidth),'mobile header with user pill fits');
 await page.locator('#user-email-display').evaluate(x=>{x.style.display='none';});
 await page.setViewportSize({width:390,height:300});await page.locator('#app-menu-toggle').click();await page.locator('#app-header-language summary').click();
 check(await page.locator('#app-header-navigation').evaluate(x=>x.scrollHeight>x.clientHeight),'short app panel scrolls');
 await page.setViewportSize({width:390,height:800});await page.screenshot({path:path.join(root,'public-site/checks/app-menu-mobile.png')});
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 await page.locator('.language-option').click();check(await page.locator('#app-header-language-name').textContent()==='English','settings handler updates header');
 await page.locator('#app-menu-toggle').click();await page.locator('#app-header-language summary').click();await page.locator('.header-language-choice[data-language="it"]').click();
 await page.locator('#app-menu-toggle').click();await page.locator('#app-info-link').click();
 check((await ctx.cookies()).find(x=>x.name==='gymleader-language').value==='it','info link carries visible app locale');
 await page.goto('https://gymleader.app/');await page.waitForFunction(()=>window.fixtureReady);
 check(await page.locator('#app-header-language-name').textContent()==='Italiano','app boot retains shared locale');
 await page.setViewportSize({width:1440,height:800});await page.screenshot({path:path.join(root,'public-site/checks/app-header-desktop.png')});
 assert.deepEqual(errors,[],'no browser errors');
 console.log('PASS: '+checks+' app header checks; actual locale functions; eight languages, five widths, keyboard, overlay, cookie. Auth/business flows not exercised.');
 await ctx.close();
}finally{await browser.close();}
