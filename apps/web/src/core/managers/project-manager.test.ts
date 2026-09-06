import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import type { EditorCore } from "@/core";
import type { TProject } from "@/lib/project/types";
import type { ExportResult } from "@/lib/export";
import { buildProject } from "@/tests/factories/project";
import { buildVideoElement, buildVideoTrack } from "@/tests/factories/editor";

const writeProject = mock<({ project }: { project: TProject }) => Promise<void>>(() => Promise.resolve());
const initializeGpu = mock(() => Promise.resolve());
mock.module("@/services/storage/service", () => ({ storageService: { saveProject: writeProject } }));
mock.module("@/services/renderer/gpu-renderer", () => ({ initializeGpuRenderer: initializeGpu, isGpuAvailable: () => false }));
mock.module("@/services/renderer/canvas-renderer", () => ({ CanvasRenderer: mock() }));
mock.module("@/services/renderer/scene-builder", () => ({ buildScene: mock() }));
const { ProjectManager } = await import("./project-manager");
let restoreLog = () => {};

function createProjectManager() {
	const project = buildProject();
	let scenes = project.scenes;
	const flush = mock(() => Promise.resolve());
	const clearHistory = mock(() => {});
	const render = mock<() => Promise<ExportResult>>(() => Promise.resolve({ success: true, buffer: new ArrayBuffer(8) }));
	const editor = {
		scenes: { getScenes: () => scenes },
		save: { flush, markDirty: mock() },
		command: { clear: clearHistory },
		renderer: { exportProject: render },
	};
	// Test the real project lifecycle; storage/GPU/browser services are boundaries.
	const manager = new ProjectManager(editor as unknown as EditorCore);
	manager.setActiveProject({ project });
	clearHistory.mockClear();
	return { manager, project, flush, render, clearHistory, setScenes: (next: TProject["scenes"]) => { scenes = next; } };
}

beforeEach(() => {
	writeProject.mockReset();
	writeProject.mockImplementation(() => Promise.resolve());
	initializeGpu.mockReset();
	initializeGpu.mockImplementation(() => Promise.resolve());
	const log = spyOn(console, "error").mockImplementation(() => {});
	restoreLog = () => log.mockRestore();
});
afterEach(() => restoreLog());

describe("project persistence @fast @regression", () => {
	test("propagates storage failures instead of pretending the save succeeded", async () => {
		const { manager } = createProjectManager();
		writeProject.mockRejectedValueOnce(new Error("Storage unavailable"));
		await expect(manager.saveCurrentProject()).rejects.toThrow("Storage unavailable");
	});

	test("does not overwrite settings changed during an in-flight save", async () => {
		const { manager, project } = createProjectManager();
		const gate = Promise.withResolvers<void>();
		writeProject.mockImplementationOnce(() => gate.promise);
		const saving = manager.saveCurrentProject();
		const edited = { ...project, settings: { ...project.settings, canvasSize: { width: 1080, height: 1920 } } };
		manager.setActiveProject({ project: edited });
		gate.resolve();
		await saving;
		expect(manager.getActive().settings).toEqual(edited.settings);
	});

	test("an old save cannot overwrite a different active project", async () => {
		const { manager, project } = createProjectManager();
		const gate = Promise.withResolvers<void>();
		writeProject.mockImplementationOnce(() => gate.promise);
		const saving = manager.saveCurrentProject();
		const next = buildProject({ metadata: { ...project.metadata, id: "next" } });
		manager.setActiveProject({ project: next });
		gate.resolve();
		await saving;
		expect(manager.getActive()).toBe(next);
	});

	test.each([false, true])("exit saves even when thumbnail is unavailable or fails (%s)", async (failGpu) => {
		const { manager, flush } = createProjectManager();
		if (failGpu) initializeGpu.mockRejectedValueOnce(new Error("GPU unavailable"));
		await manager.prepareExit();
		expect(flush).toHaveBeenCalledTimes(1);
	});

	test("exit rejects a failed flush instead of allowing data loss", async () => {
		const { manager, flush } = createProjectManager();
		flush.mockRejectedValueOnce(new Error("Unsaved edits"));
		await expect(manager.prepareExit()).rejects.toThrow("Unsaved edits");
	});

	test("switching project identity clears history but same-project updates do not", () => {
		const { manager, project, clearHistory } = createProjectManager();
		manager.setActiveProject({ project: { ...project } });
		expect(clearHistory).not.toHaveBeenCalled();
		manager.setActiveProject({ project: buildProject({ metadata: { ...project.metadata, id: "next" } }) });
		expect(clearHistory).toHaveBeenCalledTimes(1);
	});
});

describe("export state @fast @regression", () => {
	test("invalidates cached video after an unsaved timeline edit", async () => {
		const { manager, project, render, setScenes } = createProjectManager();
		const options = { format: "mp4", quality: "high" } as const;
		await manager.export({ options });
		expect((await manager.export({ options })).cached).toBe(true);
		setScenes(project.scenes.map((scene) => ({ ...scene, tracks: { ...scene.tracks, main: buildVideoTrack({ elements: [buildVideoElement()] }) } })));
		const next = await manager.export({ options });
		expect(next.cached).not.toBe(true);
		expect(render).toHaveBeenCalledTimes(2);
	});

	test("renderer exceptions become a failed result and clear the exporting state", async () => {
		const { manager, render } = createProjectManager();
		render.mockRejectedValueOnce(new Error("GPU lost"));
		const result = await manager.export({ options: { format: "mp4", quality: "high" } });
		expect(result.success).toBe(false);
		expect(result.error).toBeTruthy();
		expect(manager.getExportState().isExporting).toBe(false);
	});
});
