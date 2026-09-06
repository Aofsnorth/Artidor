import { beforeEach, describe, expect, mock, test } from "bun:test";
import {
	buildSceneTracks,
	buildVideoElement,
	buildVideoTrack,
	createTimelineEditor,
} from "@/tests/factories/editor";
import { getOrderedTracks, type TimelineElement } from "@/lib/timeline/types";
import { buildProject } from "@/tests/factories/project";
import type { TProject } from "@/lib/project/types";

let state = createTimelineEditor();
mock.module("@/core", () => ({
	EditorCore: { getInstance: () => state.editor },
}));
const { DuplicateElementsCommand } = await import(
	"@/lib/commands/timeline/element/duplicate-elements"
);

const { PasteCommand } = await import("@/lib/commands/timeline/clipboard/paste");
const { SplitElementsCommand } = await import("@/lib/commands/timeline/element/split-elements");
const { InsertElementCommand } = await import("@/lib/commands/timeline/element/insert-element");
const { UpdateElementsCommand } = await import("@/lib/commands/timeline/element/update-elements");

beforeEach(() => {
	state = createTimelineEditor();
});

describe("redo identity @fast @regression", () => {
	const cases = [
		{ name: "duplicate", create: () => new DuplicateElementsCommand({ elements: [{ trackId: "main", elementId: "clip" }] }) },
		{ name: "paste", create: () => new PasteCommand({ time: 0, clipboardItems: [{ trackId: "main", trackType: "video", element: buildVideoElement() }] }) },
		{ name: "split", create: () => new SplitElementsCommand({ splitTime: 60_000, elements: [{ trackId: "main", elementId: "clip" }] }) },
		{ name: "insert", create: () => new InsertElementCommand({ element: buildVideoElement(), placement: { mode: "auto" } }) },
	];

	test.each(cases)("$name preserves IDs and dependent edits over repeated undo/redo", ({ create }) => {
		const original = buildSceneTracks({ main: buildVideoTrack({ elements: [buildVideoElement()] }) });
		state.setTracks(original);
		const command = create();
		const result = command.execute();
		const ref = result?.select?.at(0);
		if (!ref) throw new Error("Expected created clip selection");
		const afterCreation = state.getTracks();
		const update = new UpdateElementsCommand({ updates: [{ ...ref, patch: { name: "Edited copy" } }] });
		update.execute();
		const afterEdit = state.getTracks();
		for (let cycle = 0; cycle < 3; cycle += 1) {
			update.undo();
			command.undo();
			expect(state.getTracks()).toEqual(original);
			expect(command.redo()).toEqual(result);
			expect(state.getTracks()).toEqual(afterCreation);
			update.redo();
			expect(state.getTracks()).toEqual(afterEdit);
		}
	});
});

describe("first media settings @fast @regression", () => {
	function attachProject() {
		let project = buildProject();
		Object.defineProperty(state.editor, "project", { value: {
			getActive: () => project,
			setActiveProject: ({ project: next }: { project: TProject }) => { project = next; },
			updateSettings: ({ settings }: { settings: Partial<TProject["settings"]> }) => {
				project = { ...project, settings: { ...project.settings, ...settings } };
			},
		} });
		Object.defineProperty(state.editor, "media", { value: { getAssets: () => [{ id: "media", type: "video", width: 1280, height: 720, fps: 60 }] } });
		Object.defineProperty(state.editor, "save", { value: { markDirty: mock() } });
		return () => project;
	}

	test("undo/redo restores automatic first-clip canvas and FPS changes", () => {
		const getProject = attachProject();
		const original = getProject().settings;
		const insert = new InsertElementCommand({ element: buildVideoElement(), placement: { mode: "auto" } });
		insert.execute();
		const inserted = getProject().settings;
		expect(inserted.canvasSize).toEqual({ width: 1280, height: 720 });
		expect(inserted.fps).toEqual({ numerator: 60, denominator: 1 });
		insert.undo();
		expect(getProject().settings).toEqual(original);
		insert.redo();
		expect(getProject().settings).toEqual(inserted);
	});

	test("an occupied lower track prevents resetting project settings on insert", () => {
		const getProject = attachProject();
		state.setTracks(buildSceneTracks({ overlayAfter: [buildVideoTrack({ id: "below", elements: [buildVideoElement()] })] }));
		const original = getProject().settings;
		new InsertElementCommand({ element: buildVideoElement(), placement: { mode: "auto" } }).execute();
		expect(getProject().settings).toEqual(original);
	});
});

describe("duplicate commands @fast @regression", () => {
	test("duplicates clips below the main track and restores them on undo", () => {
		const original = buildSceneTracks({
			overlayAfter: [
				buildVideoTrack({ id: "below", elements: [buildVideoElement()] }),
			],
		});
		state.setTracks(original);
		const command = new DuplicateElementsCommand({
			elements: [{ trackId: "below", elementId: "clip" }],
		});

		const result = command.execute();
		expect(result?.select).toHaveLength(1);
		expect(getOrderedTracks(state.getTracks()).flatMap<TimelineElement>((t) => t.elements))
			.toHaveLength(2);
		expect(state.getTracks().overlayAfter).toEqual(original.overlayAfter);
		command.undo();
		expect(state.getTracks()).toEqual(original);
	});

	test("does not create an empty track for a stale selection", () => {
		const original = buildSceneTracks();
		state.setTracks(original);
		const command = new DuplicateElementsCommand({
			elements: [{ trackId: "main", elementId: "missing" }],
		});
		expect(command.execute()).toBeUndefined();
		expect(state.getTracks()).toEqual(original);
	});
});
