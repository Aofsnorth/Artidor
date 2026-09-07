import type { EditorCore } from "@/core";
import {
	getOrderedTracks,
	type ElementRef,
	type SceneTracks,
	type VideoElement,
	type VideoTrack,
} from "@/lib/timeline/types";

/** Valid deterministic media-free clip; override only the behavior under test. */
export function buildVideoElement(
	overrides: Partial<VideoElement> = {},
): VideoElement {
	return {
		id: "clip",
		name: "Clip",
		type: "video",
		mediaId: "media",
		startTime: 0,
		duration: 120_000,
		trimStart: 0,
		trimEnd: 0,
		transform: {
			scaleX: 1,
			scaleY: 1,
			position: { x: 0, y: 0 },
			rotate: 0,
		},
		opacity: 1,
		...overrides,
	};
}

/** Build an independent timeline lane without browser media resources. */
export function buildVideoTrack(
	overrides: Partial<VideoTrack> = {},
): VideoTrack {
	return {
		id: "main",
		name: "Main",
		type: "video",
		elements: [],
		muted: false,
		hidden: false,
		...overrides,
	};
}

/** Include all track groups so fixtures exercise the current timeline schema. */
export function buildSceneTracks(
	overrides: Partial<SceneTracks> = {},
): SceneTracks {
	return {
		overlay: [],
		main: buildVideoTrack(),
		overlayAfter: [],
		audio: [],
		...overrides,
	};
}

/** In-memory state boundary; production commands remain the system under test. */
export function createTimelineEditor(initialTracks = buildSceneTracks()) {
	let tracks = initialTracks;
	let selected: ElementRef[] = [];
	const scene = () => ({ id: "scene", tracks });
	const editor = {
		scenes: {
			getActiveScene: scene,
			getActiveSceneOrNull: scene,
		},
		timeline: {
			updateTracks: (next: SceneTracks) => {
				tracks = next;
			},
			getElementsWithTracks: ({ elements }: { elements: ElementRef[] }) =>
				elements.flatMap((ref) => {
					const track = getOrderedTracks(tracks).find(
						(candidate) => candidate.id === ref.trackId,
					);
					const element = track?.elements.find(
						(candidate) => candidate.id === ref.elementId,
					);
					return track && element ? [{ track, element }] : [];
				}),
		},
		selection: {
			getSelectedElements: () => selected,
			getSelectedKeyframes: () => [],
			setSelectedElements: ({ elements }: { elements: ElementRef[] }) => {
				selected = elements;
			},
		},
		project: {
			getActive: () => ({ settings: { fps: { numerator: 30, denominator: 1 } } }),
		},
	};
	return {
		// Only the browser/storage boundaries used by these tests are supplied.
		editor: editor as unknown as EditorCore,
		getTracks: () => tracks,
		setTracks: editor.timeline.updateTracks,
	};
}
