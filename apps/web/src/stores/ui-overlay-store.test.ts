import { afterEach, beforeEach, expect, test } from "bun:test";
import { useUiOverlayStore } from "./ui-overlay-store";

beforeEach(() => {
	useUiOverlayStore.setState(useUiOverlayStore.getInitialState(), true);
});

afterEach(() => {
	useUiOverlayStore.setState(useUiOverlayStore.getInitialState(), true);
});

test("@fast side audio monitor defaults on in meter mode", () => {
	const state = useUiOverlayStore.getState();
	expect(state.isAudioVisualizerOpen).toBe(true);
	expect(state.audioMeterMode).toBe("meter");
	expect(state.isAdvancedViewersOpen).toBe(false);
});

test("@fast DIM/VIS switches the display without hiding the monitor", () => {
	useUiOverlayStore.getState().toggleAudioMeterMode();
	expect(useUiOverlayStore.getState().audioMeterMode).toBe("visualizer");
	expect(useUiOverlayStore.getState().isAudioVisualizerOpen).toBe(true);

	useUiOverlayStore.getState().toggleAudioMeterMode();
	expect(useUiOverlayStore.getState().audioMeterMode).toBe("meter");
	expect(useUiOverlayStore.getState().isAudioVisualizerOpen).toBe(true);
});

test("@fast toolbar visibility preserves the selected audio display", () => {
	useUiOverlayStore.getState().toggleAudioMeterMode();
	useUiOverlayStore.getState().toggleAudioVisualizer();
	expect(useUiOverlayStore.getState().isAudioVisualizerOpen).toBe(false);
	expect(useUiOverlayStore.getState().audioMeterMode).toBe("visualizer");

	useUiOverlayStore.getState().toggleAudioVisualizer();
	expect(useUiOverlayStore.getState().isAudioVisualizerOpen).toBe(true);
	expect(useUiOverlayStore.getState().audioMeterMode).toBe("visualizer");

	useUiOverlayStore.getState().setAudioVisualizerOpen(false);
	useUiOverlayStore.getState().setAudioVisualizerOpen(false);
	expect(useUiOverlayStore.getState().isAudioVisualizerOpen).toBe(false);
	expect(useUiOverlayStore.getState().audioMeterMode).toBe("visualizer");
});

test("@fast advanced viewers toggle and close independently of the audio monitor", () => {
	useUiOverlayStore.getState().toggleAdvancedViewers();
	expect(useUiOverlayStore.getState().isAdvancedViewersOpen).toBe(true);
	useUiOverlayStore.getState().toggleAdvancedViewers();
	expect(useUiOverlayStore.getState().isAdvancedViewersOpen).toBe(false);

	useUiOverlayStore.getState().setAdvancedViewersOpen(true);
	useUiOverlayStore.getState().setAdvancedViewersOpen(false);
	useUiOverlayStore.getState().setAdvancedViewersOpen(false);
	expect(useUiOverlayStore.getState().isAdvancedViewersOpen).toBe(false);
	expect(useUiOverlayStore.getState().isAudioVisualizerOpen).toBe(true);
	expect(useUiOverlayStore.getState().audioMeterMode).toBe("meter");
});
