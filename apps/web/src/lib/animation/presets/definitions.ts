import { animationPresetsRegistry } from "./registry";
import type { AnimationPreset } from "./types";
import { TICKS_PER_SECOND } from "@/lib/wasm";

const SECOND = TICKS_PER_SECOND;
const linear = "linear" as const;

const presets: AnimationPreset[] = [
	{
		id: "fade-up",
		type: "fade-up",
		name: "Fade Up",
		keywords: ["fade", "up", "entrance"],
		category: "entrance",
		duration: SECOND * 0.8,
		keyframes: () => [
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: linear },
			{
				propertyPath: "opacity",
				time: SECOND * 0.8,
				value: 1,
				interpolation: linear,
			},
			{
				propertyPath: "transform.positionY",
				time: 0,
				value: 40,
				interpolation: linear,
			},
			{
				propertyPath: "transform.positionY",
				time: SECOND * 0.8,
				value: 0,
				interpolation: linear,
			},
		],
	},
	{
		id: "pop-in",
		type: "pop-in",
		name: "Pop In",
		keywords: ["pop", "scale", "entrance"],
		category: "entrance",
		duration: SECOND * 0.6,
		keyframes: () => [
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: linear },
			{
				propertyPath: "opacity",
				time: SECOND * 0.6,
				value: 1,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleX",
				time: 0,
				value: 0.6,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.6,
				value: 1,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleY",
				time: 0,
				value: 0.6,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.6,
				value: 1,
				interpolation: linear,
			},
		],
	},
	{
		id: "slide-in-left",
		type: "slide-in-left",
		name: "Slide In Left",
		keywords: ["slide", "left", "entrance"],
		category: "entrance",
		duration: SECOND * 0.6,
		keyframes: () => [
			{
				propertyPath: "transform.positionX",
				time: 0,
				value: -100,
				interpolation: linear,
			},
			{
				propertyPath: "transform.positionX",
				time: SECOND * 0.6,
				value: 0,
				interpolation: linear,
			},
		],
	},
	{
		id: "slide-in-right",
		type: "slide-in-right",
		name: "Slide In Right",
		keywords: ["slide", "right", "entrance"],
		category: "entrance",
		duration: SECOND * 0.6,
		keyframes: () => [
			{
				propertyPath: "transform.positionX",
				time: 0,
				value: 100,
				interpolation: linear,
			},
			{
				propertyPath: "transform.positionX",
				time: SECOND * 0.6,
				value: 0,
				interpolation: linear,
			},
		],
	},
	{
		id: "rotate-in",
		type: "rotate-in",
		name: "Rotate In",
		keywords: ["rotate", "spin", "entrance"],
		category: "entrance",
		duration: SECOND * 0.7,
		keyframes: () => [
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: linear },
			{
				propertyPath: "opacity",
				time: SECOND * 0.7,
				value: 1,
				interpolation: linear,
			},
			{
				propertyPath: "transform.rotate",
				time: 0,
				value: -45,
				interpolation: linear,
			},
			{
				propertyPath: "transform.rotate",
				time: SECOND * 0.7,
				value: 0,
				interpolation: linear,
			},
		],
	},
	{
		id: "bounce-in",
		type: "bounce-in",
		name: "Bounce In",
		keywords: ["bounce", "entrance", "spring"],
		category: "entrance",
		duration: SECOND * 0.8,
		keyframes: () => [
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: linear },
			{
				propertyPath: "opacity",
				time: SECOND * 0.4,
				value: 1,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleX",
				time: 0,
				value: 0,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.4,
				value: 1.15,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.6,
				value: 0.9,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.8,
				value: 1,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleY",
				time: 0,
				value: 0,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.4,
				value: 1.15,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.6,
				value: 0.9,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.8,
				value: 1,
				interpolation: linear,
			},
		],
	},
	{
		id: "fade-out",
		type: "fade-out",
		name: "Fade Out",
		keywords: ["fade", "exit"],
		category: "exit",
		duration: SECOND * 0.8,
		keyframes: ({ elementDuration }) => {
			const start = elementDuration - SECOND * 0.8;
			return [
				{
					propertyPath: "opacity",
					time: start,
					value: 1,
					interpolation: linear,
				},
				{
					propertyPath: "opacity",
					time: elementDuration,
					value: 0,
					interpolation: linear,
				},
			];
		},
	},
	{
		id: "slide-out-left",
		type: "slide-out-left",
		name: "Slide Out Left",
		keywords: ["slide", "left", "exit"],
		category: "exit",
		duration: SECOND * 0.6,
		keyframes: ({ elementDuration }) => {
			const start = elementDuration - SECOND * 0.6;
			return [
				{
					propertyPath: "transform.positionX",
					time: start,
					value: 0,
					interpolation: linear,
				},
				{
					propertyPath: "transform.positionX",
					time: elementDuration,
					value: -100,
					interpolation: linear,
				},
			];
		},
	},
	{
		id: "zoom-out",
		type: "zoom-out",
		name: "Zoom Out",
		keywords: ["zoom", "out", "exit"],
		category: "exit",
		duration: SECOND * 0.6,
		keyframes: ({ elementDuration }) => {
			const start = elementDuration - SECOND * 0.6;
			return [
				{
					propertyPath: "transform.scaleX",
					time: start,
					value: 1,
					interpolation: linear,
				},
				{
					propertyPath: "transform.scaleX",
					time: elementDuration,
					value: 1.5,
					interpolation: linear,
				},
				{
					propertyPath: "transform.scaleY",
					time: start,
					value: 1,
					interpolation: linear,
				},
				{
					propertyPath: "transform.scaleY",
					time: elementDuration,
					value: 1.5,
					interpolation: linear,
				},
				{
					propertyPath: "opacity",
					time: start,
					value: 1,
					interpolation: linear,
				},
				{
					propertyPath: "opacity",
					time: elementDuration,
					value: 0,
					interpolation: linear,
				},
			];
		},
	},
	{
		id: "combo-fade-up-and-out",
		type: "combo-fade-up-and-out",
		name: "Fade Up + Out",
		keywords: ["combo", "fade", "in", "out"],
		category: "combo",
		duration: SECOND * 1.4,
		keyframes: ({ elementDuration }) => {
			const endStart = elementDuration - SECOND * 0.6;
			return [
				{ propertyPath: "opacity", time: 0, value: 0, interpolation: linear },
				{
					propertyPath: "opacity",
					time: SECOND * 0.8,
					value: 1,
					interpolation: linear,
				},
				{
					propertyPath: "opacity",
					time: endStart,
					value: 1,
					interpolation: linear,
				},
				{
					propertyPath: "opacity",
					time: elementDuration,
					value: 0,
					interpolation: linear,
				},
				{
					propertyPath: "transform.positionY",
					time: 0,
					value: 40,
					interpolation: linear,
				},
				{
					propertyPath: "transform.positionY",
					time: SECOND * 0.8,
					value: 0,
					interpolation: linear,
				},
			];
		},
	},
	{
		id: "combo-pop-and-zoom-out",
		type: "combo-pop-and-zoom-out",
		name: "Pop In + Zoom Out",
		keywords: ["combo", "pop", "zoom", "in", "out"],
		category: "combo",
		duration: SECOND * 1.2,
		keyframes: ({ elementDuration }) => {
			const endStart = elementDuration - SECOND * 0.6;
			return [
				{ propertyPath: "opacity", time: 0, value: 0, interpolation: linear },
				{
					propertyPath: "opacity",
					time: SECOND * 0.4,
					value: 1,
					interpolation: linear,
				},
				{
					propertyPath: "transform.scaleX",
					time: 0,
					value: 0.6,
					interpolation: linear,
				},
				{
					propertyPath: "transform.scaleX",
					time: SECOND * 0.6,
					value: 1,
					interpolation: linear,
				},
				{
					propertyPath: "transform.scaleX",
					time: endStart,
					value: 1,
					interpolation: linear,
				},
				{
					propertyPath: "transform.scaleX",
					time: elementDuration,
					value: 1.5,
					interpolation: linear,
				},
				{
					propertyPath: "transform.scaleY",
					time: 0,
					value: 0.6,
					interpolation: linear,
				},
				{
					propertyPath: "transform.scaleY",
					time: SECOND * 0.6,
					value: 1,
					interpolation: linear,
				},
				{
					propertyPath: "transform.scaleY",
					time: endStart,
					value: 1,
					interpolation: linear,
				},
				{
					propertyPath: "transform.scaleY",
					time: elementDuration,
					value: 1.5,
					interpolation: linear,
				},
			];
		},
	},
	{
		id: "type-writer",
		type: "type-writer",
		name: "Type In",
		keywords: ["type", "writer", "text", "entrance"],
		category: "entrance",
		duration: SECOND * 0.8,
		keyframes: () => [
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: linear },
			{
				propertyPath: "opacity",
				time: SECOND * 0.8,
				value: 1,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleX",
				time: 0,
				value: 0.95,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.8,
				value: 1,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleY",
				time: 0,
				value: 0.95,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.8,
				value: 1,
				interpolation: linear,
			},
		],
	},
	{
		id: "rise-and-scale",
		type: "rise-and-scale",
		name: "Rise + Scale",
		keywords: ["rise", "scale", "entrance", "zoom"],
		category: "entrance",
		duration: SECOND * 0.7,
		keyframes: () => [
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: linear },
			{
				propertyPath: "opacity",
				time: SECOND * 0.7,
				value: 1,
				interpolation: linear,
			},
			{
				propertyPath: "transform.positionY",
				time: 0,
				value: 70,
				interpolation: linear,
			},
			{
				propertyPath: "transform.positionY",
				time: SECOND * 0.7,
				value: 0,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleX",
				time: 0,
				value: 0.82,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.7,
				value: 1,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleY",
				time: 0,
				value: 0.82,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.7,
				value: 1,
				interpolation: linear,
			},
		],
	},
	{
		id: "drop-in",
		type: "drop-in",
		name: "Drop In",
		keywords: ["drop", "down", "entrance"],
		category: "entrance",
		duration: SECOND * 0.55,
		keyframes: () => [
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: linear },
			{
				propertyPath: "opacity",
				time: SECOND * 0.55,
				value: 1,
				interpolation: linear,
			},
			{
				propertyPath: "transform.positionY",
				time: 0,
				value: -90,
				interpolation: linear,
			},
			{
				propertyPath: "transform.positionY",
				time: SECOND * 0.55,
				value: 0,
				interpolation: linear,
			},
		],
	},
	{
		id: "spin-pop",
		type: "spin-pop",
		name: "Spin Pop",
		keywords: ["spin", "pop", "rotate", "entrance"],
		category: "entrance",
		duration: SECOND * 0.65,
		keyframes: () => [
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: linear },
			{
				propertyPath: "opacity",
				time: SECOND * 0.65,
				value: 1,
				interpolation: linear,
			},
			{
				propertyPath: "transform.rotate",
				time: 0,
				value: -18,
				interpolation: linear,
			},
			{
				propertyPath: "transform.rotate",
				time: SECOND * 0.65,
				value: 0,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleX",
				time: 0,
				value: 0.75,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.65,
				value: 1,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleY",
				time: 0,
				value: 0.75,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.65,
				value: 1,
				interpolation: linear,
			},
		],
	},
	{
		id: "slide-out-right",
		type: "slide-out-right",
		name: "Slide Out Right",
		keywords: ["slide", "right", "exit"],
		category: "exit",
		duration: SECOND * 0.6,
		keyframes: ({ elementDuration }) => {
			const start = elementDuration - SECOND * 0.6;
			return [
				{
					propertyPath: "transform.positionX",
					time: start,
					value: 0,
					interpolation: linear,
				},
				{
					propertyPath: "transform.positionX",
					time: elementDuration,
					value: 100,
					interpolation: linear,
				},
				{
					propertyPath: "opacity",
					time: start,
					value: 1,
					interpolation: linear,
				},
				{
					propertyPath: "opacity",
					time: elementDuration,
					value: 0,
					interpolation: linear,
				},
			];
		},
	},
	{
		id: "fall-out",
		type: "fall-out",
		name: "Fall Out",
		keywords: ["fall", "down", "exit"],
		category: "exit",
		duration: SECOND * 0.65,
		keyframes: ({ elementDuration }) => {
			const start = elementDuration - SECOND * 0.65;
			return [
				{
					propertyPath: "transform.positionY",
					time: start,
					value: 0,
					interpolation: linear,
				},
				{
					propertyPath: "transform.positionY",
					time: elementDuration,
					value: 90,
					interpolation: linear,
				},
				{
					propertyPath: "opacity",
					time: start,
					value: 1,
					interpolation: linear,
				},
				{
					propertyPath: "opacity",
					time: elementDuration,
					value: 0,
					interpolation: linear,
				},
			];
		},
	},
	{
		id: "combo-slide-left-return",
		type: "combo-slide-left-return",
		name: "Slide Left + Return",
		keywords: ["combo", "slide", "left", "return"],
		category: "combo",
		duration: SECOND * 1.2,
		keyframes: ({ elementDuration }) => {
			const endStart = elementDuration - SECOND * 0.55;
			return [
				{ propertyPath: "opacity", time: 0, value: 0, interpolation: linear },
				{
					propertyPath: "opacity",
					time: SECOND * 0.45,
					value: 1,
					interpolation: linear,
				},
				{
					propertyPath: "transform.positionX",
					time: 0,
					value: -80,
					interpolation: linear,
				},
				{
					propertyPath: "transform.positionX",
					time: SECOND * 0.45,
					value: 0,
					interpolation: linear,
				},
				{
					propertyPath: "transform.positionX",
					time: endStart,
					value: 0,
					interpolation: linear,
				},
				{
					propertyPath: "transform.positionX",
					time: elementDuration,
					value: -80,
					interpolation: linear,
				},
				{
					propertyPath: "opacity",
					time: endStart,
					value: 1,
					interpolation: linear,
				},
				{
					propertyPath: "opacity",
					time: elementDuration,
					value: 0,
					interpolation: linear,
				},
			];
		},
	},
	{
		id: "combo-breathe",
		type: "combo-breathe",
		name: "Breathe",
		keywords: ["combo", "breathe", "pulse", "scale"],
		category: "combo",
		duration: SECOND * 1.4,
		keyframes: ({ elementDuration }) => [
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: linear },
			{
				propertyPath: "opacity",
				time: SECOND * 0.35,
				value: 1,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleX",
				time: 0,
				value: 0.96,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleX",
				time: elementDuration / 2,
				value: 1.04,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleX",
				time: elementDuration,
				value: 1,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleY",
				time: 0,
				value: 0.96,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleY",
				time: elementDuration / 2,
				value: 1.04,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleY",
				time: elementDuration,
				value: 1,
				interpolation: linear,
			},
		],
	},
	/* ---------------------------------------------------------------------- */
	/*  AE-style logo reveals — overshoot / anticipation keyframes give the    */
	/*  professional "pop" (scale past target, then settle) without needing    */
	/*  baked bezier handles. Tuned for logo intros.                           */
	/* ---------------------------------------------------------------------- */
	{
		id: "logo-pop",
		type: "logo-pop",
		name: "Logo Pop",
		keywords: ["logo", "pop", "scale", "overshoot", "entrance"],
		category: "entrance",
		duration: SECOND * 0.5,
		keyframes: () => [
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: linear },
			{
				propertyPath: "opacity",
				time: SECOND * 0.22,
				value: 1,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleX",
				time: 0,
				value: 0.3,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.32,
				value: 1.15,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.5,
				value: 1,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleY",
				time: 0,
				value: 0.3,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.32,
				value: 1.15,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.5,
				value: 1,
				interpolation: linear,
			},
		],
	},
	{
		id: "logo-drop",
		type: "logo-drop",
		name: "Logo Drop",
		keywords: ["logo", "drop", "fall", "bounce", "entrance"],
		category: "entrance",
		duration: SECOND * 0.7,
		keyframes: () => [
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: linear },
			{
				propertyPath: "opacity",
				time: SECOND * 0.18,
				value: 1,
				interpolation: linear,
			},
			{
				propertyPath: "transform.positionY",
				time: 0,
				value: -140,
				interpolation: linear,
			},
			{
				propertyPath: "transform.positionY",
				time: SECOND * 0.45,
				value: 14,
				interpolation: linear,
			},
			{
				propertyPath: "transform.positionY",
				time: SECOND * 0.7,
				value: 0,
				interpolation: linear,
			},
		],
	},
	{
		id: "spin-reveal",
		type: "spin-reveal",
		name: "Spin Reveal",
		keywords: ["logo", "spin", "rotate", "reveal", "entrance"],
		category: "entrance",
		duration: SECOND * 0.8,
		keyframes: () => [
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: linear },
			{
				propertyPath: "opacity",
				time: SECOND * 0.25,
				value: 1,
				interpolation: linear,
			},
			{
				propertyPath: "transform.rotate",
				time: 0,
				value: -200,
				interpolation: linear,
			},
			{
				propertyPath: "transform.rotate",
				time: SECOND * 0.6,
				value: 10,
				interpolation: linear,
			},
			{
				propertyPath: "transform.rotate",
				time: SECOND * 0.8,
				value: 0,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleX",
				time: 0,
				value: 0.4,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.6,
				value: 1.06,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.8,
				value: 1,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleY",
				time: 0,
				value: 0.4,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.6,
				value: 1.06,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.8,
				value: 1,
				interpolation: linear,
			},
		],
	},
	{
		id: "zoom-punch",
		type: "zoom-punch",
		name: "Zoom Punch",
		keywords: ["logo", "zoom", "punch", "impact", "entrance"],
		category: "entrance",
		duration: SECOND * 0.5,
		keyframes: () => [
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: linear },
			{
				propertyPath: "opacity",
				time: SECOND * 0.16,
				value: 1,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleX",
				time: 0,
				value: 1.7,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.34,
				value: 0.94,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.5,
				value: 1,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleY",
				time: 0,
				value: 1.7,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.34,
				value: 0.94,
				interpolation: linear,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.5,
				value: 1,
				interpolation: linear,
			},
		],
	},
	{
		id: "rise-settle",
		type: "rise-settle",
		name: "Rise + Settle",
		keywords: ["logo", "rise", "settle", "overshoot", "entrance"],
		category: "entrance",
		duration: SECOND * 0.7,
		keyframes: () => [
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: linear },
			{
				propertyPath: "opacity",
				time: SECOND * 0.3,
				value: 1,
				interpolation: linear,
			},
			{
				propertyPath: "transform.positionY",
				time: 0,
				value: 70,
				interpolation: linear,
			},
			{
				propertyPath: "transform.positionY",
				time: SECOND * 0.5,
				value: -10,
				interpolation: linear,
			},
			{
				propertyPath: "transform.positionY",
				time: SECOND * 0.7,
				value: 0,
				interpolation: linear,
			},
		],
	},
];

export function registerDefaultAnimationPresets(): void {
	for (const preset of presets) {
		if (animationPresetsRegistry.has(preset.type)) continue;
		animationPresetsRegistry.register(preset.type, preset);
	}
}
