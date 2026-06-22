const ARTPR_FORMAT = "artidor-project";
const ARTPR_VERSION = 1;
const ARTPR_ALG = "AES-GCM";
const ARTPR_KDF = "PBKDF2-SHA256";
const ARTPR_ITERATIONS = 120_000;
const ARTPR_SALT_BYTES = 16;
const ARTPR_IV_BYTES = 12;
const ARTPR_EXTENSION = ".artpr";
const ARTPR_MIME = "application/vnd.artidor.project";

// App-scoped encryption key material. This keeps Drive files opaque/plaintext-free
// and rejects tampering via AES-GCM auth tags. It is not DRM: a determined
// attacker with the Artidor source can reimplement the decrypt path.
const ARTPR_APP_SECRET = "artidor.app/project-file/v1";

interface ArtprEnvelope {
	format: typeof ARTPR_FORMAT;
	version: typeof ARTPR_VERSION;
	alg: typeof ARTPR_ALG;
	kdf: typeof ARTPR_KDF;
	iterations: number;
	salt: string;
	iv: string;
	data: string;
}

export const ARTPR_PROJECT_MIME = ARTPR_MIME;
export const ARTPR_PROJECT_EXTENSION = ARTPR_EXTENSION;
export const ARTPR_PROJECT_FILE_NAME = `artidor${ARTPR_EXTENSION}`;

function bytesToBase64(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
	const binary = atob(value);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

function randomBytes(length: number): Uint8Array {
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	return bytes;
}

async function deriveArtprKey({
	salt,
	iterations,
}: {
	salt: Uint8Array;
	iterations: number;
}): Promise<CryptoKey> {
	const material = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(ARTPR_APP_SECRET) as BufferSource,
		"PBKDF2",
		false,
		["deriveKey"],
	);
	return crypto.subtle.deriveKey(
		{
			name: "PBKDF2",
			hash: "SHA-256",
			salt: salt as BufferSource,
			iterations,
		},
		material,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);
}

function assertEnvelope(value: unknown): ArtprEnvelope {
	if (!value || typeof value !== "object") {
		throw new Error("Invalid .artpr file");
	}
	const envelope = value as Partial<ArtprEnvelope>;
	if (
		envelope.format !== ARTPR_FORMAT ||
		envelope.version !== ARTPR_VERSION ||
		envelope.alg !== ARTPR_ALG ||
		envelope.kdf !== ARTPR_KDF ||
		typeof envelope.iterations !== "number" ||
		typeof envelope.salt !== "string" ||
		typeof envelope.iv !== "string" ||
		typeof envelope.data !== "string"
	) {
		throw new Error("Unsupported or invalid .artpr file");
	}
	return envelope as ArtprEnvelope;
}

export async function encodeArtprProject(project: unknown): Promise<string> {
	const salt = randomBytes(ARTPR_SALT_BYTES);
	const iv = randomBytes(ARTPR_IV_BYTES);
	const key = await deriveArtprKey({ salt, iterations: ARTPR_ITERATIONS });
	const plaintext = new TextEncoder().encode(JSON.stringify(project));
	const ciphertext = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv: iv as BufferSource },
		key,
		plaintext as BufferSource,
	);
	const envelope: ArtprEnvelope = {
		format: ARTPR_FORMAT,
		version: ARTPR_VERSION,
		alg: ARTPR_ALG,
		kdf: ARTPR_KDF,
		iterations: ARTPR_ITERATIONS,
		salt: bytesToBase64(salt),
		iv: bytesToBase64(iv),
		data: bytesToBase64(new Uint8Array(ciphertext)),
	};
	return JSON.stringify(envelope);
}

export async function decodeArtprProject<T = unknown>(content: string): Promise<T> {
	const envelope = assertEnvelope(JSON.parse(content));
	const salt = base64ToBytes(envelope.salt);
	const iv = base64ToBytes(envelope.iv);
	const data = base64ToBytes(envelope.data);
	const key = await deriveArtprKey({
		salt,
		iterations: envelope.iterations,
	});
	try {
		const plaintext = await crypto.subtle.decrypt(
			{ name: "AES-GCM", iv: iv as BufferSource },
			key,
			data as BufferSource,
		);
		return JSON.parse(new TextDecoder().decode(plaintext)) as T;
	} catch {
		throw new Error("Could not decrypt .artpr project file");
	}
}

export function isArtprFileName(name: string): boolean {
	return name.toLowerCase().endsWith(ARTPR_EXTENSION);
}
