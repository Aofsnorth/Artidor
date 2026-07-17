import { decodeImageBitmap } from "../image-decode";
import {
	VisualNode,
	type ResolvedVisualSourceNodeState,
	type VisualNodeParams,
} from "./visual-node";

export interface ImageNodeParams extends VisualNodeParams {
	mediaId: string;
	url: string;
	file: File;
	maxSourceSize?: number;
}

export interface CachedImageSource {
	source: HTMLImageElement | OffscreenCanvas | ImageBitmap;
	width: number;
	height: number;
}

const imageSourceCache = new Map<string, Promise<CachedImageSource>>();

export function loadImageSource(
	url: string,
	maxSourceSize?: number,
): Promise<CachedImageSource> {
	const cacheKey = `${url}::${maxSourceSize ?? "full"}`;

	const cached = imageSourceCache.get(cacheKey);
	if (cached) return cached;

	const promise = (async (): Promise<CachedImageSource> => {
		// Use createImageBitmap via fetch so this path works in both the main
		// thread and Web Worker contexts (where `new Image()` is unavailable).
		const response = await fetch(url);
		const blob = await response.blob();
		const bitmap = await decodeImageBitmap(blob, {
			url,
			maxSourceSize,
			label: "image",
		});

		const naturalWidth = bitmap.width;
		const naturalHeight = bitmap.height;
		const exceedsLimit =
			maxSourceSize &&
			(naturalWidth > maxSourceSize || naturalHeight > maxSourceSize);

		if (exceedsLimit) {
			const scale = Math.min(
				maxSourceSize / naturalWidth,
				maxSourceSize / naturalHeight,
			);
			const scaledWidth = Math.round(naturalWidth * scale);
			const scaledHeight = Math.round(naturalHeight * scale);

			const offscreen = new OffscreenCanvas(scaledWidth, scaledHeight);
			const ctx = offscreen.getContext("2d");

			if (ctx) {
				ctx.drawImage(bitmap, 0, 0, scaledWidth, scaledHeight);
				bitmap.close();
				return { source: offscreen, width: scaledWidth, height: scaledHeight };
			}
		}

		// Return the bitmap directly — it is drawable by CanvasRenderingContext2D
		// in both main-thread and worker contexts, unlike HTMLImageElement.
		return { source: bitmap, width: naturalWidth, height: naturalHeight };
	})();

	imageSourceCache.set(cacheKey, promise);
	return promise;
}

export class ImageNode extends VisualNode<
	ImageNodeParams,
	ResolvedVisualSourceNodeState
> {}
