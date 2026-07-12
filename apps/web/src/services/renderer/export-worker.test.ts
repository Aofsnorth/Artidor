import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const workerSource = readFileSync(
	`${import.meta.dir}/export-worker.ts`,
	"utf8",
);

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
