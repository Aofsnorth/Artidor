/**
 * Format a StyleProfile for inclusion in a system prompt.
 *
 * The LLM gets the raw numbers AND a short narrative. The numbers let
 * it reason about exact pacing; the narrative gives it copy it can
 * paraphrase to the user.
 */

import type { StyleProfile } from "./extractor";

export function formatStyleProfile(profile: StyleProfile): string {
	if (!profile || profile.duration === 0) return "";

	const durSec = (profile.duration / 120_000).toFixed(1);
	const avgShotSec = (profile.avgShotLength / 120_000).toFixed(2);
	const bpm = profile.audioTempo
		? `${Math.round(profile.audioTempo)} BPM`
		: "no audio detected";

	const lines: string[] = [
		"",
		"# Reference style profile",
		`- Duration: ${durSec}s`,
	];

	if (profile.cutFrequency > 0) {
		lines.push(`- Cuts per minute: ${profile.cutFrequency.toFixed(1)}`);
		lines.push(`- Average shot length: ${avgShotSec}s`);
	}
	lines.push(
		`- Motion intensity: ${(profile.motionIntensity * 100).toFixed(0)}%`,
	);
	lines.push(`- Audio tempo: ${bpm}`);
	if (profile.dominantColors.length) {
		lines.push(`- Dominant colors: ${profile.dominantColors.join(", ")}`);
	}
	const hints = profile.transitionHints;
	if (hints.cutRatio + hints.fadeRatio + hints.wipeRatio > 0) {
		lines.push(
			`- Transition mix → cuts:${(hints.cutRatio * 100).toFixed(0)}%, ` +
				`fades:${(hints.fadeRatio * 100).toFixed(0)}%, ` +
				`wipes:${(hints.wipeRatio * 100).toFixed(0)}%`,
		);
	}
	if (profile.notes.length) {
		lines.push("- Notes:");
		for (const n of profile.notes) lines.push(`  • ${n}`);
	}
	return lines.join("\n");
}
