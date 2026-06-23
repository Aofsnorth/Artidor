"use client";

import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "@/utils/ui";

/**
 * Wrapper around react-resizable-panels v4 `Group` component.
 *
 * Accepts a `direction` prop ("horizontal" | "vertical") for convenience
 * and maps it to v4's `orientation` prop. Also sets a
 * `data-panel-group-direction` attribute for CSS selectors.
 */
const ResizablePanelGroup = ({
	className,
	direction,
	...props
}: React.ComponentProps<typeof ResizablePrimitive.Group> & { direction?: "horizontal" | "vertical" }) => (
	<ResizablePrimitive.Group
		orientation={direction}
		className={cn(
			"group flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
			className,
		)}
		data-panel-group-direction={direction}
		{...props}
	/>
);

const ResizablePanel = ResizablePrimitive.Panel;

/**
 * Wrapper around react-resizable-panels v4 `Separator` component.
 *
 * In v4, the `Separator` component replaces the old `PanelResizeHandle`.
 * The `withHandle` prop is preserved for API compat but is unused by v4.
 * Sizing/cursor CSS uses `aria-[orientation=…]` selectors that match
 * the WAI-ARIA attributes v4 renders on the separator element.
 */
const ResizableHandle = ({
	withHandle,
	className,
	...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator> & {
	withHandle?: boolean;
}) => (
	<ResizablePrimitive.Separator
		className={cn(
			"relative flex focus-visible:outline-none transition-all z-50",
			// When separator is vertical (divides columns, group is horizontal)
			"aria-[orientation=vertical]:w-0 aria-[orientation=vertical]:h-full aria-[orientation=vertical]:cursor-col-resize aria-[orientation=vertical]:after:absolute aria-[orientation=vertical]:after:inset-y-0 aria-[orientation=vertical]:after:left-1/2 aria-[orientation=vertical]:after:w-2.5 aria-[orientation=vertical]:after:-translate-x-1/2 aria-[orientation=vertical]:after:content-['']",
			// When separator is horizontal (divides rows, group is vertical)
			"aria-[orientation=horizontal]:h-0 aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:cursor-row-resize aria-[orientation=horizontal]:after:absolute aria-[orientation=horizontal]:after:inset-x-0 aria-[orientation=horizontal]:after:top-1/2 aria-[orientation=horizontal]:after:h-2.5 aria-[orientation=horizontal]:after:-translate-y-1/2 aria-[orientation=horizontal]:after:content-['']",
			className,
		)}
		{...props}
	/>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
export type { PanelImperativeHandle as ImperativePanelHandle } from "react-resizable-panels";
