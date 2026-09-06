export const MODEL_MARQUEE_PIXELS_PER_SECOND = 24;

export function getModelMarqueeDuration({
	distance,
}: {
	distance: number;
}): number {
	if (!Number.isFinite(distance) || distance <= 0) return 0;
	return distance / MODEL_MARQUEE_PIXELS_PER_SECOND;
}
