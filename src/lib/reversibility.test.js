import test from "node:test";
import assert from "node:assert/strict";

import {
  isOriginalRestoreVerified,
  shouldAbortPatchedInstall,
} from "./reversibility.js";

test("shouldAbortPatchedInstall blocks patched keypad installs without backups", () => {
  assert.equal(
    shouldAbortPatchedInstall({
      keypadPatched: true,
      hasHomeBackup: false,
      hasOptBackup: false,
    }),
    true,
  );
});

test("shouldAbortPatchedInstall allows patched keypad installs when a trusted backup exists", () => {
  assert.equal(
    shouldAbortPatchedInstall({
      keypadPatched: true,
      hasHomeBackup: true,
      hasOptBackup: false,
    }),
    false,
  );
  assert.equal(
    shouldAbortPatchedInstall({
      keypadPatched: true,
      hasHomeBackup: false,
      hasOptBackup: true,
    }),
    false,
  );
});

test("isOriginalRestoreVerified requires explicit restore success marker", () => {
  assert.equal(isOriginalRestoreVerified("VERIFY_ORIGINAL_OK\nRESTORED=INACTIVE"), true);
  assert.equal(isOriginalRestoreVerified("VERIFY_STILL_PATCHED\nRESTORED=NO"), false);
});
