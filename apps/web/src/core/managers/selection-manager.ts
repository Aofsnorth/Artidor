import type { EditorCore } from "@/core";
import type { SelectedKeyframeRef } from "@/lib/animation/types";
import type { ElementRef } from "@/lib/timeline/types";

export class SelectionManager {
	private selectedElements: ElementRef[] = [];
	private selectedKeyframes: SelectedKeyframeRef[] = [];
	private keyframeSelectionAnchor: SelectedKeyframeRef | null = null;
	private listeners = new Set<() => void>();

	constructor(editor: EditorCore) {
		void editor;
	}

	getSelectedElements(): ElementRef[] {
		// Defensive copies: callers (hooks, commands) spread/push these arrays.
		// Returning the live reference let one caller mutate another's snapshot
		// and skip notify() — selection UI desynced silently.
		return [...this.selectedElements];
	}

	getSelectedKeyframes(): SelectedKeyframeRef[] {
		return [...this.selectedKeyframes];
	}

	getKeyframeSelectionAnchor(): SelectedKeyframeRef | null {
		return this.keyframeSelectionAnchor;
	}

	setSelectedElements({
		elements,
		preserveKeyframes = false,
	}: {
		elements: ElementRef[];
		preserveKeyframes?: boolean;
	}): void {
		this.selectedElements = [...elements];
		if (!preserveKeyframes) {
			this.selectedKeyframes = [];
			this.keyframeSelectionAnchor = null;
		}
		this.notify();
	}

	setSelectedKeyframes({
		keyframes,
		anchorKeyframe,
	}: {
		keyframes: SelectedKeyframeRef[];
		anchorKeyframe?: SelectedKeyframeRef | null;
	}): void {
		this.selectedKeyframes = [...keyframes];
		if (anchorKeyframe !== undefined) {
			this.keyframeSelectionAnchor = anchorKeyframe;
		} else if (keyframes.length === 0) {
			this.keyframeSelectionAnchor = null;
		}
		this.notify();
	}

	clearSelection(): void {
		this.selectedElements = [];
		this.selectedKeyframes = [];
		this.keyframeSelectionAnchor = null;
		this.notify();
	}

	clearKeyframeSelection(): void {
		this.selectedKeyframes = [];
		this.keyframeSelectionAnchor = null;
		this.notify();
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notify(): void {
		this.listeners.forEach((fn) => {
			fn();
		});
	}
}
