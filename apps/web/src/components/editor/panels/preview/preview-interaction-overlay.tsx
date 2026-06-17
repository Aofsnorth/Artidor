import { useState } from "react";
import { usePreviewViewport } from "@/components/editor/panels/preview/preview-viewport";
import { usePreviewInteraction } from "@/hooks/use-preview-interaction";
import { useFreehandDraw } from "@/hooks/use-freehand-draw";
import { useToolModeStore } from "@/stores/tool-mode-store";
import type { SnapLine } from "@/lib/preview/preview-snap";
import { TransformHandles } from "./transform-handles";
import { MaskHandles } from "./mask-handles";
import { SnapGuides } from "./snap-guides";
import { TextEditOverlay } from "./text-edit-overlay";
import { FreehandDrawOverlay } from "./freehand-draw-overlay";
import { usePropertiesStore } from "../properties/stores/properties-store";
import { useEditor } from "@/hooks/use-editor";

export function PreviewInteractionOverlay() {
	const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
	const editor = useEditor();
	const viewport = usePreviewViewport();
	const selectedElements = useEditor((e) => e.selection.getSelectedElements());
	const activeTabPerType = usePropertiesStore((s) => s.activeTabPerType);
	const toolMode = useToolModeStore((s) => s.toolMode);

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

	const isDrawMode = toolMode === "draw";
	const isDrawing = isDrawMode && drawInteraction.isDrawing;

	const handlePointerDown = (event: React.PointerEvent) => {
		if (viewport.handlePanPointerDown({ event })) return;

		if (isDrawMode) {
			drawInteraction.handlePointerDown(event);
		} else {
			selectInteraction.onPointerDown(event);
		}
	};

	const handlePointerMove = (event: React.PointerEvent) => {
		if (viewport.handlePanPointerMove({ event })) return;

		if (isDrawMode) {
			drawInteraction.handlePointerMove(event);
		} else {
			selectInteraction.onPointerMove(event);
		}
	};

	const handlePointerUp = (event: React.PointerEvent) => {
		if (viewport.handlePanPointerUp({ event })) return;

		if (isDrawMode) {
			drawInteraction.handlePointerUp(event);
		} else {
			selectInteraction.onPointerUp(event);
		}
	};

	const onDoubleClick = (event: React.MouseEvent) => {
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
							: isDrawMode
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
					<FreehandDrawOverlay points={drawInteraction.currentPath} />
				)
			) : isMaskMode ? (
				<MaskHandles onSnapLinesChange={setSnapLines} />
			) : (
				<TransformHandles onSnapLinesChange={setSnapLines} />
			)}
			{!isDrawing && <SnapGuides lines={snapLines} />}
		</div>
	);
}
