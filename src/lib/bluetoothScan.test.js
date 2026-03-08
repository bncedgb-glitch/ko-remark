import test from "node:test";
import assert from "node:assert/strict";

import {
  extractDiscoveredDevice,
  extractObservedDeviceAddress,
} from "./bluetoothScan.js";

test("extractDiscoveredDevice parses NEW device lines from bluetoothctl scan output", () => {
  assert.deepEqual(
    extractDiscoveredDevice("[NEW] Device D6:A6:54:68:75:8D Keys-To-Go 2"),
    {
      address: "D6:A6:54:68:75:8D",
      name: "Keys-To-Go 2",
    },
  );
});

test("extractDiscoveredDevice ignores non-discovery lines", () => {
  assert.equal(extractDiscoveredDevice("Changing pairable on succeeded"), null);
});

test("extractObservedDeviceAddress parses CHG device lines", () => {
  assert.equal(
    extractObservedDeviceAddress("[CHG] Device D6:A6:54:68:75:8D RSSI: 0xffffffcd (-51)"),
    "D6:A6:54:68:75:8D",
  );
});

test("extractObservedDeviceAddress also parses NEW device lines", () => {
  assert.equal(
    extractObservedDeviceAddress("[NEW] Device D6:A6:54:68:75:8D Keys-To-Go 2"),
    "D6:A6:54:68:75:8D",
  );
});
