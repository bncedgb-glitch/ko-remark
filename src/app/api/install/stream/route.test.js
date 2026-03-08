import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

const routePath = path.resolve(process.cwd(), "src/app/api/install/stream/route.ts");
const routeSource = fs.readFileSync(routePath, "utf8");
const restoreServiceBlock = routeSource.match(/const RESTORE_SERVICE = `([\s\S]*?)`;/)?.[1] ?? "";
const restoreScriptBlock = routeSource.match(/const RESTORE_SCRIPT = `([\s\S]*?)`;\n\nconst RESTORE_SERVICE/)?.[1] ?? "";

test("restore service starts before xochitl during boot recovery", () => {
  assert.ok(restoreServiceBlock.length > 0, "RESTORE_SERVICE block not found");
  assert.match(restoreServiceBlock, /Before=xochitl\.service/);
});

test("restore script stops xochitl before repatching the binary", () => {
  assert.ok(restoreScriptBlock.length > 0, "RESTORE_SCRIPT block not found");
  assert.match(restoreScriptBlock, /systemctl stop xochitl 2>\/dev\/null \|\| true/);
});
