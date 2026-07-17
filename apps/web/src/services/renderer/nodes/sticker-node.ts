import { STICKER_INTRINSIC_SIZE_FALLBACK } from "@/lib/stickers/intrinsic-size";
import { resolveStickerId } from "@/lib/stickers";
import { decodeImageBitmap } from "../image-decode";
import {
	VisualNode,
	type ResolvedVisualSourceNodeState,
	type VisualNodeParams,
} from "./visual-node";

export interface StickerNodeParams extends VisualNodeParams {
	stickerId: string;
	intrinsicWidth?: number;
	intrinsicHeight?: number;
}

interface CachedStickerSource {
	source: HTMLImageElement | ImageBitmap;
	width: number;
	height: number;
}

const stickerSourceCache = new Map<string, Promise<CachedStickerSource>>();

export function loadStickerSource({
	stickerId,
	intrinsicWidth,
	intrinsicHeight,
}: {
	stickerId: string;
	intrinsicWidth?: number;
	intrinsicHeight?: number;
}): Promise<CachedStickerSource> {
	const resizeWidth = intrinsicWidth ?? STICKER_INTRINSIC_SIZE_FALLBACK;
	const cacheKey = `${stickerId}:${resizeWidth}`;
	const cached = stickerSourceCache.get(cacheKey);
	if (cached) return cached;

	const promise = (async (): Promise<CachedStickerSource> => {
		const url = resolveStickerId({
			stickerId,
			options: {
				width: intrinsicWidth ?? STICKER_INTRINSIC_SIZE_FALLBACK,
				height: intrinsicHeight ?? STICKER_INTRINSIC_SIZE_FALLBACK,
			},
		});

		// Use fetch + createImageBitmap so this path works in Web Worker
		// contexts where `new Image()` (a DOM API) is unavailable.
		const response = await fetch(url);
		const blob = await response.blob();
		const bitmap = await decodeImageBitmap(blob, {
			url,
			resizeWidth,
			label: "sticker",
		});

		return {
			source: bitmap,
			width: bitmap.width,
			height: bitmap.height,
		};
	})();

	stickerSourceCache.set(cacheKey, promise);
	return promise;
}

export class StickerNode extends VisualNode<
	StickerNodeParams,
	ResolvedVisualSourceNodeState
> {}
