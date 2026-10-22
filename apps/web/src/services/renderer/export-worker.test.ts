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

test("encode promises get a rejection handler before the loop continues", () => {
	// The old code pushed `videoSource.add(...)` raw, so a rejection fired the
	// global unhandledrejection handler and settled the export while the render
	// loop was still running. Every encode is now wrapped eagerly and the loop
	// checks the stored failure at its next checkpoint.
	expect(workerSource).not.toContain("pendingEncodes.push(videoSource.add(");
	expect(workerSource).toContain("encode.catch((error) => {");
	expect(workerSource).toContain("firstEncodeError = error;");
	expect(workerSource).toContain("throwIfEncodeFailed();");
	expect(workerSource).toContain(
		"queueEncode(videoSource.add(localTimeSeconds, frameDuration));",
	);
});

test("a pinned segment codec honors the negotiated hardware hint", () => {
	// The parallel pipeline negotiates hardware/software once; segments must
	// not default back to prefer-hardware and retry the failure per worker.
	expect(workerSource).toContain(
		'(msg.hardwareAcceleration ?? "prefer-hardware")',
	);
	// Forced-software retries still win over the hint.
	expect(workerSource).toContain(
		"hardwareAcceleration = msg.forceSoftwareEncoding",
	);
});
