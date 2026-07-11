import type { EffectDefinition } from "@/lib/effects/types";

const asAmount01 = (v: unknown): number => {
	const n = typeof v === "number" ? v : Number.parseFloat(String(v));
	const clamped = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
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

export const tileEffectDefinition = singleAmountEffect({
	type: "tile",
	name: "Tile",
	keywords: ["tile", "repeat", "mosaic", "grid", "geometric"],
	label: "Tiles",
	defaultValue: 40,
});

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
