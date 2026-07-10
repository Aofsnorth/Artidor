export function closeTimelineGap<
	T extends { startTime: number; duration: number },
>(elements: T[], gapStart: number, gapEnd: number): T[] {
	const gap = Math.max(0, gapEnd - gapStart);
	return elements.map((element) =>
		element.startTime >= gapEnd
			? { ...element, startTime: element.startTime - gap }
			: element,
	);
}

export function findNearestSnapTime(
	time: number,
	points: readonly number[],
	threshold: number,
): number | null {
	let best: number | null = null;
	let bestDistance = Infinity;
	for (const point of points) {
		const distance = Math.abs(point - time);
		if (distance <= threshold && distance < bestDistance) {
			best = point;
			bestDistance = distance;
		}
	}
	return best;
}
