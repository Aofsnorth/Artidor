/**
 * Reject a promise if it does not settle within `timeoutMs`. Used by the
 * share page so a hung network request cannot leave the viewer spinning
 * forever. The underlying request is not cancelled, but the UI is released
 * and can offer a retry.
 */
export class TimeoutError extends Error {
	constructor(message = "Operation timed out") {
		super(message);
		this.name = "TimeoutError";
	}
}

export function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new TimeoutError());
		}, timeoutMs);

		promise.then(
			(value) => {
				clearTimeout(timer);
				resolve(value);
			},
			(error: unknown) => {
				clearTimeout(timer);
				reject(error);
			},
		);
	});
}
