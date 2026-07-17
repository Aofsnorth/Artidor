import type { EffectDefinition } from "@/lib/effects/types";

const asAmount01 = (v: unknown): number => {
	const n = typeof v === "number" ? v : Number.parseFloat(String(v));
	const clamped = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
	return clamped / 100;
};

const asShift = (v: unknown): number => {
	const n = typeof v === "number" ? v : Number.parseFloat(String(v));
	const clamped = Number.isFinite(n) ? Math.min(100, Math.max(-100, n)) : 0;
	return clamped / 100;
};

const asSingleLine = (v: unknown): number =>
	v === true || v === 1 ? 1 : 0;

const asOrientation = (v: unknown): number =>
	v === "vertical" ? 1 : 0;

/** Map UI scroll speed (-100..100) to UV units per second. */
const asScrollSpeed = (v: unknown): number => {
	const n = typeof v === "number" ? v : Number.parseFloat(String(v));
	const clamped = Number.isFinite(n) ? Math.min(100, Math.max(-100, n)) : 0;
	return clamped / 100;
};

function singleAmountEffect({
	type,
	name,
	keywords,
	label,
	defaultValue,
}: {
	type: string;
	name: string;
	keywords: string[];
	label: string;
	defaultValue: number;
}): EffectDefinition {
	return {
		type,
		name,
		keywords,
		params: [
			{
				key: "amount",
				label,
				type: "number",
				default: defaultValue,
				min: 0,
				max: 100,
				step: 1,
			},
		],
		renderer: {
			passes: [
				{
					shader: type,
					uniforms: ({ effectParams }) => ({
						u_amount: asAmount01(effectParams.amount),
					}),
				},
			],
		},
	};
}

export const kaleidoscopeEffectDefinition = singleAmountEffect({
	type: "kaleidoscope",
	name: "Kaleidoscope",
	keywords: ["kaleidoscope", "mirror", "symmetry", "wedge", "geometric"],
	label: "Segments",
	defaultValue: 50,
});

export const tileEffectDefinition: EffectDefinition = {
	type: "tile",
	name: "Tile",
	keywords: ["tile", "repeat", "mosaic", "grid", "geometric"],
	params: [
		{
			key: "amount",
			label: "Tiles",
			type: "number",
			default: 40,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "shift",
			label: "Shift",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
		{
			key: "singleLine",
			label: "Single Line",
			type: "boolean",
			default: false,
		},
		{
			key: "orientation",
			label: "Orientation",
			type: "select",
			default: "horizontal",
			options: [
				{ value: "horizontal", label: "Horizontal" },
				{ value: "vertical", label: "Vertical" },
			],
		},
		{
			key: "scrollSpeed",
			label: "Scroll Speed",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "tile",
				// Bake auto-scroll into u_shift so shader/rust pack stay unchanged.
				// localTime is ticks (TICKS_PER_SECOND = 120_000).
				// ponytail: hardcode tick rate; switch to TICKS_PER_SECOND import if rate ever varies.
				uniforms: ({ effectParams, localTime = 0 }) => {
					const scrollSpeed = asScrollSpeed(effectParams.scrollSpeed);
					const timeSeconds = localTime / 120_000;
					const scrolledShift =
						asShift(effectParams.shift) + scrollSpeed * timeSeconds;
					return {
						u_amount: asAmount01(effectParams.amount),
						u_shift: scrolledShift,
						u_single_line: asSingleLine(effectParams.singleLine),
						u_orientation: asOrientation(effectParams.orientation),
					};
				},
			},
		],
	},
};

/**
 * Legacy alias for the fx-style-tile preset. Saved projects may still reference
 * this type, so it is kept in the registry but is not shown in the effects catalog.
 */
export const fxStyleTileEffectDefinition: EffectDefinition = {
	...tileEffectDefinition,
	type: "fx-style-tile",
};

export const checkerEffectDefinition = singleAmountEffect({
	type: "checker",
	name: "Checker",
	keywords: ["checker", "checkerboard", "pattern", "geometric"],
	label: "Size",
	defaultValue: 30,
});

export const gridEffectDefinition = singleAmountEffect({
	type: "grid",
	name: "Grid",
	keywords: ["grid", "lines", "wireframe", "overlay", "geometric"],
	label: "Amount",
	defaultValue: 35,
});
