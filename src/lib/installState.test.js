import test from "node:test";
import assert from "node:assert/strict";

import {
  XOCHITL_DROPIN_DIR,
  mergeInstallState,
  renderInstallState,
} from "./installState.js";

test("mergeInstallState keeps previously installed BT when adding keypad", () => {
  assert.deepEqual(
    mergeInstallState(
      { installKeypad: false, installBt: true, locales: [] },
      { installKeypad: true, installBt: false, locales: ["en_US", "ko_KR"] },
    ),
    { installKeypad: true, installBt: true, locales: ["en_US", "ko_KR"] },
  );
});

test("mergeInstallState keeps previously installed keypad when adding BT", () => {
  assert.deepEqual(
    mergeInstallState(
      { installKeypad: true, installBt: false, locales: ["en_US", "ko_KR"] },
      { installKeypad: false, installBt: true, locales: [] },
    ),
    { installKeypad: true, installBt: true, locales: ["en_US", "ko_KR"] },
  );
});

test("renderInstallState writes shell-safe persisted flags", () => {
  assert.equal(
    renderInstallState({
      installKeypad: true,
      installBt: false,
      locales: ["en_US", "ko_KR", "de_DE"],
    }),
    "INSTALL_KEYPAD=1\nINSTALL_BT=0\nKEYBOARD_LOCALES=en_US,ko_KR,de_DE\n",
  );
});

test("xochitl drop-in uses the vendor unit directory", () => {
  assert.equal(
    XOCHITL_DROPIN_DIR,
    "/usr/lib/systemd/system/xochitl.service.d",
  );
});

test("mergeInstallState replaces locales when keypad is explicitly requested", () => {
  assert.deepEqual(
    mergeInstallState(
      { installKeypad: true, installBt: true, locales: ["en_US", "ko_KR"] },
      { installKeypad: true, installBt: false, locales: ["en_US", "ko_KR", "fr_FR"] },
    ),
    { installKeypad: true, installBt: true, locales: ["en_US", "ko_KR", "fr_FR"] },
  );
});
