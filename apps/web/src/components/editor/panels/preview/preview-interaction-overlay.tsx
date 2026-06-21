import { useEffect, useState } from "react";
import { usePreviewViewport } from "@/components/editor/panels/preview/preview-viewport";
import { usePreviewInteraction } from "@/hooks/use-preview-interaction";
import { useFreehandDraw } from "@/hooks/use-freehand-draw";
import { useVectorDraw } from "@/hooks/use-vector-draw";
import { useToolModeStore } from "@/stores/tool-mode-store";
import type { SnapLine } from "@/lib/preview/preview-snap";
import { TransformHandles } from "./transform-handles";
import { MaskHandles } from "./mask-handles";
import { SnapGuides } from "./snap-guides";
import { TextEditOverlay } from "./text-edit-overlay";
import { FreehandDrawOverlay } from "./freehand-draw-overlay";
import { VectorDrawOverlay } from "./vector-draw-overlay";

import { usePropertiesStore } from "../properties/stores/properties-store";
import { useEditor } from "@/hooks/use-editor";
import type { Point } from "@/lib/graphics/path-utils";
import { DEFAULT_GRAPHIC_SOURCE_SIZE } from "@/lib/graphics";
import { canvasLogicalToGraphicSource } from "@/lib/preview/preview-coords";

export function PreviewInteractionOverlay() {
	const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
	const editor = useEditor();
	const viewport = usePreviewViewport();
	const selectedElements = useEditor((e) => e.selection.getSelectedElements());
	const activeTabPerType = usePropertiesStore((s) => s.activeTabPerType);
	const toolMode = useToolModeStore((s) => s.toolMode);
	const drawConfig = useToolModeStore((s) => s.drawConfig);
	const [vectorCursor, setVectorCursor] = useState<Point | null>(null);

	const selectedRef =
		selectedElements.length === 1 ? selectedElements[0] : null;
	const activeTrack = selectedRef
		? editor.timeline.getTrackById({ trackId: selectedRef.trackId })
		: null;
	const activeElement =
		activeTrack?.elements.find(
			(element) => element.id === selectedRef?.elementId,
		) ?? null;
	const isMaskMode = activeElement
		? activeTabPerType[activeElement.type] === "masks"
		: false;

	const selectInteraction = usePreviewInteraction({
		onSnapLinesChange: setSnapLines,
		isMaskMode,
	});

	const drawInteraction = useFreehandDraw();
	const vectorInteraction = useVectorDraw();

	const isDrawMode = toolMode === "draw";
	const isVectorMode = toolMode === "vector";
	const isDrawing = isDrawMode && drawInteraction.isDrawing;
	void vectorInteraction.isOpen;

	// Hook up the vector tool's keyboard shortcuts while it's active.
	useEffect(() => {
		if (!isVectorMode) return;
		const handler = (event: KeyboardEvent) => {
			vectorInteraction.handleKeyDown(event);
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [isVectorMode, vectorInteraction]);

	const handlePointerDown = (event: React.PointerEvent) => {
		if (viewport.handlePanPointerDown({ event })) return;

		if (isVectorMode) {
			vectorInteraction.handlePointerDown(event);
			const point = screenToSourcePoint({ event, viewport });
			setVectorCursor(point);
			return;
		}

		if (isDrawMode) {
			drawInteraction.handlePointerDown(event);
		} else {
			selectInteraction.onPointerDown(event);
		}
	};

	const handlePointerMove = (event: React.PointerEvent) => {
		if (viewport.handlePanPointerMove({ event })) return;

		if (isVectorMode) {
			vectorInteraction.handlePointerMove(event);
			const point = screenToSourcePoint({ event, viewport });
			setVectorCursor(point);
			return;
		}

		if (isDrawMode) {
			drawInteraction.handlePointerMove(event);
		} else {
			selectInteraction.onPointerMove(event);
		}
	};

	const handlePointerUp = (event: React.PointerEvent) => {
		if (viewport.handlePanPointerUp({ event })) return;

		if (isVectorMode) {
			return;
		}

		if (isDrawMode) {
			drawInteraction.handlePointerUp(event);
		} else {
			selectInteraction.onPointerUp(event);
		}
	};

	const onDoubleClick = (event: React.MouseEvent) => {
		if (isVectorMode) {
			vectorInteraction.handleDoubleClick(event);
			setVectorCursor(null);
			return;
		}
		if (isDrawMode) return;
		selectInteraction.onDoubleClick(event);
	};

	return (
		<div className="absolute inset-0">
			<div
				className="absolute inset-0 pointer-events-auto"
				role="application"
				aria-label="Preview canvas"
				style={{
					cursor: viewport.isPanning
						? "grabbing"
						: viewport.canPan
							? "default"
							: isDrawMode || isVectorMode
								? "crosshair"
								: undefined,
				}}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerCancel={handlePointerUp}
				onDoubleClick={onDoubleClick}
				onDragStart={(e) => e.preventDefault()}
			/>
			{selectInteraction.editingText ? (
				<TextEditOverlay
					trackId={selectInteraction.editingText.trackId}
					elementId={selectInteraction.editingText.elementId}
					element={selectInteraction.editingText.element}
					onCommit={selectInteraction.commitTextEdit}
				/>
			) : isDrawMode ? (
				drawInteraction.currentPath && (
					<FreehandDrawOverlay
						points={drawInteraction.currentPath}
						stroke={drawConfig.stroke}
						strokeWidth={drawConfig.strokeWidth}
						opacity={drawConfig.opacity}
					/>
				)
			) : isVectorMode ? (
				<VectorDrawOverlay
					anchors={vectorInteraction.anchors}
					cursor={vectorCursor}
					stroke={drawConfig.stroke}
					strokeWidth={drawConfig.strokeWidth}
					opacity={drawConfig.opacity}
				/>
			) : isMaskMode ? (
				<MaskHandles onSnapLinesChange={setSnapLines} />
			) : (
				<TransformHandles onSnapLinesChange={setSnapLines} />
			)}
			{!isDrawing && <SnapGuides lines={snapLines} />}
		</div>
	);
}

function screenToSourcePoint({
	event,
	viewport,
}: {
	event: React.PointerEvent;
	viewport: ReturnType<typeof usePreviewViewport>;
}): Point | null {
	const canvas = viewport.screenToCanvas({
		clientX: event.clientX,
		clientY: event.clientY,
	});
	if (!canvas) return null;
	const scale = viewport.getDisplayScale();
	const w = scale.x > 0 ? viewport.sceneWidth / scale.x : 0;
	const h = scale.y > 0 ? viewport.sceneHeight / scale.y : 0;
	if (w <= 0 || h <= 0) return null;
	return canvasLogicalToGraphicSource({
		canvasX: canvas.x,
		canvasY: canvas.y,
		canvasWidth: w,
		canvasHeight: h,
		sourceSize: DEFAULT_GRAPHIC_SOURCE_SIZE,
	});
}
