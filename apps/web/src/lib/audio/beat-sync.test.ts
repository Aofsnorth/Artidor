import { detectBeatTimes } from "./beat-sync";

function assert(cond: boolean, msg: string): void {
	if (!cond) {
		console.error(`FAIL: ${msg}`);
		process.exit(1);
	}
}

const sampleRate = 10;
const samples = new Float32Array(50);
samples[10] = 1;
samples[20] = 1;
samples[30] = 1;
const beats = detectBeatTimes(samples, sampleRate, {
	windowSize: 5,
	threshold: 0.8,
	minGapSeconds: 0.5,
});

assert(beats.length === 3, "detects three impulses");
assert(beats[0] === 1 && beats[1] === 2 && beats[2] === 3, "returns seconds");

console.log("beat-sync: all assertions passed");
