import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

export const root = path.resolve(import.meta.dirname, "../../..");
export const atlasPath = path.join(root, "docs/codebase-map.html");

export function checkAtlas(html = readFileSync(atlasPath, "utf8")) {
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(script, "Atlas must contain its inline application script.");
  new vm.Script(script, { filename: atlasPath });
  // Evaluate only the checked-in, declarative graph data, never the UI or a DOM.
  const start = script.indexOf("const LAYERS =");
  const end = script.indexOf("/* ---------- Estado");
  assert(start >= 0 && end > start, "Graph data section is missing.");
  const { layers, nodes, edges } = vm.runInNewContext(
    script.slice(start, end) + ";({layers:LAYERS,nodes:NODES,edges:EDGES})",
    Object.create(null),
    { timeout: 1000 },
  );
  assert(nodes.length > 0, "Graph is empty.");
  const layerIds = new Set(layers.map(layer => layer.id));
  const ids = new Set(nodes.map(node => node.id));
  assert.equal(layerIds.size, layers.length, "Duplicate layer ID.");
  assert.equal(ids.size, nodes.length, "Duplicate node ID.");
  for (const node of nodes) {
    assert(layerIds.has(node.layer), `Unknown layer for ${node.id}.`);
    for (const field of ["id", "name", "kind", "detail", "path"]) {
      assert(typeof node[field] === "string" && node[field].trim(), `Missing ${field}: ${node.id}.`);
    }
  }
  const relations = new Set();
  for (const [from, to, type, verb] of edges) {
    assert(ids.has(from) && ids.has(to), `Dangling edge: ${from} → ${to}.`);
    assert.notEqual(from, to, `Self edge: ${from}.`);
    assert(["", "boundary", "inference", "storage"].includes(type), `Unknown edge type: ${type}.`);
    assert(typeof verb === "string" && verb.trim(), `Missing relation: ${from} → ${to}.`);
    const key = [from, to, type, verb].join("|");
    assert(!relations.has(key), `Duplicate relation: ${key}.`);
    relations.add(key);
  }
  for (const view of ["graph", "uml", "architecture"]) {
    assert(html.includes(`id="${view}-view"`), `Missing ${view} view.`);
    assert(html.includes(`aria-controls="${view}-view"`), `Missing ${view} tab.`);
  }
  const readme = readFileSync(path.join(root, "README.md"), "utf8");
  assert(readme.includes("docs/assets/codebase-map.png"), "README must embed the canonical preview.");
  return { nodes: nodes.length, edges: edges.length, layers: layers.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log("Architecture atlas:", checkAtlas());
}
