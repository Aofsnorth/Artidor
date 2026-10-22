import type { TProject } from "./types";

/**
 * Convert JSON-serialised timestamps (ISO strings) back into `Date`
 * instances.
 *
 * Any project that arrives through JSON — a Drive-folder import, an `.artpr`
 * decode, a raw `project.json` — carries strings, while
 * `storageService.saveProject()` serialises `metadata.createdAt` and
 * `scene.createdAt` with `.toISOString()`. Without revival those fields throw
 * `TypeError: ... .toISOString is not a function` on save.
 *
 * Kept in its own module (no crypto/wasm imports) so it can be unit tested
 * without loading the `.artpr` decoder.
 */
export function reviveProjectDates(project: TProject): TProject {
	return {
		...project,
		metadata: {
			...project.metadata,
			createdAt: new Date(project.metadata.createdAt),
			updatedAt: new Date(project.metadata.updatedAt),
		},
		scenes: project.scenes.map((scene) => ({
			...scene,
			createdAt: new Date(scene.createdAt),
			updatedAt: new Date(scene.updatedAt),
		})),
	};
}