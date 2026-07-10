import { getProxyTargetSize, shouldUseProxy } from "./proxy";

function assert(cond: boolean, msg: string): void {
	if (!cond) {
		console.error(`FAIL: ${msg}`);
		process.exit(1);
	}
}

assert(
	shouldUseProxy({
		width: 3840,
		height: 2160,
		durationSeconds: 60,
		fileSizeBytes: 800_000_000,
		previewScale: 0.4,
	}),
	"4K long large clip uses proxy",
);
assert(
	!shouldUseProxy({
		width: 1280,
		height: 720,
		durationSeconds: 5,
		fileSizeBytes: 5_000_000,
		previewScale: 1,
	}),
	"short 720p clip does not use proxy",
);
const size = getProxyTargetSize({
	width: 3840,
	height: 2160,
	maxLongEdge: 960,
});
assert(size.width === 960 && size.height === 540, "proxy keeps 16:9 aspect");

console.log("proxy: all assertions passed");
