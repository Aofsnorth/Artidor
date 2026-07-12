import { describe, expect, test } from "bun:test";
import {
	decodeArtprProject,
	encodeArtprProject,
	isArtprFileName,
} from "../artpr";

describe(".artpr project files", () => {
	test("round-trips project JSON without storing plaintext", async () => {
		const project = {
			metadata: { id: "p1", name: "Secret Project" },
			scenes: [
				{
					id: "s1",
					tracks: { overlay: [], main: [], overlayAfter: [], audio: [] },
				},
			],
		};
		const encoded = await encodeArtprProject(project);
		expect(encoded).toContain("artidor-project");
		expect(encoded).not.toContain("Secret Project");

		const decoded = await decodeArtprProject<typeof project>(encoded);
		expect(decoded).toEqual(project);
	});

	test("rejects tampered ciphertext", async () => {
		const encoded = await encodeArtprProject({ metadata: { id: "p1" } });
		const envelope = JSON.parse(encoded) as { data: string };
		envelope.data = `${envelope.data.slice(0, -4)}AAAA`;
		await expect(decodeArtprProject(JSON.stringify(envelope))).rejects.toThrow(
			"Could not decrypt",
		);
	});

	test("detects .artpr file names", () => {
		expect(isArtprFileName("artidor.artpr")).toBe(true);
		expect(isArtprFileName("ARTIDOR.ARTPR")).toBe(true);
		expect(isArtprFileName("artidor.json")).toBe(false);
	});
});
