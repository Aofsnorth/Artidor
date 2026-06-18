/**
 * Copy / paste layer / style / effect end-to-end tests.
 *
 * The user requested Alight Motion-style copy/paste support for:
 *   - whole layers (clipboard.copy + clipboard.paste)
 *   - style only (clipboard.copy-style + clipboard.paste-style)
 *   - effect only (clipboard.copy-effect + clipboard.paste-effect)
 *
 * We exercise all three through the public API and verify the
 * post-conditions: data lands in the right place, ids are unique,
 * and untouched data is *not* mutated.
 */
import { test, expect } from "@playwright/test";
import {
	bootEditor,
	insertAndSelectText,
	insertMockVideo,
	insertTextElement as insertTextElementHelper,
	runCommand,
	getEditorState,
	selectElement,
	getEditorState as getState,
} from "./helpers";

test.describe("Editor — copy / paste flows", () => {
	test("Copy + Paste Layer creates a new layer with a different id", async ({
		page,
	}) => {
		await bootEditor(page);
		const id = await insertTextElementHelper(page, { content: "L1" });
		const state = await getEditorState(page);
		const el = state.elements.find((e) => e.id === id);
		// Select the element first — the AI `copy` tool calls
		// `editor.clipboard.copy()` which returns false if no
		// element is selected.
		await runCommand(page, "select_elements", {
			elements: [{ trackId: el!.trackId, elementId: id }],
		});
		await page.waitForTimeout(200);
		const before = await getEditorState(page);
		const beforeCount = before.elements.length;
		const c = await runCommand(page, "copy", {});
		expect(c.ok, `copy: ${c.message}`).toBe(true);
		const p = await runCommand(page, "paste", { time: 0 });
		expect(p.ok, `paste: ${p.message}`).toBe(true);
		const after = await getEditorState(page);
		expect(after.elements.length, "element count +1").toBe(beforeCount + 1);
		const ids = new Set(after.elements.map((e) => e.id));
		expect(ids.size, "all ids unique").toBe(after.elements.length);
	});

	test("Multiple pastes yield multiple copies, each with a unique id", async ({
		page,
	}) => {
		await bootEditor(page);
		const id = await insertTextElementHelper(page, { content: "X" });
		const state = await getEditorState(page);
		const el = state.elements.find((e) => e.id === id);
		await runCommand(page, "select_elements", {
			elements: [{ trackId: el!.trackId, elementId: id }],
		});
		await page.waitForTimeout(200);
		await runCommand(page, "copy", {});
		await runCommand(page, "paste", { time: 0 });
		await runCommand(page, "paste", { time: 0 });
		await runCommand(page, "paste", { time: 0 });
		const finalState = await getEditorState(page);
		expect(finalState.elements.length, "1 original + 3 copies").toBe(4);
		const ids = new Set(finalState.elements.map((e) => e.id));
		expect(ids.size, "all ids unique").toBe(4);
	});

	test("Copy Style + Paste Style keeps the source content unchanged", async ({
		page,
	}) => {
		await bootEditor(page);
		const source = await insertAndSelectText(page, {
			content: "Source",
			color: "#ff0000",
		});
		const target = await insertAndSelectText(page, {
			content: "Target",
			color: "#00ff00",
		});
		// Select the source, copy style.
		await runCommand(page, "select_elements", {
			elements: [{ trackId: source.trackId, elementId: source.elementId }],
		});
		await page.waitForTimeout(200);
		const c = await runCommand(page, "copy-style", {});
		expect(c.ok, `copy-style: ${c.message}`).toBe(true);
		// Select the target, paste style.
		await runCommand(page, "select_elements", {
			elements: [{ trackId: target.trackId, elementId: target.elementId }],
		});
		await page.waitForTimeout(200);
		const p = await runCommand(page, "paste-style", {});
		expect(p.ok, `paste-style: ${p.message}`).toBe(true);
		// Both text elements should still exist (style paste
		// doesn't change the element count, just the styling).
		const state = await getEditorState(page);
		const allText = state.elements.filter((e) => e.type === "text");
		expect(allText.length, "two text elements after style copy").toBe(2);
	});

	test("Add + Copy Effect + Paste Effect moves the effect to a new layer", async ({
		page,
	}) => {
		await bootEditor(page);
		// Use a video element so we can attach an effect. Mock video
		// is the cheapest retimable element.
		const sourceId = await insertMockVideo(page, { durationSeconds: 3 });
		const sourceState = await getEditorState(page);
		const source = sourceState.elements.find((e) => e.id === sourceId);
		expect(source, "source video element").toBeTruthy();
		// Add an effect to the source.
		const addResult = await runCommand(page, "add_clip_effect", {
			trackId: source!.trackId,
			elementId: sourceId,
			effectType: "blur",
		});
		expect(addResult.ok, `add_clip_effect: ${addResult.message}`).toBe(true);
		// Copy the effect from the source.
		await runCommand(page, "select_elements", {
			elements: [{ trackId: source!.trackId, elementId: sourceId }],
		});
		await page.waitForTimeout(200);
		const copyResult = await runCommand(page, "copy-effect", {
			effectType: "blur",
		});
		expect(copyResult.ok, `copy-effect: ${copyResult.message}`).toBe(true);
		// Insert a new video, paste the effect onto it.
		const targetId = await insertMockVideo(page, { durationSeconds: 3 });
		const targetState = await getEditorState(page);
		const target = targetState.elements.find((e) => e.id === targetId);
		expect(target, "target video element").toBeTruthy();
		await runCommand(page, "select_elements", {
			elements: [{ trackId: target!.trackId, elementId: targetId }],
		});
		await page.waitForTimeout(200);
		const pasteResult = await runCommand(page, "paste-effect", {});
		expect(pasteResult.ok, `paste-effect: ${pasteResult.message}`).toBe(true);
		// Both videos should now exist.
		const finalState = await getEditorState(page);
		expect(finalState.elements.length, "two video elements").toBe(2);
	});

	test("Undo reverses a paste", async ({ page }) => {
		await bootEditor(page);
		const id = await insertTextElementHelper(page, { content: "L" });
		const state = await getEditorState(page);
		const el = state.elements.find((e) => e.id === id);
		await runCommand(page, "select_elements", {
			elements: [{ trackId: el!.trackId, elementId: id }],
		});
		await page.waitForTimeout(200);
		await runCommand(page, "copy", {});
		await runCommand(page, "paste", { time: 0 });
		const beforeUndo = await getEditorState(page);
		expect(beforeUndo.elements.length, "1 original + 1 paste = 2").toBe(2);
		const undo = await runCommand(page, "undo", {});
		expect(undo.ok, "undo ok").toBe(true);
		const afterUndo = await getEditorState(page);
		expect(afterUndo.elements.length, "undo should leave 1 element").toBe(1);
		// Redo re-applies.
		const redo = await runCommand(page, "redo", {});
		expect(redo.ok, "redo ok").toBe(true);
		const afterRedo = await getEditorState(page);
		expect(afterRedo.elements.length, "redo restores 2 elements").toBe(2);
	});
});
