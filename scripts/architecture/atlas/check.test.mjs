import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { atlasPath, checkAtlas } from "./check.mjs";

const html = readFileSync(atlasPath, "utf8");

test("the current atlas is internally consistent", () => {
  const result = checkAtlas(html);
  assert(result.nodes > 0 && result.edges > 0 && result.layers > 0);
});

test("a removed node cannot leave a dangling relation", () => {
  const broken = html.replace('["app", "encounter"', '["missing-node", "encounter"');
  assert.notEqual(broken, html);
  assert.throws(() => checkAtlas(broken), /Dangling edge/);
});

test("renaming a node to an existing ID fails", () => {
  const broken = html.replace('{ id: "app", layer:', '{ id: "encounter", layer:');
  assert.notEqual(broken, html);
  assert.throws(() => checkAtlas(broken), /Duplicate node ID/);
});

test("the UML view cannot disappear silently", () => {
  const broken = html.replace('id="uml-view"', 'id="removed-view"');
  assert.throws(() => checkAtlas(broken), /Missing uml view/);
});

test("a node needs a source reference", () => {
  const broken = html.replace('path: "renderer/App.tsx"', 'path: ""');
  assert.notEqual(broken, html);
  assert.throws(() => checkAtlas(broken), /Missing path/);
});
