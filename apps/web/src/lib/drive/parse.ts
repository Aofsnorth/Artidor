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

	// Folder URL shape:
	//   /drive/folders/{id}
	//   /drive/folders/{id}?usp=sharing
	if (
		host === "drive.google.com" &&
		parsed.pathname.startsWith("/drive/folders/")
	) {
		const segments = parsed.pathname.split("/").filter(Boolean);
		// [drive, folders, ID]
		const id = segments[2];
		return id && id.length > 0
			? { kind: "folder", id, url: parsed.toString() }
			: null;
	}

	// File URL shapes:
	//   /file/d/{id}/view  |  /file/d/{id}/preview  |  /file/d/{id}/edit
	//   /open?id={id}
	//   /uc?id={id}&export=download
	//   /uc?export=download&id={id}
	//   https://drive.usercontent.google.com/download?id={id}
	if (host === "drive.google.com" && parsed.pathname.startsWith("/file/d/")) {
		const segments = parsed.pathname.split("/").filter(Boolean);
		// [file, d, ID, view|preview|edit|...]
		const id = segments[2];
		return id && id.length > 0
			? { kind: "file", id, url: parsed.toString() }
			: null;
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
	return `https://drive.google.com/file/d/${fileId}/preview`;
}

export function buildDriveDirectUrl({ fileId }: { fileId: string }): string {
	return `https://drive.google.com/uc?export=download&id=${fileId}`;
}
