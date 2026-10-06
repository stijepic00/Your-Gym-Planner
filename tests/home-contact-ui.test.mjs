import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { TRANSLATIONS } from '../translations.js';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const script = fs.readFileSync(new URL('../javascript.js', import.meta.url), 'utf8');
const languages = ['sr', 'bs', 'hr', 'en', 'de', 'fr', 'it', 'es'];

test('Home value card replaces the coming-soon claim with implemented features', () => {
  assert.match(html, /id="dashboard-value-card"/);
  assert.doesNotMatch(html, /dashboard-coming-soon|USKORO|pam(et|e)tniji planovi za teretane/i);
  assert.match(html, /Trening i ishrana, na jednom mjestu/);
  assert.match(html, /bilježi kilaže i ponavljanja/);
  assert.match(html, /dnevnik hrane/);
  assert.match(html, /Meal Planner/);
  assert.doesNotMatch(script, /dashboard-coming-soon/);
  for (const phrase of [
    'Trening i ishrana, na jednom mjestu',
    'Napravi i ponavljaj rutine, bilježi kilaže i ponavljanja, prati napredak, vodi dnevnik hrane i koristi Meal Planner za prijedloge obroka.'
  ]) {
    for (const language of languages) assert.ok(language === 'sr' ? phrase : TRANSLATIONS[language]?.[phrase], `${phrase} should be translated for ${language}`);
  }
});

test('Home support button opens contact card with visible address and two email options', () => {
  assert.match(html, /<button id="dashboard-support-link" class="dashboard-contact-fab" type="button" aria-label="Kontaktirajte nas" aria-controls="dashboard-support-note" aria-expanded="false">/);
  assert.match(html, /<span>Kontaktirajte nas<\/span>/);
  assert.match(html, /class="dashboard-support-address" data-no-translate>gymleaderapp@gmail.com/);
  const match = html.match(/<a href="(mailto:[^"]+)">Otvori email aplikaciju<\/a>/);
  assert.ok(match);
  const href = match[1];
  assert.ok(href.startsWith('mailto:gymleaderapp@gmail.com?subject='));
  assert.equal(decodeURIComponent(href.split('subject=')[1]), 'Pitanje ili prijedlog za GymLeader');
  for (const phrase of ['GymLeader podrška', 'Zatvori poruku podrške', 'Kontaktirajte nas', 'Imate prijedlog, problem ili sugestiju? Nešto vam nije jasno, komplikovano je ili ne radi? Pišite nam na email — vaše poruke nam pomažu da poboljšamo GymLeader.', 'Otvori email aplikaciju', 'Otvori Gmail']) {
    for (const language of languages) assert.ok(language === 'sr' ? phrase : TRANSLATIONS[language]?.[phrase], `${phrase} should be translated for ${language}`);
  }
  assert.match(html, /https:\/\/mail\.google\.com\/mail\/\?view=cm&amp;fs=1&amp;to=gymleaderapp%40gmail.com&amp;su=Pitanje%20ili%20prijedlog%20za%20GymLeader/);
  assert.match(script, /dashboard-support-link'\)\?\.addEventListener\('click', \(\) => \{[\s\S]*?showDashboardSupportNote\(\);/);
  assert.match(script, /setAttribute\('aria-expanded', 'true'\)/);
});

test('Contact button has visible keyboard focus and stays above bottom navigation', () => {
  assert.match(css, /\.dashboard-contact-fab:focus-visible\s*\{/);
  assert.match(css, /\.dashboard-support\s*\{[^}]*position:\s*fixed;[^}]*z-index:\s*110;[^}]*bottom:\s*calc\(var\(--nav-height\)/s);
  assert.match(css, /\.dashboard-support\s*\{[^}]*right:\s*max\(/s);
  assert.match(css, /\.dashboard-support-note\s*\{[^}]*width:\s*min\(310px, calc\(100vw - 28px\)\)/s);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.ok(html.indexOf('id="dashboard-support"') > html.indexOf('</main>'), 'fixed support must not be inside the transformed Home view');
  assert.match(script, /const onHome = tabId === 'dashboard' && Boolean\(currentUser\);[\s\S]*?support\.hidden = !onHome;/);
  assert.match(script, /event\.key === 'Escape'/);
});

test('Desktop support contact uses a rounded translucent horizontal label', () => {
  assert.match(css, /@media \(min-width: 1200px\)\s*\{\s*\.dashboard-support\s*\{[^}]*bottom:\s*calc\(18px/s);
  assert.match(css, /\.dashboard-contact-fab\s*\{[^}]*flex-direction:\s*row-reverse/s);
  assert.match(css, /\.dashboard-contact-fab span\s*\{[^}]*border-radius:\s*999px;[^}]*backdrop-filter:\s*blur\(14px\)/s);
  assert.match(css, /\.dashboard-support-note\s*\{[^}]*backdrop-filter:\s*blur\(16px\)/s);
});

test('Support invitation is shown at most twice per account with a seven-day gap', () => {
  assert.match(script, /DASHBOARD_SUPPORT_WAIT_MS = 30000/);
  assert.match(script, /DASHBOARD_SUPPORT_REPEAT_MS = 7 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(script, /gymleader-support-nudge-v1:\$\{currentUser\.uid\}/);
  assert.match(script, /state\.count >= 2/);
  assert.match(script, /localStorage\.setItem\(key, JSON\.stringify\(nextState\)\)/);
  assert.match(script, /if \(onHome\) scheduleDashboardSupportNote\(\);\s*else hideDashboardSupportNote\(\);/);
});
