"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
	BoxSelectionSnapshot,
	ResolveIntersections,
} from "@/lib/selection/types";

interface SelectionBoxState<TId> extends BoxSelectionSnapshot<TId> {
	startPos: { x: number; y: number };
	currentPos: { x: number; y: number };
	isActive: boolean;
	isAdditive: boolean;
}

export function useBoxSelect<TId>({
	containerRef,
	resolveIntersections,
	selectedIds,
	anchorId,
	onSelectionChange,
	shouldStartSelection,
	getIsAdditiveSelection,
	isEnabled = true,
}: {
	containerRef: React.RefObject<HTMLElement | null>;
	resolveIntersections: ResolveIntersections<TId>;
	selectedIds: TId[];
	anchorId: TId | null;
	onSelectionChange: (state: {
		intersectedIds: TId[];
		initialSelectedIds: TId[];
		initialAnchorId: TId | null;
		isAdditive: boolean;
	}) => void;
	shouldStartSelection?: (event: React.MouseEvent<Element>) => boolean;
	getIsAdditiveSelection?: (event: React.MouseEvent<Element>) => boolean;
	isEnabled?: boolean;
}) {
	const [selectionBox, setSelectionBox] =
		useState<SelectionBoxState<TId> | null>(null);
	// Mirror of `selectionBox` for the window listeners. The listeners are
	// mounted once (see the rAF effect below) instead of re-binding on every
	// mousemove, so they read the live box from here rather than closing over
	// the state value.
	const selectionBoxRef = useRef<SelectionBoxState<TId> | null>(null);
	const justFinishedSelectingRef = useRef(false);
	const shouldStartSelectionCheck = shouldStartSelection ?? (() => true);
	const getIsAdditiveSelectionCheck =
		getIsAdditiveSelection ??
		((event: React.MouseEvent<Element>) => event.ctrlKey || event.metaKey);

	const handleMouseDown = useCallback(
		(event: React.MouseEvent<Element>) => {
			const canStartSelection = shouldStartSelectionCheck(event);
			if (!isEnabled || event.button !== 0 || !canStartSelection) {
				return;
			}

			const nextSelectionBox: SelectionBoxState<TId> = {
				startPos: { x: event.clientX, y: event.clientY },
				currentPos: { x: event.clientX, y: event.clientY },
				isActive: false,
				isAdditive: getIsAdditiveSelectionCheck(event),
				initialSelectedIds: selectedIds,
				initialAnchorId: anchorId,
			};
			selectionBoxRef.current = nextSelectionBox;
			setSelectionBox(nextSelectionBox);
		},
		[
			anchorId,
			getIsAdditiveSelectionCheck,
			isEnabled,
			selectedIds,
			shouldStartSelectionCheck,
		],
	);

	const updateSelection = useCallback(
		({
			startPos,
			currentPos,
			isAdditive,
			initialSelectedIds,
			initialAnchorId,
		}: SelectionBoxState<TId>) => {
			const intersectedIds = resolveIntersections({
				startPos,
				currentPos,
			});
			onSelectionChange({
				intersectedIds,
				initialSelectedIds,
				initialAnchorId,
				isAdditive,
			});
		},
		[onSelectionChange, resolveIntersections],
	);

	// Latest `updateSelection`, read by the rAF flush. Identity changes
	// whenever the consumer passes new callbacks, which must not force the
	// window listeners to re-bind.
	const updateSelectionRef = useRef(updateSelection);
	updateSelectionRef.current = updateSelection;

	// Mousemove is coalesced to one `setSelectionBox` + one
	// `resolveIntersections()` scan per animation frame. Browsers can fire
	// mousemove well above 60Hz, and each call scanned every candidate box
	// and published a selection change.
	const pendingMoveRef = useRef<{ clientX: number; clientY: number } | null>(
		null,
	);
	const moveFrameRef = useRef<number | null>(null);

	const flushPendingMove = useCallback(() => {
		moveFrameRef.current = null;
		const pending = pendingMoveRef.current;
		pendingMoveRef.current = null;
		const current = selectionBoxRef.current;
		if (!pending || !current) return;

		const deltaX = Math.abs(pending.clientX - current.startPos.x);
		const deltaY = Math.abs(pending.clientY - current.startPos.y);
		const nextSelectionBox: SelectionBoxState<TId> = {
			...current,
			currentPos: { x: pending.clientX, y: pending.clientY },
			isActive: deltaX > 5 || deltaY > 5 || current.isActive,
		};
		selectionBoxRef.current = nextSelectionBox;
		setSelectionBox(nextSelectionBox);

		if (!nextSelectionBox.isActive) {
			return;
		}

		updateSelectionRef.current(nextSelectionBox);
	}, []);

	useEffect(() => {
		const handleMouseMove = ({ clientX, clientY }: MouseEvent) => {
			pendingMoveRef.current = { clientX, clientY };
			if (moveFrameRef.current !== null) return;
			moveFrameRef.current = requestAnimationFrame(flushPendingMove);
		};

		const handleMouseUp = () => {
			// Apply the final pointer position synchronously so the released
			// selection is exact even if the last mousemove frame has not run.
			if (moveFrameRef.current !== null) {
				cancelAnimationFrame(moveFrameRef.current);
				moveFrameRef.current = null;
			}
			flushPendingMove();

			if (selectionBoxRef.current?.isActive) {
				justFinishedSelectingRef.current = true;
				requestAnimationFrame(() => {
					justFinishedSelectingRef.current = false;
				});
			}

			selectionBoxRef.current = null;
			setSelectionBox(null);
		};

		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
			if (moveFrameRef.current !== null) {
				cancelAnimationFrame(moveFrameRef.current);
				moveFrameRef.current = null;
			}
			pendingMoveRef.current = null;
		};
	}, [flushPendingMove]);

	const isBoxSelectActive = selectionBox !== null;
	useEffect(() => {
		if (!isBoxSelectActive) {
			return;
		}

		const previousBodyUserSelect = document.body.style.userSelect;
		const previousContainerUserSelect =
			containerRef.current?.style.userSelect ?? "";

		document.body.style.userSelect = "none";
		if (containerRef.current) {
			containerRef.current.style.userSelect = "none";
		}

		return () => {
			document.body.style.userSelect = previousBodyUserSelect;
			if (containerRef.current) {
				containerRef.current.style.userSelect = previousContainerUserSelect;
			}
		};
	}, [containerRef, isBoxSelectActive]);

	const shouldIgnoreClick = useCallback(() => {
		return justFinishedSelectingRef.current;
	}, []);

	return {
		selectionBox,
		handleMouseDown,
		isSelecting: selectionBox?.isActive ?? false,
		shouldIgnoreClick,
	};
}
