// Bosnian and Croatian remain separate language choices. This editorial
// vocabulary is applied to every established source key before the existing
// lookup map is built; interpolation values and user-authored text are never
// passed through it.
const BOSNIAN_TERMS = [
  [/\bNalog\b/g, 'Račun'], [/\bnalog\b/g, 'račun'], [/\bNalozi\b/g, 'Računi'], [/\bnalozi\b/g, 'računi'],
  [/\bPodešavanja\b/g, 'Postavke'], [/\bpodešavanja\b/g, 'postavke'], [/\bPodešavanjima\b/g, 'Postavkama'], [/\bpodešavanjima\b/g, 'postavkama'],
  [/\bSačuvaj\b/g, 'Spremi'], [/\bsačuvaj\b/g, 'spremi'], [/\bSačuvano\b/g, 'Spremljeno'], [/\bsačuvano\b/g, 'spremljeno'],
  [/\bsačuvani\b/g, 'spremljeni'], [/\bsačuvanih\b/g, 'spremljenih'],
  [/\bObriši\b/g, 'Izbriši'], [/\bobriši\b/g, 'izbriši'], [/\bobrisan\b/g, 'izbrisan'], [/\bobrisana\b/g, 'izbrisana'], [/\bobrisati\b/g, 'izbrisati']
];
const CROATIAN_TERMS = [
  [/\bOve sedmice\b/g, 'Ovog tjedna'], [/\bove sedmice\b/g, 'ovog tjedna'],
  [/\bSedmični\b/g, 'Tjedni'], [/\bsedmični\b/g, 'tjedni'], [/\bsedmično\b/g, 'tjedno'], [/\bsedmice\b/g, 'tjedna'], [/\bsedmica\b/g, 'tjedan'],
  [/\bIshrana\b/g, 'Prehrana'], [/\bishrana\b/g, 'prehrana'], [/\bishrane\b/g, 'prehrane'], [/\bishranu\b/g, 'prehranu'],
  [/\bUžina\b/g, 'Međuobrok'], [/\bužina\b/g, 'međuobrok'],
  [/\bKilaža\b/g, 'Težina'], [/\bkilaža\b/g, 'težina'], [/\bkilaže\b/g, 'težine'], [/\bKilaže\b/g, 'Težine'],
  [/\bKrompir\b/g, 'Krumpir'], [/\bkrompir\b/g, 'krumpir'],
  [/\bHljeb\b/g, 'Kruh'], [/\bhljeb\b/g, 'kruh'],
  [/\bParadajz\b/g, 'Rajčica'], [/\bparadajz\b/g, 'rajčica'], [/\bparadajzom\b/g, 'rajčicom'],
  [/\bĆureća\b/g, 'Pureća'], [/\bćureća\b/g, 'pureća']
];
export function localizeBcsText(value, language) {
  if (language !== 'bs' && language !== 'hr') return value;
  const terms = language === 'hr' ? [...BOSNIAN_TERMS, ...CROATIAN_TERMS] : BOSNIAN_TERMS;
  return terms.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}
export function buildBcsTranslations(sourcePhrases, language) {
  return Object.fromEntries(Object.keys(sourcePhrases.en || {}).map((source) => [source, localizeBcsText(source, language)]));
}
