import { FOOD_LIBRARY, getFoodLibraryName } from './food-library.js?v=20261003-home-v127';

// A small, reviewed recipe set built only from individual catalogue ingredients.
// Prices are illustrative local estimates in EUR, not shop prices or live rates.
import { CATALOG_TRANSLATIONS } from './catalog-translations.js?v=20261003-home-v127';
const recipe = (id, name, slots, ingredients, minutes, costEur, diet, simple = true) => ({
  id, name, slots, ingredients: ingredients.map(([foodId, quantity]) => ({ foodId, quantity })),
  minutes, costEur, diet, simple
});

export const MEAL_RECIPES = [
  recipe('oats-banana-milk', 'Zobene s bananom i mlijekom', ['breakfast'], [['oats', 60], ['banana', 1], ['milk', 250]], 8, 1.45, 'vegetarian'),
  recipe('skyr-berries-almonds', 'Skyr, jagode i bademi', ['breakfast'], [['skyr', 150], ['strawberries', 150], ['almonds', 20]], 5, 2.65, 'vegetarian'),
  recipe('eggs-toast-tomato', 'Jaja, integralni hljeb i paradajz', ['breakfast'], [['egg', 2], ['bread-wholegrain', 60], ['tomato', 150]], 12, 1.85, 'vegetarian'),
  recipe('tofu-spinach-breakfast', 'Tofu sa špinatom i paradajzom', ['breakfast'], [['tofu', 150], ['spinach', 100], ['tomato', 150]], 15, 2.35, 'vegan'),
  recipe('oats-banana-peanuts', 'Zobene, banana i maslac od kikirikija', ['breakfast'], [['oats', 50], ['banana', 1], ['peanut-butter', 20]], 5, 1.45, 'vegan'),
  recipe('cottage-apple-walnuts', 'Posni sir, jabuka i orasi', ['breakfast'], [['cottage-cheese', 200], ['apple', 1], ['walnuts', 20]], 5, 2.4, 'vegetarian'),
  recipe('rice-banana-almonds', 'Riža, banana i bademi', ['breakfast'], [['rice-cooked', 200], ['banana', 1], ['almonds', 20]], 8, 1.45, 'vegan'),
  recipe('lentils-tomato-breakfast', 'Leća s paradajzom', ['breakfast'], [['lentils-cooked', 180], ['tomato', 150], ['olive-oil', 10]], 12, 1.55, 'vegan'),
  recipe('chicken-rice-broccoli', 'Piletina, riža i brokoli', ['lunch', 'dinner'], [['chicken-breast', 150], ['rice-cooked', 200], ['broccoli', 150], ['olive-oil', 10]], 25, 3.55, 'meat'),
  recipe('tuna-potato-salad', 'Tuna, krompir i salata', ['lunch', 'dinner'], [['tuna-water', 120], ['potato-boiled', 200], ['cucumber', 150], ['tomato', 150]], 18, 3.1, 'fish'),
  recipe('tofu-rice-broccoli', 'Tofu, riža i brokoli', ['lunch', 'dinner'], [['tofu', 180], ['rice-cooked', 200], ['broccoli', 150]], 20, 2.75, 'vegan'),
  recipe('lentils-potato-carrot', 'Leća, krompir i mrkva', ['lunch', 'dinner'], [['lentils-cooked', 200], ['potato-boiled', 200], ['carrot', 100], ['olive-oil', 10]], 20, 1.95, 'vegan'),
  recipe('chickpea-rice-peppers', 'Slanutak, riža i paprika', ['lunch', 'dinner'], [['chickpeas-cooked', 180], ['rice-cooked', 150], ['pepper', 150]], 18, 2.15, 'vegan'),
  recipe('beef-potato-carrot', 'Junetina s krompirom i mrkvom', ['lunch', 'dinner'], [['beef-lean', 150], ['potato-boiled', 200], ['carrot', 100]], 30, 4.1, 'meat', false),
  recipe('beans-rice-tomato', 'Grah s rižom i paradajzom', ['lunch', 'dinner'], [['beans-cooked', 200], ['rice-cooked', 150], ['tomato', 150]], 15, 1.8, 'vegan'),
  recipe('egg-potato-spinach', 'Jaja, krompir i špinat', ['lunch', 'dinner'], [['egg', 3], ['potato-boiled', 200], ['spinach', 100]], 20, 2.1, 'vegetarian'),
  recipe('salmon-potato-spinach', 'Losos, krompir i špinat', ['lunch', 'dinner'], [['salmon', 150], ['potato-boiled', 200], ['spinach', 100]], 25, 4.8, 'fish', false),
  recipe('chicken-sweet-potato', 'Piletina, slatki krompir i paprika', ['lunch', 'dinner'], [['chicken-breast', 150], ['sweet-potato', 200], ['pepper', 150]], 25, 3.65, 'meat', false),
  recipe('tofu-chickpea-vegetables', 'Tofu, slanutak i povrće', ['lunch', 'dinner'], [['tofu', 150], ['chickpeas-cooked', 150], ['broccoli', 150]], 20, 2.9, 'vegan'),
  recipe('beans-tomato-bread', 'Grah s paradajzom i hljebom', ['lunch', 'dinner'], [['beans-cooked', 220], ['tomato', 150], ['bread-wholegrain', 60]], 15, 1.85, 'vegan'),
  recipe('tuna-pasta-tomato', 'Tuna, tjestenina i paradajz', ['lunch', 'dinner'], [['tuna-water', 120], ['pasta-cooked', 180], ['tomato', 150]], 20, 3.2, 'fish'),
  recipe('beef-rice-peppers', 'Junetina, riža i paprika', ['lunch', 'dinner'], [['beef-lean', 150], ['rice-cooked', 200], ['pepper', 150]], 30, 4.2, 'meat', false),
  recipe('apple-almonds', 'Jabuka i bademi', ['snack'], [['apple', 1], ['almonds', 25]], 2, 1.1, 'vegan'),
  recipe('banana-peanut-butter', 'Banana i maslac od kikirikija', ['snack'], [['banana', 1], ['peanut-butter', 20]], 2, 0.95, 'vegan'),
  recipe('skyr-strawberries', 'Skyr i jagode', ['snack'], [['skyr', 150], ['strawberries', 150]], 2, 2.2, 'vegetarian'),
  recipe('egg-apple', 'Kuhano jaje i jabuka', ['snack'], [['egg', 1], ['apple', 1]], 12, 0.9, 'vegetarian'),
  recipe('carrot-chickpeas', 'Mrkva i slanutak', ['snack'], [['carrot', 100], ['chickpeas-cooked', 100]], 5, 0.8, 'vegan'),
  recipe('cottage-tomato', 'Posni sir i paradajz', ['snack'], [['cottage-cheese', 150], ['tomato', 150]], 3, 1.65, 'vegetarian'),
  recipe('banana-walnuts', 'Banana i orasi', ['snack'], [['banana', 1], ['walnuts', 20]], 2, 1.05, 'vegan'),
  recipe('yogurt-banana', 'Jogurt i banana', ['snack'], [['plain-yogurt', 180], ['banana', 1]], 2, 1.05, 'vegetarian')
];

const foods = new Map(FOOD_LIBRARY.map((item) => [item.id, item]));
const recipes = new Map(MEAL_RECIPES.map((item) => [item.id, item]));
const recipeTranslations = {
  'oats-banana-milk': ['Oats with banana and milk', 'Haferflocken mit Banane und Milch'],
  'skyr-berries-almonds': ['Skyr with strawberries and almonds', 'Skyr mit Erdbeeren und Mandeln'],
  'eggs-toast-tomato': ['Eggs, wholegrain bread and tomato', 'Eier, Vollkornbrot und Tomate'],
  'tofu-spinach-breakfast': ['Tofu with spinach and tomato', 'Tofu mit Spinat und Tomate'],
  'oats-banana-peanuts': ['Oats, banana and peanut butter', 'Haferflocken, Banane und Erdnussbutter'],
  'cottage-apple-walnuts': ['Cottage cheese, apple and walnuts', 'Hüttenkäse, Apfel und Walnüsse'],
  'rice-banana-almonds': ['Rice, banana and almonds', 'Reis, Banane und Mandeln'],
  'lentils-tomato-breakfast': ['Lentils with tomato', 'Linsen mit Tomate'],
  'chicken-rice-broccoli': ['Chicken, rice and broccoli', 'Hähnchen, Reis und Brokkoli'],
  'tuna-potato-salad': ['Tuna, potato and salad', 'Thunfisch, Kartoffeln und Salat'],
  'tofu-rice-broccoli': ['Tofu, rice and broccoli', 'Tofu, Reis und Brokkoli'],
  'lentils-potato-carrot': ['Lentils, potato and carrot', 'Linsen, Kartoffeln und Karotten'],
  'chickpea-rice-peppers': ['Chickpeas, rice and peppers', 'Kichererbsen, Reis und Paprika'],
  'beef-potato-carrot': ['Beef with potato and carrot', 'Rindfleisch mit Kartoffeln und Karotten'],
  'beans-rice-tomato': ['Beans with rice and tomato', 'Bohnen mit Reis und Tomate'],
  'egg-potato-spinach': ['Eggs, potato and spinach', 'Eier, Kartoffeln und Spinat'],
  'salmon-potato-spinach': ['Salmon, potato and spinach', 'Lachs, Kartoffeln und Spinat'],
  'chicken-sweet-potato': ['Chicken, sweet potato and peppers', 'Hähnchen, Süßkartoffeln und Paprika'],
  'tofu-chickpea-vegetables': ['Tofu, chickpeas and vegetables', 'Tofu, Kichererbsen und Gemüse'],
  'beans-tomato-bread': ['Beans with tomato and bread', 'Bohnen mit Tomate und Brot'],
  'tuna-pasta-tomato': ['Tuna pasta with tomato', 'Thunfischnudeln mit Tomate'],
  'beef-rice-peppers': ['Beef, rice and peppers', 'Rindfleisch, Reis und Paprika'],
  'apple-almonds': ['Apple and almonds', 'Apfel und Mandeln'],
  'banana-peanut-butter': ['Banana and peanut butter', 'Banane und Erdnussbutter'],
  'skyr-strawberries': ['Skyr and strawberries', 'Skyr und Erdbeeren'],
  'egg-apple': ['Boiled egg and apple', 'Gekochtes Ei und Apfel'],
  'carrot-chickpeas': ['Carrot and chickpeas', 'Karotten und Kichererbsen'],
  'cottage-tomato': ['Cottage cheese and tomato', 'Hüttenkäse und Tomate'],
  'banana-walnuts': ['Banana and walnuts', 'Banane und Walnüsse'],
  'yogurt-banana': ['Yogurt and banana', 'Joghurt und Banane']
};
const allergenAliases = {
  milk: ['mlijeko', 'mleko', 'mlijecno', 'mlecno', 'laktoza', 'dairy', 'milk', 'lactose', 'milch'],
  eggs: ['jaje', 'jaja', 'egg', 'eggs', 'ei', 'eier'],
  gluten: ['gluten', 'psenica', 'pšenica', 'wheat', 'celijakija', 'celiac', 'brot'],
  peanuts: ['kikiriki', 'peanut', 'erdnuss'],
  nuts: ['orasasti', 'orašasti', 'orasi', 'bademi', 'nuts', 'walnut', 'almond', 'nüsse'],
  soy: ['soja', 'soje', 'soy', 'sojaeiweiss'],
  fish: ['riba', 'ribu', 'ribe', 'fish', 'fisch', 'tuna', 'losos'],
  shellfish: ['skoljke', 'školjke', 'kozice', 'shrimp', 'shellfish'],
  seeds: ['sjemenke', 'seeds', 'sjemenki'],
  sesame: ['sezam', 'sesame', 'sesam']
};
const additionalAllergens = { 'tuna-water': ['fish'], salmon: ['fish'] };
// Localized input aliases share the existing restriction resolver and rules.
const localizedAllergenAliases = {
  milk: ['lait', 'laitier', 'laitiers', 'latte', 'latticini', 'lattosio', 'leche', 'lacteos', 'lactosa'],
  eggs: ['oeuf', 'œuf', 'oeufs', 'œufs', 'uovo', 'uova', 'huevo', 'huevos'],
  gluten: ['ble', 'frumento', 'grano', 'trigo', 'celiaque', 'celiachia', 'celiaquia'],
  peanuts: ['arachide', 'arachidi', 'cacahuete'], nuts: ['fruits a coque', 'frutta a guscio', 'frutos secos', 'noix', 'noci', 'nueces', 'mandorle', 'almendras'],
  soy: ['soia'], fish: ['poisson', 'pesce', 'pescado'], shellfish: ['crustaces', 'mollusques', 'crostacei', 'molluschi', 'mariscos'],
  seeds: ['graines', 'semi', 'semillas'], sesame: ['sesamo']
};
for (const [allergen, aliases] of Object.entries(localizedAllergenAliases)) allergenAliases[allergen].push(...aliases);
const foodAliases = {
  'chicken-breast': ['piletina', 'pilece', 'pileca', 'chicken'],
  'beef-lean': ['junetina', 'govedina', 'beef'],
  'chickpeas-cooked': ['slanutak', 'leblebija'],
  'lentils-cooked': ['leca', 'lece'],
  'beans-cooked': ['grah', 'pasulj']
};

export const MEAL_CURRENCIES = { EUR: { symbol: '€', factor: 1 }, BAM: { symbol: 'KM', factor: 2 }, RSD: { symbol: 'RSD', factor: 120 } };
export const MEAL_CATALOG_VERSION = 1;
export const getMealRecipe = (id) => recipes.get(id) || null;
export function getMealRecipeName(item, language = 'sr') {
  if (!item) return '';
  if (CATALOG_TRANSLATIONS[language]?.[item.name]) return CATALOG_TRANSLATIONS[language][item.name];
  const translated = recipeTranslations[item.id];
  return language === 'en' ? (translated?.[0] || item.name) : language === 'de' ? (translated?.[1] || item.name) : item.name;
}

export function normalizeMealText(value) {
  return String(value || '').toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/ß/g, 'ss').trim();
}

function matchesWord(text, candidate) {
  const normalizedText = normalizeMealText(text);
  const normalizedCandidate = normalizeMealText(candidate);
  return normalizedCandidate.length >= 3 && normalizedText.includes(normalizedCandidate);
}

function restrictionTerms(value) {
  const text = String(value || '').trim();
  if (!text) return [];
  return text.split(/[,;\n/]|\s+(?:i|and|und|et|e|y)\s+/i)
    .map((part) => part.trim())
    .filter((part) => part && !/^(nemam|nema|none|no allergies|no restrictions|keine|aucun|pas d.allerg|nessun|sin alerg|sin restric)/i.test(normalizeMealText(part)));
}

function resolveRestrictions(value) {
  const allergens = new Set();
  const foodIds = new Set();
  const unknown = [];
  for (const term of restrictionTerms(value)) {
    let matched = false;
    for (const [key, aliases] of Object.entries(allergenAliases)) {
      if (aliases.some((alias) => matchesWord(term, alias))) { allergens.add(key); matched = true; }
    }
    for (const food of foods.values()) {
      if ([food.id, ...Object.values(food.names), ...(foodAliases[food.id] || [])].some((name) => matchesWord(term, name))) {
        foodIds.add(food.id);
        matched = true;
      }
    }
    if (!matched) unknown.push(term);
  }
  return { allergens, foodIds, unknown };
}

function recipeAllergens(item) {
  return new Set(item.ingredients.flatMap(({ foodId }) => [...(foods.get(foodId)?.allergens || []), ...(additionalAllergens[foodId] || [])]));
}

function allowedByDiet(item, diet) {
  if (diet === 'orthodox_fast_water') return item.diet === 'vegan' && !item.ingredients.some(({ foodId }) => foodId === 'olive-oil');
  if (diet === 'orthodox_fast_oil') return item.diet === 'vegan';
  if (diet === 'orthodox_fast_fish') return item.diet === 'vegan' || item.diet === 'fish';
  if (diet === 'vegan') return item.diet === 'vegan';
  if (diet === 'vegetarian') return item.diet === 'vegan' || item.diet === 'vegetarian';
  // For MVP, halal uses only plant, egg and plain dairy recipes. This is not certification.
  if (diet === 'halal') return item.diet === 'vegan' || item.diet === 'vegetarian';
  return true;
}

function blockedByRestrictions(item, restrictions) {
  const allergens = recipeAllergens(item);
  return item.ingredients.some(({ foodId }) => restrictions.foodIds.has(foodId))
    || [...allergens].some((key) => restrictions.allergens.has(key));
}

export function recipeNutrition(item) {
  const result = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  for (const ingredient of item.ingredients) {
    const food = foods.get(ingredient.foodId);
    if (!food || !Number.isFinite(food.portion) || food.portion <= 0) return null;
    const factor = ingredient.quantity / food.portion;
    for (const field of Object.keys(result)) result[field] += Number(food[field] || 0) * factor;
  }
  for (const field of Object.keys(result)) result[field] = Math.round(result[field] * 10) / 10;
  return result;
}

export function recipeIngredients(item, language = 'sr') {
  return item.ingredients.map(({ foodId, quantity }) => {
    const food = foods.get(foodId);
    const unit = food?.unit === 'komad' ? ({ sr: 'komad', en: 'piece', de: 'Stück', fr: 'pièce', it: 'pezzo', es: 'unidad' }[language] || 'komad') : food?.unit;
    return food ? { foodId, name: getFoodLibraryName(food, language), quantity, unit } : null;
  });
}

export function planSlots(mealCount) {
  if (mealCount === 2) return ['lunch', 'dinner'];
  if (mealCount === 3) return ['breakfast', 'lunch', 'dinner'];
  if (mealCount === 4) return ['breakfast', 'lunch', 'dinner', 'snack'];
  if (mealCount === 5) return ['breakfast', 'snack', 'lunch', 'dinner', 'snack'];
  return [];
}

export function eligibleMealRecipes(options) {
  const mandatory = resolveRestrictions(options.allergies);
  const disliked = resolveRestrictions(options.disliked);
  const unknown = [...mandatory.unknown, ...disliked.unknown];
  if (unknown.length) return { recipes: [], unknown };
  return {
    unknown: [],
    recipes: MEAL_RECIPES.filter((item) => allowedByDiet(item, options.diet)
      && item.minutes <= options.maxMinutes
      && (!options.simpleOnly || item.simple)
      && !blockedByRestrictions(item, mandatory)
      && !blockedByRestrictions(item, disliked)
      && recipeNutrition(item) && recipeIngredients(item).every(Boolean))
  };
}

export function mealPlanTotals(day) {
  const total = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, costEur: 0 };
  for (const meal of day.meals) {
    const item = getMealRecipe(meal.recipeId);
    if (!item) return null;
    const nutrition = recipeNutrition(item);
    if (!nutrition) return null;
    for (const field of ['calories', 'proteinG', 'carbsG', 'fatG']) total[field] += nutrition[field];
    total.costEur += item.costEur;
  }
  for (const field of Object.keys(total)) total[field] = Math.round(total[field] * 10) / 10;
  return total;
}

function dateAtOffset(startDate, offset) {
  const [year, month, day] = startDate.split('-').map(Number);
  const date = new Date(year, month - 1, day + offset, 12);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function mealScore(item, options, priorUses, dayUses, slotIndex) {
  const nutrition = recipeNutrition(item);
  let score = priorUses * 55 + (dayUses.has(item.id) ? 90 : 0) + ((slotIndex * 13 + item.id.length * 7) % 11);
  if (options.highProtein) score -= nutrition.proteinG * 0.9;
  if (options.goal === 'lose_weight') score += nutrition.calories * 0.015;
  if (options.goal === 'gain_weight') score -= nutrition.calories * 0.015;
  return score;
}

export function buildMealPlan(options) {
  const slots = planSlots(options.mealCount);
  const estimatedBudgetEur = options.budget / MEAL_CURRENCIES[options.currency].factor;
  const { recipes: available, unknown } = eligibleMealRecipes(options);
  if (unknown.length) return { error: 'unknown-restrictions', unknown };
  const positions = Array.from({ length: options.dayCount }, (_, dayIndex) => slots.map((slot, slotIndex) => ({ dayIndex, slot, slotIndex }))).flat();
  const candidates = positions.map(({ slot }) => available.filter((item) => item.slots.includes(slot)));
  if (candidates.some((items) => !items.length)) return { error: 'no-recipes' };
  const minimumFuture = new Array(positions.length + 1).fill(0);
  for (let i = positions.length - 1; i >= 0; i--) minimumFuture[i] = minimumFuture[i + 1] + Math.min(...candidates[i].map((item) => item.costEur * options.people));
  if (minimumFuture[0] > estimatedBudgetEur + 0.001) return { error: 'budget', minimumCostEur: Math.round(minimumFuture[0] * 100) / 100 };
  const days = Array.from({ length: options.dayCount }, (_, index) => ({ date: dateAtOffset(options.startDate, index), meals: [] }));
  const priorUses = new Map();
  let spent = 0;
  positions.forEach(({ dayIndex, slot, slotIndex }, index) => {
    const dayUses = new Set(days[dayIndex].meals.map((meal) => meal.recipeId));
    const affordable = candidates[index].filter((item) => spent + item.costEur * options.people + minimumFuture[index + 1] <= estimatedBudgetEur + 0.001);
    affordable.sort((a, b) => mealScore(a, options, priorUses.get(a.id) || 0, dayUses, slotIndex)
      - mealScore(b, options, priorUses.get(b.id) || 0, dayUses, slotIndex) || a.id.localeCompare(b.id));
    const chosen = affordable[0];
    days[dayIndex].meals.push({ slot, recipeId: chosen.id });
    priorUses.set(chosen.id, (priorUses.get(chosen.id) || 0) + 1);
    spent += chosen.costEur * options.people;
  });
  return { days, estimatedCostEur: Math.round(spent * 100) / 100, catalogVersion: MEAL_CATALOG_VERSION };
}

export function replaceMealInPlan(plan, dayIndex, mealIndex, options) {
  const day = plan.days[dayIndex];
  const meal = day?.meals?.[mealIndex];
  if (!meal) return null;
  const { recipes: available, unknown } = eligibleMealRecipes(options);
  if (unknown.length) return null;
  const otherCost = plan.days.reduce((sum, item, dIndex) => sum + item.meals.reduce((daily, entry, mIndex) => {
    if (dIndex === dayIndex && mIndex === mealIndex) return daily;
    return daily + (getMealRecipe(entry.recipeId)?.costEur || 0) * options.people;
  }, 0), 0);
  const budgetEur = options.budget / MEAL_CURRENCIES[options.currency].factor;
  const alternatives = available.filter((item) => item.slots.includes(meal.slot) && item.id !== meal.recipeId
    && otherCost + item.costEur * options.people <= budgetEur + 0.001);
  if (!alternatives.length) return null;
  const uses = new Map();
  plan.days.forEach((item) => item.meals.forEach((entry) => uses.set(entry.recipeId, (uses.get(entry.recipeId) || 0) + 1)));
  alternatives.sort((a, b) => mealScore(a, options, uses.get(a.id) || 0, new Set(day.meals.map((entry) => entry.recipeId)), mealIndex)
    - mealScore(b, options, uses.get(b.id) || 0, new Set(day.meals.map((entry) => entry.recipeId)), mealIndex) || a.id.localeCompare(b.id));
  const replacement = alternatives[0];
  const days = plan.days.map((item, dIndex) => dIndex !== dayIndex ? item : {
    ...item, meals: item.meals.map((entry, mIndex) => mIndex === mealIndex ? { ...entry, recipeId: replacement.id } : entry)
  });
  return { ...plan, days, estimatedCostEur: Math.round((otherCost + replacement.costEur * options.people) * 100) / 100 };
}

export function validStoredMealPlan(data) {
  if (!data || !Array.isArray(data.days) || data.days.length < 1 || data.days.length > 7 || !planSlots(data.mealCount).length) return false;
  if (!MEAL_CURRENCIES[data.currency] || !['lose_weight', 'maintain', 'gain_weight'].includes(data.goal)
    || !['none', 'vegetarian', 'vegan', 'halal', 'orthodox_fast_water', 'orthodox_fast_oil', 'orthodox_fast_fish'].includes(data.diet) || !Number.isInteger(data.people) || data.people < 1 || data.people > 10
    || !Number.isFinite(data.budget) || data.budget <= 0 || !Number.isInteger(data.maxMinutes) || data.maxMinutes < 5 || data.maxMinutes > 180
    || !Number.isInteger(data.dayCount) || data.dayCount !== data.days.length
    || !/^\d{4}-\d{2}-\d{2}$/.test(data.startDate || '')
    || typeof data.allergies !== 'string' || typeof data.disliked !== 'string'
    || !Number.isFinite(data.estimatedCostEur) || data.estimatedCostEur < 0) return false;
  return data.days.every((day) => /^\d{4}-\d{2}-\d{2}$/.test(day.date)
    && Array.isArray(day.meals) && day.meals.length === data.mealCount
    && day.meals.every((meal) => ['breakfast', 'lunch', 'dinner', 'snack'].includes(meal.slot) && getMealRecipe(meal.recipeId)));
}
