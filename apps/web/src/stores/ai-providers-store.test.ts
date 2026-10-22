import { describe, expect, test } from "bun:test";
import { transformPersistedProviderKeys } from "./ai-providers-store";

/**
 * The zustand persist envelope is `{ state: { providers }, version }`.
 * The storage adapter used to look only at a top-level `providers` field,
 * so it never found a key and never encrypted anything. These tests pin the
 * envelope shape (plus the legacy flat shape) and the round-trip.
 */
describe("transformPersistedProviderKeys", () => {
	const plaintext = "sk-live-super-secret";
	// Base64 stands in for AES-GCM: the written value must not contain the
	// plaintext, and the reverse transform must restore it.
	const encrypt = async (key: string) => btoa(key);
	const decrypt = async (key: string) => atob(key);

	test("encrypts keys inside the zustand persist envelope", async () => {
		const raw = JSON.stringify({
			state: {
				providers: [
					{ id: "p1", apiKey: plaintext, model: "gpt-4o" },
					{ id: "p2", apiKey: "", model: "llama" },
				],
			},
			version: 0,
		});

		const written = await transformPersistedProviderKeys(raw, encrypt);

		expect(written).not.toContain(plaintext);
		const parsed = JSON.parse(written) as {
			state: { providers: Array<{ id: string; apiKey: string }> };
			version: number;
		};
		expect(parsed.version).toBe(0);
		expect(parsed.state.providers[0]?.apiKey).toBe(btoa(plaintext));
		// Empty keys stay empty (no pointless encryption).
		expect(parsed.state.providers[1]?.apiKey).toBe("");
	});

	test("round-trips the ciphertext back to the plaintext key", async () => {
		const raw = JSON.stringify({
			state: { providers: [{ apiKey: btoa(plaintext) }] },
			version: 0,
		});

		const read = await transformPersistedProviderKeys(raw, decrypt);

		const parsed = JSON.parse(read) as {
			state: { providers: Array<{ apiKey: string }> };
		};
		expect(parsed.state.providers[0]?.apiKey).toBe(plaintext);
	});

	test("still supports the legacy flat { providers } shape", async () => {
		const raw = JSON.stringify({ providers: [{ apiKey: plaintext }] });

		const written = await transformPersistedProviderKeys(raw, encrypt);

		expect(written).not.toContain(plaintext);
		const parsed = JSON.parse(written) as {
			providers: Array<{ apiKey: string }>;
		};
		expect(parsed.providers[0]?.apiKey).toBe(btoa(plaintext));
	});

	test("leaves an unrecognized payload untouched", async () => {
		const raw = JSON.stringify({ somethingElse: true });
		await expect(
			transformPersistedProviderKeys(raw, async (key) => key),
		).resolves.toBe(raw);
	});
});
