export type CaptionCue = {
	trackId: string;
	elementId: string;
	text: string;
	startTime: number;
	duration: number;
};

type CaptionTrack = {
	id: string;
	elements: Array<{
		id: string;
		content: string;
		startTime: number;
		duration: number;
	}>;
};

export function getCaptionCues({
	track,
	ticksPerSecond,
}: {
	track: CaptionTrack;
	ticksPerSecond: number;
}): CaptionCue[] {
	return track.elements
		.map((element) => ({
			trackId: track.id,
			elementId: element.id,
			text: element.content,
			startTime: element.startTime / ticksPerSecond,
			duration: element.duration / ticksPerSecond,
		}))
		.sort((a, b) => a.startTime - b.startTime);
}
