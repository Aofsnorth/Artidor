import { animationPresetsRegistry } from "./registry";
import type { AnimationPreset } from "./types";
import { TICKS_PER_SECOND } from "@/lib/wasm";

const SECOND = TICKS_PER_SECOND;
// Presets use bezier segments; with the default "flat" tangent this gives a
// smooth ease-in-out (slow in/out, fast middle) instead of mechanical linear
// motion — the AE-style smoothness for logo/title animations.
const bezier = "bezier" as const;

const presets: AnimationPreset[] = [
	{
		id: "fade-up",
		type: "fade-up",
		name: "Fade Up",
		keywords: ["fade", "up", "entrance"],
		category: "entrance",
		duration: SECOND * 0.8,
		keyframes: () => [
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: bezier },
			{
				propertyPath: "opacity",
				time: SECOND * 0.8,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.positionY",
				time: 0,
				value: 40,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.positionY",
				time: SECOND * 0.8,
				value: 0,
				interpolation: bezier,
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
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: bezier },
			{
				propertyPath: "opacity",
				time: SECOND * 0.6,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: 0,
				value: 0.6,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.6,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: 0,
				value: 0.6,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.6,
				value: 1,
				interpolation: bezier,
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
				interpolation: bezier,
			},
			{
				propertyPath: "transform.positionX",
				time: SECOND * 0.6,
				value: 0,
				interpolation: bezier,
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
				interpolation: bezier,
			},
			{
				propertyPath: "transform.positionX",
				time: SECOND * 0.6,
				value: 0,
				interpolation: bezier,
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
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: bezier },
			{
				propertyPath: "opacity",
				time: SECOND * 0.7,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.rotate",
				time: 0,
				value: -45,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.rotate",
				time: SECOND * 0.7,
				value: 0,
				interpolation: bezier,
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
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: bezier },
			{
				propertyPath: "opacity",
				time: SECOND * 0.4,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: 0,
				value: 0,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.4,
				value: 1.15,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.6,
				value: 0.9,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.8,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: 0,
				value: 0,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.4,
				value: 1.15,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.6,
				value: 0.9,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.8,
				value: 1,
				interpolation: bezier,
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
					interpolation: bezier,
				},
				{
					propertyPath: "opacity",
					time: elementDuration,
					value: 0,
					interpolation: bezier,
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
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionX",
					time: elementDuration,
					value: -100,
					interpolation: bezier,
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
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: elementDuration,
					value: 1.5,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: start,
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: elementDuration,
					value: 1.5,
					interpolation: bezier,
				},
				{
					propertyPath: "opacity",
					time: start,
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "opacity",
					time: elementDuration,
					value: 0,
					interpolation: bezier,
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
				{ propertyPath: "opacity", time: 0, value: 0, interpolation: bezier },
				{
					propertyPath: "opacity",
					time: SECOND * 0.8,
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "opacity",
					time: endStart,
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "opacity",
					time: elementDuration,
					value: 0,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionY",
					time: 0,
					value: 40,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionY",
					time: SECOND * 0.8,
					value: 0,
					interpolation: bezier,
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
				{ propertyPath: "opacity", time: 0, value: 0, interpolation: bezier },
				{
					propertyPath: "opacity",
					time: SECOND * 0.4,
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: 0,
					value: 0.6,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: SECOND * 0.6,
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: endStart,
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: elementDuration,
					value: 1.5,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: 0,
					value: 0.6,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: SECOND * 0.6,
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: endStart,
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: elementDuration,
					value: 1.5,
					interpolation: bezier,
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
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: bezier },
			{
				propertyPath: "opacity",
				time: SECOND * 0.8,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: 0,
				value: 0.95,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.8,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: 0,
				value: 0.95,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.8,
				value: 1,
				interpolation: bezier,
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
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: bezier },
			{
				propertyPath: "opacity",
				time: SECOND * 0.7,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.positionY",
				time: 0,
				value: 70,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.positionY",
				time: SECOND * 0.7,
				value: 0,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: 0,
				value: 0.82,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.7,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: 0,
				value: 0.82,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.7,
				value: 1,
				interpolation: bezier,
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
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: bezier },
			{
				propertyPath: "opacity",
				time: SECOND * 0.55,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.positionY",
				time: 0,
				value: -90,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.positionY",
				time: SECOND * 0.55,
				value: 0,
				interpolation: bezier,
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
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: bezier },
			{
				propertyPath: "opacity",
				time: SECOND * 0.65,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.rotate",
				time: 0,
				value: -18,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.rotate",
				time: SECOND * 0.65,
				value: 0,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: 0,
				value: 0.75,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.65,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: 0,
				value: 0.75,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.65,
				value: 1,
				interpolation: bezier,
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
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionX",
					time: elementDuration,
					value: 100,
					interpolation: bezier,
				},
				{
					propertyPath: "opacity",
					time: start,
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "opacity",
					time: elementDuration,
					value: 0,
					interpolation: bezier,
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
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionY",
					time: elementDuration,
					value: 90,
					interpolation: bezier,
				},
				{
					propertyPath: "opacity",
					time: start,
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "opacity",
					time: elementDuration,
					value: 0,
					interpolation: bezier,
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
				{ propertyPath: "opacity", time: 0, value: 0, interpolation: bezier },
				{
					propertyPath: "opacity",
					time: SECOND * 0.45,
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionX",
					time: 0,
					value: -80,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionX",
					time: SECOND * 0.45,
					value: 0,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionX",
					time: endStart,
					value: 0,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionX",
					time: elementDuration,
					value: -80,
					interpolation: bezier,
				},
				{
					propertyPath: "opacity",
					time: endStart,
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "opacity",
					time: elementDuration,
					value: 0,
					interpolation: bezier,
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
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: bezier },
			{
				propertyPath: "opacity",
				time: SECOND * 0.35,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: 0,
				value: 0.96,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: elementDuration / 2,
				value: 1.04,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: elementDuration,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: 0,
				value: 0.96,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: elementDuration / 2,
				value: 1.04,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: elementDuration,
				value: 1,
				interpolation: bezier,
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
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: bezier },
			{
				propertyPath: "opacity",
				time: SECOND * 0.22,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: 0,
				value: 0.3,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.32,
				value: 1.15,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.5,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: 0,
				value: 0.3,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.32,
				value: 1.15,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.5,
				value: 1,
				interpolation: bezier,
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
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: bezier },
			{
				propertyPath: "opacity",
				time: SECOND * 0.18,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.positionY",
				time: 0,
				value: -140,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.positionY",
				time: SECOND * 0.45,
				value: 14,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.positionY",
				time: SECOND * 0.7,
				value: 0,
				interpolation: bezier,
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
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: bezier },
			{
				propertyPath: "opacity",
				time: SECOND * 0.25,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.rotate",
				time: 0,
				value: -200,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.rotate",
				time: SECOND * 0.6,
				value: 10,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.rotate",
				time: SECOND * 0.8,
				value: 0,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: 0,
				value: 0.4,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.6,
				value: 1.06,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.8,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: 0,
				value: 0.4,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.6,
				value: 1.06,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.8,
				value: 1,
				interpolation: bezier,
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
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: bezier },
			{
				propertyPath: "opacity",
				time: SECOND * 0.16,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: 0,
				value: 1.7,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.34,
				value: 0.94,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.5,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: 0,
				value: 1.7,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.34,
				value: 0.94,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.5,
				value: 1,
				interpolation: bezier,
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
			{ propertyPath: "opacity", time: 0, value: 0, interpolation: bezier },
			{
				propertyPath: "opacity",
				time: SECOND * 0.3,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.positionY",
				time: 0,
				value: 70,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.positionY",
				time: SECOND * 0.5,
				value: -10,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.positionY",
				time: SECOND * 0.7,
				value: 0,
				interpolation: bezier,
			},
		],
	},

	/* ------------------------------- emphasis ------------------------------ */
	{
		id: "pulse",
		type: "pulse",
		name: "Pulse",
		keywords: ["pulse", "scale", "emphasis", "beat"],
		category: "emphasis",
		duration: SECOND * 0.6,
		keyframes: () => [
			{
				propertyPath: "transform.scaleX",
				time: 0,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: 0,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.3,
				value: 1.15,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.3,
				value: 1.15,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 0.6,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 0.6,
				value: 1,
				interpolation: bezier,
			},
		],
	},
	{
		id: "shake",
		type: "shake",
		name: "Shake",
		keywords: ["shake", "wiggle", "emphasis", "horizontal"],
		category: "emphasis",
		duration: SECOND * 0.5,
		keyframes: () => [
			{
				propertyPath: "transform.positionX",
				time: 0,
				value: 0,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.positionX",
				time: SECOND * 0.12,
				value: -10,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.positionX",
				time: SECOND * 0.25,
				value: 10,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.positionX",
				time: SECOND * 0.38,
				value: -6,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.positionX",
				time: SECOND * 0.5,
				value: 0,
				interpolation: bezier,
			},
		],
	},
	{
		id: "flash",
		type: "flash",
		name: "Flash",
		keywords: ["flash", "blink", "emphasis", "opacity"],
		category: "emphasis",
		duration: SECOND * 0.6,
		keyframes: () => [
			{ propertyPath: "opacity", time: 0, value: 1, interpolation: bezier },
			{
				propertyPath: "opacity",
				time: SECOND * 0.2,
				value: 0.2,
				interpolation: bezier,
			},
			{
				propertyPath: "opacity",
				time: SECOND * 0.4,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "opacity",
				time: SECOND * 0.5,
				value: 0.2,
				interpolation: bezier,
			},
			{
				propertyPath: "opacity",
				time: SECOND * 0.6,
				value: 1,
				interpolation: bezier,
			},
		],
	},
	{
		id: "wobble",
		type: "wobble",
		name: "Wobble",
		keywords: ["wobble", "rotate", "emphasis", "tilt"],
		category: "emphasis",
		duration: SECOND * 0.7,
		keyframes: () => [
			{
				propertyPath: "transform.rotate",
				time: 0,
				value: 0,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.rotate",
				time: SECOND * 0.18,
				value: -8,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.rotate",
				time: SECOND * 0.36,
				value: 8,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.rotate",
				time: SECOND * 0.54,
				value: -4,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.rotate",
				time: SECOND * 0.7,
				value: 0,
				interpolation: bezier,
			},
		],
	},

	/* --------------------------------- loop -------------------------------- */
	{
		id: "breathe",
		type: "breathe",
		name: "Breathe",
		keywords: ["breathe", "loop", "scale", "idle"],
		category: "loop",
		duration: SECOND * 2,
		keyframes: () => [
			{
				propertyPath: "transform.scaleX",
				time: 0,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: 0,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND,
				value: 1.06,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND,
				value: 1.06,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleX",
				time: SECOND * 2,
				value: 1,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.scaleY",
				time: SECOND * 2,
				value: 1,
				interpolation: bezier,
			},
		],
	},
	{
		id: "float",
		type: "float",
		name: "Float",
		keywords: ["float", "loop", "bob", "hover"],
		category: "loop",
		duration: SECOND * 2,
		keyframes: () => [
			{
				propertyPath: "transform.positionY",
				time: 0,
				value: 0,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.positionY",
				time: SECOND,
				value: -12,
				interpolation: bezier,
			},
			{
				propertyPath: "transform.positionY",
				time: SECOND * 2,
				value: 0,
				interpolation: bezier,
			},
		],
	},

	/* --------------------- DonkeyCut hold motions ---------------------- */
	// Ported from DonkeyCut (Apache 2.0, github.com/DonkeyCut/Donkey —
	// site/packages/effects-kit/src/motion/holds.json). Their keyframes are
	// normalized 0..1 across the element's hold; here `t` scales that onto
	// elementDuration so the move spans the whole clip it is applied to.
	// DonkeyCut's ease per keyframe is a cubic-bezier close to the registry's
	// default bezier tangent, so one interpolation fits all of them.
	{
		id: "dk-push",
		type: "dk-push",
		name: "Push In",
		keywords: ["donkeycut", "zoom", "hold", "urgency"],
		category: "loop",
		duration: SECOND * 2,
		keyframes: ({ elementDuration }) => {
			const t = (p: number) => Math.round(elementDuration * p);
			return [
				{
					propertyPath: "transform.scaleX",
					time: t(0),
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(0),
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: t(1),
					value: 1.16,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(1),
					value: 1.16,
					interpolation: bezier,
				},
			];
		},
	},
	{
		id: "dk-pull",
		type: "dk-pull",
		name: "Pull Out",
		keywords: ["donkeycut", "zoom", "out", "reveal"],
		category: "loop",
		duration: SECOND * 2,
		keyframes: ({ elementDuration }) => {
			const t = (p: number) => Math.round(elementDuration * p);
			return [
				{
					propertyPath: "transform.scaleX",
					time: t(0),
					value: 1.16,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(0),
					value: 1.16,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: t(1),
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(1),
					value: 1,
					interpolation: bezier,
				},
			];
		},
	},
	{
		id: "dk-settle",
		type: "dk-settle",
		name: "Settle",
		keywords: ["donkeycut", "settle", "ease", "hero"],
		category: "entrance",
		duration: SECOND * 2,
		keyframes: ({ elementDuration }) => {
			const t = (p: number) => Math.round(elementDuration * p);
			return [
				{
					propertyPath: "transform.scaleX",
					time: t(0),
					value: 1.14,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(0),
					value: 1.14,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.rotate",
					time: t(0),
					value: -4,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: t(0.35),
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(0.35),
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.rotate",
					time: t(0.35),
					value: 0,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: t(1),
					value: 1.03,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(1),
					value: 1.03,
					interpolation: bezier,
				},
			];
		},
	},
	{
		id: "dk-swing",
		type: "dk-swing",
		name: "Swing",
		keywords: ["donkeycut", "swing", "playful", "overshoot"],
		category: "entrance",
		duration: SECOND * 2,
		keyframes: ({ elementDuration }) => {
			const t = (p: number) => Math.round(elementDuration * p);
			return [
				{
					propertyPath: "transform.rotate",
					time: t(0),
					value: -14,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: t(0),
					value: 0.94,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(0),
					value: 0.94,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.rotate",
					time: t(0.35),
					value: 7,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: t(0.35),
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(0.35),
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.rotate",
					time: t(0.62),
					value: -3,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.rotate",
					time: t(1),
					value: 0,
					interpolation: bezier,
				},
			];
		},
	},
	{
		id: "dk-punch",
		type: "dk-punch",
		name: "Punch",
		keywords: ["donkeycut", "punch", "beat", "hit"],
		category: "entrance",
		duration: SECOND * 2,
		keyframes: ({ elementDuration }) => {
			const t = (p: number) => Math.round(elementDuration * p);
			return [
				{
					propertyPath: "transform.scaleX",
					time: t(0),
					value: 1.3,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(0),
					value: 1.3,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: t(0.2),
					value: 0.97,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(0.2),
					value: 0.97,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: t(0.35),
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(0.35),
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: t(1),
					value: 1.06,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(1),
					value: 1.06,
					interpolation: bezier,
				},
			];
		},
	},
	{
		id: "dk-float-hold",
		type: "dk-float-hold",
		name: "Drift Up",
		keywords: ["donkeycut", "float", "dreamy", "weightless"],
		category: "loop",
		duration: SECOND * 2,
		keyframes: ({ elementDuration }) => {
			const t = (p: number) => Math.round(elementDuration * p);
			return [
				{
					propertyPath: "transform.positionY",
					time: t(0),
					value: 43,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionY",
					time: t(1),
					value: -43,
					interpolation: bezier,
				},
			];
		},
	},
	{
		id: "dk-sink",
		type: "dk-sink",
		name: "Sink",
		keywords: ["donkeycut", "sink", "down", "ending"],
		category: "loop",
		duration: SECOND * 2,
		keyframes: ({ elementDuration }) => {
			const t = (p: number) => Math.round(elementDuration * p);
			return [
				{
					propertyPath: "transform.positionY",
					time: t(0),
					value: -43,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionY",
					time: t(1),
					value: 54,
					interpolation: bezier,
				},
			];
		},
	},
	{
		id: "dk-driftleft",
		type: "dk-driftleft",
		name: "Drift Left",
		keywords: ["donkeycut", "drift", "left", "parallax"],
		category: "loop",
		duration: SECOND * 2,
		keyframes: ({ elementDuration }) => {
			const t = (p: number) => Math.round(elementDuration * p);
			return [
				{
					propertyPath: "transform.positionX",
					time: t(0),
					value: 115,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionX",
					time: t(1),
					value: -115,
					interpolation: bezier,
				},
			];
		},
	},
	{
		id: "dk-driftright",
		type: "dk-driftright",
		name: "Drift Right",
		keywords: ["donkeycut", "drift", "right", "parallax"],
		category: "loop",
		duration: SECOND * 2,
		keyframes: ({ elementDuration }) => {
			const t = (p: number) => Math.round(elementDuration * p);
			return [
				{
					propertyPath: "transform.positionX",
					time: t(0),
					value: -115,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionX",
					time: t(1),
					value: 115,
					interpolation: bezier,
				},
			];
		},
	},
	{
		id: "dk-sway",
		type: "dk-sway",
		name: "Sway",
		keywords: ["donkeycut", "sway", "lean", "loose"],
		category: "loop",
		duration: SECOND * 2,
		keyframes: ({ elementDuration }) => {
			const t = (p: number) => Math.round(elementDuration * p);
			return [
				{
					propertyPath: "transform.rotate",
					time: t(0),
					value: -5,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.rotate",
					time: t(0.5),
					value: 5,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.rotate",
					time: t(1),
					value: -2,
					interpolation: bezier,
				},
			];
		},
	},
	{
		id: "dk-arc",
		type: "dk-arc",
		name: "Arc",
		keywords: ["donkeycut", "arc", "curve", "travel"],
		category: "loop",
		duration: SECOND * 2,
		keyframes: ({ elementDuration }) => {
			const t = (p: number) => Math.round(elementDuration * p);
			return [
				{
					propertyPath: "transform.positionX",
					time: t(0),
					value: -150,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionY",
					time: t(0),
					value: 32,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionX",
					time: t(0.5),
					value: 0,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionY",
					time: t(0.5),
					value: -54,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionX",
					time: t(1),
					value: 150,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionY",
					time: t(1),
					value: 32,
					interpolation: bezier,
				},
			];
		},
	},
	{
		id: "dk-tiltsettle",
		type: "dk-tiltsettle",
		name: "Tilt Settle",
		keywords: ["donkeycut", "tilt", "unwind", "arrive"],
		category: "entrance",
		duration: SECOND * 2,
		keyframes: ({ elementDuration }) => {
			const t = (p: number) => Math.round(elementDuration * p);
			return [
				{
					propertyPath: "transform.rotate",
					time: t(0),
					value: -25,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: t(0),
					value: 0.9,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(0),
					value: 0.9,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.rotate",
					time: t(0.45),
					value: 0,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: t(0.45),
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(0.45),
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: t(1),
					value: 1.04,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(1),
					value: 1.04,
					interpolation: bezier,
				},
			];
		},
	},
	{
		id: "dk-breathe",
		type: "dk-breathe",
		name: "Breathe",
		keywords: ["donkeycut", "breathe", "pulse", "patient"],
		category: "loop",
		duration: SECOND * 2,
		keyframes: ({ elementDuration }) => {
			const t = (p: number) => Math.round(elementDuration * p);
			return [
				{
					propertyPath: "transform.scaleX",
					time: t(0),
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(0),
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: t(0.25),
					value: 1.05,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(0.25),
					value: 1.05,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: t(0.5),
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(0.5),
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: t(0.75),
					value: 1.05,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(0.75),
					value: 1.05,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: t(1),
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(1),
					value: 1,
					interpolation: bezier,
				},
			];
		},
	},
	{
		id: "dk-creep",
		type: "dk-creep",
		name: "Creep",
		keywords: ["donkeycut", "creep", "dread", "slow"],
		category: "loop",
		duration: SECOND * 2,
		keyframes: ({ elementDuration }) => {
			const t = (p: number) => Math.round(elementDuration * p);
			return [
				{
					propertyPath: "transform.scaleX",
					time: t(0),
					value: 0.98,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(0),
					value: 0.98,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: t(1),
					value: 1.06,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(1),
					value: 1.06,
					interpolation: bezier,
				},
			];
		},
	},
	{
		id: "dk-slam",
		type: "dk-slam",
		name: "Slam",
		keywords: ["donkeycut", "slam", "impact", "hard"],
		category: "entrance",
		duration: SECOND * 2,
		keyframes: ({ elementDuration }) => {
			const t = (p: number) => Math.round(elementDuration * p);
			return [
				{
					propertyPath: "transform.scaleX",
					time: t(0),
					value: 1.9,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(0),
					value: 1.9,
					interpolation: bezier,
				},
				{
					propertyPath: "opacity",
					time: t(0),
					value: 0.6,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: t(0.12),
					value: 0.94,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(0.12),
					value: 0.94,
					interpolation: bezier,
				},
				{
					propertyPath: "opacity",
					time: t(0.12),
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: t(0.22),
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(0.22),
					value: 1,
					interpolation: bezier,
				},
			];
		},
	},
	{
		id: "dk-orbit",
		type: "dk-orbit",
		name: "Orbit",
		keywords: ["donkeycut", "orbit", "circle", "chaos"],
		category: "loop",
		duration: SECOND * 2,
		keyframes: ({ elementDuration }) => {
			const t = (p: number) => Math.round(elementDuration * p);
			return [
				{
					propertyPath: "transform.positionX",
					time: t(0),
					value: 0,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionY",
					time: t(0),
					value: 0,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionX",
					time: t(0.25),
					value: 54,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionY",
					time: t(0.25),
					value: -43,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionX",
					time: t(0.5),
					value: 0,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionY",
					time: t(0.5),
					value: -76,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionX",
					time: t(0.75),
					value: -54,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionY",
					time: t(0.75),
					value: -43,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionX",
					time: t(1),
					value: 0,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionY",
					time: t(1),
					value: 0,
					interpolation: bezier,
				},
			];
		},
	},
	{
		id: "dk-spring",
		type: "dk-spring",
		name: "Spring",
		keywords: ["donkeycut", "spring", "bounce", "overshoot"],
		category: "entrance",
		duration: SECOND * 2,
		keyframes: ({ elementDuration }) => {
			const t = (p: number) => Math.round(elementDuration * p);
			return [
				{
					propertyPath: "transform.scaleX",
					time: t(0),
					value: 0.6,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(0),
					value: 0.6,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: t(0.3),
					value: 1.18,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(0.3),
					value: 1.18,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: t(0.48),
					value: 0.96,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(0.48),
					value: 0.96,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: t(0.62),
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(0.62),
					value: 1,
					interpolation: bezier,
				},
			];
		},
	},
	{
		id: "dk-fall",
		type: "dk-fall",
		name: "Fall",
		keywords: ["donkeycut", "fall", "drop", "weight"],
		category: "entrance",
		duration: SECOND * 2,
		keyframes: ({ elementDuration }) => {
			const t = (p: number) => Math.round(elementDuration * p);
			return [
				{
					propertyPath: "transform.positionY",
					time: t(0),
					value: -237,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: t(0),
					value: 1.1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(0),
					value: 1.1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionY",
					time: t(0.3),
					value: 0,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleX",
					time: t(0.3),
					value: 1,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.scaleY",
					time: t(0.3),
					value: 1,
					interpolation: bezier,
				},
			];
		},
	},
	{
		id: "dk-reveal",
		type: "dk-reveal",
		name: "Reveal",
		keywords: ["donkeycut", "reveal", "ease", "down"],
		category: "entrance",
		duration: SECOND * 2,
		keyframes: ({ elementDuration }) => {
			const t = (p: number) => Math.round(elementDuration * p);
			return [
				{
					propertyPath: "transform.positionY",
					time: t(0),
					value: -65,
					interpolation: bezier,
				},
				{
					propertyPath: "opacity",
					time: t(0),
					value: 0,
					interpolation: bezier,
				},
				{
					propertyPath: "transform.positionY",
					time: t(0.3),
					value: 0,
					interpolation: bezier,
				},
				{
					propertyPath: "opacity",
					time: t(0.3),
					value: 1,
					interpolation: bezier,
				},
			];
		},
	},
];

export function registerDefaultAnimationPresets(): void {
	for (const preset of presets) {
		if (animationPresetsRegistry.has(preset.type)) continue;
		animationPresetsRegistry.register(preset.type, preset);
	}
}
