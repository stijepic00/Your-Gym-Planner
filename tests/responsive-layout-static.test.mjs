import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

assert.match(css, /@media \(max-width: 480px\)[\s\S]*?\.dashboard-summary-grid \{ grid-template-columns: 1fr; \}/);
assert.match(css, /@media \(max-width: 480px\)[\s\S]*?\.meal-planner-saved-item > span \{ display: flex; flex-wrap: wrap;/);
assert.match(css, /#view-active-workout > \.flex-between > div \{ display: grid !important; grid-template-columns: repeat\(2,minmax\(0,1fr\)\);/);
assert.match(css, /\.settings-option-row:has\(\.settings-option-value\) \{ grid-template-columns: 40px minmax\(0,1fr\) auto;/);

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.match(html, /<button id="dashboard-primary-action"[\s\S]*?<\/button>\s*<a id="dashboard-guide-link" class="dashboard-guide-link"/);
assert.match(css, /\.dashboard-guide-link[\s\S]*?min-height: 44px/);
assert.match(css, /\.dashboard-guide-link:focus-visible[\s\S]*?outline: 2px solid/);
assert.match(css, /\.app-header-language summary\{[^}]*min-width:200px[^}]*linear-gradient/);
assert.match(css, /#app-header-language-name\{[^}]*border-radius:9px[^}]*font-weight:750/);
assert.match(html, /<summary aria-label="Izbor jezika aplikacije"><svg aria-hidden="true"/);

console.log('PASS: narrow dashboard summaries, active-workout actions, saved-plan actions and long Settings values receive responsive layouts.');
