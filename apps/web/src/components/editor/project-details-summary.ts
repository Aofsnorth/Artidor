const TICKS_PER_SECOND = 120_000;

export function summarizeProjectDetails({
	name,
	durationTicks,
	fps,
	canvasSize,
	trackCount,
	mediaCount,
}: {
	name: string;
	durationTicks: number;
	fps: { numerator: number; denominator: number };
	canvasSize: { width: number; height: number };
	trackCount: number;
	mediaCount: number;
}) {
	const totalSeconds = Math.max(
		0,
		Math.round(durationTicks / TICKS_PER_SECOND),
	);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	const frameRate = Math.round(fps.numerator / Math.max(1, fps.denominator));

	return {
		name,
		duration: `${minutes}:${seconds.toString().padStart(2, "0")}`,
		frameRate: `${frameRate} fps`,
		resolution: `${canvasSize.width} × ${canvasSize.height}`,
		tracks: `${trackCount} ${trackCount === 1 ? "track" : "tracks"}`,
		media: `${mediaCount} media`,
	};
}
