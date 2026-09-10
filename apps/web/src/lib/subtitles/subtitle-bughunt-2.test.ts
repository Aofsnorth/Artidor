import { beforeEach, describe, expect, test } from "bun:test";
import { parseSrt } from "./srt";
import { parseAss } from "./ass";
import { parseVtt } from "./vtt";
import { parseSubtitleFile } from "./parse";
import { exportCuesToAss, exportCuesToSrt } from "./export";

beforeEach(() => {
	// build-subtitle-text-element needs document only for measurement; the
	// parse/export suites below are DOM-free.
});

/** media-bughunt-2 R02/R03/R04/R10–R13: parser + export hardening. */
describe("subtitle bughunt-2 regressions", () => {
	test("R02: single-digit hour + out-of-range mm/ss rejected, valid kept", () => {
		const result = parseSrt({
			input: [
				"1",
				"0:00:01,000 --> 0:00:02,000",
				"no hour pad",
				"",
				"2",
				"00:75:00,000 --> 00:75:01,000",
				"bad minute",
				"",
				"3",
				"00:00:05,000 --> 00:00:04,000",
				"negative duration",
			].join("\n"),
		});
		expect(result.captions.map((cue) => cue.text)).toEqual(["no hour pad"]);
		expect(result.skippedCueCount).toBe(2);
	});

	test("R03: out-of-order cues sort + overlap clamps with warning (SRT)", () => {
		const result = parseSrt({
			input: [
				"1",
				"00:00:05,000 --> 00:00:07,000",
				"second",
				"",
				"2",
				"00:00:01,000 --> 00:00:06,000",
				"first",
			].join("\n"),
		});
		expect(result.captions.map((cue) => cue.text)).toEqual(["first", "second"]);
		expect(result.captions[0]?.duration).toBeCloseTo(4);
		expect(result.warnings.join(" ")).toContain("overlapping");
	});

	test("R03: ASS out-of-order + overlap also sorts/clamps with warning", () => {
		const input = [
			"[Script Info]",
			"PlayResX: 1920",
			"PlayResY: 1080",
			"",
			"[V4+ Styles]",
			"Format: Name, Fontname, Fontsize, PrimaryColour, Alignment, MarginL, MarginR, MarginV",
			"Style: Default,Inter,72,&H00FFFFFF,2,40,40,60",
			"",
			"[Events]",
			"Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
			"Dialogue: 0,0:00:05.00,0:00:07.00,Default,,0,0,0,,second",
			"Dialogue: 0,0:00:01.00,0:00:06.00,Default,,0,0,0,,first",
		].join("\n");
		const result = parseAss({ input });
		expect(result.captions.map((cue) => cue.text)).toEqual(["first", "second"]);
		expect(result.captions[0]?.duration).toBeCloseTo(4);
		expect(result.warnings.join(" ")).toContain("overlapping");
	});

	test("R10: VTT header/NOTE/STYLE skipped, cues parsed", () => {
		const result = parseVtt({
			input: [
				"WEBVTT - some header text",
				"",
				"NOTE this is a comment",
				"",
				"STYLE",
				"::cue { color: white }",
				"",
				"00:01.000 --> 00:03.000",
				"hello",
				"",
				"cue-1",
				"00:05.000 --> 00:06.500 position:10%",
				"world",
			].join("\n"),
		});
		expect(result.captions.map((cue) => cue.text)).toEqual(["hello", "world"]);
		expect(result.captions[0]?.startTime).toBeCloseTo(1);
		expect(result.captions[1]?.duration).toBeCloseTo(1.5);
	});

	test("R11: SRT without cue-number line still imports", () => {
		const result = parseSrt({
			input:
				"00:00:01,000 --> 00:00:02,000\nhello\n\n00:00:03,000 --> 00:00:04,000\nworld",
		});
		expect(result.captions.map((cue) => cue.text)).toEqual(["hello", "world"]);
	});

	test("R12: single-digit hour SRT timestamp accepted", () => {
		const result = parseSrt({
			input: "1\n0:00:01,000 --> 0:00:02,500\nok",
		});
		expect(result.captions).toHaveLength(1);
		expect(result.captions[0]?.duration).toBeCloseTo(1.5);
	});

	test("R13: .vtt/.ssa route + WEBVTT sniffing for .txt", () => {
		expect(
			parseSubtitleFile({
				fileName: "subs.vtt",
				input: "WEBVTT\n\n00:01.000 --> 00:02.000\nhi",
			}).captions,
		).toHaveLength(1);
		expect(
			parseSubtitleFile({
				fileName: "notes.txt",
				input: "WEBVTT\n\n00:01.000 --> 00:02.000\nhi",
			}).captions,
		).toHaveLength(1);
		expect(
			parseSubtitleFile({
				fileName: "subs.ssa",
				input: [
					"[Script Info]",
					"PlayResX: 384",
					"PlayResY: 288",
					"[Events]",
					"Format: Layer, Start, End, Style, Text",
					"Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,hi",
				].join("\n"),
			}).captions,
		).toHaveLength(1);
	});

	test("R04: export rounding never emits millis=1000 / centis=100", () => {
		const srt = exportCuesToSrt({
			cues: [{ text: "x", startTime: 59.9996, duration: 0.0003 }],
		});
		expect(srt).toContain("00:01:00,000");
		expect(srt).not.toContain("1000");
		const ass = exportCuesToAss({
			cues: [{ text: "x", startTime: 59.999, duration: 0.001 }],
		});
		expect(ass).not.toContain(".100");
	});
});
