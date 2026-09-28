/**
 * Adjust-panel slider regressions.
 *
 * Two bugs are covered here:
 *
 * 1. Released sliders snapped back to 0. The old inspector wrote one
 *    `UpdateElementsCommand` per pointer tick straight from the drag
 *    start state, so on release the field re-read a stale `value` and
 *    jumped back to the value it had before the drag. The panel now
 *    previews during the drag and commits once on release.
 * 2. A single drag flooded undo history with one entry per tick. One
 *    gesture must now be one `undo`.
 *
 * The panel is exercised for real (mouse drag on the track) and asserted
 * against the STORED effects from `__ARTIDOR_DEBUG__.getState()`, not just
 * the DOM readout: a snapped-back input can look fine in the DOM while
 * the write was dropped, and vice versa.
 *
 * Run via:
 *   npx playwright test tests/16-adjust-sliders.spec.ts
 */
import { expect, test, type Page } from "@playwright/test";
import { bootEditor, clickInspectorTab, runCommand } from "./helpers";

type StoredEffect = {
	id?: string;
	type: string;
	enabled?: boolean;
	params?: Record<string, unknown>;
};

type StateWithEffects = {
	elements: Array<{
		id: string;
		trackId: string;
		type: string;
		effects: StoredEffect[];
	}>;
};

/**
 * The Adjust panel is registered for IMAGE elements only (see
 * `getImageConfig` in the properties registry), so the fixture is a mock
 * image rather than the mock video other suites use.
 */
async function selectMockImage(page: Page): Promise<string> {
	const elementId = await page.evaluate(() => {
		const w = window as unknown as {
			__ARTIDOR_DEBUG__?: {
				insertMockImage: (o?: { durationSeconds?: number }) => string;
			};
		};
		if (!w.__ARTIDOR_DEBUG__) throw new Error("__ARTIDOR_DEBUG__ missing");
		return w.__ARTIDOR_DEBUG__.insertMockImage({ durationSeconds: 4 });
	});
	const state = (await page.evaluate(
		() =>
			(
				window as unknown as {
					__ARTIDOR_DEBUG__?: { getState: () => StateWithEffects };
				}
			).__ARTIDOR_DEBUG__?.getState() ?? { elements: [] },
	)) as StateWithEffects;
	const element = state.elements.find((e) => e.id === elementId);
	expect(element, "mock image present in state").toBeTruthy();
	// The track id is a generated UUID, not the literal "main" the
	// track is NAMED, so it has to come from the state snapshot.
	const selected = await runCommand(page, "select_elements", {
		elements: [{ trackId: element?.trackId ?? "", elementId }],
	});
	expect(selected.ok, `select_elements: ${selected.message}`).toBe(true);
	await page.waitForTimeout(600);
	return elementId;
}

async function readEffects(
	page: Page,
	elementId: string,
): Promise<StoredEffect[]> {
	return await page.evaluate((id) => {
		const w = window as unknown as {
			__ARTIDOR_DEBUG__?: {
				getState: () => {
					elements: Array<{ id: string; effects: StoredEffect[] }>;
				};
			};
		};
		if (!w.__ARTIDOR_DEBUG__) throw new Error("__ARTIDOR_DEBUG__ missing");
		return w.__ARTIDOR_DEBUG__.getState().elements.find((e) => e.id === id)
			?.effects as StoredEffect[];
	}, elementId);
}

function findAmount(
	effects: readonly StoredEffect[],
	effectType: string,
): number | undefined {
	const raw = effects.find((e) => e.type === effectType)?.params?.amount;
	return typeof raw === "number" ? raw : undefined;
}

/** Press the mouse down on the slider track, sweep right, release. */
async function dragSlider(
	page: Page,
	testId: string,
	endFraction: number,
): Promise<void> {
	const slider = page.getByTestId(testId).locator('input[type="range"]');
	await slider.waitFor({ state: "visible", timeout: 15_000 });
	// The inspector is short (≈390px) and its control list is long, so a
	// raw bounding box can point BELOW the scroll viewport — where the
	// timeline panel receives the pointer instead. Scroll it into view
	// first or the "drag" lands on whatever is painted underneath.
	await slider.scrollIntoViewIfNeeded({ timeout: 10_000 });
	const box = await slider.boundingBox();
	if (!box) throw new Error(`no bounding box for ${testId}`);
	const startX = box.x + box.width * 0.5;
	const y = box.y + box.height / 2;
	await page.mouse.move(startX, y);
	await page.mouse.down();
	// Several intermediate moves: a real drag emits many ticks, which is
	// exactly what used to produce one history entry each.
	for (let i = 1; i <= 6; i++) {
		await page.mouse.move(
			startX + (box.width * endFraction - box.width * 0.5) * (i / 6),
			y,
		);
	}
	await page.mouse.up();
	await page.waitForTimeout(300);
}

test.describe("Editor — Adjust panel sliders", () => {
	test("a released slider keeps its value instead of snapping to 0", async ({
		page,
	}) => {
		await bootEditor(page);
		const elementId = await selectMockImage(page);
		await clickInspectorTab(page, /^Adjust$/i);

		await dragSlider(page, "adjust-brightness", 0.85);

		// The write must be STORED, not just painted in the DOM.
		const amount = findAmount(await readEffects(page, elementId), "brightness");
		expect(
			amount,
			"brightness effect was written to the element",
		).toBeDefined();
		expect(
			amount ?? 0,
			"brightness is not the neutral amount (100 for brightness)",
		).not.toBe(100);

		// And the field must still show the dragged value after release.
		const shown = await page
			.getByTestId("adjust-brightness")
			.locator('input[type="range"]')
			.inputValue();
		expect(
			Number(shown),
			"slider readout kept the dragged value",
		).toBeGreaterThan(0);
	});

	test("one slider gesture is one undo entry", async ({ page }) => {
		await bootEditor(page);
		const elementId = await selectMockImage(page);
		await clickInspectorTab(page, /^Adjust$/i);

		await dragSlider(page, "adjust-contrast", 0.9);
		const after = findAmount(await readEffects(page, elementId), "contrast");
		expect(after, "contrast written").toBeDefined();

		const undo = await runCommand(page, "undo", {});
		expect(undo.ok, `undo: ${undo.message}`).toBe(true);
		await page.waitForTimeout(300);

		// A single undo must clear the effect entirely: the neutral
		// position removes the effect rather than storing a no-op pass.
		expect(
			findAmount(await readEffects(page, elementId), "contrast"),
			"one undo reverted the whole gesture",
		).toBeUndefined();

		const redo = await runCommand(page, "redo", {});
		expect(redo.ok, `redo: ${redo.message}`).toBe(true);
		await page.waitForTimeout(300);
		expect(
			findAmount(await readEffects(page, elementId), "contrast"),
			"redo restored the value",
		).toBeDefined();
	});

	test("keyboard nudging works and commits on release", async ({ page }) => {
		await bootEditor(page);
		const elementId = await selectMockImage(page);
		await clickInspectorTab(page, /^Adjust$/i);

		const slider = page
			.getByTestId("adjust-saturation")
			.locator('input[type="range"]');
		await slider.waitFor({ state: "visible", timeout: 15_000 });
		await slider.scrollIntoViewIfNeeded({ timeout: 10_000 });
		await slider.focus();
		for (let i = 0; i < 8; i++) {
			await page.keyboard.press("ArrowRight");
		}
		await page.waitForTimeout(300);

		const amount = findAmount(await readEffects(page, elementId), "saturation");
		expect(amount, "saturation written by keyboard").toBeDefined();
		expect(amount ?? 0, "saturation moved off neutral").not.toBe(100);

		// A blur (leaving the field) commits whatever is pending.
		await page.keyboard.press("Tab");
		await page.waitForTimeout(300);
		expect(
			findAmount(await readEffects(page, elementId), "saturation"),
			"value survived leaving the field",
		).toBe(amount);
	});
});
