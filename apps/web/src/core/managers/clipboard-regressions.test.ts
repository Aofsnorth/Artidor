import { beforeEach, describe, expect, mock, test } from "bun:test";
import { buildSceneTracks, buildVideoElement, buildVideoTrack, createTimelineEditor } from "@/tests/factories/editor";
import { CommandManager } from "./commands";

let state = createTimelineEditor();
mock.module("@/core", () => ({ EditorCore: { getInstance: () => state.editor } }));
const { ClipboardManager } = await import("./clipboard-manager");
const { registerDefaultEffects } = await import("@/lib/effects");
const { AddClipEffectCommand } = await import("@/lib/commands/timeline/element/effects/add-effect");
const { UpdateClipEffectParamsCommand } = await import("@/lib/commands/timeline/element/effects/update-effect-params");

beforeEach(() => {
	state = createTimelineEditor();
	Object.defineProperty(state.editor, "command", { value: new CommandManager(state.editor) });
	registerDefaultEffects();
});

describe("effect clipboard @fast @regression", () => {
	test("pastes disabled custom effects onto fresh clips as one undoable action", () => {
		const original = buildSceneTracks({ main: buildVideoTrack({ elements: [
			buildVideoElement(), buildVideoElement({ id: "second", startTime: 120_000 }),
		] }) });
		state.setTracks(original);
		state.editor.selection.setSelectedElements({ elements: [
			{ trackId: "main", elementId: "clip" }, { trackId: "main", elementId: "second" },
		] });
		const clipboard = new ClipboardManager(state.editor);
		clipboard.copyEffect({ type: "blur", params: { intensity: 7 }, enabled: false });
		expect(clipboard.pasteEffect()).toBe(true);
		const effects = state.getTracks().main.elements.map((element) => element.effects?.at(0));
		for (const effect of effects) {
			expect(effect).toMatchObject({ type: "blur", params: { intensity: 7 }, enabled: false });
		}
		expect(effects.at(0)?.id).not.toBe(effects.at(1)?.id);
		expect(state.editor.command.getHistoryLength()).toBe(1);
		const pasted = state.getTracks();
		state.editor.command.undo();
		expect(state.getTracks()).toEqual(original);
		state.editor.command.redo();
		expect(state.getTracks()).toEqual(pasted);
	});

	test("does not report successful paste for a stale selection", () => {
		state.editor.selection.setSelectedElements({ elements: [{ trackId: "main", elementId: "missing" }] });
		const clipboard = new ClipboardManager(state.editor);
		clipboard.copyEffect({ type: "blur", params: {}, enabled: true });
		expect(clipboard.pasteEffect()).toBe(false);
		expect(state.editor.command.canUndo()).toBe(false);
	});

	test("redo of adding an effect preserves the target of later parameter edits", () => {
		state.setTracks(buildSceneTracks({ main: buildVideoTrack({ elements: [buildVideoElement()] }) }));
		const add = new AddClipEffectCommand({ trackId: "main", elementId: "clip", effectType: "blur" });
		add.execute();
		const effectId = add.getEffectId();
		if (!effectId) throw new Error("Expected effect ID");
		const edit = new UpdateClipEffectParamsCommand({ trackId: "main", elementId: "clip", effectId, params: { intensity: 9 } });
		edit.execute();
		const expected = state.getTracks();
		edit.undo();
		add.undo();
		add.redo();
		edit.redo();
		expect(state.getTracks()).toEqual(expected);
	});
});
