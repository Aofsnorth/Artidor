import type { EditorCore } from "@/core";
import {
	buildPasteClipboardCommand,
	copyClipboardEntry,
	type ClipboardEntry,
	type CopyContext,
	type PasteContext,
} from "@/lib/clipboard";
import type { ElementStyle, StyleClipboardEntry } from "@/lib/clipboard/types";
import { PasteStyleCommand } from "@/lib/commands/timeline/clipboard";
import type { TimelineElement } from "@/lib/timeline";
import type { ParamValues } from "@/lib/params";

/** What gets stored when a user copies a single effect. */
export interface EffectClipboardEntry {
	type: string;
	params: ParamValues;
	enabled: boolean;
}

export class ClipboardManager {
	private entry: ClipboardEntry | null = null;
	/**
	 * Separate slot for "Copy Style" — stored independently from the main
	 * clipboard entry so that copying a layer doesn't overwrite the copied
	 * style and vice versa (mirrors Alight Motion's dual-clipboard model).
	 */
	private styleEntry: StyleClipboardEntry | null = null;
	/**
	 * Separate slot for "Copy Effect" — a single effect that can be pasted
	 * onto other elements' effect stacks.
	 */
	private effectEntry: EffectClipboardEntry | null = null;
	private listeners = new Set<() => void>();

	constructor(private editor: EditorCore) {}

	getEntry(): ClipboardEntry | null {
		return this.entry;
	}

	hasEntry(): boolean {
		return this.entry !== null;
	}

	getStyleEntry(): StyleClipboardEntry | null {
		return this.styleEntry;
	}

	hasStyleEntry(): boolean {
		return this.styleEntry !== null;
	}

	copy(): boolean {
		const entry = copyClipboardEntry({
			context: this.getCopyContext(),
		});
		if (!entry) {
			return false;
		}

		this.entry = entry;
		this.notify();
		return true;
	}

	/**
	 * Copy the visual style (transform, effects, animations, text formatting,
	 * etc.) of the first selected element into the style clipboard slot.
	 */
	copyStyle(): boolean {
		const selectedElements = this.editor.selection.getSelectedElements();
		if (selectedElements.length === 0) return false;

		const [result] = this.editor.timeline.getElementsWithTracks({
			elements: [selectedElements[0]],
		});
		if (!result) return false;

		const style = extractStyle(result.element);
		this.styleEntry = {
			type: "style",
			sourceType: result.element.type,
			style,
		};
		this.notify();
		return true;
	}

	/**
	 * Paste the copied style onto all currently selected elements. Properties
	 * that don't apply to the target element type are silently skipped (handled
	 * by PasteStyleCommand).
	 */
	pasteStyle({ time }: { time?: number } = {}): boolean {
		if (!this.styleEntry) return false;

		const selectedElements = this.editor.selection.getSelectedElements();
		if (selectedElements.length === 0) return false;

		const command = new PasteStyleCommand({
			targets: selectedElements,
			style: this.styleEntry.style,
		});

		this.editor.command.execute({ command });
		return true;
	}

	// ---- Effect clipboard ----

	getEffectEntry(): EffectClipboardEntry | null {
		return this.effectEntry;
	}

	hasEffectEntry(): boolean {
		return this.effectEntry !== null;
	}

	/**
	 * Store a single effect in the effect clipboard slot. Called from the
	 * effects tab when the user clicks "Copy effect" on an effect card.
	 */
	copyEffect(effect: {
		type: string;
		params: ParamValues;
		enabled: boolean;
	}): boolean {
		this.effectEntry = {
			type: effect.type,
			params: { ...effect.params },
			enabled: effect.enabled,
		};
		this.notify();
		return true;
	}

	/**
	 * Paste the copied effect onto all currently selected visual elements.
	 * Creates a new effect instance via addClipEffect, then overwrites the
	 * params with the copied values (without creating a second history entry).
	 */
	pasteEffect(): boolean {
		if (!this.effectEntry) return false;

		const selectedElements = this.editor.selection.getSelectedElements();
		if (selectedElements.length === 0) return false;

		const results = this.editor.timeline.getElementsWithTracks({
			elements: selectedElements,
		});

		for (const { track, element } of results) {
			if (!("effects" in element)) continue;

			// Step 1: Add the effect (creates with default params, pushes history)
			const effectId = this.editor.timeline.addClipEffect({
				trackId: track.id,
				elementId: element.id,
				effectType: this.effectEntry.type,
			});

			if (!effectId) continue;

			// Step 2: Overwrite params with the copied values (no history push
			// so the add+update is a single undoable action)
			this.editor.timeline.updateClipEffectParams({
				trackId: track.id,
				elementId: element.id,
				effectId,
				params: { ...this.effectEntry.params },
				pushHistory: false,
			});
		}

		return true;
	}

	paste({ time }: { time?: number } = {}): boolean {
		if (!this.entry) {
			return false;
		}

		const command = buildPasteClipboardCommand({
			entry: this.entry,
			context: this.getPasteContext({ time }),
		});
		if (!command) {
			return false;
		}

		this.editor.command.execute({ command });
		return true;
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private getCopyContext(): CopyContext {
		return {
			editor: this.editor,
			selectedElements: this.editor.selection.getSelectedElements(),
			selectedKeyframes: this.editor.selection.getSelectedKeyframes(),
		};
	}

	private getPasteContext({ time }: { time?: number }): PasteContext {
		return {
			editor: this.editor,
			selectedElements: this.editor.selection.getSelectedElements(),
			selectedKeyframes: this.editor.selection.getSelectedKeyframes(),
			time: time ?? this.editor.playback.getCurrentTime(),
		};
	}

	private notify(): void {
		this.listeners.forEach((listener) => {
			listener();
		});
	}
}

/**
 * Extract all "style" properties from an element — everything that defines
 * how the element looks/behaves, but NOT its content (mediaId, stickerId,
 * text content, etc.) or timeline position (startTime, duration, trim).
 */
function extractStyle(element: TimelineElement): ElementStyle {
	const style: ElementStyle = {};

	// Visual transform (video, image, text, sticker, graphic)
	if ("transform" in element && element.transform) {
		style.transform = { ...element.transform };
	}
	if ("transform3d" in element && element.transform3d) {
		style.transform3d = { ...element.transform3d };
	}
	if ("opacity" in element && element.opacity !== undefined) {
		style.opacity = element.opacity;
	}
	if ("blendMode" in element && element.blendMode) {
		style.blendMode = element.blendMode;
	}

	// Effects
	if ("effects" in element && element.effects) {
		style.effects = element.effects.map((e) => ({ ...e }));
	}

	// Masks
	if ("masks" in element && element.masks) {
		style.masks = element.masks.map((m) => ({ ...m }));
	}

	// Animations
	if (element.animations) {
		style.animations = element.animations;
	}

	// Text-specific
	if (element.type === "text") {
		style.fontSize = element.fontSize;
		style.fontFamily = element.fontFamily;
		style.color = element.color;
		style.textAlign = element.textAlign;
		style.fontWeight = element.fontWeight;
		style.fontStyle = element.fontStyle;
		style.textDecoration = element.textDecoration;
		style.letterSpacing = element.letterSpacing;
		style.lineHeight = element.lineHeight;
		style.stroke = element.stroke ? { ...element.stroke } : undefined;
		style.shadow = element.shadow ? { ...element.shadow } : undefined;
		style.textAnimator = element.textAnimator
			? { ...element.textAnimator }
			: undefined;
		style.background = element.background
			? { ...element.background }
			: undefined;
	}

	// Audio / video
	if ("volume" in element && element.volume !== undefined) {
		style.volume = element.volume;
	}
	if ("muted" in element && element.muted !== undefined) {
		style.muted = element.muted;
	}
	if ("pan" in element && element.pan !== undefined) {
		style.pan = element.pan;
	}
	if ("fadeInDuration" in element && element.fadeInDuration !== undefined) {
		style.fadeInDuration = element.fadeInDuration;
	}
	if ("fadeOutDuration" in element && element.fadeOutDuration !== undefined) {
		style.fadeOutDuration = element.fadeOutDuration;
	}
	if ("retime" in element && element.retime) {
		style.retime = { ...element.retime };
	}

	return style;
}
