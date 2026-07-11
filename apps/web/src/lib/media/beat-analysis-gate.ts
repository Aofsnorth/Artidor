export function createBeatAnalysisGate() {
	let busy = false;

	return {
		run<T>(job: () => Promise<T>): Promise<T> {
			if (busy) {
				throw new Error("Beat analysis already in progress");
			}
			busy = true;
			return job().finally(() => {
				busy = false;
			});
		},
	};
}
