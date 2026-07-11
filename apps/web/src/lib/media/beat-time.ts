import { TICKS_PER_SECOND } from "../wasm/ticks";

export function secondsToBeatTicks(seconds: number): number {
	return Math.round(seconds * TICKS_PER_SECOND);
}
