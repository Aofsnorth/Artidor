/**
 * Export-capability probe, REAL browser.
 *
 * `tests/19-export-probe.spec.ts` runs under the suite's launch flags
 * (`--disable-webgpu --disable-gpu --use-gl=swiftshader`), so it measures a
 * deliberately crippled browser: no adapter, and headless Chromium on Windows
 * exposes no hardware video encoder regardless of the machine. Those numbers
 * say nothing about what a user on real hardware gets.
 *
 * This script launches the same build in a HEADED browser with the GPU left
 * alone, which is the only way to answer "is export as fast as it can be
 * here?" honestly.
 *
 * Run:  node scripts/probe-export-realtime.mjs
 */
import { chromium } from "playwright";

const BASE_URL = process.env.PROBE_URL ?? "http://127.0.0.1:3005";
const HEADED = process.env.PROBE_HEADED !== "0";

const browser = await chromium.launch({
	headless: !HEADED,
	args: [
		"--no-sandbox",
		"--disable-dev-shm-usage",
		"--autoplay-policy=no-user-gesture-required",
	],
});
const page = await browser.newPage();
const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(e.message));

console.log(
	"opening",
	BASE_URL,
	HEADED ? "(headed, GPU enabled)" : "(headless)",
);
await page.goto(`${BASE_URL}/editor/test-project`, {
	waitUntil: "domcontentloaded",
});
await page.waitForSelector(".editing-screen", { timeout: 60_000 });
await page.waitForTimeout(6000);

const report = await page.evaluate(async () => {
	const w = window;
	const hasEncoder = typeof w.VideoEncoder === "function";
	const candidates = [
		["avc1.42001f (H.264 baseline)", "avc1.42001f"],
		["avc1.640028 (H.264 high)", "avc1.640028"],
		["avc1.640034 (H.264 high 5.2)", "avc1.640034"],
		["vp09.00.10.08 (VP9 p0)", "vp09.00.10.08"],
		["vp8", "vp8"],
		["av01.0.04M.08 (AV1)", "av01.0.04M.08"],
	];
	const codecs = [];
	if (hasEncoder) {
		for (const [label, codec] of candidates) {
			const base = {
				codec,
				width: 1920,
				height: 1080,
				bitrate: 8_000_000,
				framerate: 30,
			};
			const ask = (accel) =>
				w.VideoEncoder.isConfigSupported({
					...base,
					hardwareAcceleration: accel,
				})
					.then((r) => Boolean(r?.supported))
					.catch(() => null);
			codecs.push({
				label,
				hardware: await ask("prefer-hardware"),
				software: await ask("prefer-software"),
				noPreference: await ask("no-preference"),
			});
		}
	}

	let adapterInfo = null;
	try {
		if ("gpu" in navigator) {
			const adapter = await navigator.gpu.requestAdapter();
			if (adapter) {
				const info = adapter.info ?? (await adapter.requestAdapterInfo?.());
				adapterInfo = {
					vendor: info?.vendor ?? null,
					architecture: info?.architecture ?? null,
					description: info?.description ?? null,
				};
			}
		}
	} catch (e) {
		adapterInfo = { error: String(e).slice(0, 120) };
	}

	return {
		hasEncoder,
		codecs,
		adapterInfo,
		cores: navigator.hardwareConcurrency,
		deviceMemory: navigator.deviceMemory ?? null,
	};
});

console.log("\n=== EXPORT CAPABILITY (real browser) ===");
console.log(`VideoEncoder API : ${report.hasEncoder}`);
for (const c of report.codecs) {
	const verdict = c.hardware
		? "HARDWARE"
		: c.noPreference
			? "no-preference only"
			: c.software
				? "software only"
				: "unsupported";
	console.log(
		`  ${c.label.padEnd(30)} hw=${String(c.hardware).padEnd(5)} nopref=${String(c.noPreference).padEnd(5)} sw=${String(c.software).padEnd(5)} -> ${verdict}`,
	);
}
console.log(`GPU adapter      : ${JSON.stringify(report.adapterInfo)}`);
console.log(`cores            : ${report.cores}`);
console.log(`deviceMemory     : ${report.deviceMemory ?? "n/a"} GB`);
if (consoleErrors.length > 0) {
	console.log(`page errors: ${consoleErrors.slice(0, 3).join(" | ")}`);
}

await browser.close();
