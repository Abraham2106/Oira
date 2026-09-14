import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";
import { atlasPath, checkAtlas, root } from "./check.mjs";

const html = await readFile(atlasPath, "utf8");
const expected = checkAtlas(html);
// Serve exactly this documentation page, not the repository or patient fixtures.
const server = http.createServer((request, response) => {
  if (request.url === "/favicon.ico") { response.writeHead(204).end(); return; }
  if (request.url?.split("?")[0] !== "/") { response.writeHead(404).end(); return; }
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(html);
});
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
let browser;
try {
  browser = await chromium.launch({
    // Optional installed Chrome for local work; CI uses pinned Playwright Chromium.
    ...(process.env.ATLAS_CHROME ? { executablePath: process.env.ATLAS_CHROME } : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    colorScheme: "dark",
    locale: "es-ES",
  });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const url = `http://127.0.0.1:${server.address().port}/?snapshot=1`;
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.dataset.atlasReady === "true");
  await page.evaluate(() => document.fonts.ready);
  const state = await page.evaluate(() => window.atlasSnapshot);
  assert.equal(state.nodes, expected.nodes);
  assert.equal(state.edges, expected.edges);
  assert(state.nonempty, "Graph canvas contains no nodes.");

  // Verify the other views render and the inspector navigates/closes before capture.
  await page.evaluate(() => { delete document.body.dataset.snapshot; });
  for (const view of ["uml", "architecture"]) {
    await page.locator(`#tab-${view}`).click();
    assert(await page.locator(`#${view}-view svg`).first().isVisible());
  }
  await page.locator("#tab-graph").click();
  await page.locator("details.index").evaluate(element => { element.open = true; });
  await page.locator("#idx button").first().click();
  assert(await page.locator("#toast").isVisible());
  await page.locator("#toastClose").click();
  assert(await page.locator("#toast").isHidden());
  await page.locator("details.index").evaluate(element => { element.open = false; });
  await page.evaluate(() => {
    document.activeElement?.blur();
    document.body.dataset.snapshot = "true";
    window.prepareAtlasSnapshot();
    window.scrollTo(0, 0);
  });
  assert.deepEqual(errors, [], "Browser runtime errors.");
  const output = path.join(root, "docs/assets/codebase-map.png");
  await mkdir(path.dirname(output), { recursive: true });
  await page.screenshot({ path: output, fullPage: true, animations: "disabled" });
  console.log(`Captured ${path.relative(root, output)} (${expected.nodes} nodes, ${expected.edges} relations)`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
