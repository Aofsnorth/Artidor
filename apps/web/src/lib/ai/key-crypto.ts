/**
 * API key encryption using the Web Crypto API.
 *
 * API keys are stored in localStorage (via Zustand persist), which is
 * accessible to any JavaScript running on the page. To mitigate XSS
 * risk, we encrypt the keys before storage using AES-GCM with a key
 * derived from a per-browser secret.
 *
 * The per-browser secret is stored in IndexedDB (not localStorage),
 * which is slightly harder to access blindly and is origin-scoped.
 * This is not a perfect defense — a determined XSS attacker can still
 * access IndexedDB — but it raises the bar significantly compared to
 * plaintext storage and prevents casual leakage via devtools.
 *
 * Trade-off: keys cannot be decrypted without the IndexedDB entry, so
 * clearing IndexedDB will effectively log the user out of their
 * providers (they'll need to re-enter keys). This is acceptable for
 * a security-sensitive credential.
 */

const DB_NAME = "artidor-secure";
const STORE_NAME = "keys";
const KEY_ENTRY = "api-key-crypto-key";

/**
 * Get or create the AES-GCM CryptoKey used to encrypt/decrypt API keys.
 * The raw key material is stored in IndexedDB so it survives page reloads
 * but is not accessible via localStorage (where provider configs live).
 */
async function getCryptoKey(): Promise<CryptoKey> {
	// Generate or retrieve the key from IndexedDB.
	const db = await openDB();
	const existing = await dbGet(db, KEY_ENTRY);
	if (existing) {
		return crypto.subtle.importKey("raw", existing, "AES-GCM", true, [
			"encrypt",
			"decrypt",
		]);
	}
	// Generate a new 256-bit AES key.
	const key = await crypto.subtle.generateKey(
		{ name: "AES-GCM", length: 256 },
		true,
		["encrypt", "decrypt"],
	);
	const raw = await crypto.subtle.exportKey("raw", key);
	await dbPut(db, KEY_ENTRY, raw);
	return key;
}

/**
 * Open (or create) the secure IndexedDB database.
 */
function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, 1);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME);
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

function dbGet(db: IDBDatabase, key: string): Promise<ArrayBuffer | undefined> {
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readonly");
		const req = tx.objectStore(STORE_NAME).get(key);
		req.onsuccess = () => resolve(req.result as ArrayBuffer | undefined);
		req.onerror = () => reject(req.error);
	});
}

function dbPut(db: IDBDatabase, key: string, value: ArrayBuffer): Promise<void> {
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		tx.objectStore(STORE_NAME).put(value, key);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

/**
 * Encrypt an API key string. Returns a base64 string containing the
 * IV + ciphertext, safe to store in localStorage.
 *
 * @param plaintext - The raw API key to encrypt.
 * @returns Base64-encoded `iv || ciphertext`, or the original string
 *          if encryption is unavailable (e.g. non-secure context).
 */
export async function encryptApiKey(plaintext: string): Promise<string> {
	if (!plaintext) return "";
	if (typeof crypto === "undefined" || !crypto.subtle) return plaintext;
	try {
		const key = await getCryptoKey();
		const iv = crypto.getRandomValues(new Uint8Array(12));
		const encoded = new TextEncoder().encode(plaintext);
		const ciphertext = await crypto.subtle.encrypt(
			{ name: "AES-GCM", iv },
			key,
			encoded,
		);
		// Combine IV + ciphertext into one buffer.
		const combined = new Uint8Array(iv.length + ciphertext.byteLength);
		combined.set(iv, 0);
		combined.set(new Uint8Array(ciphertext), iv.length);
		return bytesToBase64(combined);
	} catch {
		// If encryption fails (e.g. IndexedDB blocked), fall back to
		// plaintext rather than breaking the app. The key is still
		// transmitted securely over HTTPS.
		return plaintext;
	}
}

/**
 * Decrypt an API key that was encrypted by `encryptApiKey`.
 *
 * @param encrypted - Base64-encoded `iv || ciphertext` from `encryptApiKey`.
 * @returns The decrypted API key, or the original string if it wasn't
 *          encrypted (backwards-compat with old plaintext entries) or
 *          if decryption fails.
 */
export async function decryptApiKey(encrypted: string): Promise<string> {
	if (!encrypted) return "";
	if (typeof crypto === "undefined" || !crypto.subtle) return encrypted;
	// Detect unencrypted (plaintext) entries: if the string doesn't
	// look like base64 or is too short to contain IV + ciphertext,
	// return it as-is for backwards compatibility.
	if (encrypted.length < 20) return encrypted;
	try {
		const combined = base64ToBytes(encrypted);
		if (combined.length < 13) return encrypted; // too short for IV + data
		const iv = combined.slice(0, 12);
		const ciphertext = combined.slice(12);
		const key = await getCryptoKey();
		const decrypted = await crypto.subtle.decrypt(
			{ name: "AES-GCM", iv },
			key,
			ciphertext,
		);
		return new TextDecoder().decode(decrypted);
	} catch {
		// Decryption failed — likely an old plaintext entry or the
		// IndexedDB key was cleared. Return as-is; the server will
		// reject it if it's garbage.
		return encrypted;
	}
}

function bytesToBase64(bytes: Uint8Array): string {
	let binary = "";
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}
