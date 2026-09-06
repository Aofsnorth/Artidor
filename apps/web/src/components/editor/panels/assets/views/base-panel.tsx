import { cn } from "@/utils/ui";

interface PanelViewProps extends React.HTMLAttributes<HTMLDivElement> {
	title?: string;
	actions?: React.ReactNode;
	children: React.ReactNode;
	contentClassName?: string;
	scrollClassName?: string;
	hideHeader?: boolean;
	ref?: React.Ref<HTMLDivElement>;
	onScroll?: React.UIEventHandler<HTMLDivElement>;
	scrollRef?: React.Ref<HTMLDivElement>;
}

/** Shared asset chrome with a fixed header and discoverable scrolling content. */
export function PanelView({
	title,
	actions,
	children,
	className,
	contentClassName,
	scrollClassName,
	hideHeader = false,
	ref,
	onScroll,
	scrollRef,
	...rest
}: PanelViewProps) {
	return (
		<div
			className={cn("relative flex h-full min-w-0 flex-col", className)}
			ref={ref}
			{...rest}
		>
			{!hideHeader && (
				<div className="h-11 shrink-0 gap-2 px-3 flex items-center justify-between border-b border-border bg-transparent">
					{title && (
						<span className="min-w-0 truncate text-foreground text-xs font-semibold">{title}</span>
					)}
					{actions}
				</div>
			)}
			<div
				className={cn(
					"scrollbar-thin flex-1 min-h-0 min-w-0 w-full overflow-y-auto flex flex-col",
					hideHeader ? "pt-4" : "pt-2",
					scrollClassName,
				)}
				ref={scrollRef}
				onScroll={onScroll}
			>
				<div
					className={cn(
						"w-full min-w-0 flex-1 flex flex-col px-3 pt-0",
						contentClassName,
					)}
				>
					{children}
				</div>
			</div>
		</div>
	);
}
