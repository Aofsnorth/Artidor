import { EditorCore } from "@/core";
import { Command, type CommandResult } from "@/lib/commands/base-command";
import type { ElementStyle } from "@/lib/clipboard/types";
import type {
	ElementRef,
	SceneTracks,
	TimelineElement,
	TextElement,
} from "@/lib/timeline";
import { updateElementInSceneTracks } from "@/lib/timeline";
import { cloneAnimations } from "@/lib/animation";

/**
 * Apply a copied style onto one or more target elements. Only properties
 * that are meaningful for the target element's type are applied — e.g.
 * fontSize is only pasted onto text elements, masks only onto maskable
 * elements, etc. This mirrors Alight Motion's paste-style behaviour where
 * incompatible properties are silently dropped.
 */
export class PasteStyleCommand extends Command {
	private savedState: SceneTracks | null = null;
	private readonly targets: ElementRef[];
	private readonly style: ElementStyle;

	constructor({
		targets,
		style,
	}: {
		targets: ElementRef[];
		style: ElementStyle;
	}) {
		super();
		this.targets = targets;
		this.style = style;
	}

	execute(): CommandResult | undefined {
		if (this.targets.length === 0) return undefined;

		const editor = EditorCore.getInstance();
		this.savedState = editor.scenes.getActiveScene().tracks;

		let updatedTracks = this.savedState;

		for (const target of this.targets) {
			updatedTracks = updateElementInSceneTracks({
				tracks: updatedTracks,
				trackId: target.trackId,
				elementId: target.elementId,
				update: (element) =>
					applyStyleToElement({ element, style: this.style }),
			});
		}

		editor.timeline.updateTracks(updatedTracks);
		return undefined;
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}
}

function applyStyleToElement({
	element,
	style,
}: {
	element: TimelineElement;
	style: ElementStyle;
}): TimelineElement {
	let patched = { ...element };

	// --- Visual transform properties (all visual element types) ---
	if (isVisualElement(patched)) {
		if (style.transform !== undefined) {
			patched = { ...patched, transform: { ...style.transform } };
		}
		if (style.transform3d !== undefined) {
			patched = { ...patched, transform3d: { ...style.transform3d } };
		}
		if (style.opacity !== undefined) {
			patched = { ...patched, opacity: style.opacity };
		}
		if (style.blendMode !== undefined) {
			patched = { ...patched, blendMode: style.blendMode };
		}
	}

	// --- Effects (all visual element types) ---
	if (isVisualElement(patched) && style.effects !== undefined) {
		patched = {
			...patched,
			effects: style.effects.map((e) => ({ ...e })),
		};
	}

	// --- Masks (video, image, graphic only) ---
	if (isMaskableElement(patched) && style.masks !== undefined) {
		patched = {
			...patched,
			masks: style.masks.map((m) => ({ ...m })),
		};
	}

	// --- Animations (all elements that support them) ---
	if (style.animations !== undefined) {
		patched = {
			...patched,
			animations: cloneAnimations({
				animations: style.animations,
				shouldRegenerateKeyframeIds: true,
			}),
		};
	}

	// --- Text-specific properties ---
	if (patched.type === "text") {
		const textPatched = patched as TextElement;
		if (style.fontSize !== undefined) {
			patched = { ...patched, fontSize: style.fontSize } as typeof patched;
		}
		if (style.fontFamily !== undefined) {
			patched = { ...patched, fontFamily: style.fontFamily } as typeof patched;
		}
		if (style.color !== undefined) {
			patched = { ...patched, color: style.color } as typeof patched;
		}
		if (style.textAlign !== undefined) {
			patched = { ...patched, textAlign: style.textAlign } as typeof patched;
		}
		if (style.fontWeight !== undefined) {
			patched = { ...patched, fontWeight: style.fontWeight } as typeof patched;
		}
		if (style.fontStyle !== undefined) {
			patched = { ...patched, fontStyle: style.fontStyle } as typeof patched;
		}
		if (style.textDecoration !== undefined) {
			patched = {
				...patched,
				textDecoration: style.textDecoration,
			} as typeof patched;
		}
		if (style.letterSpacing !== undefined) {
			patched = {
				...patched,
				letterSpacing: style.letterSpacing,
			} as typeof patched;
		}
		if (style.lineHeight !== undefined) {
			patched = { ...patched, lineHeight: style.lineHeight } as typeof patched;
		}
		if (style.stroke !== undefined) {
			patched = { ...patched, stroke: { ...style.stroke } } as typeof patched;
		}
		if (style.shadow !== undefined) {
			patched = { ...patched, shadow: { ...style.shadow } } as typeof patched;
		}
		if (style.textAnimator !== undefined) {
			patched = {
				...patched,
				textAnimator: { ...style.textAnimator },
			} as typeof patched;
		}
		if (style.background !== undefined) {
			patched = {
				...patched,
				background: { ...style.background },
			} as typeof patched;
		}
		// suppress unused variable warning
		void textPatched;
	}

	// --- Audio / video properties ---
	if (isAudioishElement(patched)) {
		if (style.volume !== undefined) {
			patched = { ...patched, volume: style.volume } as typeof patched;
		}
		if (style.muted !== undefined) {
			patched = { ...patched, muted: style.muted } as typeof patched;
		}
		if (style.pan !== undefined) {
			patched = { ...patched, pan: style.pan } as typeof patched;
		}
		if (style.fadeInDuration !== undefined) {
			patched = {
				...patched,
				fadeInDuration: style.fadeInDuration,
			} as typeof patched;
		}
		if (style.fadeOutDuration !== undefined) {
			patched = {
				...patched,
				fadeOutDuration: style.fadeOutDuration,
			} as typeof patched;
		}
		if (style.retime !== undefined) {
			patched = {
				...patched,
				retime: { ...style.retime },
			} as typeof patched;
		}
	}

	return patched;
}

function isVisualElement(
	element: TimelineElement,
): element is Extract<TimelineElement, { transform: unknown }> {
	return (
		element.type === "video" ||
		element.type === "image" ||
		element.type === "text" ||
		element.type === "sticker" ||
		element.type === "graphic"
	);
}

function isMaskableElement(
	element: TimelineElement,
): element is Extract<TimelineElement, { masks?: unknown }> {
	return (
		element.type === "video" ||
		element.type === "image" ||
		element.type === "graphic"
	);
}

function isAudioishElement(
	element: TimelineElement,
): element is Extract<TimelineElement, { volume?: unknown }> {
	return element.type === "video" || element.type === "audio";
}
