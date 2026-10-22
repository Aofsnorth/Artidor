import { useState, useRef, useCallback, useEffect } from "react";
import { hasDragData } from "@/lib/drag-data";
import { isTauri } from "@/lib/tauri/detect";
import { importMediaNative } from "@/lib/tauri/media-bridge";

interface UseFileUploadOptions {
	accept?: string;
	multiple?: boolean;
	onFilesSelected?: (files: File[]) => void;
}

function containsFiles(dataTransfer: DataTransfer): boolean {
	return !hasDragData({ dataTransfer }) && dataTransfer.types.includes("Files");
}

export function useFileUpload({
	accept,
	multiple,
	onFilesSelected,
}: UseFileUploadOptions = {}) {
	const [isDragOver, setIsDragOver] = useState(false);
	const dragCounterRef = useRef(0);
	const justDroppedRef = useRef(false);
	const inputRef = useRef<HTMLInputElement>(null);

	// A drag that ends outside the drop target (or while the window loses
	// focus) never fires `dragleave` on it, which used to leave the overlay
	// stuck on. Reset on every terminal drag event as a safety net.
	useEffect(() => {
		const resetDragState = () => {
			dragCounterRef.current = 0;
			setIsDragOver(false);
		};

		window.addEventListener("dragend", resetDragState);
		window.addEventListener("drop", resetDragState);
		window.addEventListener("blur", resetDragState);
		return () => {
			window.removeEventListener("dragend", resetDragState);
			window.removeEventListener("drop", resetDragState);
			window.removeEventListener("blur", resetDragState);
		};
	}, []);

	const openFilePicker = useCallback(async () => {
		// Native file picker when in Tauri
		if (isTauri()) {
			const imports = await importMediaNative();
			if (imports && imports.length > 0 && onFilesSelected) {
				onFilesSelected(imports.map((imp) => imp.file));
			}
			return;
		}

		// Web fallback: use hidden <input type="file">
		if (!inputRef.current) return;
		inputRef.current.accept = accept || "*";
		inputRef.current.multiple = multiple || false;
		inputRef.current.click();
	}, [accept, multiple, onFilesSelected]);

	function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const files = Array.from(event.target.files ?? []);
		if (files.length > 0 && onFilesSelected) {
			onFilesSelected(files);
		}

		if (event.target) {
			event.target.value = "";
		}
	}

	function handleDragEnter(e: React.DragEvent) {
		e.preventDefault();

		if (!containsFiles(e.dataTransfer)) return;

		dragCounterRef.current += 1;
		setIsDragOver(true);
	}

	function handleDragOver(e: React.DragEvent) {
		e.preventDefault();

		if (!containsFiles(e.dataTransfer)) return;
	}

	function handleDragLeave(e: React.DragEvent) {
		e.preventDefault();

		if (!containsFiles(e.dataTransfer)) return;

		dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
		if (dragCounterRef.current === 0) {
			setIsDragOver(false);
		}
	}

	function handleDrop(e: React.DragEvent) {
		e.preventDefault();
		// Mark this as a real drop so the cancel-hint logic doesn't treat the
		// resulting isDragOver=false transition as a cancellation.
		justDroppedRef.current = true;
		setIsDragOver(false);
		dragCounterRef.current = 0;

		if (onFilesSelected && containsFiles(e.dataTransfer)) {
			const files = Array.from(e.dataTransfer.files);
			const shouldUseMultiple = multiple ?? false;

			if (shouldUseMultiple) {
				onFilesSelected(files);
			} else if (files.length > 0) {
				onFilesSelected([files[0]]);
			}
		}
	}

	return {
		isDragOver,
		justDroppedRef,
		openFilePicker,
		fileInputProps: {
			ref: inputRef,
			type: "file",
			style: { display: "none" },
			onChange: handleFileChange,
		},
		dragProps: {
			onDragEnter: handleDragEnter,
			onDragOver: handleDragOver,
			onDragLeave: handleDragLeave,
			onDrop: handleDrop,
		},
	};
}
