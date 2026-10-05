import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { getLibraryExerciseById } from '../exercise-library.js';
import { exerciseKey, exerciseMatches, latestExerciseHistory, maxExerciseWeight, matchingExerciseHistory } from '../exercise-history.js';

const row = (id, userId, date, name, weight = 30, reps = 10) => ({
  id, userId, date, name: id, exercises: [{ name, sets: [{ weight, reps }] }]
});
const tuesday = row('routine-tuesday', 'A', '2026-10-06T18:00:00.000Z', 'Potisak nogama');
const thursday = row('routine-thursday', 'A', '2026-10-08T18:00:00.000Z', 'Leg press', 35, 10);

assert.equal(exerciseKey('Potisak nogama'), 'library:leg-press');
assert.equal(exerciseKey('Leg press'), 'library:leg-press');
assert.equal(exerciseKey('Beinpresse'), 'library:leg-press');
for (const name of Object.values(getLibraryExerciseById('leg-press').names)) {
  assert.equal(exerciseKey(name), 'library:leg-press');
}
assert.equal(exerciseMatches('Leg press', 'Potisak nogama'), true);

// Tuesday's completed workout is visible on Thursday, regardless of routine name.
assert.equal(latestExerciseHistory([tuesday], 'A', { name: 'Leg press', measurementType: 'weight_reps' }).sets[0].weight, 30);
assert.equal(latestExerciseHistory([tuesday], 'A', 'Leg press').sets[0].reps, 10);
assert.equal(maxExerciseWeight([tuesday], 'A', 'Leg press'), 30);

// Exercise progression uses the same cross-routine lookup as "last time".
const appSource = fs.readFileSync(new URL('../javascript.js', import.meta.url), 'utf8');
const start = appSource.indexOf('  function calculateTargetGoal(');
const end = appSource.indexOf('  function renderActiveWorkoutUI(', start);
assert.ok(start >= 0 && end > start);
const progression = {
  normalizeRoutineExercise: (exercise) => ({ repRangeMin: 8, repRangeMax: 12, weightIncrement: 5, measurementType: 'weight_reps', ...exercise }),
  getLatestExerciseLog: (exercise) => latestExerciseHistory([tuesday], 'A', exercise),
  formatNextReps: (values, maximum) => values.map((value) => Math.min(maximum, value + 1)).join('/'),
  formatGoalText: (kind, payload) => ({ kind, payload })
};
vm.createContext(progression);
vm.runInContext(appSource.slice(start, end), progression);
const suggestion = progression.calculateTargetGoal({ name: 'Leg press' });
assert.equal(suggestion.kind, 'weight-reps');
assert.equal(suggestion.payload.weight, 30);
assert.equal(suggestion.payload.nextReps, '11');

// Sorting follows workout date, not incoming array or routine order.
assert.equal(latestExerciseHistory([tuesday, thursday], 'A', 'Beinpresse').sets[0].weight, 35);
assert.equal(matchingExerciseHistory([tuesday, thursday], 'A', 'Leg press').length, 2);

// Similar names and measurement variants stay separate.
assert.notEqual(exerciseKey('Leg press'), exerciseKey('Leg extension'));
assert.notEqual(exerciseKey({ name: 'My press', measurementType: 'seconds' }), exerciseKey({ name: 'My press', measurementType: 'weight_reps' }));
assert.equal(latestExerciseHistory([row('other', 'A', '2026-10-09T18:00:00Z', 'Leg extension'), tuesday], 'A', 'Leg press').sets[0].weight, 30);

// Account isolation applies even when cached rows are accidentally mixed.
const otherUser = row('foreign', 'B', '2026-10-10T18:00:00Z', 'Leg press', 200);
assert.equal(latestExerciseHistory([otherUser, tuesday], 'A', 'Leg press').sets[0].weight, 30);
assert.equal(maxExerciseWeight([otherUser, tuesday], 'A', 'Leg press'), 30);
assert.equal(latestExerciseHistory([otherUser, tuesday], 'B', 'Leg press').sets[0].weight, 200);

// Legacy records need no new ID or migration when an exact catalogue alias is unambiguous.
assert.equal(tuesday.exercises[0].libraryExerciseId, undefined);
assert.equal(latestExerciseHistory([tuesday], 'A', { name: 'Leg press', libraryExerciseId: 'leg-press' }).sets[0].weight, 30);
assert.equal(exerciseMatches('Custom cable press', 'Custom cable press'), true);
assert.equal(exerciseMatches('Custom cable press', 'Custom machine press'), false);

console.log('PASS: cross-routine, translated, legacy and account-isolated exercise history');
