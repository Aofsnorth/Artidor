/**
 * Cross-clip adjust bleed regression.
 *
 * Symptom (user report): "select clip 2, adjust it there, and clip 1 changes
 * along with it."
 *
 * Root cause: the preview overlay was a scene-wide `Map<elementId, patch>` and
 * `commitPreview()` promoted EVERY staged entry in one snapshot command. A
 * gesture staged on clip 1 and interrupted before it committed (here: the
 * opacity field is still focused, so its `onBlur` commit never fired) was
 * therefore promoted inside clip 2's commit, writing clip 1's staged value to
 * the timeline.
 *
 * The precondition is built through the real UI: typing in the Image tab's
 * Opacity field previews on every change and only commits on blur. The pointer
 * is never moved away from the field, so the staged entry stays uncommitted
 * while the test switches selection to clip 2 via the command API — the
 * selection change never blurs the field.
 *
 * Assertions read the STORED effects from `__ARTIDOR_DEBUG__.getState()`, not
 * the DOM: a leaked write is invisible in the panel that made it.
 *
 * Run via:
 *   npx playwright test tests/26-adjust-cross-clip-bleed.spec.ts
 */
import { expect, test, type Page } from "@playwright/test";
import { bootEditor, runCommand } from "./helpers";

type StateWithElements = {
	elements: Array<{
		id: string;
		trackId: string;
		type: string;
		effects: StoredEffect[];
		opacity?: number;
	}>;
};

type StoredEffect = {
	id?: string;
	type: string;
	enabled?: boolean;
	params?: Record<string, unknown>;
};

type InsertOptions = {
	durationSeconds?: number;
	/**
	 * Seconds from the timeline start. Two clips on one track MUST get distinct
	 * start times: `placement: explicit` rejects an overlap, and a rejected
	 * insert makes the helper return the PREVIOUS clip's id, which silently
	 * turns a two-clip test into a one-clip test.
	 */
	startTime?: number;
};

async function insertAndSelectImage(
	page: Page,
	opts: { startTime: number; durationSeconds: number },
): Promise<{ elementId: string; trackId: string }> {
	const { elementId, trackId } = await page.evaluate(
		([o]) => {
			const w = window as unknown as {
				__ARTIDOR_DEBUG__?: {
					insertMockImage: (o?: InsertOptions) => string;
					getState: () => StateWithElements;
				};
			};
			if (!w.__ARTIDOR_DEBUG__) throw new Error("__ARTIDOR_DEBUG__ missing");
			const before = w.__ARTIDOR_DEBUG__.getState().elements.map((e) => e.id);
			const id = w.__ARTIDOR_DEBUG__.insertMockImage(o);
			if (before.includes(id)) {
				throw new Error(
					"insertMockImage returned a pre-existing element id (overlapping placement?)",
				);
			}
			// The track id is a generated UUID, not the literal "main" the track is
			// NAMED, so it has to come from the state snapshot.
			const element = w.__ARTIDOR_DEBUG__
				.getState()
				.elements.find((e) => e.id === id);
			if (!element) throw new Error("mock image missing from state");
			return { elementId: id, trackId: element.trackId };
		},
		[opts] as const,
	);

	const selected = await runCommand(page, "select_elements", {
		elements: [{ trackId, elementId }],
	});
	expect(selected.ok, `select_elements: ${selected.message}`).toBe(true);
	await page.waitForTimeout(600);
	return { elementId, trackId };
}

async function readEffects(
	page: Page,
	elementId: string,
): Promise<StoredEffect[]> {
	return await page.evaluate((id) => {
		const w = window as unknown as {
			__ARTIDOR_DEBUG__?: { getState: () => StateWithElements };
		};
		if (!w.__ARTIDOR_DEBUG__) throw new Error("__ARTIDOR_DEBUG__ missing");
		return w.__ARTIDOR_DEBUG__.getState().elements.find((e) => e.id === id)
			?.effects as StoredEffect[];
	}, elementId);
}

/** Effects + opacity of a clip as currently STORED on the timeline. */
async function readElement(
	page: Page,
	elementId: string,
): Promise<{
	effects: StoredEffect[];
	opacity: number | undefined;
} | null> {
	return await page.evaluate((id) => {
		const w = window as unknown as {
			__ARTIDOR_DEBUG__?: { getState: () => StateWithElements };
		};
		if (!w.__ARTIDOR_DEBUG__) throw new Error("__ARTIDOR_DEBUG__ missing");
		const element = w.__ARTIDOR_DEBUG__
			.getState()
			.elements.find((e) => e.id === id);
		if (!element) return null;
		return { effects: element.effects, opacity: element.opacity };
	}, elementId);
}

function findAmount(
	effects: readonly { type: string; params?: Record<string, unknown> }[],
	effectType: string,
): number | undefined {
	const raw = effects.find((e) => e.type === effectType)?.params?.amount;
	return typeof raw === "number" ? raw : undefined;
}

/**
 * Type into the Image tab's Opacity field WITHOUT blurring it: `onChange`
 * previews into the overlay, and the commit only happens on `onBlur`. This
 * leaves a staged-but-uncommitted entry, which is the precondition for the
 * bleed.
 */
/**
 * Open a SECONDARY inspector tab (Info / Image / Adjust / Transform / …).
 *
 * Three traps here, all learned from a failed first draft:
 *
 * 1. The inspector renders TWO tab rows and several labels appear in both —
 *    "Image" is a primary type-tab AND the secondary media tab. `.first()`
 *    lands on the primary row, which switches tab groups instead of opening
 *    the panel. Scope on the secondary row (the one carrying `aria-label`).
 * 2. Do NOT pass `force: true`. The secondary tabs sit inside a TooltipTrigger,
 *    so the element under the click point is a child `<span>`, not the button.
 *    A forced click dispatches at those coordinates and never reaches the
 *    button's own handler, so the tab silently does not switch.
 * 3. A normal click can also be blocked: after the Opacity field is focused,
 *    a portal overlay (tooltip/dialog) intercepts pointer events over the tab
 *    strip, so Playwright refuses with "<html> intercepts pointer events".
 *    `dispatchEvent("click")` bypasses hit-testing and still runs the button's
 *    React onClick, which is exactly the effect this helper needs.
 */
async function openSecondaryTab(page: Page, label: string): Promise<void> {
	const tab = page
		.getByTestId("properties-panel")
		.getByRole("button", { name: label, exact: true })
		.last();
	await tab.waitFor({ state: "visible", timeout: 15_000 });
	await tab.dispatchEvent("click");
	await page.waitForTimeout(600);
}

async function stageOpacityWithoutCommit(
	page: Page,
	value: string,
): Promise<void> {
	await openSecondaryTab(page, "Image");
	const field = page.getByTestId("image-opacity").locator("input");
	// Attach first, then scroll, then visible: the inspector is short and its
	// control list is long, so the field can be mounted but scrolled out of the
	// viewport (which reads as "not visible"). Scrolling into view resolves it.
	await field.waitFor({ state: "attached", timeout: 15_000 });
	await field.scrollIntoViewIfNeeded({ timeout: 10_000 });
	await field.waitFor({ state: "visible", timeout: 10_000 });
	await field.click();
	await field.fill(value);
	await page.waitForTimeout(300);
}

test.describe("Editor — Adjust cross-clip isolation", () => {
	test("adjusting clip 2 does not write clip 1's staged value", async ({
		page,
	}) => {
		await bootEditor(page);
		const clip1 = await insertAndSelectImage(page, {
			startTime: 0,
			durationSeconds: 4,
		});
		const clip2 = await insertAndSelectImage(page, {
			startTime: 5,
			durationSeconds: 4,
		});
		expect(clip2.elementId, "two distinct clips").not.toBe(clip1.elementId);

		// 1. Stage an uncommitted preview on clip 1: the Opacity field keeps
		//    focus, so its `onBlur` commit never fires. Inserting clip 2 selected
		//    IT, so clip 1 has to be re-selected first.
		await runCommand(page, "select_elements", {
			elements: [{ trackId: clip1.trackId, elementId: clip1.elementId }],
		});
		await page.waitForTimeout(600);
		await stageOpacityWithoutCommit(page, "0.4");

		// 2. Select clip 2. The selection change must resolve clip 1's stranded
		//    entry ON ITS OWN, immediately — the value the user saw (0.4) is
		//    what they keep, and it is committed to clip 1 alone.
		//    The probe has to happen HERE, before any gesture on clip 2: this
		//    timing is what separates the fix from the bug. On the old
		//    scene-wide commit, clip 1 still read 1.0 at this point because its
		//    entry sat uncommitted in the shared overlay until clip 2 happened
		//    to commit — which is exactly the reported "clip 1 changed while I
		//    adjusted clip 2".
		await runCommand(page, "select_elements", {
			elements: [{ trackId: clip2.trackId, elementId: clip2.elementId }],
		});
		await page.waitForTimeout(600);

		const clip1Resolved = await readElement(page, clip1.elementId);
		expect(
			Math.abs((clip1Resolved?.opacity ?? 1) - 0.4),
			"clip 1's staged opacity was resolved to clip 1 at selection change",
		).toBeLessThan(0.02);

		const clip2Untouched = await readElement(page, clip2.elementId);
		expect(
			Math.abs((clip2Untouched?.opacity ?? 1) - 1),
			"resolving clip 1 did not touch clip 2",
		).toBeLessThan(0.02);

		// 3. Now grade clip 2 and confirm the gesture stays on clip 2.
		await openSecondaryTab(page, "Adjust");
		await dragAdjustSlider(page, "adjust-contrast", 0.9);

		const clip2Effects = await readEffects(page, clip2.elementId);
		expect(
			findAmount(clip2Effects, "contrast"),
			"contrast written to clip 2",
		).toBeDefined();

		// 4. Clip 1 must NOT have gained clip 2's grade.
		const clip1Effects = await readEffects(page, clip1.elementId);
		expect(
			findAmount(clip1Effects, "contrast"),
			"clip 1 must not receive clip 2's contrast",
		).toBeUndefined();
		expect(
			findAmount(clip1Effects, "brightness"),
			"clip 1 must not receive clip 2's grade",
		).toBeUndefined();

		// 5. And clip 2's gesture must not have moved clip 1's own resolved
		//    value — the leak would show up here as a second, later write.
		const clip1After = await readElement(page, clip1.elementId);
		expect(
			Math.abs((clip1After?.opacity ?? 1) - 0.4),
			"clip 2's adjust gesture did not rewrite clip 1",
		).toBeLessThan(0.02);
	});

	test("a staged value on clip 1 survives switching to clip 2", async ({
		page,
	}) => {
		await bootEditor(page);
		const clip1 = await insertAndSelectImage(page, {
			startTime: 0,
			durationSeconds: 4,
		});
		const clip2 = await insertAndSelectImage(page, {
			startTime: 5,
			durationSeconds: 4,
		});

		// Inserting clip 2 selected IT; the stage must happen on clip 1.
		await runCommand(page, "select_elements", {
			elements: [{ trackId: clip1.trackId, elementId: clip1.elementId }],
		});
		await page.waitForTimeout(600);
		await stageOpacityWithoutCommit(page, "0.4");

		// Switch to clip 2. The value the user saw on clip 1 is what they
		// keep: the staged entry is resolved to clip 1 alone, not dropped and
		// not applied to clip 2.
		await runCommand(page, "select_elements", {
			elements: [{ trackId: clip2.trackId, elementId: clip2.elementId }],
		});
		await page.waitForTimeout(600);

		const clip1After = await readElement(page, clip1.elementId);
		expect(clip1After, "clip 1 still present").toBeTruthy();
		// The preview was opacity 0.4; it is now committed on clip 1.
		expect(
			Math.abs((clip1After?.opacity ?? 1) - 0.4),
			"clip 1 kept the opacity the user dragged to",
		).toBeLessThan(0.02);

		const clip2After = await readElement(page, clip2.elementId);
		expect(
			Math.abs((clip2After?.opacity ?? 1) - 1),
			"clip 2 opacity untouched",
		).toBeLessThan(0.02);
	});

	test("per-clip grades are independent", async ({ page }) => {
		await bootEditor(page);
		const clip1 = await insertAndSelectImage(page, {
			startTime: 0,
			durationSeconds: 4,
		});
		const clip2 = await insertAndSelectImage(page, {
			startTime: 5,
			durationSeconds: 4,
		});

		// Grade clip 1. Re-select it: inserting clip 2 selected IT.
		await runCommand(page, "select_elements", {
			elements: [{ trackId: clip1.trackId, elementId: clip1.elementId }],
		});
		await page.waitForTimeout(600);
		await openSecondaryTab(page, "Adjust");
		await dragAdjustSlider(page, "adjust-brightness", 0.85);

		// Grade clip 2 with a DIFFERENT control.
		await runCommand(page, "select_elements", {
			elements: [{ trackId: clip2.trackId, elementId: clip2.elementId }],
		});
		await page.waitForTimeout(600);
		await openSecondaryTab(page, "Adjust");
		await dragAdjustSlider(page, "adjust-saturation", 0.85);

		const clip1Effects = await readEffects(page, clip1.elementId);
		const clip2Effects = await readEffects(page, clip2.elementId);

		expect(
			findAmount(clip1Effects, "brightness"),
			"clip 1 has brightness",
		).toBeDefined();
		expect(
			findAmount(clip2Effects, "saturation"),
			"clip 2 has saturation",
		).toBeDefined();
		expect(
			findAmount(clip2Effects, "brightness"),
			"clip 2 did not inherit clip 1's brightness",
		).toBeUndefined();
		expect(
			findAmount(clip1Effects, "saturation"),
			"clip 1 did not inherit clip 2's saturation",
		).toBeUndefined();
	});
});

/**
 * Press the mouse down on the slider track, sweep right, release.
 *
 * The inspector is short and its control list is long, so a raw bounding box
 * can point BELOW the scroll viewport — where the TIMELINE receives the
 * pointer instead. A click there deselects the clip, so the drag silently
 * edits nothing. Scroll into view, then let the scroll settle before reading
 * the box.
 */
async function dragAdjustSlider(
	page: Page,
	testId: string,
	endFraction: number,
): Promise<void> {
	const slider = page.getByTestId(testId).locator('input[type="range"]');
	// Attach first, then scroll, then visible: the inspector is short and its
	// control list is long, so a control can be mounted yet scrolled out of the
	// viewport. A bounding box read before the scroll lands the "drag" on the
	// timeline, which deselects the clip and silently edits nothing.
	await slider.waitFor({ state: "attached", timeout: 15_000 });
	await slider.scrollIntoViewIfNeeded({ timeout: 10_000 });
	await slider.waitFor({ state: "visible", timeout: 10_000 });
	const box = await slider.boundingBox();
	if (!box) throw new Error(`no bounding box for ${testId}`);
	const startX = box.x + box.width * 0.5;
	const y = box.y + box.height / 2;
	await page.mouse.move(startX, y);
	await page.mouse.down();
	for (let i = 1; i <= 6; i++) {
		await page.mouse.move(
			startX + (box.width * endFraction - box.width * 0.5) * (i / 6),
			y,
		);
	}
	await page.mouse.up();
	await page.waitForTimeout(300);
}
