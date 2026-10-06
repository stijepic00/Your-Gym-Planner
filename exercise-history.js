import { EXERCISE_LIBRARY, getLibraryExerciseById } from './exercise-library.js?v=20261005-bcs-settings-v132';

const normalize = (value) => String(value || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
const byName = new Map();
for (const item of EXERCISE_LIBRARY) {
  for (const name of [...Object.values(item.names), ...(item.aliases || [])]) {
    const key = normalize(name);
    if (!byName.has(key)) byName.set(key, item);
    else if (byName.get(key)?.id !== item.id) byName.set(key, null);
  }
}

function measurement(exercise) {
  if (exercise?.measurementType) return exercise.measurementType;
  if (exercise?.minutes !== undefined) return 'cardio';
  const set = exercise?.sets?.find((item) => item && Object.keys(item).length);
  if (set?.seconds !== undefined) return 'seconds';
  if (set?.weight !== undefined) return 'weight_reps';
  if (set?.reps !== undefined) return 'reps';
  return '';
}

export function libraryExerciseId(exercise) {
  const source = typeof exercise === 'string' ? { name: exercise } : exercise;
  const name = normalize(source?.name);
  if (!name) return '';
  const id = source.libraryExerciseId || source.exerciseId;
  const explicit = getLibraryExerciseById(id);
  const catalog = explicit && [...Object.values(explicit.names), ...(explicit.aliases || [])].some((label) => normalize(label) === name)
    ? explicit : byName.get(name);
  const type = measurement(source);
  return catalog && (!type || type === catalog.measurementType) ? catalog.id : '';
}

export function exerciseKey(exercise) {
  const source = typeof exercise === 'string' ? { name: exercise } : exercise;
  const name = normalize(source?.name);
  if (!name) return '';
  const id = libraryExerciseId(source);
  if (id) return `library:${id}`;
  const type = measurement(source);
  return `custom:${name}:${type || 'weight_reps'}`;
}

export function exerciseMatches(first, second) {
  const key = exerciseKey(first);
  return Boolean(key && key === exerciseKey(second));
}

export function matchingExerciseHistory(rows, userId, exercise) {
  if (!userId) return [];
  return rows.filter((row) => row?.userId === userId && Number.isFinite(Date.parse(row.date)) && Array.isArray(row.exercises))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .flatMap((row) => row.exercises.filter((item) => exerciseMatches(item, exercise)).map((item) => ({ ...item, workoutDate: row.date })));
}

export function latestExerciseHistory(rows, userId, exercise) {
  return matchingExerciseHistory(rows, userId, exercise)[0] || null;
}

export function latestExerciseNote(rows, userId, exercise) {
  return matchingExerciseHistory(rows, userId, exercise)
    .find((item) => typeof item.notes === 'string' && item.notes.trim())?.notes || '';
}

export function maxExerciseWeight(rows, userId, exercise) {
  return matchingExerciseHistory(rows, userId, exercise).reduce((highest, item) => Math.max(highest,
    ...(item.sets || []).map((set) => Number(set.weight) || 0)), 0);
}
