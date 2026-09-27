"use client";

import { forwardRef, memo, useCallback, useMemo } from "react";
import { useSelectionContext } from "@/lib/selection/context";
import { SELECTABLE_ITEM_ATTRIBUTE } from "@/lib/selection/attributes";
import type { SelectableItemProps } from "@/lib/selection/types";
import { cn } from "@/utils/ui";

function setForwardedRef<T>(ref: React.ForwardedRef<T>, value: T | null) {
	if (typeof ref === "function") {
		ref(value);
		return;
	}

	if (ref) {
		ref.current = value;
	}
}

const SelectableItemWithRef = forwardRef<
	HTMLDivElement,
	SelectableItemProps
>(function SelectableItem(
	{
		id,
		children,
		className,
		onClick,
		onKeyDown,
		onMouseDown,
		onContextMenu,
		tabIndex,
		...rest
	}: SelectableItemProps,
	forwardedRef,
) {
	// Only the two per-item booleans this card needs are read out of the
	// shared selection Context value: a `Set` lookup and an id compare. The
	// context still notifies every mounted item when the selection changes —
	// narrowing that to a per-item boolean needs a second provider in
	// `selectable-surface.tsx`.
	const {
		highlightedId,
		isBoxSelecting,
		isSelected,
		handleItemClick,
		handleItemMouseDown,
		registerItem,
	} = useSelectionContext();
	const isItemSelected = isSelected(id);
	const isItemHighlighted = highlightedId === id;

	// Memoized so a selection change (which re-renders this component
	// regardless, because context updates bypass `React.memo`) does not also
	// re-run the class-name concatenation and produce a new string identity.
	const stateClassName = useMemo(
		() =>
			cn(
				"relative",
				isBoxSelecting && "pointer-events-none",
				isItemSelected && "ring-1 ring-primary rounded-sm bg-primary/10",
				isItemHighlighted &&
					(isItemSelected
						? "rounded-sm shadow-[0_0_0_1px_hsl(var(--primary))]"
						: "ring-1 ring-primary/60 rounded-sm bg-primary/5"),
			),
		[isBoxSelecting, isItemHighlighted, isItemSelected],
	);

	const handleRef = useCallback(
		(element: HTMLDivElement | null) => {
			registerItem(id, element);
			setForwardedRef(forwardedRef, element);
		},
		[forwardedRef, id, registerItem],
	);

	return (
		<div
			ref={handleRef}
			className={cn(stateClassName, className)}
			{...{ [SELECTABLE_ITEM_ATTRIBUTE]: "true" }}
			role="option"
			aria-selected={isItemSelected}
			tabIndex={tabIndex ?? 0}
			onClick={(event) => {
				onClick?.(event);
				if (event.defaultPrevented) {
					return;
				}

				handleItemClick({ event, id });
			}}
			onMouseDown={(event) => {
				onMouseDown?.(event);
				if (event.defaultPrevented) {
					return;
				}

				handleItemMouseDown({ event, id });
			}}
			onKeyDown={(event) => {
				onKeyDown?.(event);
				if (event.defaultPrevented || event.target !== event.currentTarget) {
					return;
				}

				if (event.key !== "Enter" && event.key !== " ") {
					return;
				}

				event.preventDefault();
				handleItemClick({ event, id });
			}}
			onContextMenu={onContextMenu}
			{...rest}
		>
			{children}
		</div>
	);
});

/**
 * `React.memo` keeps a card out of the render pass when its parent
 * re-renders with unchanged props. Two limits are worth knowing:
 * the selection `Context` value changes identity on every selection change,
 * so a selection change still re-renders each mounted item (React context
 * updates bypass `memo`); and `children` is a fresh element on every parent
 * render, so a re-rendering parent also fails the shallow compare. Callers
 * that re-render often should memoize their own card component — that makes
 * this memo pay off.
 */
export const SelectableItem = memo(SelectableItemWithRef);
