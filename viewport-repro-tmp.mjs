import { chromium } from "playwright";
import fs from "node:fs";
const bundle = fs.readFileSync("C:/Users/Arthenyx/AppData/Local/Temp/artidor-viewport-repro/bundle.js", "utf8");
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.setContent(`<!DOCTYPE html><html><body><div id="root"></div></body></html>`);
  await page.addScriptTag({ content: bundle });
  await page.waitForFunction(() => window.__READY__ === true, null, { timeout: 15000 });
  const result = await page.evaluate(() => window.__RESULT__);
  console.log("RESULT:" + JSON.stringify(result, null, 2));
} finally { await browser.close(); }
