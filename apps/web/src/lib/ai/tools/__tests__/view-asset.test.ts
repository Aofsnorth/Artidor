import { describe, expect, test } from "bun:test";
import {
	ALL_TOOLS,
	getToolDefinitions,
	getFilteredToolDefinitions,
} from "../registry";

describe("view_asset tool registration", () => {
	test("view_asset is registered in ALL_TOOLS", () => {
		const names = ALL_TOOLS.map((t) => t.def.function.name);
		expect(names).toContain("view_asset");
	});

	test("view_asset is in the asset category", () => {
		const tool = ALL_TOOLS.find(
			(t) => t.def.function.name === "view_asset",
		);
		expect(tool).toBeDefined();
		expect(tool?.category).toBe("asset");
	});

	test("view_asset requires assetId", () => {
		const tool = ALL_TOOLS.find(
			(t) => t.def.function.name === "view_asset",
		);
		const params = tool?.def.function.parameters;
		expect(params?.required).toContain("assetId");
		expect(params?.properties).toHaveProperty("assetId");
	});

	test("view_asset has an optional sampleFrames parameter (1-8)", () => {
		const tool = ALL_TOOLS.find(
			(t) => t.def.function.name === "view_asset",
		);
		const params = tool?.def.function.parameters;
		const sf = params?.properties?.sampleFrames as
			| { type: string; minimum?: number; maximum?: number }
			| undefined;
		expect(sf?.type).toBe("number");
		expect(sf?.minimum).toBe(1);
		expect(sf?.maximum).toBe(8);
		// sampleFrames is NOT required — it has a default in the executor.
		expect(params?.required ?? []).not.toContain("sampleFrames");
	});

	test("view_asset is included in getToolDefinitions()", () => {
		const defs = getToolDefinitions();
		expect(defs.map((d) => d.function.name)).toContain("view_asset");
	});

	test("view_asset is always included regardless of media model config", () => {
		// view_asset is a read-only inspection tool, not a generation
		// tool, so it must be available even when no media generation
		// models are configured.
		const defs = getFilteredToolDefinitions({});
		expect(defs.map((d) => d.function.name)).toContain("view_asset");
	});

	test("view_asset is NOT gated by video/image/audio/media model config", () => {
		// Configuring only a video model should not suddenly hide
		// view_asset, and configuring none should not hide it either.
		const withVideo = getFilteredToolDefinitions({
			videoModel: "sora-2",
		});
		const withImage = getFilteredToolDefinitions({
			imageModel: "dall-e-3",
		});
		expect(withVideo.map((d) => d.function.name)).toContain("view_asset");
		expect(withImage.map((d) => d.function.name)).toContain("view_asset");
	});
});
