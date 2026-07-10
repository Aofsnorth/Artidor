import { TOOLS_BY_EXECUTOR_KEY } from "../registry";

function assert(cond: boolean, msg: string): void {
	if (!cond) {
		console.error(`FAIL: ${msg}`);
		process.exit(1);
	}
}

assert(
	Boolean(TOOLS_BY_EXECUTOR_KEY.smart_close_gaps),
	"smart_close_gaps registered",
);
assert(
	Boolean(TOOLS_BY_EXECUTOR_KEY.smart_beat_markers),
	"smart_beat_markers registered",
);
assert(
	Boolean(TOOLS_BY_EXECUTOR_KEY.smart_capcut_style),
	"smart_capcut_style registered",
);

console.log("macro-tools: all assertions passed");
