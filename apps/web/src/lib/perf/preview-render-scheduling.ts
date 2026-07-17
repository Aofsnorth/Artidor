export function shouldQueuePreviewRender<Scene>({
	activeFrame,
	requestedFrame,
	activeScene,
	requestedScene,
	activeScaleInputs,
	requestedScaleInputs,
}: {
	activeFrame: number;
	requestedFrame: number;
	activeScene: Scene | null;
	requestedScene: Scene;
	activeScaleInputs: string;
	requestedScaleInputs: string;
}): boolean {
	return (
		requestedFrame !== activeFrame ||
		requestedScene !== activeScene ||
		requestedScaleInputs !== activeScaleInputs
	);
}
