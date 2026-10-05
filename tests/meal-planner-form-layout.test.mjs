import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = fs.readFileSync(new URL('../javascript.js', import.meta.url), 'utf8');

function section(id) {
  const start = html.indexOf(id);
  assert.ok(start >= 0, `Missing ${id}`);
  const end = html.indexOf('</section>', start);
  assert.ok(end > start, `Unclosed section containing ${id}`);
  return html.slice(start, end);
}

const basics = section('meal-planner-basics-title');
const restrictions = section('meal-planner-restrictions-title');
const advanced = html.slice(html.indexOf('class="meal-planner-advanced"'), html.indexOf('</details>', html.indexOf('class="meal-planner-advanced"')));

for (const id of ['goal', 'start', 'people', 'days', 'count', 'diet', 'budget', 'currency', 'minutes']) {
  assert.match(basics, new RegExp(`id="meal-plan-${id}"`), `Basic plan field meal-plan-${id} stays visible`);
}
for (const id of ['allergies', 'disliked']) {
  assert.match(restrictions, new RegExp(`id="meal-plan-${id}"`), `Restriction meal-plan-${id} stays visible and strict`);
}
for (const id of ['high-protein', 'simple']) {
  assert.match(advanced, new RegExp(`id="meal-plan-${id}"`), `Optional field meal-plan-${id} is grouped under More options`);
}

assert.match(html, /id="meal-planner-disclaimer"[^>]*>Plan, nutritivne vrijednosti i cijene su procjene iz GymLeader kataloga\./);
assert.match(html, /Ne računa lični kalorijski cilj niti daje nutritivnu preporuku\./);
assert.match(source, /document\.getElementById\('meal-plan-start'\)\.value = todayForDateInput\(\);/);
assert.match(source, /refreshMealPlannerFormCopy\(\);/);
assert.match(source, /escapeHtml\(mealPlannerFormCopy\(\)\.disclaimer\)/);

console.log('PASS: Meal Planner keeps basic fields and strict restrictions visible, puts optional choices in More options, defaults to today, and states catalogue estimates.');
