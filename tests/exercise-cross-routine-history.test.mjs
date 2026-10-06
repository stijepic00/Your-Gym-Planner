import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { getLibraryExerciseById } from '../exercise-library.js';
import { exerciseKey, exerciseMatches, libraryExerciseId, latestExerciseHistory, latestExerciseNote, maxExerciseWeight, matchingExerciseHistory } from '../exercise-history.js';

const row = (id, userId, date, name, weight = 30, reps = 10) => ({
  id, userId, date, name: id, exercises: [{ name, sets: [{ weight, reps }] }]
});
const tuesday = row('routine-tuesday', 'A', '2026-10-06T18:00:00.000Z', 'Potisak nogama');
tuesday.exercises[0].sets[0].weight = 20;
tuesday.exercises[0].notes = 'Stopala malo više';
const thursday = row('routine-thursday', 'A', '2026-10-08T18:00:00.000Z', 'Leg press', 40, 8);
thursday.exercises[0].libraryExerciseId = 'leg-press';
thursday.exercises[0].notes = 'Bez zaključavanja koljena';

assert.equal(exerciseKey('Potisak nogama'), 'library:leg-press');
assert.equal(exerciseKey('Leg press'), 'library:leg-press');
assert.equal(exerciseKey('Beinpresse'), 'library:leg-press');
for (const name of Object.values(getLibraryExerciseById('leg-press').names)) {
  assert.equal(exerciseKey(name), 'library:leg-press');
}
assert.equal(exerciseMatches('Leg press', 'Potisak nogama'), true);

// Tuesday's completed workout is visible on Thursday, regardless of routine name.
assert.equal(latestExerciseHistory([tuesday], 'A', { name: 'Leg press', measurementType: 'weight_reps' }).sets[0].weight, 20);
assert.equal(latestExerciseHistory([tuesday], 'A', 'Leg press').sets[0].reps, 10);
assert.equal(maxExerciseWeight([tuesday], 'A', 'Leg press'), 20);

// Exercise progression uses the same cross-routine lookup as "last time".
const appSource = fs.readFileSync(new URL('../javascript.js', import.meta.url), 'utf8');
const start = appSource.indexOf('  function calculateTargetGoal(');
const end = appSource.indexOf('  function renderActiveWorkoutUI(', start);
assert.ok(start >= 0 && end > start);
let progressionRows = [tuesday];
const progression = {
  normalizeRoutineExercise: (exercise) => ({ repRangeMin: 8, repRangeMax: 12, weightIncrement: 5, measurementType: 'weight_reps', ...exercise }),
  getLatestExerciseLog: (exercise) => latestExerciseHistory(progressionRows, 'A', exercise),
  formatNextReps: (values, maximum) => values.map((value) => Math.min(maximum, value + 1)).join('/'),
  formatGoalText: (kind, payload) => ({ kind, payload })
};
vm.createContext(progression);
vm.runInContext(appSource.slice(start, end), progression);
const suggestion = progression.calculateTargetGoal({ name: 'Leg press' });
assert.equal(suggestion.kind, 'weight-reps');
assert.equal(suggestion.payload.weight, 20);
assert.equal(suggestion.payload.nextReps, '11');
progressionRows = [tuesday, thursday];
const nextTuesday = progression.calculateTargetGoal({ name: 'Potisak nogama', libraryExerciseId: 'leg-press' });
assert.equal(nextTuesday.payload.weight, 40);
assert.equal(nextTuesday.payload.nextReps, '9');

// Sorting follows workout date, not incoming array or routine order.
assert.equal(latestExerciseHistory([thursday, tuesday], 'A', 'Beinpresse').sets[0].weight, 40);
assert.equal(latestExerciseHistory([thursday, tuesday], 'A', 'Beinpresse').sets[0].reps, 8);
assert.equal(latestExerciseNote([thursday, tuesday], 'A', 'Beinpresse'), 'Bez zaključavanja koljena');
assert.equal(maxExerciseWeight([thursday, tuesday], 'A', 'Potisak nogama'), 40);
assert.equal(matchingExerciseHistory([tuesday, thursday], 'A', 'Leg press').length, 2);
assert.equal(latestExerciseHistory([tuesday, thursday], 'A', { name: 'Leg press', libraryExerciseId: 'leg-press' }).workoutDate, thursday.date);
const noteOnlyInOlderWorkout = { ...thursday, exercises: [{ ...thursday.exercises[0], notes: '' }] };
assert.equal(latestExerciseNote([noteOnlyInOlderWorkout, tuesday], 'A', 'Leg press'), 'Stopala malo više');
assert.equal(latestExerciseNote([{ ...thursday, notes: 'Bilješka cijelog treninga', exercises: [{ ...thursday.exercises[0], notes: '' }] }], 'A', 'Leg press'), '');
assert.equal(new Set([tuesday, thursday].flatMap((workout) => workout.exercises.map(exerciseKey))).size, 1);

// Similar names and measurement variants stay separate.
assert.notEqual(exerciseKey('Leg press'), exerciseKey('Leg extension'));
assert.notEqual(exerciseKey({ name: 'My press', measurementType: 'seconds' }), exerciseKey({ name: 'My press', measurementType: 'weight_reps' }));
assert.equal(latestExerciseHistory([row('other', 'A', '2026-10-09T18:00:00Z', 'Leg extension'), tuesday], 'A', 'Leg press').sets[0].weight, 20);
assert.equal(libraryExerciseId({ name: 'Leg press', libraryExerciseId: 'leg-extension' }), 'leg-press');
assert.equal(libraryExerciseId({ name: 'My press', libraryExerciseId: 'leg-press' }), '');

// Account isolation applies even when cached rows are accidentally mixed.
const otherUser = row('foreign', 'B', '2026-10-10T18:00:00Z', 'Leg press', 200);
otherUser.exercises[0].notes = 'Drugi nalog';
assert.equal(latestExerciseHistory([otherUser, tuesday], 'A', 'Leg press').sets[0].weight, 20);
assert.equal(maxExerciseWeight([otherUser, tuesday], 'A', 'Leg press'), 20);
assert.equal(latestExerciseHistory([otherUser, tuesday], 'B', 'Leg press').sets[0].weight, 200);
assert.equal(latestExerciseNote([otherUser, tuesday], 'A', 'Leg press'), 'Stopala malo više');
assert.equal(latestExerciseNote([otherUser, tuesday], 'B', 'Leg press'), 'Drugi nalog');

// The live PR badge compares against the maximum from every routine of this UID.
const prStart = appSource.indexOf('  window.checkPR = function(inputEl) {');
const prEnd = appSource.indexOf('  function updateProgress()', prStart);
assert.ok(prStart >= 0 && prEnd > prStart);
let prUser = 'A';
const prContext = {
  window: {},
  historyCoverage: { complete: true, loading: false },
  getMaxWeightFromHistory: (exercise) => maxExerciseWeight([otherUser, tuesday, thursday], prUser, exercise)
};
vm.createContext(prContext);
vm.runInContext(appSource.slice(prStart, prEnd), prContext);
const badgeSlot = { innerHTML: '' };
const block = {
  getAttribute: (name) => ({ 'data-name': 'Potisak nogama', 'data-library-exercise-id': 'leg-press', 'data-measurement-type': 'weight_reps' })[name],
  querySelector: () => badgeSlot
};
const input = { value: '40', closest: () => block };
prContext.window.checkPR(input);
assert.equal(badgeSlot.innerHTML, '');
input.value = '45';
prContext.window.checkPR(input);
assert.match(badgeSlot.innerHTML, /NOVI PR/);
prUser = 'B';
prContext.window.checkPR(input);
assert.equal(badgeSlot.innerHTML, '');

// Legacy records need no new ID or migration when an exact catalogue alias is unambiguous.
assert.equal(tuesday.exercises[0].libraryExerciseId, undefined);
assert.equal(latestExerciseHistory([tuesday], 'A', { name: 'Leg press', libraryExerciseId: 'leg-press' }).sets[0].weight, 20);
assert.equal(exerciseMatches('Custom cable press', 'Custom cable press'), true);
assert.equal(exerciseMatches('Custom cable press', 'Custom machine press'), false);
const customTuesday = row('custom-tuesday', 'A', '2026-10-06T19:00:00Z', 'My own leg press', 22);
const customThursday = row('custom-thursday', 'A', '2026-10-08T19:00:00Z', 'My own leg press', 44, 8);
assert.equal(latestExerciseHistory([customTuesday, customThursday], 'A', 'My own leg press').sets[0].weight, 44);
assert.equal(latestExerciseHistory([customTuesday, customThursday], 'B', 'My own leg press'), null);

// The routine normalizer used by the live app preserves a valid catalogue ID
// and discards an ID after a name/type edit; old names can still resolve it.
const normalizeStart = appSource.indexOf('  function normalizeRoutineExercise(');
const normalizeEnd = appSource.indexOf('  function readExerciseSetting(', normalizeStart);
assert.ok(normalizeStart >= 0 && normalizeEnd > normalizeStart);
const normalizer = {
  libraryExerciseId,
  getLibraryExerciseById,
  getExerciseMeasurementType: () => 'weight_reps',
  getExerciseProgressionDefaults: (_type, _name, libraryExercise) => libraryExercise?.defaults || {
    repRangeMin: 8, repRangeMax: 12, weightIncrement: 5, timeIncrement: 5, restSeconds: 90
  },
  readExerciseSetting: (value, fallback, minimum, maximum) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
  }
};
vm.createContext(normalizer);
vm.runInContext(appSource.slice(normalizeStart, normalizeEnd), normalizer);
assert.equal(normalizer.normalizeRoutineExercise({ name: 'Leg press', libraryExerciseId: 'leg-press' }).libraryExerciseId, 'leg-press');
assert.equal(normalizer.normalizeRoutineExercise('Potisak nogama').libraryExerciseId, 'leg-press');
assert.equal(normalizer.normalizeRoutineExercise({ name: 'My press', libraryExerciseId: 'leg-press' }).libraryExerciseId, undefined);
assert.equal(normalizer.normalizeRoutineExercise({ name: 'Leg press', libraryExerciseId: 'leg-press', measurementType: 'seconds' }).libraryExerciseId, undefined);

// Confirm the new ID travels through routine selection, active cards, drafts,
// finished workouts and the editor, rather than being lost on a save path.
assert.match(appSource, /libraryExerciseId: item\.id/);
assert.match(appSource, /row\.dataset\.libraryExerciseId = normalizedExercise\.libraryExerciseId/);
assert.match(appSource, /libraryExerciseId: b\.getAttribute\('data-library-exercise-id'\)/);
assert.match(appSource, /if \(stableId\) exObj\.libraryExerciseId = stableId/);
assert.match(appSource, /if \(stableId\) exercise\.libraryExerciseId = stableId/);

console.log('PASS: cross-routine results, notes, PR basis, translated and legacy IDs, distinct exercises, account isolation');
