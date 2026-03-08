import test from "node:test";
import assert from "node:assert/strict";

import {
  SELECTABLE_LOCALES,
  filterSelectableLocales,
} from "./keyboardLocales.js";

test("selectable locales exclude region duplicates that create duplicate keyboards", () => {
  assert.equal(SELECTABLE_LOCALES.includes("en_GB"), false);
  assert.equal(SELECTABLE_LOCALES.includes("en_CA"), false);
  assert.equal(SELECTABLE_LOCALES.includes("de_AT"), false);
  assert.equal(SELECTABLE_LOCALES.includes("fr_CA"), false);
  assert.equal(SELECTABLE_LOCALES.includes("nl_BE"), false);
});

test("filterSelectableLocales keeps only canonical locales", () => {
  assert.deepEqual(
    filterSelectableLocales([
      "ko_KR",
      "en_US",
      "en_GB",
      "fr_FR",
      "fr_CA",
      "de_DE",
      "de_AT",
    ]),
    ["ko_KR", "en_US", "fr_FR", "de_DE"],
  );
});
