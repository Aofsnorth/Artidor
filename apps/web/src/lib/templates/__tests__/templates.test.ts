import { describe, expect, test } from "bun:test";
import {
	PROJECT_TEMPLATES,
	applyTemplateToProject,
	getTemplateById,
} from "@/lib/templates";

describe("applyTemplateToProject", () => {
	test("rejects a missing required media placeholder", () => {
		const template = getTemplateById("vlog-intro");
		expect(template).toBeDefined();
		if (!template) return;

		expect(() =>
			applyTemplateToProject({ template, mediaIdsByPlaceholder: {} }),
		).toThrow(/requires media for: "Background video"/);
	});

	test("accepts a template whose required placeholders are satisfied", () => {
		const template = getTemplateById("vlog-intro");
		expect(template).toBeDefined();
		if (!template) return;

		const project = applyTemplateToProject({
			template,
			mediaIdsByPlaceholder: { bg: "media-bg" },
		});
		// `tracks.main` is stored as a one-track array by the builder.
		const mainTracks = project.scenes[0].tracks.main as unknown as Array<{
			elements: Array<{ type: string; mediaId?: string }>;
		}>;
		const video = mainTracks
			.flatMap((track) => track.elements)
			.find((element) => element.type === "video");
		expect(video?.mediaId).toBe("media-bg");
	});

	test("never creates media elements with an empty mediaId", () => {
		for (const template of PROJECT_TEMPLATES) {
			const mediaIdsByPlaceholder: Record<string, string> = {};
			for (const placeholder of template.placeholders) {
				mediaIdsByPlaceholder[placeholder.id] = `media-${placeholder.id}`;
			}

			const project = applyTemplateToProject({
				template,
				mediaIdsByPlaceholder,
			});
			const scene = project.scenes[0];
			const mainTracks = scene.tracks.main as unknown as Array<{
				elements: Array<{ type: string; name: string; mediaId?: string }>;
			}>;
			const tracks = [
				...mainTracks,
				...scene.tracks.overlay,
				...scene.tracks.overlayAfter,
				...scene.tracks.audio,
			];

			for (const track of tracks) {
				for (const element of track.elements) {
					if (
						element.type === "video" ||
						element.type === "image" ||
						element.type === "audio"
					) {
						expect(
							element.mediaId,
							`${template.id} / ${element.name}`,
						).not.toBe("");
					}
				}
			}
		}
	});
});