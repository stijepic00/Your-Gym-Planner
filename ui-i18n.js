import { TRANSLATIONS } from './translations.js?v=20261003-i18n-v111';

export const SUPPORTED_LANGUAGES = ['sr', 'en', 'de', 'fr', 'it', 'es'];
export const LOCALES = { sr: 'sr-Latn-RS', en: 'en-GB', de: 'de-DE', fr: 'fr-FR', it: 'it-IT', es: 'es-ES' };
const normalize = value => String(value).replace(/\s+/g, ' ').trim().toLocaleLowerCase('sr-Latn').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
const sources = new Map(Object.keys(TRANSLATIONS.en).map(source => [normalize(source), source]));
const lookup = Object.fromEntries(Object.entries(TRANSLATIONS).map(([language, phrases]) => [language, new Map(Object.entries(phrases).map(([source, target]) => [normalize(source), target]))]));
const reverse = new Map();
for (const phrases of Object.values(TRANSLATIONS)) {
  for (const [source, target] of Object.entries(phrases)) {
    const key = normalize(target);
    // Several source phrases can intentionally share a translation (e.g.
    // Cancel/Odustani/Otkaži). Keep a stable source instead of losing the label
    // on the next language switch. User content is excluded by the DOM layer.
    if (!reverse.has(key)) reverse.set(key, source);
  }
}

// Named templates handle the app's existing interpolated messages as whole
// phrases. Captured values are preserved, never translated as user content.
const templates = [];
for (const source of Object.keys(TRANSLATIONS.en).filter(key => /\{\w+\}/.test(key))) {
  for (const [language, text] of [['sr', source], ...Object.entries(TRANSLATIONS).map(([language, phrases]) => [language, phrases[source]])]) {
    if (!text) continue;
    const names = [];
    const expression = text.split(/(\{\w+\})/).map(part => {
      if (/^\{\w+\}$/.test(part)) {
        const name = part.slice(1, -1);
        names.push(name);
        const isNumber = !['name', 'terms', 'fields', 'location', 'focus', 'muscles', 'time', 'amount'].includes(name) && !(name === 'goal' && source.startsWith('Prijedlog:'));
        return isNumber ? '([+−-]?\\d[\\d\\s.,+−-]*)' : '(.+?)';
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    }).join('');
    templates.push({ source, language, pattern: new RegExp(`^${expression}$`, 'u'), names });
  }
}
const fill = (text, values) => text.replace(/\{(\w+)\}/g, (token, name) => Object.hasOwn(values, name) ? String(values[name]) : token);
function matchTemplate(value) {
  for (const template of templates) {
    const match = value.match(template.pattern);
    if (match) return { source: template.source, values: Object.fromEntries(template.names.map((name, i) => [name, match[i + 1]])) };
  }
  return null;
}
export function canonicalUiText(value) {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  const key = normalize(text);
  if (sources.has(key)) return sources.get(key);
  if (reverse.has(key)) return reverse.get(key);
  const template = matchTemplate(text);
  return template ? fill(template.source, template.values) : value;
}
export function translateText(value, language = 'sr') {
  if (typeof value !== 'string' || !value.trim()) return value;
  const leading = value.match(/^\s*/)[0], trailing = value.match(/\s*$/)[0];
  const source = canonicalUiText(value.trim());
  const translated = language === 'sr' ? source : lookup[language]?.get(normalize(source));
  if (translated) return leading + translated + trailing;
  const template = matchTemplate(source);
  if (template && TRANSLATIONS[language]?.[template.source]) return leading + fill(TRANSLATIONS[language][template.source], template.values) + trailing;
  // Icons are presentation, not part of the phrase's identity.
  const decorated = value.trim().match(/^([^\p{L}\p{N}]+)([\s\S]+)$/u);
  if (decorated) {
    const label = translateText(decorated[2], language);
    if (label !== decorated[2]) return leading + decorated[1] + label + trailing;
  }
  return value;
}
export function formatUiMessage(source, values, language = 'sr') {
  return fill(translateText(source, language), values);
}
