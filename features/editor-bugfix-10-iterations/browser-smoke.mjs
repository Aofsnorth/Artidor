import assert from "node:assert/strict";
import { chromium } from "playwright";

// Uses the existing dev server only. The isolated context cannot access user projects.
const browser = await chromium.launch({
	headless: true,
	timeout: 20_000,
	args: ["--disable-webgpu", "--disable-gpu"],
});
try {
	const context = await browser.newContext();
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	const response = await page.goto("http://127.0.0.1:3005/editor/reliability-smoke", {
		waitUntil: "domcontentloaded",
		timeout: 45_000,
	});
	assert(response?.ok(), "Editor route must return a successful response");
	await page.waitForFunction(() => Boolean(window.__ARTIDOR_API__ && window.__ARTIDOR_DEBUG__?.getState().tracks), { timeout: 30_000 });
	const result = await page.evaluate(async () => {
		const api = window.__ARTIDOR_API__;
		const debug = window.__ARTIDOR_DEBUG__;
		const run = async (name, args = {}) => {
			const result = await api.run(name, args);
			if (!result.ok) throw new Error(name + ": " + result.message);
			return result;
		};
		await run("insert_text_element", { content: "Regression smoke", durationSeconds: 3 });
		const original = debug.getState().elements.find((element) => element.type === "text");
		if (!original) throw new Error("Inserted text missing");
		await run("duplicate_elements", { elements: [{ trackId: original.trackId, elementId: original.id }] });
		const duplicated = debug.getState();
		await run("undo");
		const undone = debug.getState();
		await run("redo");
		const redone = debug.getState();
		await run("save_project");
		return { duplicated, undone, redone };
	});
	assert.equal(result.duplicated.elements.length, 2);
	assert.equal(result.undone.elements.length, 1);
	assert.deepEqual(result.redone.elements, result.duplicated.elements);
	console.log("PASS: isolated editor load, insert, duplicate, undo/redo identities, save");
	console.log("Runtime errors:", JSON.stringify(errors));
	assert.equal(errors.length, 0, "Browser should not report runtime errors");
	await context.close();
} finally {
	await browser.close();
}
