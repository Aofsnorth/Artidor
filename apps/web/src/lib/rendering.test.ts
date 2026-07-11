import { expect, test } from "bun:test";
import { BLEND_MODES, resolveBlendMode } from "./rendering";

test("blend modes expose the complete verified renderer set", () => {
	expect(BLEND_MODES).toContain("plus-lighter");
	expect(BLEND_MODES).toContain("luminosity");
	expect(BLEND_MODES).toHaveLength(17);
});

test("unknown blend modes fall back to normal", () => {
	expect(resolveBlendMode("multiply")).toBe("multiply");
	expect(resolveBlendMode("plus-darker")).toBe("normal");
	expect(resolveBlendMode(undefined)).toBe("normal");
});
