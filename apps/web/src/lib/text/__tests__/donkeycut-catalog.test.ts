import { describe, expect, it } from "bun:test";
import {
	animationPresetsRegistry,
	registerDefaultAnimationPresets,
} from "@/lib/animation/presets";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { textPresets } from "@/lib/text/presets";
import {
	registerDefaultTransitions,
	transitionsRegistry,
} from "@/lib/transitions";

describe("DonkeyCut text looks (ported)", () => {
	it("ships all twelve looks as presets", () => {
		const ids = textPresets.map((p) => p.id);
		for (const id of [
			"dk-plain",
			"dk-lyric-card",
			"dk-karaoke",
			"dk-neon-club",
			"dk-marker-note",
			"dk-serif-mood",
			"dk-type-out",
			"dk-over-footage",
			"dk-kinetic",
			"dk-ransom",
			"dk-stacked-caps",
			"dk-pastel-pop",
		]) {
			expect(ids).toContain(id);
		}
	});

	it("builds with the source look's type, color, and background", () => {
		const marker = textPresets.find((p) => p.id === "dk-marker-note");
		expect(marker).toBeDefined();
		if (!marker) return;
		const built = marker.build();
		expect(built.fontFamily).toBe("Caveat");
		expect(built.color).toBe("#1B1B1B");
		expect(built.background?.enabled).toBe(true);
		expect(built.background?.color).toBe("#F4F1E8");

		const neon = textPresets.find((p) => p.id === "dk-neon-club");
		expect(neon).toBeDefined();
		if (!neon) return;
		const neonBuilt = neon.build();
		expect(neonBuilt.stroke?.enabled).toBe(true);
		expect(neonBuilt.stroke?.color).toBe("#22D3EE");
	});
});

describe("DonkeyCut text motions (ported)", () => {
	it("registers all nineteen hold moves in the live animation registry", () => {
		registerDefaultAnimationPresets();
		for (const type of [
			"dk-push",
			"dk-pull",
			"dk-settle",
			"dk-swing",
			"dk-punch",
			"dk-float-hold",
			"dk-sink",
			"dk-driftleft",
			"dk-driftright",
			"dk-sway",
			"dk-arc",
			"dk-tiltsettle",
			"dk-breathe",
			"dk-creep",
			"dk-slam",
			"dk-orbit",
			"dk-spring",
			"dk-fall",
			"dk-reveal",
		]) {
			expect(animationPresetsRegistry.has(type)).toBe(true);
		}
	});

	it("scales the source motion's keyframes onto the element duration", () => {
		registerDefaultAnimationPresets();
		const slam = animationPresetsRegistry.get("dk-slam");
		expect(slam).toBeDefined();
		if (!slam) return;

		const elementDuration = 4 * TICKS_PER_SECOND;
		const keyframes = slam.keyframes({ elementDuration });
		const scaleAtStart = keyframes.find(
			(k) => k.propertyPath === "transform.scaleX" && k.time === 0,
		);
		expect(scaleAtStart?.value).toBe(1.9);
		const scaleAt12 = keyframes.find(
			(k) =>
				k.propertyPath === "transform.scaleX" &&
				k.time === Math.round(elementDuration * 0.12),
		);
		expect(scaleAt12?.value).toBe(0.94);

		const fall = animationPresetsRegistry.get("dk-fall");
		expect(fall).toBeDefined();
		if (!fall) return;
		const yAtStart = fall
			.keyframes({ elementDuration })
			.find((k) => k.propertyPath === "transform.positionY" && k.time === 0);
		expect(yAtStart?.value).toBe(-237);
	});
});

describe("DonkeyCut blur transition (ported)", () => {
	it("registers the blur transition", () => {
		registerDefaultTransitions();
		expect(transitionsRegistry.has("blur")).toBe(true);
		const def = transitionsRegistry.get("blur");
		expect(def?.name).toBe("Blur");
		expect(def?.defaultDuration).toBe(500);
	});
});
