// Parses a Google Drive sharing URL into its file ID. Returns null for any
// other host or unrecognised shape.
const DRIVE_HOSTS = new Set([
	"drive.google.com",
	"drive.usercontent.google.com",
]);

export function parseDriveFileId({ url }: { url: string }): string | null {
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

	// Common shapes:
	//   /file/d/{id}/view
	//   /file/d/{id}/preview
	//   /file/d/{id}/edit
	//   /open?id={id}
	//   /uc?id={id}&export=download
	//   /uc?export=download&id={id}
	//   https://drive.usercontent.google.com/download?id={id}
	if (host === "drive.google.com" && parsed.pathname.startsWith("/file/d/")) {
		const segments = parsed.pathname.split("/").filter(Boolean);
		// [file, d, ID, view|preview|edit|...]
		const id = segments[2];
		return id && id.length > 0 ? id : null;
	}

	const id = parsed.searchParams.get("id");
	return id && id.length > 0 ? id : null;
}

export function buildDrivePreviewUrl({ fileId }: { fileId: string }): string {
	return `https://drive.google.com/file/d/${fileId}/preview`;
}

export function buildDriveDirectUrl({ fileId }: { fileId: string }): string {
	return `https://drive.google.com/uc?export=download&id=${fileId}`;
}
