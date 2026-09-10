import { describe, expect, test } from "bun:test";
import { decodeArtprProject, encodeArtprProject } from "../artpr";

/** media-bughunt-2 R08/R09/R15/R16: decode hardening. */
describe("artpr bughunt-2 regressions", () => {
	test("R09: garbage input rejects with envelope error (no SyntaxError crash)", async () => {
		await expect(decodeArtprProject("not json at all {{{")).rejects.toThrow(
			"Unsupported or invalid .artpr file",
		);
		// "null" parses as JSON null: the null-envelope branch keeps its own
		// "Invalid" message — the requirement is only that it rejects without
		// leaking a raw SyntaxError/TypeError crash.
		await expect(decodeArtprProject("null")).rejects.toThrow(".artpr file");
	});

	test("R08/R09: bad base64 + wrong salt/iv lengths reject cleanly", async () => {
		const encoded = await encodeArtprProject({ ok: true });
		const envelope = JSON.parse(encoded) as Record<string, string>;
		await expect(
			decodeArtprProject(
				JSON.stringify({ ...envelope, salt: "!!!not-base64!!!" }),
			),
		).rejects.toThrow("Unsupported or invalid .artpr file");
		// Valid base64 but wrong byte length (4 bytes instead of 16).
		await expect(
			decodeArtprProject(
				JSON.stringify({
					...envelope,
					salt: btoa("1234"),
				}),
			),
		).rejects.toThrow("Unsupported or invalid .artpr file");
	});

	test("R15: absurd KDF iteration count rejected without deriving", async () => {
		const encoded = await encodeArtprProject({ ok: true });
		const envelope = JSON.parse(encoded) as Record<string, unknown>;
		await expect(
			decodeArtprProject(
				JSON.stringify({ ...envelope, iterations: 99_999_999 }),
			),
		).rejects.toThrow("Unsupported or invalid .artpr file");
	});

	test("R16: version mismatch names the versions (not a generic corrupt error)", async () => {
		const encoded = await encodeArtprProject({ ok: true });
		const envelope = JSON.parse(encoded) as Record<string, unknown>;
		await expect(
			decodeArtprProject(JSON.stringify({ ...envelope, version: 999 })),
		).rejects.toThrow("version 999");
	});

	test("round-trip still preserves scenes/effects/keyframes byte-semantically", async () => {
		const project = {
			scenes: [
				{
					id: "s1",
					tracks: { overlay: [], main: [], overlayAfter: [], audio: [] },
					effects: [{ id: "fx", params: { strength: 0.5 } }],
					keyframes: [{ t: 120000, v: 1 }],
				},
			],
		};
		const decoded = await decodeArtprProject<typeof project>(
			await encodeArtprProject(project),
		);
		expect(decoded).toEqual(project);
	});
});
