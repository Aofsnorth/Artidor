/**
 * Server-only crypto helpers for project shares.
 *
 * - Passwords are hashed with scrypt + a per-hash random salt and verified in
 *   constant time. The plaintext password never leaves the request handler and
 *   is never stored.
 * - Share ids and manage tokens are random, URL-safe capabilities. Only the
 *   SHA-256 of a manage token is stored, so a DB leak can't be used to revoke.
 *
 * These rely on `node:crypto`, so every route that imports this must run on the
 * Node.js runtime (`export const runtime = "nodejs"`).
 */

import {
	createHash,
	randomBytes,
	scryptSync,
	timingSafeEqual,
} from "node:crypto";

const KEY_LEN = 64;

/** scrypt hash, encoded as `saltHex:keyHex`. */
export function hashPassword(password: string): string {
	const salt = randomBytes(16);
	const key = scryptSync(password, salt, KEY_LEN);
	return `${salt.toString("hex")}:${key.toString("hex")}`;
}

/** Constant-time verify against a `saltHex:keyHex` string. */
export function verifyPassword(password: string, stored: string): boolean {
	const [saltHex, keyHex] = stored.split(":");
	if (!saltHex || !keyHex) return false;
	let expected: Buffer;
	try {
		expected = Buffer.from(keyHex, "hex");
	} catch {
		return false;
	}
	if (expected.length === 0) return false;
	const actual = scryptSync(
		password,
		Buffer.from(saltHex, "hex"),
		expected.length,
	);
	return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** A short, URL-safe capability id for the share link. */
export function generateShareId(): string {
	return randomBytes(9).toString("base64url");
}

/** A longer secret the creator keeps to revoke the share later. */
export function generateManageToken(): string {
	return randomBytes(24).toString("base64url");
}

/** Stored form of a manage token (we never persist the raw token). */
export function hashManageToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

/** Constant-time compare of a presented manage token against its stored hash. */
export function verifyManageToken(token: string, storedHash: string): boolean {
	const presented = Buffer.from(hashManageToken(token), "hex");
	let expected: Buffer;
	try {
		expected = Buffer.from(storedHash, "hex");
	} catch {
		return false;
	}
	return (
		presented.length === expected.length && timingSafeEqual(presented, expected)
	);
}
