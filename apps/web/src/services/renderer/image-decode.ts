export interface DecodeImageBitmapOptions {
	url: string;
	/** Desired bitmap width for SVG sources that lack intrinsic dimensions. */
	resizeWidth?: number;
	/** Cap on the longest edge, used as a fallback resize target when `resizeWidth` is not given. */
	maxSourceSize?: number;
	/** Label for error messages, e.g. "sticker" or "image". */
	label?: string;
}

function isSvgFromMetadata(blob: Blob, url: string): boolean {
	if (blob.type?.includes("image/svg+xml")) return true;
	if (url.startsWith("data:image/svg+xml")) return true;

	try {
		const pathname = new URL(url).pathname;
		return pathname.toLowerCase().endsWith(".svg");
	} catch {
		return false;
	}
}

async function isSvgFromContent(blob: Blob): Promise<boolean> {
	const sample = await blob.slice(0, 1024).text();
	const trimmed = sample.trimStart();
	return (
		trimmed.startsWith("<?xml") ||
		trimmed.toLowerCase().startsWith("<svg") ||
		trimmed.toLowerCase().includes("<svg")
	);
}

async function isSvgImage(
	blob: Blob,
	url: string,
	force = false,
): Promise<boolean> {
	if (isSvgFromMetadata(blob, url)) return true;
	if (!force) return false;
	return isSvgFromContent(blob);
}

function buildDecodeError(
	label: string,
	url: string,
	blob: Blob,
	error: unknown,
): Error {
	const reason = error instanceof Error ? error.message : String(error);
	return new Error(
		`Failed to decode ${label} from "${url}" (type: "${blob.type}"): ${reason}`,
	);
}

/**
 * Decode a `Blob` into an `ImageBitmap`, with a fallback for SVG sources that
 * do not have intrinsic dimensions.
 *
 * `createImageBitmap(blob)` fails on SVGs without `width`/`height` or a
 * `viewBox` in some browsers. Passing `resizeWidth` (or falling back to
 * `maxSourceSize` / 1024) gives the browser an explicit output size and lets
 * it derive the other dimension from the SVG aspect ratio.
 */
export async function decodeImageBitmap(
	blob: Blob,
	options: DecodeImageBitmapOptions,
): Promise<ImageBitmap> {
	const isSvg = await isSvgImage(blob, options.url);
	const targetWidth = options.resizeWidth ?? options.maxSourceSize;
	const label = options.label ?? "image source";

	if (isSvg && targetWidth !== undefined) {
		try {
			return await createImageBitmap(blob, {
				resizeWidth: Math.max(1, Math.round(targetWidth)),
				resizeQuality: "high",
			});
		} catch {
			// A resize hint was provided but the SVG still could not be decoded.
			// Continue to the unparameterized path so we can produce a useful
			// error message and, if the source was misidentified, try again.
		}
	}

	try {
		return await createImageBitmap(blob);
	} catch (error) {
		const maybeSvg = await isSvgImage(blob, options.url, true);
		if (maybeSvg) {
			const fallbackWidth = Math.max(
				1,
				Math.round(targetWidth ?? 1024),
			);
			try {
				return await createImageBitmap(blob, {
					resizeWidth: fallbackWidth,
					resizeQuality: "high",
				});
			} catch (fallbackError) {
				throw buildDecodeError(label, options.url, blob, fallbackError);
			}
		}

		throw buildDecodeError(label, options.url, blob, error);
	}
}
