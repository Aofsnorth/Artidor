import type { EffectDefinition } from "@/lib/effects/types";

/**
 * Four effects that surface WGSL shaders already compiled into the Rust
 * effects pipeline (velocity-blur, stroke, drop-shadow, outer-glow) but which
 * had no TS definition, so they were unreachable from the effects picker.
 *
 * Uniform contracts match the Rust `build_effect_uniforms` mapping:
 *   velocity-blur: u_amount, u_direction
 *   stroke:        u_amount, u_thickness
 *   drop-shadow:   u_distance, u_blur, u_direction
 *   outer-glow:    u_radius, u_intensity
 */

function asNumber(v: unknown, fallback: number): number {
	const n = typeof v === "number" ? v : Number.parseFloat(String(v));
	return Number.isFinite(n) ? n : fallback;
}

/** Convert an angle in degrees to a unit direction vector. */
function angleToDirection(degrees: number): [number, number] {
	const radians = (degrees * Math.PI) / 180;
	return [Math.cos(radians), Math.sin(radians)];
}

export const velocityBlurEffectDefinition: EffectDefinition = {
	type: "velocity-blur",
	name: "Velocity Blur",
	keywords: ["velocity", "motion", "directional", "blur", "speed", "streak"],
	params: [
		{
			key: "amount",
			label: "Amount",
			type: "number",
			default: 50,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "angle",
			label: "Angle",
			type: "number",
			default: 0,
			min: 0,
			max: 360,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "velocity-blur",
				uniforms: ({ effectParams }) => ({
					u_amount: asNumber(effectParams.amount, 50) / 100,
					u_direction: angleToDirection(asNumber(effectParams.angle, 0)),
				}),
			},
		],
	},
};

export const strokeEffectDefinition: EffectDefinition = {
	type: "stroke",
	name: "Stroke",
	keywords: ["stroke", "outline", "border", "edge", "contour"],
	params: [
		{
			key: "amount",
			label: "Strength",
			type: "number",
			default: 80,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "thickness",
			label: "Thickness",
			type: "number",
			default: 3,
			min: 1,
			max: 20,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "stroke",
				uniforms: ({ effectParams }) => ({
					u_amount: asNumber(effectParams.amount, 80) / 100,
					u_thickness: asNumber(effectParams.thickness, 3),
				}),
			},
		],
	},
};

export const dropShadowEffectDefinition: EffectDefinition = {
	type: "drop-shadow",
	name: "Drop Shadow",
	keywords: ["drop", "shadow", "depth", "cast", "elevation"],
	params: [
		{
			key: "distance",
			label: "Distance",
			type: "number",
			default: 10,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "blur",
			label: "Blur",
			type: "number",
			default: 4,
			min: 0,
			max: 50,
			step: 1,
		},
		{
			key: "angle",
			label: "Angle",
			type: "number",
			default: 135,
			min: 0,
			max: 360,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "drop-shadow",
				uniforms: ({ effectParams }) => ({
					u_distance: asNumber(effectParams.distance, 10) / 100,
					u_blur: asNumber(effectParams.blur, 4),
					u_direction: angleToDirection(asNumber(effectParams.angle, 135)),
				}),
			},
		],
	},
};

export const outerGlowEffectDefinition: EffectDefinition = {
	type: "outer-glow",
	name: "Outer Glow",
	keywords: ["outer", "glow", "halo", "aura", "rim", "light"],
	params: [
		{
			key: "radius",
			label: "Radius",
			type: "number",
			default: 8,
			min: 1,
			max: 50,
			step: 1,
		},
		{
			key: "intensity",
			label: "Intensity",
			type: "number",
			default: 60,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "outer-glow",
				uniforms: ({ effectParams }) => ({
					u_radius: asNumber(effectParams.radius, 8),
					u_intensity: asNumber(effectParams.intensity, 60) / 100,
				}),
			},
		],
	},
};
