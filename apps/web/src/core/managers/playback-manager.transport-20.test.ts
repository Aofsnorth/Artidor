import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import type { EditorCore } from "@/core";
import * as wasm from "artidor-wasm";
mock.module("artidor-wasm", () => ({
	...wasm,
	roundToFrame: ({ time, rate }: { time: number; rate: { numerator: number; denominator: number } }) => {
		const frame = 120_000 * rate.denominator / rate.numerator;
		return Math.round(time / frame) * frame;
	},
}));
const { PlaybackManager } = await import("./playback-manager");
const descriptors = new Map(["window", "requestAnimationFrame", "cancelAnimationFrame"].map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
const nowDescriptor = Object.getOwnPropertyDescriptor(performance, "now");
let now = 0;
let nextId = 0;
const frames = new Map<number, FrameRequestCallback>();
let events: EventTarget;
beforeEach(() => {
	now = 0; nextId = 0; frames.clear(); events = new EventTarget();
	Object.defineProperty(globalThis, "window", { configurable: true, value: events });
	Object.defineProperty(globalThis, "requestAnimationFrame", { configurable: true, value: (callback: FrameRequestCallback) => { const id = nextId++; frames.set(id, callback); return id; } });
	Object.defineProperty(globalThis, "cancelAnimationFrame", { configurable: true, value: (id: number) => frames.delete(id) });
	Object.defineProperty(performance, "now", { configurable: true, value: () => now });
});
afterEach(() => {
	for (const [name, descriptor] of descriptors) {
		if (descriptor) Object.defineProperty(globalThis, name, descriptor);
		else Reflect.deleteProperty(globalThis, name);
	}
	if (nowDescriptor) Object.defineProperty(performance, "now", nowDescriptor);
	else Reflect.deleteProperty(performance, "now");
});
function fixture() {
	const editor = {
		timeline: { getTotalDuration: () => 240_000 },
		project: { getActive: () => ({ settings: { fps: { numerator: 30, denominator: 1 } } }) },
	} as unknown as EditorCore;
	return new PlaybackManager(editor);
}
function advance(ms: number) {
	now += ms; const callbacks = [...frames.values()]; frames.clear();
	for (const callback of callbacks) callback(now);
}

test("R04 loop survives a delayed frame without pausing", () => {
	const manager = fixture(); const seeks: number[] = [];
	events.addEventListener("playback-seek", (event) => seeks.push((event as CustomEvent<{ time: number }>).detail.time));
	manager.setLoopMode({ loop: true }); manager.play(); advance(2_500);
	expect(manager.getIsPlaying()).toBe(true);
	expect(manager.getCurrentTime()).toBe(0);
	expect(seeks).toEqual([0]);
	advance(100);
	expect(manager.getCurrentTime()).toBe(12_000);
	manager.pause();
});

test("R05 non-loop stops at the exact end", () => {
	const manager = fixture(); const states: number[] = [];
	manager.subscribe(() => { if (!manager.getIsPlaying()) states.push(manager.getCurrentTime()); });
	manager.play(); advance(2_500);
	expect(manager.getIsPlaying()).toBe(false);
	expect(states).toEqual([240_000]);
	expect(frames.size).toBe(0);
});

test("R16 RAF zero cancels; loop subscriber can pause without an orphan frame", () => {
	const manager = fixture(); manager.play();
	expect(frames.has(0)).toBe(true);
	manager.pause(); expect(frames.size).toBe(0);
	manager.setLoopMode({ loop: true }); manager.seek({ time: 120_000 }); manager.play();
	manager.subscribe(() => {
		if (manager.getIsPlaying() && manager.getCurrentTime() === 0) manager.pause();
	});
	advance(2_500);
	expect(manager.getIsPlaying()).toBe(false);
	expect(frames.size).toBe(0);
});
