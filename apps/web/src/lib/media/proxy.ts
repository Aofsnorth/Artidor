export function shouldUseProxy({
	width,
	height,
	durationSeconds,
	fileSizeBytes,
	previewScale,
}: {
	width: number;
	height: number;
	durationSeconds: number;
	fileSizeBytes: number;
	previewScale: number;
}): boolean {
	const pixels = width * height;
	return (
		previewScale < 0.75 &&
		(pixels >= 1920 * 1080 ||
			durationSeconds >= 30 ||
			fileSizeBytes >= 250_000_000)
	);
}

export function getProxyTargetSize({
	width,
	height,
	maxLongEdge,
}: {
	width: number;
	height: number;
	maxLongEdge: number;
}): { width: number; height: number } {
	const longest = Math.max(width, height);
	if (longest <= maxLongEdge) return { width, height };
	const scale = maxLongEdge / longest;
	return {
		width: Math.max(2, Math.round((width * scale) / 2) * 2),
		height: Math.max(2, Math.round((height * scale) / 2) * 2),
	};
}
