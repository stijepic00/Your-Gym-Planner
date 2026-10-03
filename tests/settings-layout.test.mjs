import assert from 'node:assert/strict';
import fs from 'node:fs';
import { translateText } from '../ui-i18n.js';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const settingsStart = html.indexOf('<section id="view-settings"');
const settingsEnd = html.indexOf('<div id="weekly-goal-settings-modal"');
const settings = settingsStart >= 0 && settingsEnd > settingsStart ? html.slice(settingsStart, settingsEnd) : '';
const expectedSections = ['Nalog', 'Tijelo i ciljevi', 'Ishrana', 'Postavke aplikacije', 'Sigurnost i privatnost', 'Upravljanje nalogom'];
const expectedActions = ['open-profile-details-editor', 'open-settings-editor', 'open-body-settings', 'open-training-goals-editor', 'open-weekly-goal-settings', 'open-food-goal-modal', 'open-legal-documents', 'logout', 'open-delete-account'];
const expectedIds = ['settings-name-initial', 'settings-name-summary', 'profile-avatar', 'settings-photo-summary', 'settings-email-summary', 'weekly-goal-settings-summary', 'settings-food-goals-summary', 'settings-language-summary', 'settings-theme-summary'];

assert.match(settings, /class="settings-sections-grid"/);
for (const heading of expectedSections) assert.match(settings, new RegExp(`>${heading.replace(/[&]/g, '\\&')}<`));
for (const action of expectedActions) assert.match(settings, new RegExp(`data-action="${action}"`));
for (const id of expectedIds) assert.match(settings, new RegExp(`id="${id}"`));
assert.match(settings, /settings-option-danger[\s\S]*data-action="open-delete-account"/);
assert.match(css, /\.settings-sections-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,/s);
assert.match(css, /@media \(max-width: 820px\)\s*\{[^}]*\.settings-sections-grid\s*\{[^}]*grid-template-columns:\s*1fr/s);
assert.match(css, /\.settings-option-row\s*\{[^}]*min-height:\s*68px/s);
assert.match(css, /\.settings-option-danger/);

for (const language of ['en', 'de', 'fr', 'it', 'es']) {
  for (const phrase of expectedSections.concat(['Upravljaj nalogom, preferencama i aplikacijom.', 'Tvoj profil i lični podaci.', 'Zaštiti svoj nalog i podatke.'])) {
    assert.notEqual(translateText(phrase, language), phrase, `${language}: ${phrase}`);
  }
}

console.log('PASS: Settings layout sections, preserved actions/IDs, responsive rules and translations.');
