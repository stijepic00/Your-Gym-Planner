import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

assert.match(css, /@media \(max-width: 480px\)[\s\S]*?\.dashboard-summary-grid \{ grid-template-columns: 1fr; \}/);
assert.match(css, /@media \(max-width: 480px\)[\s\S]*?\.meal-planner-saved-item > span \{ display: flex; flex-wrap: wrap;/);
assert.match(css, /#view-active-workout > \.flex-between > div \{ display: grid !important; grid-template-columns: repeat\(2,minmax\(0,1fr\)\);/);
assert.match(css, /\.settings-option-row:has\(\.settings-option-value\) \{ grid-template-columns: 40px minmax\(0,1fr\) auto;/);

console.log('PASS: narrow dashboard summaries, active-workout actions, saved-plan actions and long Settings values receive responsive layouts.');
