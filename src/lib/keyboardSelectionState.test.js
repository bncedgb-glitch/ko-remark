import test from "node:test";
import assert from "node:assert/strict";

import { needsKeyboardSelection } from "./keyboardSelectionState.js";

test("needsKeyboardSelection returns false for keypad installs because all locales are bundled by default", () => {
  assert.equal(
    needsKeyboardSelection({
      installMode: "keypad",
      localesConfigured: false,
    }),
    false,
  );
});

test("needsKeyboardSelection returns false for keypad installs after locale selection", () => {
  assert.equal(
    needsKeyboardSelection({
      installMode: "keypad",
      localesConfigured: true,
    }),
    false,
  );
});

test("needsKeyboardSelection returns false for bluetooth installs", () => {
  assert.equal(
    needsKeyboardSelection({
      installMode: "bt",
      localesConfigured: false,
    }),
    false,
  );
});
