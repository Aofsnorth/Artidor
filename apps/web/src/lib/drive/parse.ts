// Parses a Google Drive sharing URL into a structured descriptor. Returns
// null for any other host or unrecognised shape. The descriptor tells the
// caller whether the link points to a single file (which we can stream
// the bytes of) or a folder (which can only become a new empty project
// since public-link folder enumeration is not available without a key).
const DRIVE_HOSTS = new Set([
	"drive.google.com",
	"drive.usercontent.google.com",
]);

export type ParsedDriveUrl =
	| { kind: "file"; id: string; url: string }
	| { kind: "folder"; id: string; url: string };

/** Google Drive IDs are URL-safe base64-ish tokens. */
const DRIVE_FILE_ID_PATTERN = /^[A-Za-z0-9_-]{10,}$/;

export function isValidDriveFileId(fileId: string): boolean {
	return DRIVE_FILE_ID_PATTERN.test(fileId);
}

/**
 * Make a Drive-supplied filename safe to store and display.
 *
 * Strips path separators, control characters and any `..` sequence so a
 * malicious `Content-Disposition` cannot smuggle a path traversal or a
 * header injection into the client. Returns null when nothing useful
 * remains (caller substitutes a generated name).
 */
export function sanitizeDriveFileName(name: string): string | null {
	const withoutControls = Array.from(name)
		// Control characters (including CR/LF), NUL and DEL.
		.filter((char) => {
			const code = char.codePointAt(0) ?? 0;
			return code >= 0x20 && code !== 0x7f;
		})
		.join("");
	const cleaned = withoutControls
		// Path separators from either platform.
		.replace(/[\\/]+/g, "_")
		// Collapse any traversal run ("..", "....") to a single dot.
		.replace(/\.{2,}/g, ".")
		// Leading/trailing dots and whitespace can hide or truncate files.
		.replace(/^[\s.]+|[\s.]+$/g, "")
		.slice(0, 255)
		.trim();

	return cleaned.length > 0 ? cleaned : null;
}

function decodeSegment(segment: string): string {
	try {
		return decodeURIComponent(segment);
	} catch {
		return segment;
	}
}

export function parseDriveUrl({ url }: { url: string }): ParsedDriveUrl | null {
	const raw = url.trim();
	if (!raw) return null;

	let parsed: URL;
	try {
		parsed = new URL(raw);
	} catch {
		return null;
	}

	const host = parsed.hostname.toLowerCase();
	if (!DRIVE_HOSTS.has(host)) return null;

	// Work on path segments instead of a fixed prefix so multi-account
	// links (`/drive/u/0/folders/{id}`) resolve the same as the legacy
	// `/drive/folders/{id}` shape.
	const segments = parsed.pathname
		.split("/")
		.filter(Boolean)
		.map(decodeSegment);

	// Folder URL shapes:
	//   /drive/folders/{id}
	//   /drive/u/{n}/folders/{id}
	//   ...?usp=sharing
	if (host === "drive.google.com" && segments[0] === "drive") {
		const folderIndex = segments.indexOf("folders");
		if (folderIndex !== -1) {
			const id = segments[folderIndex + 1];
			return id && id.length > 0
				? { kind: "folder", id, url: parsed.toString() }
				: null;
		}
	}

	// File URL shapes:
	//   /file/d/{id}/view  |  /file/d/{id}/preview  |  /file/d/{id}/edit
	//   /file/u/{n}/d/{id}/view
	//   /open?id={id}
	//   /uc?id={id}&export=download
	//   /uc?export=download&id={id}
	//   https://drive.usercontent.google.com/download?id={id}
	if (host === "drive.google.com" && segments[0] === "file") {
		const markerIndex = segments.indexOf("d");
		if (markerIndex !== -1) {
			const id = segments[markerIndex + 1];
			return id && id.length > 0
				? { kind: "file", id, url: parsed.toString() }
				: null;
		}
	}

	const id = parsed.searchParams.get("id");
	return id && id.length > 0
		? { kind: "file", id, url: parsed.toString() }
		: null;
}

// Backwards-compatible helper for the file-only call sites.
export function parseDriveFileId({ url }: { url: string }): string | null {
	const parsed = parseDriveUrl({ url });
	return parsed?.kind === "file" ? parsed.id : null;
}

export function buildDrivePreviewUrl({ fileId }: { fileId: string }): string {
	return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
}

export function buildDriveDirectUrl({ fileId }: { fileId: string }): string {
	return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}
