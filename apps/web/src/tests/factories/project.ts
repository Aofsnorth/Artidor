import type { TProject } from "@/lib/project/types";
import { DEFAULT_FPS } from "@/lib/fps/defaults";
import { buildSceneTracks } from "./editor";

/** A local project fixture with stable timestamps and no user media or credentials. */
export function buildProject(overrides: Partial<TProject> = {}): TProject {
	const date = new Date("2026-09-01T00:00:00Z");
	return {
		metadata: { id: "project", name: "Project", duration: 0, createdAt: date, updatedAt: date },
		scenes: [{ id: "scene", name: "Scene", isMain: true, tracks: buildSceneTracks(), bookmarks: [], createdAt: date, updatedAt: date }],
		currentSceneId: "scene",
		settings: { fps: { ...DEFAULT_FPS }, canvasSize: { width: 1920, height: 1080 }, background: { type: "color", color: "#000000" } },
		version: 23,
		...overrides,
	};
}
