import type { Effect } from "@/lib/effects/types";
import type { ParamValues } from "@/lib/params";

const ADJUSTMENT_TYPES = new Set([
	"brightness",
	"contrast",
	"saturation",
	"hue-rotate",
	"temperature",
	"sepia",
	"grayscale",
	"invert",
	"highlights",
	"shadows",
	"sharpen",
	"vibrance",
	"vignette",
	"grain",
	"clarity",
	"dehaze",
	"fade",
	"whites",
	"blacks",
]);

export function isAdjustmentEffect({ effectType }: { effectType: string }): boolean {
	return ADJUSTMENT_TYPES.has(effectType);
}

function readAmount(params: ParamValues, fallback: number): number {
	const raw = params.amount;
	if (typeof raw === "number") return raw;
	if (typeof raw === "string") {
		const parsed = Number.parseFloat(raw);
		return Number.isFinite(parsed) ? parsed : fallback;
	}
	return fallback;
}

function readPercent(params: ParamValues): number {
	const raw = params.amount;
	if (typeof raw === "number") return Math.max(0, Math.min(100, raw));
	if (typeof raw === "string") {
		const parsed = Number.parseFloat(raw);
		return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 100;
	}
	return 100;
}

function adjustmentToFilter({ effect }: { effect: Effect }): string | null {
	if (!effect.enabled) return null;

	switch (effect.type) {
		case "brightness": {
			const amount = readAmount(effect.params, 100);
			return `brightness(${(amount / 100).toFixed(3)})`;
		}
		case "contrast": {
			const amount = readAmount(effect.params, 100);
			return `contrast(${(amount / 100).toFixed(3)})`;
		}
		case "saturation": {
			const amount = readAmount(effect.params, 100);
			return `saturate(${(amount / 100).toFixed(3)})`;
		}
		case "hue-rotate": {
			const deg = readAmount(effect.params, 0);
			return `hue-rotate(${deg.toFixed(1)}deg)`;
		}
		case "temperature": {
			const amount = readAmount(effect.params, 0);
			const warm = amount > 0;
			const strength = Math.abs(amount) / 100;
			if (warm) {
				return `sepia(${strength.toFixed(3)}) saturate(${(1 + strength * 0.3).toFixed(3)})`;
			}
			return `saturate(${(1 - strength * 0.2).toFixed(3)}) hue-rotate(${(180 * strength).toFixed(1)}deg)`;
		}
		case "sepia": {
			const percent = readPercent(effect.params);
			return `sepia(${(percent / 100).toFixed(3)})`;
		}
		case "grayscale": {
			const percent = readPercent(effect.params);
			return `grayscale(${(percent / 100).toFixed(3)})`;
		}
		case "invert": {
			const percent = readPercent(effect.params);
			return `invert(${(percent / 100).toFixed(3)})`;
		}
		case "highlights": {
			const amount = readAmount(effect.params, 0);
			const factor = 1 + (amount / 200);
			return `contrast(${(1 + Math.abs(amount) / 400).toFixed(3)}) brightness(${factor.toFixed(3)})`;
		}
		case "shadows": {
			const amount = readAmount(effect.params, 0);
			const factor = 1 + (amount / 200);
			return `brightness(${factor.toFixed(3)}) contrast(${(1 - amount / 400).toFixed(3)})`;
		}
		case "sharpen": {
			const amount = readAmount(effect.params, 0);
			const factor = 1 + (amount / 300);
			return `contrast(${factor.toFixed(3)}) saturate(${(1 + amount / 500).toFixed(3)})`;
		}
		case "vibrance": {
			const amount = readAmount(effect.params, 0);
			const factor = 1 + amount / 100;
			return `saturate(${factor.toFixed(3)})`;
		}
		case "vignette": {
			const amount = readAmount(effect.params, 0);
			const a = Math.min(1, Math.max(0, amount / 100));
			return `brightness(${(1 - a * 0.4).toFixed(3)}) contrast(${(1 - a * 0.1).toFixed(3)})`;
		}
		case "grain": {
			const amount = readAmount(effect.params, 0);
			return `contrast(${(1 + amount / 200).toFixed(3)})`;
		}
		case "clarity": {
			const amount = readAmount(effect.params, 0);
			const factor = 1 + amount / 200;
			return `contrast(${factor.toFixed(3)}) saturate(${(1 + amount / 400).toFixed(3)})`;
		}
		case "fade": {
			const amount = readAmount(effect.params, 0);
			return `contrast(${(1 - amount / 200).toFixed(3)}) brightness(${(1 + amount / 400).toFixed(3)})`;
		}
		case "whites": {
			const amount = readAmount(effect.params, 0);
			return `brightness(${(1 + amount / 200).toFixed(3)})`;
		}
		case "blacks": {
			const amount = readAmount(effect.params, 0);
			return `brightness(${(1 - amount / 200).toFixed(3)}) contrast(${(1 + amount / 400).toFixed(3)})`;
		}
		default:
			return null;
	}
}

export function effectsToCssFilter({ effects }: { effects: Effect[] | undefined }): string {
	if (!effects || effects.length === 0) return "none";
	const parts: string[] = [];
	for (const effect of effects) {
		if (!isAdjustmentEffect({ effectType: effect.type })) continue;
		const filter = adjustmentToFilter({ effect });
		if (filter) parts.push(filter);
	}
	return parts.length > 0 ? parts.join(" ") : "none";
}
