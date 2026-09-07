import assert from "node:assert/strict";
import { chromium, devices } from "playwright";
import { writeFile } from "node:fs/promises";

const browser = await chromium.launch({ headless: true, timeout: 20_000 });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: "reduce" });
const page = await context.newPage();
page.setDefaultTimeout(8000);
const report = { routes: [], devices: [], runtimeErrors: [] };
page.on("pageerror", (error) => report.runtimeErrors.push(error.message));
try {
  for (const route of ["/sponsors", "/brand", "/privacy", "/terms", "/contributors", "/oauth-callback", "/c/ui-polish-qa", "/s/ui-polish-qa", "/changelog", "/blog"]) {
    const response = await page.goto(`http://127.0.0.1:3005${route}`, { waitUntil: "domcontentloaded", timeout: 35_000 });
    assert(response?.ok(), `${route}: HTTP ${response?.status()}`);
    await page.waitForTimeout(400);
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      assert(scrollWidth <= width + 1, `${route}: ${scrollWidth}px overflows ${width}px`);
      await page.screenshot({ path: `features/ui-polish-2026-09-06/screenshots/remaining-${route.split('/')[1]}-${width}.png` });
    }
    report.routes.push({ route, status: "pass" });
    console.log(`PASS: ${route} at 375/768/1440`);
    if (route === "/changelog" || route === "/blog") {
      const link = page.locator(`main a[href^='${route}/']`).first();
      const href = await link.count() ? await link.getAttribute("href") : null;
      if (href) {
        await page.goto(`http://127.0.0.1:3005${href}`, { waitUntil: "domcontentloaded", timeout: 35_000 });
        await page.screenshot({ path: `features/ui-polish-2026-09-06/screenshots/remaining-${route.slice(1)}-detail.png` });
        report.routes.push({ route: href, status: "captured" });
      }
    }
  }
  for (const name of ["iPhone 13", "iPad Mini", "Pixel 7"]) {
    const deviceContext = await browser.newContext({ ...devices[name], reducedMotion: "reduce" });
    const device = await deviceContext.newPage();
    await device.goto("http://127.0.0.1:3005/projects", { waitUntil: "domcontentloaded", timeout: 35_000 });
    await device.getByRole("heading", { name: /desktop/i }).waitFor();
    await device.screenshot({ path: `features/ui-polish-2026-09-06/screenshots/remaining-${name.replaceAll(' ', '-')}.png` });
    if (name === "Pixel 7") assert.equal(await device.getByRole("button", { name: "Take a look anyway" }).count(), 0);
    report.devices.push(name);
    console.log(`PASS: ${name} mobile gate`);
    await deviceContext.close();
  }
  assert.equal(report.runtimeErrors.length, 0, JSON.stringify(report.runtimeErrors));
} catch (error) {
  report.failure = { message: error.message, url: page.url() };
  throw error;
} finally {
  await writeFile("features/ui-polish-2026-09-06/remaining-verification.json", JSON.stringify(report, null, 2));
  await browser.close();
}
