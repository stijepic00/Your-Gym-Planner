// Runs in an isolated headless browser. Never touches accounts or production.
// Uses an existing Playwright installation; the deployed site has no dependencies.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.GYMLEADER_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = path.resolve(root, '..');
const codes = ['bs','sr','hr','en','de','fr','it','es'];
const sectionSlugs={bs:{features:'mogucnosti',how:'kako-radi',faq:'cesta-pitanja',contact:'kontakt'},sr:{features:'mogucnosti',how:'kako-radi',faq:'cesta-pitanja',contact:'kontakt'},hr:{features:'znacajke',how:'kako-funkcionira',faq:'cesta-pitanja',contact:'kontakt'},en:{features:'features',how:'how-it-works',faq:'faq',contact:'contact'},de:{features:'funktionen',how:'so-funktioniert-es',faq:'faq',contact:'kontakt'},fr:{features:'fonctionnalites',how:'comment-ca-marche',faq:'faq',contact:'contact'},it:{features:'funzionalita',how:'come-funziona',faq:'domande-frequenti',contact:'contatti'},es:{features:'funciones',how:'como-funciona',faq:'preguntas-frecuentes',contact:'contacto'}};
const origin = 'https://info.gymleader.app';
const failures = [];
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions++; }
const browser = await chromium.launch({headless:true, ...(process.env.GYMLEADER_BROWSER_EXECUTABLE ? {executablePath:process.env.GYMLEADER_BROWSER_EXECUTABLE} : {})});
async function context(options = {}) {
  const ctx = await browser.newContext(options);
  await ctx.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'gymleader.app') {
      if (url.pathname === '/language-boot.js') return route.fulfill({path:path.join(appRoot,'language-boot.js'),contentType:'text/javascript'});
      return route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><script>window.GymLeaderBootHandlerInstalled=true</script></head><body><script src="/language-boot.js"></script></body></html>'});
    }
    if (url.hostname !== 'info.gymleader.app') throw new Error('Unexpected external request: ' + url.href);
    const local = path.resolve(root, '.' + decodeURIComponent(url.pathname) + (url.pathname.endsWith('/') ? 'index.html' : ''));
    check(local.startsWith(root + path.sep), 'path stays in public-site');
    if (!fs.existsSync(local)) { failures.push('Missing request: ' + url.pathname); return route.fulfill({status:404,body:'Not found'}); }
    const type = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.xml':'application/xml'}[path.extname(local)] || 'text/plain';
    return route.fulfill({path:local,contentType:type});
  });
  return ctx;
}
try {
  const ctx = await context({locale:'en-GB'});
  const page = await ctx.newPage();
  page.on('pageerror', error => failures.push(error.message));
  const titles = new Set(), descriptions = new Set(), canonicalPages = [];
  for (const code of codes) {
    for (const kind of ['index','terms','privacy']) {
      const url = `${origin}/${code}/${kind === 'index' ? '' : kind + '.html'}`;
      await page.goto(url);
      const info = await page.evaluate(() => ({
        lang:document.documentElement.lang,
        title:document.title,
        description:document.querySelector('meta[name="description"]').content,
        canonical:document.querySelector('link[rel="canonical"]').href,
        alternates:[...document.querySelectorAll('link[hreflang]')].map(x=>[x.hreflang,x.href]),
        ctas:[...document.querySelectorAll('a.button:not([href^="mailto:"])')].map(x=>x.href),
        faq:[...document.querySelectorAll('.faq-list details')].map(x=>[x.querySelector('summary').textContent,x.querySelector('p').textContent]),
        sectionNavigation:[...document.querySelectorAll('#site-navigation>a[href^="#"]')].map(x=>[x.getAttribute('href').slice(1),x.textContent.trim()]),
        sectionIds:[...document.querySelectorAll('main>section[id]')].map(x=>x.id),
        localAnchors:[...document.querySelectorAll('main a[href^="#"]')].map(x=>x.getAttribute('href').slice(1)),
        schema:[...document.querySelectorAll('script[type="application/ld+json"]')].map(x=>JSON.parse(x.textContent)),
        links:[...document.querySelectorAll('a[href],link[href],script[src],img[src],source[srcset]')].map(x=>x.href||x.src||x.srcset).filter(Boolean)
      }));
      check(info.lang === code, 'correct document language: ' + url);
      if(kind==='index'){
        const slugs=sectionSlugs[code];
        assert.deepEqual(info.sectionNavigation.map(x=>x[0]),[slugs.features,slugs.how,slugs.faq,slugs.contact],`${code}: navigation fragments are localized`);assertions++;
        for(const slug of Object.values(slugs))check(info.sectionIds.includes(slug),`${code}: localized section id ${slug}`);
        for(const slug of info.localAnchors)check(info.sectionIds.includes(slug),`${code}: same-page anchor resolves ${slug}`);
        await page.setViewportSize({width:1024,height:960});
        for(let index=0;index<4;index++){
          const target=slugs[['features','how','faq','contact'][index]];
          await page.locator('#site-navigation>a[href^="#"]').nth(index).click();
          check(new URL(page.url()).hash==='#'+target,`${code}: navigation opens localized #${target}`);
          check(await page.evaluate(()=>Boolean(document.querySelector(location.hash))),`${code}: localized target exists after navigation`);
        }
      }
      check(info.canonical === url, 'self-canonical: ' + url);
      canonicalPages.push(url);
      check(info.alternates.length === 9, 'eight languages plus x-default: ' + url);
      for (const target of codes) check(info.alternates.some(([lang,href])=>lang===target&&href===`${origin}/${target}/${kind==='index'?'':kind+'.html'}`), 'reciprocal alternate: '+url+' -> '+target);
      check(info.ctas.every(x=>x==='https://gymleader.app/'), 'app destinations: '+url);
      for (const link of info.links) {
        const parsed = new URL(link, url);
        if (parsed.origin !== origin) continue;
        const local = path.resolve(root, '.' + parsed.pathname + (parsed.pathname.endsWith('/')?'index.html':''));
        check(fs.existsSync(local), 'local target exists: ' + link);
      }
      if(kind==='index')await page.evaluate(()=>{history.replaceState(null,'',location.pathname);window.scrollTo({top:0,behavior:'instant'});});
      if (kind === 'index') {
        titles.add(info.title); descriptions.add(info.description);
        const faq = info.schema[0]['@graph'].find(x=>x['@type']==='FAQPage');
        assert.deepEqual(faq.mainEntity.map(x=>[x.name,x.acceptedAnswer.text]),info.faq);
        check(info.faq.length===7, 'visible FAQs match structured data');
        for (const width of [360,390,768,1024,1440]) {
          await page.setViewportSize({width,height:960});
          const layout = await page.evaluate(() => ({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,over:[...document.querySelectorAll('h1,h2,h3,.button,.hero-phrase')].filter(x=>x.scrollWidth>x.clientWidth+1).map(x=>x.textContent)}));
          check(layout.scroll<=layout.width, `${code} ${width}: no horizontal overflow`);
          check(layout.over.length===0, `${code} ${width}: readable headings/buttons ${layout.over}`);
          if (width < 761) {
            await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
            const position = () => page.evaluate(() => ({ y:window.scrollY, header:document.querySelector('.site-header').getBoundingClientRect().height, hero:document.querySelector('.hero').getBoundingClientRect().top }));
            const samePosition = (actual, expected, label) => { check(actual.header===expected.header&&Math.abs(actual.y-expected.y)<=2&&Math.abs(actual.hero-expected.hero)<=2,label); };
            const closed = await position();
            await page.locator('.menu-toggle').click();
            samePosition(await position(), closed, `${code} ${width}: opening does not move header or hero`);
            await page.locator('.language-menu summary').click();
            samePosition(await position(), closed, `${code} ${width}: language menu does not move hero`);
            await page.keyboard.press('Escape');
            check(await page.locator('.menu-toggle').getAttribute('aria-expanded')==='true','nested Escape closes language list first');
            await page.keyboard.press('Escape');
            samePosition(await position(), closed, `${code} ${width}: closing preserves position`);
          }
        }
      } else {
        await page.setViewportSize({width:360,height:960});
        check(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth), 'legal narrow viewport: '+url);
        const legalBefore = await page.locator('.legal-page').boundingBox();
        await page.locator('.language-menu summary').click();
        assert.deepEqual(await page.locator('.legal-page').boundingBox(), legalBefore, 'legal language dropdown overlays content'); assertions++;
        await page.keyboard.press('Escape');
      }
    }
  }
  check(titles.size===8&&descriptions.size===8, 'unique titles/descriptions per language');
  const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
  const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(x=>x[1]);
  check(urls.length===27&&new Set(urls).size===27, '27 unique public sitemap entries');
  check(canonicalPages.every(x=>urls.includes(x)), 'sitemap covers all translations');

  await page.goto(origin+'/de/');
  await page.setViewportSize({width:360,height:960});
  await page.getByRole('button',{name:'Menü öffnen',exact:true}).focus();
  await page.keyboard.press('Enter');
  check(await page.locator('.menu-toggle').getAttribute('aria-expanded')==='true','keyboard hamburger opens');
  await page.keyboard.press('Escape');
  check(await page.locator('.menu-toggle').getAttribute('aria-expanded')==='false','Escape closes hamburger');
  await page.getByRole('button',{name:'Menü öffnen',exact:true}).click();
  await page.locator('#site-navigation a[href="#faq"]').click();
  check(await page.locator('.menu-toggle').getAttribute('aria-expanded')==='false','section link closes menu');
  await page.goto(origin+'/en/');
  await page.setViewportSize({width:1440,height:960});
  await page.locator('.language-menu summary').click();
  await page.locator('a[data-language="it"]').click();
  check(page.url()===origin+'/it/','manual language URL');
  const cookies=await ctx.cookies();
  const preference=cookies.find(x=>x.name==='gymleader-language');
  check(preference.value==='it'&&preference.secure&&preference.sameSite==='Lax'&&preference.path==='/'&&preference.domain==='.gymleader.app','shared cookie contains only valid locale and secure attributes');
  await page.goto('https://gymleader.app/');
  check(await page.evaluate(()=>localStorage.getItem('gym-language'))==='it','app boot consumes public locale');
  await page.evaluate(()=>window.GymLeaderLanguagePreference.write('fr'));
  await page.goto(origin+'/');
  await page.waitForURL(origin+'/fr/');
  check(page.url()===origin+'/fr/','root consumes app locale');
  await page.goto(origin+'/de/');
  check(page.url()===origin+'/de/','explicit URL survives another cookie language');
  await page.setViewportSize({width:1440,height:960});
  await page.locator('#site-navigation a.button').click();
  await page.waitForFunction(()=>localStorage.getItem('gym-language')==='de');
  check(await page.evaluate(()=>localStorage.getItem('gym-language'))==='de','CTA carries explicit page language instead of older cookie');
  await page.goto(origin+'/en/');
  await page.setViewportSize({width:390,height:500});
  await page.evaluate(()=>window.scrollTo({top:400,behavior:'instant'}));
  const scrolled = await page.evaluate(()=>window.scrollY);
  const toggleBox=await page.locator('.menu-toggle').boundingBox();
  await page.mouse.click(toggleBox.x+toggleBox.width/2,toggleBox.y+toggleBox.height/2);
  check(await page.evaluate(()=>window.scrollY)===scrolled, 'opening preserves scrolled position: '+scrolled+' -> '+await page.evaluate(()=>window.scrollY));
  const summaryBox=await page.locator('.language-menu summary').boundingBox();
  await page.mouse.click(summaryBox.x+summaryBox.width/2,summaryBox.y+summaryBox.height/2);
  check(await page.evaluate(()=>window.scrollY)===scrolled, 'opening language preserves scrolled position: '+scrolled+' -> '+await page.evaluate(()=>window.scrollY));
  check(await page.locator('#site-navigation').evaluate(x=>x.scrollHeight>x.clientHeight),'short screen scrolls panel internally');
  await page.locator('#site-navigation').evaluate(x=>x.scrollTop=200);
  check(await page.evaluate(()=>window.scrollY)===scrolled,'panel scroll preserves background position');
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  check(await page.evaluate(()=>window.scrollY)===scrolled,'closing preserves scrolled page');
  await page.locator('.menu-toggle').click();
  await page.locator('.site-header .brand').click();
  check(await page.locator('.menu-toggle').getAttribute('aria-expanded')==='false','header link closes mobile menu');
  await page.setViewportSize({width:390,height:800});
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.locator('.menu-toggle').click();
  await page.screenshot({path:path.join(root,'checks','public-menu-mobile.png')});
  await page.mouse.click(350,700);
  check(await page.locator('.menu-toggle').getAttribute('aria-expanded')==='false','outside click closes public menu');
  await ctx.close();

  const fallback=await context({locale:'it-IT'});
  const p=await fallback.newPage();
  await p.goto(origin+'/'); await p.waitForURL(origin+'/it/');
  check(p.url()===origin+'/it/','browser locale fallback');
  await p.goto(origin+'/en/');
  await p.evaluate(()=>localStorage.setItem('gymleader-site-language','es'));
  await p.goto(origin+'/'); await p.waitForURL(origin+'/es/');
  check(p.url()===origin+'/es/','public saved locale before browser');
  await fallback.close();
  const unknown=await context({locale:'pl-PL'}); const up=await unknown.newPage();
  await unknown.addCookies([{name:'gymleader-language',value:'bad',domain:'.gymleader.app',path:'/',secure:true,sameSite:'Lax'}]);
  await up.goto(origin+'/'); await up.waitForURL(origin+'/bs/');
  check(up.url()===origin+'/bs/','invalid cookie and unsupported browser -> bs');
  await unknown.close();

  const animation=await context({viewport:{width:1440,height:960}}); const ap=await animation.newPage();
  await ap.goto(origin+'/en/');
  check(await ap.locator('.hero-phrases').evaluate(x=>getComputedStyle(x).backgroundImage)==='none','gradient is on individual phrases, not overlapping text container');
  const before=await ap.locator('#hero-title').boundingBox();
  await ap.waitForTimeout(14000);
  check(await ap.locator('.hero-frame.is-active img').getAttribute('data-src')?.then(x=>x.includes('female')),'female after slow interval');
  check((await ap.locator('.hero-phrase.is-active').textContent())!=='Your progress.','title changes');
  const after=await ap.locator('#hero-title').boundingBox();
  check(before.height===after.height&&before.width===after.width,'stable animated title box');
  check(await ap.locator('.hero-frame.is-active img').evaluate(x=>x.currentSrc.endsWith('female-desktop.webp')),'desktop photo crop');
  await ap.getByRole('button',{name:'Pause animations',exact:true}).click();
  const pausedPhrase=await ap.locator('.hero-phrase.is-active').textContent();
  await ap.waitForTimeout(6500);
  check(await ap.locator('.hero-phrase.is-active').textContent()===pausedPhrase,'pause freezes title');
  await ap.screenshot({path:path.join(root,'checks','desktop-female.png'),fullPage:false});
  await ap.setViewportSize({width:390,height:960});
  await ap.locator('.hero-frame.is-active img').evaluate(x=>x.decode());
  check(await ap.locator('.hero-frame.is-active img').evaluate(x=>x.currentSrc.endsWith('female-mobile.webp')),'female mobile crop');
  await ap.screenshot({path:path.join(root,'checks','mobile-female.png'),fullPage:false});
  await ap.getByRole('button',{name:'Resume animations',exact:true}).click();
  await ap.evaluate(()=>{
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const hiddenPhrase=await ap.locator('.hero-phrase.is-active').textContent();
  await ap.waitForTimeout(6500);
  check(await ap.locator('.hero-phrase.is-active').textContent()===hiddenPhrase,'background visibility pauses title');
  await ap.evaluate(()=>{
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await ap.emulateMedia({reducedMotion:'reduce'});
  await ap.locator('.animation-toggle').waitFor({state:'hidden'});
  check(await ap.locator('.animation-toggle').isHidden(),'reduced motion hides animation control');
  check(await ap.locator('.hero-frame.is-active img').evaluate(x=>x.currentSrc.endsWith('male-mobile.webp')),'reduced motion resets to static mobile image');
  check(await ap.locator('.hero-phrase.is-active').textContent()==='Your progress.','reduced motion static phrase');
  await ap.screenshot({path:path.join(root,'checks','mobile.png'),fullPage:true});
  await ap.emulateMedia({reducedMotion:'no-preference'});
  await ap.setViewportSize({width:1440,height:960});
  await ap.screenshot({path:path.join(root,'checks','desktop.png'),fullPage:true});
  await animation.close();
  const reduce=await context({reducedMotion:'reduce'}); const rp=await reduce.newPage();
  await rp.goto(origin+'/en/'); await rp.waitForTimeout(1700);
  check(await rp.locator('img[data-src]').getAttribute('src')===null,'reduced motion does not download second photo');
  await reduce.close();
  const nojs=await context({javaScriptEnabled:false}); const np=await nojs.newPage();
  await np.goto(origin+'/fr/');
  check(await np.locator('h1').textContent().then(x=>x.includes('Tes routines.')),'translated content without JS');
  check(await np.locator('#site-navigation').isVisible(),'navigation without JS');
  await np.setViewportSize({width:390,height:800});
  check(await np.locator('#site-navigation').isVisible(),'mobile navigation remains usable without JS');
  check(await np.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'no-JS mobile fits');
  check(await np.locator('.hero-frame').first().evaluate(x=>getComputedStyle(x).opacity)==='1','static photo without JS');
  await nojs.close();

  // Current language handler must use the real cookie helper, not a second state.
  const appSource=fs.readFileSync(path.join(appRoot,'javascript.js'),'utf8');
  check(appSource.includes('window.GymLeaderLanguagePreference?.write(selectedLanguage);'),'app settings shares language');
  const boot=fs.readFileSync(path.join(appRoot,'language-boot.js'),'utf8');
  const storage=new Map([['gym-language','en']]); let writes=[];
  const document={cookie:'gymleader-language=invalid',documentElement:{},getElementById:()=>null};
  Object.defineProperty(document,'cookie',{get:()=> 'gymleader-language=invalid',set:v=>writes.push(v)});
  const win={location:{protocol:'https:',hostname:'gymleader.app'},addEventListener(){},setTimeout(){}};
  vm.runInNewContext(boot,{document,window:win,navigator:{languages:['it'],onLine:true},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}});
  check(storage.get('gym-language')==='en','invalid cookie preserves existing app locale');
  win.GymLeaderLanguagePreference.write('unknown');
  check(writes.every(x=>/^gymleader-language=(bs|sr|hr|en|de|fr|it|es);/.test(x)),'rejects unknown cookie values');
  assert.deepEqual(failures,[],'no missing files or browser errors');
  console.log(`PASS: ${assertions} checks; 27 pages; 8 languages × 5 viewport widths; menus, static SEO, cross-subdomain locale, fallback, animations and reduced motion.`);
} finally { await browser.close(); }
