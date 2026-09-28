/**
 * Adjust panel — CapCut-parity feature coverage.
 *
 * Covers the toolbar (Auto / Copy / Paste / Reset / Apply all), the master
 * intensity, the preset cards, per-adjustment copy/paste of a single value,
 * the Basic/Wheels/Curves/HSL sub-tabs, and — importantly — that the Adjust
 * tab is reachable on a VIDEO element as well as an image, not just images.
 *
 * Assertions read the STORED effects from `__ARTIDOR_DEBUG__.getState()`
 * rather than the DOM, so a value that only paints but never persists is
 * caught.
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
	elements: Array<{ id: string; trackId: string; effects: StoredEffect[] }>;
};

async function insertAndSelect(
	page: Page,
	kind: "image" | "video",
): Promise<string> {
	const elementId = await page.evaluate((k) => {
		const w = window as unknown as {
			__ARTIDOR_DEBUG__?: {
				insertMockImage: (o?: { durationSeconds?: number }) => string;
				insertMockVideo: (o?: { durationSeconds?: number }) => string;
			};
		};
		if (!w.__ARTIDOR_DEBUG__) throw new Error("__ARTIDOR_DEBUG__ missing");
		return k === "image"
			? w.__ARTIDOR_DEBUG__.insertMockImage({ durationSeconds: 4 })
			: w.__ARTIDOR_DEBUG__.insertMockVideo({ durationSeconds: 4 });
	}, kind);
	const state = (await page.evaluate(
		() =>
			(
				window as unknown as {
					__ARTIDOR_DEBUG__?: { getState: () => StateWithEffects };
				}
			).__ARTIDOR_DEBUG__?.getState() ?? { elements: [] },
	)) as StateWithEffects;
	const element = state.elements.find((e) => e.id === elementId);
	expect(element, `${kind} inserted`).toBeTruthy();
	const selected = await runCommand(page, "select_elements", {
		elements: [{ trackId: element?.trackId ?? "", elementId }],
	});
	expect(selected.ok, `select_elements: ${selected.message}`).toBe(true);
	await page.waitForTimeout(600);
	return elementId;
}

async function effectsOf(
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
		return (
			w.__ARTIDOR_DEBUG__?.getState().elements.find((e) => e.id === id)
				?.effects ?? []
		);
	}, elementId);
}

function amountOf(effects: readonly StoredEffect[], type: string) {
	const raw = effects.find((e) => e.type === type)?.params?.amount;
	return typeof raw === "number" ? raw : undefined;
}

/** Drag a slider to a fraction of its track, scrolling it into view first. */
async function dragTo(
	page: Page,
	testId: string,
	fraction: number,
): Promise<void> {
	const slider = page.getByTestId(testId).locator('input[type="range"]');
	await slider.waitFor({ state: "visible", timeout: 15_000 });
	await slider.scrollIntoViewIfNeeded({ timeout: 10_000 });
	const box = await slider.boundingBox();
	if (!box) throw new Error(`no bounding box for ${testId}`);
	const y = box.y + box.height / 2;
	const fromX = box.x + box.width * 0.5;
	await page.mouse.move(fromX, y);
	await page.mouse.down();
	for (let i = 1; i <= 5; i++) {
		await page.mouse.move(
			fromX + (box.width * fraction - box.width * 0.5) * (i / 5),
			y,
		);
	}
	await page.mouse.up();
	await page.waitForTimeout(350);
}

async function openAdjust(page: Page): Promise<void> {
	await clickInspectorTab(page, /^Adjust$/i);
	await page
		.getByTestId("adjust-auto")
		.waitFor({ state: "visible", timeout: 15_000 });
}

test.describe("Adjust panel — availability", () => {
	test("the Adjust tab is offered for a VIDEO element", async ({ page }) => {
		await bootEditor(page);
		await insertAndSelect(page, "video");
		const tab = page
			.getByTestId("properties-panel")
			.locator('button[aria-label="Adjust"]')
			.first();
		await expect(tab, "video exposes the Adjust tab").toBeVisible({
			timeout: 10_000,
		});
		await tab.click({ force: true });
		await page
			.getByTestId("adjust-auto")
			.waitFor({ state: "visible", timeout: 15_000 });
	});

	test("the Adjust tab is offered for an IMAGE element", async ({ page }) => {
		await bootEditor(page);
		await insertAndSelect(page, "image");
		await openAdjust(page);
		await expect(page.getByTestId("adjust-intensity")).toBeVisible();
	});
});

test.describe("Adjust panel — CapCut toolbar", () => {
	test("Auto applies a balanced starting grade", async ({ page }) => {
		await bootEditor(page);
		const elementId = await insertAndSelect(page, "image");
		await openAdjust(page);

		await page.getByTestId("adjust-auto").click();
		await page.waitForTimeout(400);

		const effects = await effectsOf(page, elementId);
		// "auto" preset names contrast + saturation + vibrance.
		expect(amountOf(effects, "contrast"), "auto wrote contrast").toBeDefined();
		expect(amountOf(effects, "vibrance"), "auto wrote vibrance").toBeDefined();
	});

	test("a preset card applies its grade and Reset clears it", async ({
		page,
	}) => {
		await bootEditor(page);
		const elementId = await insertAndSelect(page, "image");
		await openAdjust(page);

		await page.getByTestId("adjust-preset-cinematic").click();
		await page.waitForTimeout(400);
		const graded = await effectsOf(page, elementId);
		expect(
			amountOf(graded, "vignette"),
			"cinematic preset wrote vignette",
		).toBeDefined();

		await page.getByTestId("adjust-reset-all").click();
		await page.waitForTimeout(400);
		const cleared = await effectsOf(page, elementId);
		expect(
			amountOf(cleared, "vignette"),
			"reset removed the adjustment",
		).toBeUndefined();
		expect(
			cleared.some((e) => e.type === "contrast" || e.type === "saturation"),
			"reset removed every basic adjustment",
		).toBe(false);
	});

	test("master intensity scales the whole grade without rewriting the base", async ({
		page,
	}) => {
		await bootEditor(page);
		const elementId = await insertAndSelect(page, "image");
		await openAdjust(page);

		// Grade first, then halve it with the intensity master.
		await dragTo(page, "adjust-contrast", 0.9);
		const baseBefore = amountOf(await effectsOf(page, elementId), "contrast");
		expect(baseBefore, "contrast graded").toBeDefined();
		const shownBefore = await page
			.getByTestId("adjust-contrast")
			.locator('input[type="range"]')
			.inputValue();

		const intensity = page
			.getByTestId("adjust-intensity")
			.locator('input[type="range"]');
		await intensity.scrollIntoViewIfNeeded();
		await intensity.focus();
		for (let i = 0; i < 100; i++) {
			await page.keyboard.press("ArrowLeft");
		}
		await page.waitForTimeout(500);

		// Intensity is stored separately from the grade, so the BASE contrast
		// must be untouched while the DISPLAYED value moves back toward
		// neutral. That split is what keeps the slider drift-free.
		const effects = await effectsOf(page, elementId);
		const gradeEffect = effects.find((e) => e.type === "davinci-adjust");
		expect(gradeEffect?.params?.intensity, "intensity persisted").toBeLessThan(
			100,
		);

		const baseAfter = amountOf(effects, "contrast");
		expect(
			Math.abs((baseAfter ?? 0) - (baseBefore ?? 0)),
			"base grade is unchanged by scaling",
		).toBeLessThan(1.5);

		const shownAfter = await page
			.getByTestId("adjust-contrast")
			.locator('input[type="range"]')
			.inputValue();
		expect(
			Number(shownAfter),
			`displayed value scaled toward neutral: ${shownBefore} -> ${shownAfter}`,
		).toBeLessThan(Number(shownBefore));
	});

	test("copy a single value and paste it onto another adjustment", async ({
		page,
	}) => {
		await bootEditor(page);
		const elementId = await insertAndSelect(page, "image");
		await openAdjust(page);

		await dragTo(page, "adjust-contrast", 0.9);
		const contrast = amountOf(await effectsOf(page, elementId), "contrast");
		expect(contrast, "contrast graded").toBeDefined();

		// Copy Contrast's value…
		const copyButton = page
			.getByTestId("adjust-contrast")
			.getByRole("button", { name: /^Copy Contrast value$/i });
		await copyButton.scrollIntoViewIfNeeded();
		await copyButton.click();
		await page.waitForTimeout(250);

		// …and paste it onto Saturation.
		const pasteButton = page
			.getByTestId("adjust-saturation")
			.getByRole("button", { name: /^Paste value onto Saturation$/i });
		await pasteButton.scrollIntoViewIfNeeded();
		await expect(pasteButton, "paste enabled after copy").toBeEnabled();
		await pasteButton.click();
		await page.waitForTimeout(400);

		const effects = await effectsOf(page, elementId);
		const saturation = amountOf(effects, "saturation");
		expect(saturation, "saturation written by paste").toBeDefined();
		expect(saturation).not.toBe(100); // 100 is saturation's neutral
	});

	test("Copy / Paste move the whole grade", async ({ page }) => {
		await bootEditor(page);
		const elementId = await insertAndSelect(page, "image");
		await openAdjust(page);

		await dragTo(page, "adjust-saturation", 0.9);
		const original = amountOf(await effectsOf(page, elementId), "saturation");

		// Copy the grade BEFORE clearing it, then paste it back.
		await page.getByTestId("adjust-copy-grade").click();
		await page.waitForTimeout(200);

		await page.getByTestId("adjust-reset-all").click();
		await page.waitForTimeout(300);
		expect(
			amountOf(await effectsOf(page, elementId), "saturation"),
			"reset cleared the grade",
		).toBeUndefined();

		await page.getByTestId("adjust-paste-grade").click();
		await page.waitForTimeout(400);

		const restored = amountOf(await effectsOf(page, elementId), "saturation");
		expect(restored, "grade restored by paste").toBeDefined();
		expect(Math.abs((restored ?? 0) - (original ?? 0))).toBeLessThan(1.5);
	});
});

test.describe("Adjust panel — advanced sub-tabs", () => {
	test("Wheels, Curves and HSL sub-tabs all render", async ({ page }) => {
		await bootEditor(page);
		await insertAndSelect(page, "image");
		await openAdjust(page);

		await page.getByTestId("adjust-subtab-wheels").click();
		await expect(
			page.getByText(/primary wheels/i).first(),
			"wheels panel",
		).toBeVisible({ timeout: 10_000 });

		await page.getByTestId("adjust-subtab-curves").click();
		await expect(page.getByText(/curves/i).first(), "curves panel").toBeVisible(
			{ timeout: 10_000 },
		);

		await page.getByTestId("adjust-subtab-hsl").click();
		await expect(
			page.getByText(/hsl secondary/i).first(),
			"hsl panel",
		).toBeVisible({ timeout: 10_000 });

		// Back to Basic still works — sub-tab state is local, not destructive.
		await page.getByTestId("adjust-subtab-basic").click();
		await expect(page.getByTestId("adjust-intensity")).toBeVisible();
	});

	test("an HSL slider writes into the grading effect", async ({ page }) => {
		await bootEditor(page);
		const elementId = await insertAndSelect(page, "image");
		await openAdjust(page);
		await page.getByTestId("adjust-subtab-hsl").click();

		const sat = page.getByTestId("dv-hsl_sat").locator('input[type="range"]');
		await sat.waitFor({ state: "visible", timeout: 10_000 });
		await sat.scrollIntoViewIfNeeded();
		await sat.focus();
		for (let i = 0; i < 6; i++) {
			await page.keyboard.press("ArrowRight");
		}
		await page.waitForTimeout(400);

		const effect = (await effectsOf(page, elementId)).find(
			(e) => e.type === "davinci-adjust",
		);
		expect(
			effect,
			"davinci-adjust effect created by the HSL panel",
		).toBeDefined();
		expect(effect?.params?.hsl_sat, "hsl_sat written").toBeGreaterThan(0);
	});
});
