import { NextResponse } from "next/server";
import { buildDriveDirectUrl, parseDriveUrl } from "@/lib/drive/parse";
import { checkRateLimit } from "@/lib/rate-limit";
import { getOptionalSession } from "@/lib/auth/require-auth";

export const runtime = "nodejs";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_FILE_BYTES = 200 * 1024 * 1024; // 200 MB safety cap

export type DriveImportError =
	| { code: "invalid_url"; message: string }
	| { code: "not_public"; message: string }
	| { code: "not_found"; message: string }
	| { code: "too_large"; message: string }
	| { code: "unsupported_host"; message: string }
	| { code: "fetch_failed"; message: string };

// Folder URLs cannot be enumerated or fetched over the public link
// surface, so we hand them back as descriptors and the client creates a
// new empty project that the user can populate manually.
export type DriveFolderImport = {
	ok: true;
	kind: "folder";
	folderId: string;
	folderUrl: string;
	folderLabel: string;
};

export type DriveFileImport = {
	ok: true;
	kind: "file";
	fileId: string;
	fileName: string;
	contentType: string;
	sizeBytes: number;
	dataBase64: string;
};

export type DriveImportResult = DriveFileImport | DriveFolderImport;

export async function POST(request: Request) {
	const session = await getOptionalSession();
	if (!session) {
		return Response.json({ error: "unauthorized" }, { status: 401 });
	}

	// This route is a server-side fetch proxy (bytes flow through our server),
	// so it must be rate-limited like the other public endpoints to blunt abuse
	// and bandwidth amplification.
	const { limited } = await checkRateLimit({ request });
	if (limited) {
		return NextResponse.json(
			{
				code: "fetch_failed",
				message: "Too many import requests. Wait a moment and try again.",
			} satisfies DriveImportError,
			{ status: 429 },
		);
	}

	const body = (await request.json().catch(() => null)) as {
		url?: string;
	} | null;
	if (!body || typeof body.url !== "string" || body.url.length === 0) {
		return NextResponse.json(
			{
				code: "invalid_url",
				message: "Paste a Google Drive share link first.",
			} satisfies DriveImportError,
			{ status: 400 },
		);
	}

	const parsed = parseDriveUrl({ url: body.url });
	if (!parsed) {
		return NextResponse.json(
			{
				code: "unsupported_host",
				message: "Only Google Drive share links are supported.",
			} satisfies DriveImportError,
			{ status: 400 },
		);
	}

	// Folder link: turn into a new empty project. The Google Drive public
	// surface does not expose folder contents without an API key, so we
	// simply create the project shell and let the user drop files in
	// from the asset panel afterwards. If the folder is not public (403
	// when we ping it below) we surface that as an error.
	if (parsed.kind === "folder") {
		// Lightweight accessibility probe: try to load the folder's
		// public HTML page. We don't need its body — only the status
		// code, to distinguish 200 (public, proceed) from 401/403/404
		// (not public / not found).
		const probe = await probeDriveFolder({ url: parsed.url });
		if (probe === "not_public") {
			return NextResponse.json(
				{
					code: "not_public",
					message:
						"This Drive folder is not public. Open Drive sharing, set it to 'Anyone with the link', and try again.",
				} satisfies DriveImportError,
				{ status: 403 },
			);
		}
		if (probe === "not_found") {
			return NextResponse.json(
				{
					code: "not_found",
					message:
						"Drive could not find this folder. Check the link or ask the owner to re-share it.",
				} satisfies DriveImportError,
				{ status: 404 },
			);
		}
		return NextResponse.json({
			ok: true,
			kind: "folder",
			folderId: parsed.id,
			folderUrl: parsed.url,
			folderLabel: deriveFolderLabel({ folderId: parsed.id }),
		} satisfies DriveFolderImport);
	}

	// File link: stream the bytes and return them base64-encoded so the
	// client can rehydrate a File without further round-trips.
	const fileId = parsed.id;
	const directUrl = buildDriveDirectUrl({ fileId });

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	let response: Response;
	try {
		response = await fetch(directUrl, {
			method: "GET",
			redirect: "follow",
			signal: controller.signal,
		});
	} catch (error) {
		clearTimeout(timer);
		const aborted = error instanceof Error && error.name === "AbortError";
		return NextResponse.json(
			{
				code: "fetch_failed",
				message: aborted
					? "Drive took too long to respond. Try again or check your network."
					: "Could not reach Google Drive. Check the link and try again.",
			} satisfies DriveImportError,
			{ status: 502 },
		);
	}
	clearTimeout(timer);

	if (response.status === 401 || response.status === 403) {
		return NextResponse.json(
			{
				code: "not_public",
				message:
					"This Drive file is not public. Open Drive sharing, set it to 'Anyone with the link', and try again.",
			} satisfies DriveImportError,
			{ status: 403 },
		);
	}
	if (response.status === 404) {
		return NextResponse.json(
			{
				code: "not_found",
				message:
					"Drive could not find this file. Check the link or ask the owner to re-share it.",
			} satisfies DriveImportError,
			{ status: 404 },
		);
	}
	if (!response.ok) {
		return NextResponse.json(
			{
				code: "fetch_failed",
				message: `Drive returned HTTP ${response.status}. Try a different file.`,
			} satisfies DriveImportError,
			{ status: 502 },
		);
	}

	const contentLengthHeader = response.headers.get("content-length");
	const contentLength = contentLengthHeader
		? Number.parseInt(contentLengthHeader, 10)
		: Number.NaN;
	if (Number.isFinite(contentLength) && contentLength > MAX_FILE_BYTES) {
		return NextResponse.json(
			{
				code: "too_large",
				message: `File is ${(contentLength / 1024 / 1024).toFixed(0)} MB. The 200 MB cap is a safety limit; try a smaller file.`,
			} satisfies DriveImportError,
			{ status: 413 },
		);
	}

	const contentType =
		response.headers.get("content-type") ?? "application/octet-stream";

	// Stream the body into chunks instead of buffering the whole file via
	// `arrayBuffer()` (one copy) then `Buffer.from` (a second copy) before
	// base64 (a third). We also abort mid-stream the moment the transfer
	// crosses the safety cap, so a missing or lying `content-length` header
	// can't force a multi-hundred-MB memory spike on the server.
	const reader = response.body?.getReader();
	if (!reader) {
		return NextResponse.json(
			{
				code: "fetch_failed",
				message: "Drive returned a bodyless response. Try a different file.",
			} satisfies DriveImportError,
			{ status: 502 },
		);
	}

	const chunks: Uint8Array[] = [];
	let totalBytes = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			if (value) {
				totalBytes += value.byteLength;
				if (totalBytes > MAX_FILE_BYTES) {
					await reader.cancel();
					return NextResponse.json(
						{
							code: "too_large",
							message: "File exceeded the 200 MB safety cap during transfer.",
						} satisfies DriveImportError,
						{ status: 413 },
					);
				}
				chunks.push(value);
			}
		}
	} catch {
		await reader.cancel().catch(() => {});
		return NextResponse.json(
			{
				code: "fetch_failed",
				message: "The download was interrupted. Try again.",
			} satisfies DriveImportError,
			{ status: 502 },
		);
	}

	const buffer = Buffer.concat(chunks as Buffer[]);
	const disposition = response.headers.get("content-disposition");
	const fileName = extractFileName({ disposition, fileId, contentType });

	return NextResponse.json({
		ok: true,
		kind: "file",
		fileId,
		fileName,
		contentType,
		sizeBytes: buffer.byteLength,
		dataBase64: buffer.toString("base64"),
	} satisfies DriveFileImport);
}

type ProbeResult = "ok" | "not_public" | "not_found" | "unknown";

async function probeDriveFolder({
	url,
}: {
	url: string;
}): Promise<ProbeResult> {
	// Public Drive folders render an HTML page when the link is reachable.
	// A 401/403/404 status is enough to know the folder is gated.
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const res = await fetch(url, {
			method: "GET",
			redirect: "follow",
			signal: controller.signal,
			headers: { "cache-control": "no-cache" },
		});
		clearTimeout(timer);
		if (res.status === 200) return "ok";
		if (res.status === 401 || res.status === 403) return "not_public";
		if (res.status === 404) return "not_found";
		return "unknown";
	} catch {
		clearTimeout(timer);
		// Network failure: treat as a soft "unknown" so the user can still
		// create the project shell — the actual folder content import is
		// a manual step anyway.
		return "unknown";
	}
}

function deriveFolderLabel({ folderId }: { folderId: string }): string {
	// Without Drive API access we cannot resolve a folder name from the
	// ID, so we surface the ID-derived stub and let the user rename the
	// project from the projects page.
	const tail = folderId.slice(-6);
	return `Drive folder \u2026${tail}`;
}

function extractFileName({
	disposition,
	fileId,
	contentType,
}: {
	disposition: string | null;
	fileId: string;
	contentType: string;
}): string {
	if (disposition) {
		const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
		if (utf8?.[1]) {
			try {
				return decodeURIComponent(utf8[1]);
			} catch {
				// fall through
			}
		}
		const quoted = /filename="?([^";]+)"?/i.exec(disposition);
		if (quoted?.[1]) return quoted[1];
	}
	const ext = contentType.split("/")[1]?.split(";")[0]?.trim() ?? "bin";
	return `drive-${fileId}.${ext}`;
}
