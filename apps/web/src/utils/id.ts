/**
 * Minimal surface of the Web Crypto API this helper needs. Accepting it as
 * an optional parameter makes the no-crypto fallback testable.
 */
export interface UuidCrypto {
	randomUUID?: () => string;
	getRandomValues?: (array: Uint8Array) => Uint8Array;
}

/**
 * Generate a RFC 4122 v4 UUID.
 *
 * Prefers `crypto.randomUUID()`, then `crypto.getRandomValues()`, then a
 * `Math.random()` fallback for environments where the Web Crypto API is
 * absent (old WebViews, some workers, SSR shims). The fallback is NOT
 * cryptographically secure — callers that need unguessable values must
 * supply a real `crypto` implementation.
 */
export function generateUUID(
	cryptoApi: UuidCrypto | undefined = typeof crypto === "undefined"
		? undefined
		: (crypto as UuidCrypto),
): string {
	if (typeof cryptoApi?.randomUUID === "function") {
		return cryptoApi.randomUUID();
	}

	const bytes = new Uint8Array(16);
	if (typeof cryptoApi?.getRandomValues === "function") {
		cryptoApi.getRandomValues(bytes);
	} else {
		for (let index = 0; index < bytes.length; index++) {
			bytes[index] = Math.floor(Math.random() * 256);
		}
	}

	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;

	const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0"));

	return (
		hex.slice(0, 4).join("") +
		"-" +
		hex.slice(4, 6).join("") +
		"-" +
		hex.slice(6, 8).join("") +
		"-" +
		hex.slice(8, 10).join("") +
		"-" +
		hex.slice(10, 16).join("")
	);
}
