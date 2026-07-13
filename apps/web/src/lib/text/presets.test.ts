import { describe, expect, it } from "bun:test";
import { textPresets } from "./presets";

describe("textPresets", () => {
	it("includes caption presets", () => {
		const captions = textPresets.filter((p) => p.category === "caption");
		expect(captions.length).toBeGreaterThanOrEqual(3);
		expect(captions.map((p) => p.id)).toContain("caption-karaoke");
		expect(captions.map((p) => p.id)).toContain("caption-pop");
		expect(captions.map((p) => p.id)).toContain("caption-minimal");
	});

	it("builds caption presets with text type and styled backgrounds", () => {
		const karaoke = textPresets.find((p) => p.id === "caption-karaoke");
		expect(karaoke).toBeDefined();
		if (!karaoke) return;
		const built = karaoke.build();
		expect(built.type).toBe("text");
		expect(built.name).toBe("Karaoke");
		expect(built.background?.enabled).toBe(true);
		expect(built.background?.color).toBe("rgba(0,0,0,0.85)");
	});
});
