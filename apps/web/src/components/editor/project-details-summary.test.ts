import { expect, test } from "bun:test";
import { summarizeProjectDetails } from "./project-details-summary";

test("summarizes project settings for the compact right card", () => {
	const summary = summarizeProjectDetails({
		name: "Launch cut",
		durationTicks: 240_000,
		fps: { numerator: 30, denominator: 1 },
		canvasSize: { width: 1920, height: 1080 },
		trackCount: 4,
		mediaCount: 7,
	});

	expect(summary).toEqual({
		name: "Launch cut",
		duration: "0:02",
		frameRate: "30 fps",
		resolution: "1920 × 1080",
		tracks: "4 tracks",
		media: "7 media",
	});
});

test("summarizes an empty project without blank values", () => {
	const summary = summarizeProjectDetails({
		name: "Untitled",
		durationTicks: 0,
		fps: { numerator: 24, denominator: 1 },
		canvasSize: { width: 1080, height: 1920 },
		trackCount: 1,
		mediaCount: 0,
	});

	expect(summary.tracks).toBe("1 track");
	expect(summary.media).toBe("0 media");
	expect(summary.duration).toBe("0:00");
});
