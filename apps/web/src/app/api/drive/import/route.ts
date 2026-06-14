import { NextResponse } from "next/server";
import { buildDriveDirectUrl, parseDriveFileId } from "@/lib/drive/parse";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_FILE_BYTES = 200 * 1024 * 1024; // 200 MB safety cap

export type DriveImportError =
	| { code: "invalid_url"; message: string }
	| { code: "not_public"; message: string }
	| { code: "not_found"; message: string }
	| { code: "too_large"; message: string }
	| { code: "unsupported_host"; message: string }
	| { code: "fetch_failed"; message: string };

export async function POST(request: Request) {
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

	const fileId = parseDriveFileId({ url: body.url });
	if (!fileId) {
		return NextResponse.json(
			{
				code: "unsupported_host",
				message: "Only Google Drive share links are supported.",
			} satisfies DriveImportError,
			{ status: 400 },
		);
	}

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
	const buffer = Buffer.from(await response.arrayBuffer());
	if (buffer.byteLength > MAX_FILE_BYTES) {
		return NextResponse.json(
			{
				code: "too_large",
				message: "File exceeded the 200 MB safety cap during transfer.",
			} satisfies DriveImportError,
			{ status: 413 },
		);
	}

	const disposition = response.headers.get("content-disposition");
	const fileName = extractFileName({ disposition, fileId, contentType });

	return NextResponse.json({
		ok: true,
		fileId,
		fileName,
		contentType,
		sizeBytes: buffer.byteLength,
		dataBase64: buffer.toString("base64"),
	});
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
