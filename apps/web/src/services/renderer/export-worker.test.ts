import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const workerSource = readFileSync(
	`${import.meta.dir}/export-worker.ts`,
	"utf8",
);

test("static export heartbeat is always cleared", () => {
	const heartbeatStart = workerSource.indexOf("const staticProgressHeartbeat");
	const finallyStart = workerSource.indexOf("} finally {", heartbeatStart);
	const heartbeatCleanup = workerSource.indexOf(
		"clearInterval(staticProgressHeartbeat)",
		finallyStart,
	);

	expect(heartbeatStart).toBeGreaterThan(-1);
	expect(finallyStart).toBeGreaterThan(heartbeatStart);
	expect(heartbeatCleanup).toBeGreaterThan(finallyStart);
});

test("warm export resets cancellation state before each run", () => {
	const handlerStart = workerSource.indexOf("async function handleExport");
	const destructureStart = workerSource.indexOf("const {", handlerStart);
	const resetPosition = workerSource.indexOf(
		"isCancelled = false",
		handlerStart,
	);

	expect(handlerStart).toBeGreaterThan(-1);
	expect(resetPosition).toBeGreaterThan(handlerStart);
	expect(resetPosition).toBeLessThan(destructureStart);
});
