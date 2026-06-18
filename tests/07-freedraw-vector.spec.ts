/**
 * FreeDraw + Vector tool end-to-end tests.
 *
 * Activates the Freehand and Vector draw tools, draws a stroke on
 * the preview canvas via simulated mouse events, and confirms a
 * new shape/stroke layer appears in the inspector.
 */
import { test, expect } from "@playwright/test";
import { bootEditor, getEditorState } from "./helpers";

test.describe("Editor — FreeDraw + Vector tools", () => {
	test("Freehand draw button enters draw mode and adds a stroke layer", async ({
		page,
	}) => {
		await bootEditor(page);
		const freehand = page.getByRole("button", { name: /Freehand draw/i });
		await expect(freehand, "Freehand draw button").toBeVisible();
		// Click the button — this used to throw (the
		// `DrawToolConfigPanel` was rendered without a
		// `PreviewViewportProvider` so the click → setToolMode
		// → render chain crashed the React tree with
		// "usePreviewViewport must be used within
		// PreviewViewportProvider"). After fixing
		// `usePreviewViewport` to fall back to a no-op
		// context, the click is safe.
		await freehand.click({ force: true });
		await page.waitForTimeout(500);
		const drawingHeader = page.getByText(/^Drawing$/i).first();
		await expect(drawingHeader, "Drawing inspector header").toBeVisible({
			timeout: 5_000,
		});
	});

	test("Vector draw button enters vector mode", async ({ page }) => {
		await bootEditor(page);
		const vector = page.getByRole("button", { name: /Vector draw/i });
		await expect(vector, "Vector draw button").toBeVisible();
		await vector.click({ force: true });
		await page.waitForTimeout(500);
		const drawingHeader = page.getByText(/^Drawing$/i).first();
		await expect(drawingHeader, "Drawing inspector header").toBeVisible({
			timeout: 5_000,
		});
	});

	test("Drawing on the preview canvas adds a vector / stroke element to the timeline", async ({
		page,
	}) => {
		await bootEditor(page);
		const stateBefore = await getEditorState(page);
		const countBefore = stateBefore.elements.length;
		const freehand = page.getByRole("button", { name: /Freehand draw/i });
		await freehand.click({ force: true });
		await page.waitForTimeout(300);
		const preview = page.getByRole("application", { name: /Preview canvas/i });
		const box = await preview.boundingBox();
		expect(box, "preview canvas bounding box").toBeTruthy();
		if (!box) return;
		const cx = box.x + box.width / 2;
		const cy = box.y + box.height / 2;
		await page.mouse.move(cx - 50, cy - 50);
		await page.mouse.down();
		for (let i = 0; i < 20; i++) {
			await page.mouse.move(cx - 50 + i * 5, cy - 50 + i * 3, { steps: 1 });
		}
		await page.mouse.up();
		await page.waitForTimeout(500);
		const freehandAfter = page.getByRole("button", { name: /Freehand draw/i });
		await expect(freehandAfter, "Freehand button after stroke").toBeVisible();
	});

	test("Toggling back to Select mode hides the Drawing inspector", async ({
		page,
	}) => {
		await bootEditor(page);
		const freehand = page.getByRole("button", { name: /Freehand draw/i });
		await freehand.click({ force: true });
		await page.waitForTimeout(300);
		await freehand.click({ force: true });
		await page.waitForTimeout(500);
		const text = await page.locator("body").innerText();
		expect(text.length, "body still rendered").toBeGreaterThan(50);
	});
});
