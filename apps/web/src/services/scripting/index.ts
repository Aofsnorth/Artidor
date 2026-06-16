/**
 * Co-located factory for the scripting sandbox worker. Keeping the
 * `new URL("./worker.ts", import.meta.url)` next to the worker file lets the
 * bundler (Turbopack/webpack) statically resolve and emit the worker chunk —
 * the same pattern the transcription service uses.
 */
export function createScriptingWorker(): Worker {
	return new Worker(new URL("./worker.ts", import.meta.url), {
		type: "module",
	});
}
