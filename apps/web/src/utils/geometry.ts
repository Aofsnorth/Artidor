export function dimensionToAspectRatio({
	width,
	height,
}: {
	width: number;
	height: number;
}): string {
	// A 0×0 (or otherwise unusable) size has no meaningful ratio. Dividing
	// by gcd(0, 0) = 0 used to return "NaN:NaN".
	if (
		!Number.isFinite(width) ||
		!Number.isFinite(height) ||
		width <= 0 ||
		height <= 0
	) {
		return "1:1";
	}

	const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
	const divisor = gcd(width, height);
	const aspectWidth = width / divisor;
	const aspectHeight = height / divisor;
	return `${aspectWidth}:${aspectHeight}`;
}
