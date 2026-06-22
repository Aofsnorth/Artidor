/**
 * Browser-side client for the read-only project share API. Wraps the
 * capability-based endpoints in `/api/share` so UI code never hand-builds
 * guessable links: a share is an opaque server-issued id, optionally
 * password-gated, and revocable with a manage token the creator keeps.
 *
 * The `payload` is opaque to the server — it carries where a viewer loads the
 * read-only project from (public Drive folder id, project file id, media
 * manifest). We keep its shape here so callers stay consistent.
 */

export interface SharePayload {
	/** Schema version so older links can be detected and rejected cleanly. */
	v: 1;
	projectId: string;
	projectName: string;
	/** Public Google Drive folder the viewer reads the project + media from. */
	driveFolderId?: string;
	/** The project file id inside that folder (artidor.artpr). */
	driveFileId?: string;
}

export interface CreateShareResult {
	shareId: string;
	manageToken: string;
}

export interface ShareMeta {
	name: string;
	needsPassword: boolean;
}

/** Build the canonical, capability-based share URL for a share id. */
export function buildShareUrl({
	origin,
	shareId,
}: {
	origin: string;
	shareId: string;
}): string {
	return `${origin}/s/${shareId}`;
}

export async function createShare({
	name,
	payload,
	password,
}: {
	name: string;
	payload: SharePayload;
	password?: string;
}): Promise<CreateShareResult> {
	const res = await fetch("/api/share", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			name,
			payload: JSON.stringify(payload),
			password: password && password.length > 0 ? password : undefined,
		}),
	});
	if (!res.ok) {
		const detail = await res.json().catch(() => null);
		throw new Error(
			detail?.error === "Too many requests"
				? "Too many share attempts. Wait a moment and try again."
				: "Could not create the share link.",
		);
	}
	return (await res.json()) as CreateShareResult;
}

export async function fetchShareMeta(shareId: string): Promise<ShareMeta | null> {
	const res = await fetch(`/api/share/${encodeURIComponent(shareId)}`, {
		method: "GET",
	});
	if (res.status === 404) return null;
	if (!res.ok) throw new Error("Could not load this share.");
	return (await res.json()) as ShareMeta;
}

export async function unlockShare({
	shareId,
	password,
}: {
	shareId: string;
	password?: string;
}): Promise<SharePayload> {
	const res = await fetch(
		`/api/share/${encodeURIComponent(shareId)}/unlock`,
		{
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ password: password || undefined }),
		},
	);
	if (res.status === 401) {
		throw new Error("invalid_password");
	}
	if (res.status === 404) {
		throw new Error("not_found");
	}
	if (res.status === 429) {
		throw new Error("Too many attempts. Wait a moment and try again.");
	}
	if (!res.ok) {
		throw new Error("Could not unlock this share.");
	}
	const data = (await res.json()) as { payload: string };
	try {
		return JSON.parse(data.payload) as SharePayload;
	} catch {
		throw new Error("This share link is malformed.");
	}
}

export async function revokeShare({
	shareId,
	manageToken,
}: {
	shareId: string;
	manageToken: string;
}): Promise<void> {
	const res = await fetch(`/api/share/${encodeURIComponent(shareId)}`, {
		method: "DELETE",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ manageToken }),
	});
	if (!res.ok) {
		throw new Error("Could not revoke this share.");
	}
}
