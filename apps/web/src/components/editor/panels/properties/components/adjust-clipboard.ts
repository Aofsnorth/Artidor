/**
 * Clipboard for the Adjust panel.
 *
 * Two distinct things get copied from this panel, and they are kept apart
 * on purpose:
 *
 * 1. A SINGLE adjustment's value ("copy this Contrast, paste it onto
 *    Saturation") — stored here.
 * 2. A WHOLE grade — the full slider map for one clip, so it can be pushed
 *    onto another clip. This reuses the editor's existing effect clipboard
 *    (`editor.clipboard.copyEffect` / `pasteEffect`), which already carries
 *    a typed effect, rather than duplicating that machinery.
 *
 * A module-level store is deliberate: the clipboard has to survive the panel
 * being collapsed, switched to another clip, or unmounted between a copy and
 * a paste, exactly like a system clipboard does.
 */

import type { AdjustmentValues } from "@/lib/effects/basic-adjust-actions";

export interface CopiedAdjustment {
	effectType: string;
	label: string;
	/** Slider position, i.e. the number shown in the control's readout. */
	value: number;
}

let singleAdjustment: CopiedAdjustment | null = null;
let wholeGrade: AdjustmentValues | null = null;

export function copyAdjustment(entry: CopiedAdjustment): void {
	singleAdjustment = entry;
}

export function readCopiedAdjustment(): CopiedAdjustment | null {
	return singleAdjustment;
}

export function hasCopiedAdjustment(effectType?: string): boolean {
	if (!singleAdjustment) return false;
	return effectType ? singleAdjustment.effectType === effectType : true;
}

/**
 * Paste returns the copied value, or null when the slot is empty.
 *
 * The stored number is the SOURCE control's slider position; the caller
 * writes it into the target control's own range (the panel clamps), which is
 * what "paste this Contrast value onto Saturation" means.
 */
export function pasteAdjustmentValue(): number | null {
	if (!singleAdjustment) return null;
	return singleAdjustment.value;
}

export function copyWholeGrade(values: AdjustmentValues): void {
	wholeGrade = { ...values };
}

export function readWholeGrade(): AdjustmentValues | null {
	return wholeGrade ? { ...wholeGrade } : null;
}

export function clearAdjustClipboard(): void {
	singleAdjustment = null;
	wholeGrade = null;
}
