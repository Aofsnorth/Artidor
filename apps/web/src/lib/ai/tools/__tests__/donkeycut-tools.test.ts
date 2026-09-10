import { describe, expect, it } from "bun:test";
import { getToolDefinitions, TOOLS_BY_EXECUTOR_KEY } from "../registry";

describe("DonkeyCut-ported AI tools", () => {
	it("registers detect_silence with DonkeyCut's default thresholds", () => {
		const tool = TOOLS_BY_EXECUTOR_KEY["detect_silence"];
		expect(tool).toBeDefined();
		expect(tool?.def.function.name).toBe("detect_silence");
		expect(tool?.category).toBe("audio");

		const description = tool?.def.function.description ?? "";
		expect(description).toContain("thresholdDb");
		expect(description).toContain("minSilenceSeconds");
	});

	it("registers apply_grade with the preset catalog in its description", () => {
		const tool = TOOLS_BY_EXECUTOR_KEY["apply_grade"];
		expect(tool).toBeDefined();
		expect(tool?.def.function.name).toBe("apply_grade");
		expect(tool?.category).toBe("effect");

		const description = tool?.def.function.description ?? "";
		expect(description).toContain("teal-orange");
		expect(description).toContain("golden-hour");
		expect(description).toContain("Cinematic:");
	});

	it("exposes both tools through getToolDefinitions", () => {
		const names = getToolDefinitions().map((t) => t.function.name);
		expect(names).toContain("detect_silence");
		expect(names).toContain("apply_grade");
	});
});
