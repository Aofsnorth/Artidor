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

/**
 * Bytes per base64 fragment. Base64 maps 3 input bytes to exactly 4
 * characters and never pads mid-stream, so a fragment whose length is a
 * multiple of 3 encodes independently and the fragments concatenate back
 * to the exact same string as encoding the whole buffer at once.
 */
const BASE64_FRAGMENT_BYTES = 3 * 64 * 1024; // 192 KB

const encoder = new TextEncoder();

/**
 * Base64-encode `buffer` as a sequence of independent fragments.
 *
 * The client contract is JSON with a base64 `dataBase64` string
 * (`components/import-drive-button.tsx` decodes it into a File), so the
 * payload cannot simply be dropped. What can be avoided is materializing
 * it twice more: `buffer.toString("base64")` allocates one ~1.33x string
 * and `NextResponse.json` allocates a second while serializing, on top of
 * the raw bytes. At the 200 MB cap that is roughly 1 GB of peak memory.
 * Emitting fragments keeps a single full-size copy in total.
 */
function* encodeBase64Fragments(buffer: Buffer): Generator<string> {
	let offset = 0;
	while (offset + BASE64_FRAGMENT_BYTES <= buffer.length) {
		yield buffer.toString("base64", offset, offset + BASE64_FRAGMENT_BYTES);
		offset += BASE64_FRAGMENT_BYTES;
	}
	if (offset < buffer.length) {
		yield buffer.toString("base64", offset, buffer.length);
	}
}

/**
 * Build the `DriveFileImport` response as a streamed JSON body: a small
 * metadata prefix, the base64 payload in fragments, then the closing
 * quote and brace. Byte-for-byte identical to `NextResponse.json` of the
 * same object, and `res.json()` on the client parses it unchanged.
 */
function fileImportJsonStream({
	fileId,
	fileName,
	contentType,
	sizeBytes,
	buffer,
}: {
	fileId: string;
	fileName: string;
	contentType: string;
	sizeBytes: number;
	buffer: Buffer;
}): Response {
	const meta: Omit<DriveFileImport, "dataBase64"> = {
		ok: true,
		kind: "file",
		fileId,
		fileName,
		contentType,
		sizeBytes,
	};
	// Serialize the metadata object, drop its closing brace and reopen the
	// object with the base64 payload: the client receives exactly the
	// `DriveFileImport` shape, with the payload streamed in.
	const prefix = `${JSON.stringify(meta).slice(0, -1)},"dataBase64":"`;
	const suffix = '"}';
	const fragments = encodeBase64Fragments(buffer);
	let prefixSent = false;
	const body = new ReadableStream<Uint8Array>({
		pull(controller) {
			if (!prefixSent) {
				prefixSent = true;
				controller.enqueue(encoder.encode(prefix));
				return;
			}
			const next = fragments.next();
			if (next.done) {
				controller.enqueue(encoder.encode(suffix));
				controller.close();
				return;
			}
			controller.enqueue(encoder.encode(next.value));
		},
	});
	return new Response(body, {
		status: 200,
		headers: { "content-type": "application/json" },
	});
}

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

	// Read the body once, into a single full-size buffer, and abort the
	// moment the transfer crosses the safety cap so a missing or lying
	// `content-length` header can't force a multi-hundred-MB memory spike
	// on the server. Pre-sizing the buffer when Drive reports the length
	// avoids a second full-size copy (`chunks` plus `Buffer.concat`).
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

	const preallocated =
		Number.isFinite(contentLength) && contentLength > 0
			? Buffer.allocUnsafe(contentLength)
			: null;
	/** Only used when the declared length was absent or wrong. */
	const chunks: Buffer[] = [];
	let filled = 0;
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
				// A header that understates the size must not write past the
				// pre-sized buffer; those bytes fall back to `chunks`.
				if (preallocated && filled + value.byteLength <= preallocated.length) {
					preallocated.set(value, filled);
					filled += value.byteLength;
				} else {
					chunks.push(
						Buffer.from(value.buffer, value.byteOffset, value.byteLength),
					);
				}
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

	const buffer =
		chunks.length > 0
			? Buffer.concat(
					[
						...(preallocated ? [preallocated.subarray(0, filled)] : []),
						...chunks,
					],
					totalBytes,
				)
			: (preallocated?.subarray(0, totalBytes) ??
				Buffer.alloc(totalBytes));
	const disposition = response.headers.get("content-disposition");
	const fileName = extractFileName({ disposition, fileId, contentType });

	return fileImportJsonStream({
		fileId,
		fileName,
		contentType,
		sizeBytes: buffer.byteLength,
		buffer,
	});
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
