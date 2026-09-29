/**
 * Adjust panel — CapCut-parity feature coverage.
 *
 * Covers the toolbar (Auto / Copy / Paste / Reset / Apply all), the master
 * intensity, the preset cards, per-adjustment copy/paste of a single value,
 * the surviving Basic/Wheels/Bars/Vignette/Sharpen/Glow sub-tabs, and —
 * importantly — that the Adjust tab is reachable on a VIDEO element as well as
 * an image, not just images.
 *
 * The Curves, HSL, Qualifier and LUT sub-tabs were removed: they wrote
 * `curves` / `hsl` / `lut`, which are registered but declare zero render
 * passes, so every control in them moved a number the renderer ignored. The
 * advanced sub-tab suite below now asserts that each SURVIVING panel writes a
 * registered, rendering primitive instead.
 *
 * Assertions read the STORED effects from `__ARTIDOR_DEBUG__.getState()`
 * rather than the DOM, so a value that only paints but never persists is
 * caught — and, just as importantly, a value that persists but never paints.
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

/** Every effect type the renderer will actually run. */
const NON_RENDERING = new Set([
	"curves",
	"davinci-adjust",
	"hsl",
	"hsl-curve",
	"lut",
	"qualifier",
]);

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

		// Intensity is NOT stored on the element: no registered effect means
		// "scale the whole grade", so writing one (as this panel used to, as
		// `davinci-adjust`) would only persist a param the renderer skips.
		// The BASE contrast must therefore be untouched while the DISPLAYED
		// value moves back toward neutral — that split is what keeps the
		// slider drift-free.
		const effects = await effectsOf(page, elementId);
		expect(
			effects.some((e) => NON_RENDERING.has(e.type)),
			`no non-rendering effect is written: ${JSON.stringify(effects.map((e) => e.type))}`,
		).toBe(false);

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

		await page.getByTestId("adjust-reset-all").click();
		await page.waitForTimeout(300);
		expect(
			amountOf(await effectsOf(page, elementId), "saturation"),
			"reset cleared the grade",
		).toBeUndefined();

		// The clipboard lives in a module-level variable, so React only
		// re-reads it on the next store-driven render — the reset above. Wait
		// for that render explicitly instead of relying on the click that
		// follows, which otherwise races the panel's re-render.
		const pasteGrade = page.getByTestId("adjust-paste-grade");
		await expect(pasteGrade, "paste enabled by the copied grade").toBeEnabled({
			timeout: 15_000,
		});
		await pasteGrade.click();
		await page.waitForTimeout(400);

		const restored = amountOf(await effectsOf(page, elementId), "saturation");
		expect(restored, "grade restored by paste").toBeDefined();
		expect(Math.abs((restored ?? 0) - (original ?? 0))).toBeLessThan(1.5);
	});
});

test.describe("Adjust panel — advanced sub-tabs", () => {
	test("every surviving sub-tab renders", async ({ page }) => {
		await bootEditor(page);
		await insertAndSelect(page, "image");
		await openAdjust(page);

		await page.getByTestId("adjust-subtab-wheels").click();
		await expect(
			page.getByText(/primary wheels/i).first(),
			"wheels panel",
		).toBeVisible({ timeout: 10_000 });

		await page.getByTestId("adjust-subtab-bars").click();
		await expect(
			page.getByText(/primary bars/i).first(),
			"bars panel",
		).toBeVisible({ timeout: 10_000 });

		await page.getByTestId("adjust-subtab-vignette").click();
		await expect(
			page.getByTestId("vig-vignette"),
			"vignette panel",
		).toBeVisible({ timeout: 10_000 });

		await page.getByTestId("adjust-subtab-sharpen").click();
		await expect(
			page.getByTestId("detail-sharpen"),
			"sharpen panel",
		).toBeVisible({ timeout: 10_000 });

		await page.getByTestId("adjust-subtab-glow").click();
		await expect(page.getByTestId("glow-glow"), "glow panel").toBeVisible({
			timeout: 10_000,
		});

		// Back to Basic still works — sub-tab state is local, not destructive.
		await page.getByTestId("adjust-subtab-basic").click();
		await expect(page.getByTestId("adjust-intensity")).toBeVisible();
	});

	test("the sub-tabs that wrote zero-pass effects are gone", async ({
		page,
	}) => {
		await bootEditor(page);
		await insertAndSelect(page, "image");
		await openAdjust(page);

		// `curves` / `hsl` / `lut` declare no render passes, so leaving the
		// sub-tabs in place would keep dead UI in front of the user.
		for (const removed of ["curves", "hsl", "qualifier", "lut"]) {
			await expect(
				page.getByTestId(`adjust-subtab-${removed}`),
				`${removed} sub-tab removed`,
			).toHaveCount(0);
		}
	});

	test("every advanced panel writes a registered, rendering effect", async ({
		page,
	}) => {
		await bootEditor(page);
		const elementId = await insertAndSelect(page, "image");
		await openAdjust(page);

		// Bars: the tone sliders each own one registered primitive.
		await page.getByTestId("adjust-subtab-bars").click();
		await dragTo(page, "bars-contrast", 0.95);
		await dragTo(page, "bars-hue-rotate", 0.9);

		// Detail: sharpen / blur / defog.
		await page.getByTestId("adjust-subtab-sharpen").click();
		await dragTo(page, "detail-sharpen", 0.8);
		await dragTo(page, "detail-box-blur", 0.6);

		// Creative: glow / grain / vignette.
		await page.getByTestId("adjust-subtab-glow").click();
		await dragTo(page, "glow-glow", 0.7);
		await page.getByTestId("adjust-subtab-vignette").click();
		await dragTo(page, "vig-vignette", 0.6);

		const effects = await effectsOf(page, elementId);
		const written = effects.map((e) => e.type);
		for (const expected of [
			"contrast",
			"hue-rotate",
			"sharpen",
			"box-blur",
			"glow",
			"vignette",
		]) {
			expect(written, `${expected} written by its panel`).toContain(expected);
		}
		for (const type of written) {
			expect(
				NON_RENDERING.has(type),
				`the Adjust tab wrote the non-rendering effect "${type}"`,
			).toBe(false);
		}
	});

	test("a colour wheel writes the color-wheels effect as a hex colour", async ({
		page,
	}) => {
		await bootEditor(page);
		const elementId = await insertAndSelect(page, "image");
		await openAdjust(page);
		await page.getByTestId("adjust-subtab-wheels").click();

		const wheel = page.getByLabel("Lift color wheel");
		await wheel.waitFor({ state: "visible", timeout: 10_000 });
		await wheel.scrollIntoViewIfNeeded();
		const box = await wheel.boundingBox();
		if (!box) throw new Error("no bounding box for the Lift wheel");
		const cy = box.y + box.height / 2;
		await page.mouse.move(box.x + box.width / 2, cy);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width * 0.78, cy, { steps: 5 });
		await page.mouse.up();
		await page.waitForTimeout(400);

		const effect = (await effectsOf(page, elementId)).find(
			(e) => e.type === "color-wheels",
		);
		expect(effect, "color-wheels created by the Lift wheel").toBeDefined();
		expect(effect?.params?.lift, "lift stored as a hex colour").toMatch(
			/^#[0-9a-f]{6}$/i,
		);
		expect(effect?.params?.lift).not.toBe("#000000");
	});

	test("a Bars slider stores nothing when it is back at neutral", async ({
		page,
	}) => {
		await bootEditor(page);
		const elementId = await insertAndSelect(page, "image");
		await openAdjust(page);
		await page.getByTestId("adjust-subtab-bars").click();

		await dragTo(page, "bars-contrast", 0.95);
		const graded = await effectsOf(page, elementId);
		expect(amountOf(graded, "contrast"), "contrast graded").toBeDefined();

		// Contrast's neutral is the slider midpoint (its param defaults to
		// 100 in 0..200), so the reset button must REMOVE the effect rather
		// than store a no-op.
		await page
			.getByTestId("bars-contrast")
			.getByRole("button", { name: /^Reset Contrast$/i })
			.click();
		await page.waitForTimeout(400);
		expect(
			amountOf(await effectsOf(page, elementId), "contrast"),
			"neutral stores no effect",
		).toBeUndefined();
	});
});
