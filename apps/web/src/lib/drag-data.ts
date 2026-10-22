import type { TimelineDragData } from "@/lib/timeline/drag";

const MIME_TYPE = "application/x-timeline-drag";
let lastDragData: TimelineDragData | null = null;

export function setDragData({
	dataTransfer,
	dragData,
}: {
	dataTransfer: DataTransfer;
	dragData: TimelineDragData;
}): void {
	dataTransfer.setData(MIME_TYPE, JSON.stringify(dragData));
	dataTransfer.setData("text/plain", JSON.stringify(dragData));
	lastDragData = dragData;
}

export function getDragData({
	dataTransfer,
}: {
	dataTransfer: DataTransfer;
}): TimelineDragData | null {
	const data = dataTransfer.getData(MIME_TYPE);
	if (data) {
		try {
			return JSON.parse(data) as TimelineDragData;
		} catch {
			// A drag payload can come from another app or a stale build; never
			// let a malformed payload escape as an exception. Try the plain-text
			// fallback below, then the last in-memory payload.
		}
	}

	const textData = dataTransfer.getData("text/plain");
	if (textData) {
		try {
			return JSON.parse(textData) as TimelineDragData;
		} catch {
			return lastDragData;
		}
	}

	return lastDragData;
}

export function hasDragData({
	dataTransfer,
}: {
	dataTransfer: DataTransfer;
}): boolean {
	return dataTransfer.types.includes(MIME_TYPE) || lastDragData !== null;
}

export function clearDragData(): void {
	lastDragData = null;
}
