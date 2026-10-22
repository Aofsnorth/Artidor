import { describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

/**
 * The editor records voiceovers with getUserMedia({ audio: true }). A
 * Permissions-Policy of `microphone=()` denies that at the document level
 * before the browser ever prompts, so it must stay `(self)`.
 */
describe("proxy Permissions-Policy", () => {
	test("allows same-origin microphone and camera while denying the rest", () => {
		const response = proxy(new NextRequest("http://localhost/editor/project-1"));
		const policy = response.headers.get("Permissions-Policy") ?? "";

		expect(policy).toContain("microphone=(self)");
		expect(policy).toContain("camera=(self)");
		expect(policy).toContain("geolocation=()");
		expect(policy).toContain("payment=()");
	});
});
