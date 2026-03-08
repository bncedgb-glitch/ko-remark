export const SELECTABLE_LOCALES = [
  "ko_KR",
  "en_US",
  "da_DK",
  "de_DE",
  "el_GR",
  "es_ES",
  "et_EE",
  "fi_FI",
  "fr_FR",
  "hu_HU",
  "is_IS",
  "it_IT",
  "nl_NL",
  "no_NO",
  "pl_PL",
  "pt_PT",
  "ro_RO",
  "sv_SE",
];

export function filterSelectableLocales(locales = []) {
  const wanted = new Set(SELECTABLE_LOCALES);
  return [...new Set(locales.filter((locale) => wanted.has(locale)))];
}
