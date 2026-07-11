import type { FrameItemDescriptor } from "./types";

export function orderMediaGraphicStyleLayers({
	fillLayer,
	shadowLayer,
	strokeLayer,
	borderLayer,
}: {
	fillLayer: FrameItemDescriptor | null;
	shadowLayer: FrameItemDescriptor | null;
	strokeLayer: FrameItemDescriptor | null;
	borderLayer: FrameItemDescriptor | null;
}): [FrameItemDescriptor[], FrameItemDescriptor[]] {
	const beforeMedia: FrameItemDescriptor[] = [];
	const afterMedia: FrameItemDescriptor[] = [];
	if (shadowLayer) beforeMedia.push(shadowLayer);
	if (fillLayer) afterMedia.push(fillLayer);
	if (strokeLayer) afterMedia.push(strokeLayer);
	if (borderLayer) afterMedia.push(borderLayer);
	return [beforeMedia, afterMedia];
}
