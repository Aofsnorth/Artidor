"use client";

import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "@/utils/ui";

const ResizablePanelGroup = ({
	className,
	...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
	<ResizablePrimitive.PanelGroup
		className={cn(
			"flex size-full data-[panel-group-direction=vertical]:flex-col",
			className,
		)}
		{...props}
	/>
);

const ResizablePanel = ResizablePrimitive.Panel;

const ResizableHandle = ({
	withHandle,
	className,
	...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
	withHandle?: boolean;
}) => (
	<ResizablePrimitive.PanelResizeHandle
		className={cn(
			"group relative flex w-1 items-center justify-center bg-transparent",
			"data-[panel-group-direction=vertical]:h-1 data-[panel-group-direction=vertical]:w-full",
			className,
		)}
		{...props}
	>
		{/* Intentionally no visible strip or grip — the user discovers
		   the handle via the cursor change (resize cursor on hover)
		   and the visible divider line. Keeps the editor chrome
		   minimal without sacrificing drag discoverability. */}
	</ResizablePrimitive.PanelResizeHandle>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
