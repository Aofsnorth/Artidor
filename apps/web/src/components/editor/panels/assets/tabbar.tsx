"use client";

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/ui";
import {
	VISIBLE_TAB_KEYS,
	tabs,
	useAssetsPanelStore,
} from "@/stores/assets-panel-store";
import {
	formatStorageSize,
	useStorageEstimate,
} from "@/hooks/use-storage-estimate";

export function TabBar() {
	const { activeTab, setActiveTab } = useAssetsPanelStore();

	return (
		<div className="panel glass-strong relative flex h-full w-[4.8rem] shrink-0 flex-col overflow-hidden rounded-xl border border-white/10">
			{/* Navigation Tabs. Each tab grows to fill the available
			   vertical space (1fr) so the column always reaches the
			   storage card below, regardless of the panel height. The
			   grid layout replaces a fixed-height list so a short editor
			   and a tall editor both produce a clean distribution. */}
			<div className="relative grid min-h-0 flex-1 auto-rows-fr content-start gap-[3px] overflow-y-auto scrollbar-hidden px-2 py-3.5 z-20">
				{VISIBLE_TAB_KEYS.map((tabKey) => {
					const tab = tabs[tabKey];
					return (
						<Tooltip key={tabKey} delayDuration={10}>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									aria-label={tab.label}
									className={cn(
										// Stretch each cell so the row fills the
										// full tab-bar height. The icon + label
										// remain vertically centered via
										// `items-center justify-center`.
										"h-full w-full flex-col items-center justify-center gap-1 rounded-lg border border-transparent px-1 py-1 min-h-[2.4rem]",
										activeTab === tabKey
											? "border-white/12 bg-white/[0.14] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.05)_inset,0_8px_22px_rgba(0,0,0,0.55)]"
											: "text-white/[0.55] hover:bg-white/[0.06] hover:text-white",
									)}
									onClick={() => setActiveTab(tabKey)}
								>
									<tab.icon className="size-[1.25rem]" />
									<span className="text-[0.6rem] leading-none tracking-[0.02em]">
										{tab.label}
									</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent
								side="right"
								align="center"
								variant="sidebar"
								sideOffset={8}
							>
								<div className="text-foreground text-sm leading-none font-medium">
									{tab.label}
								</div>
							</TooltipContent>
						</Tooltip>
					);
				})}
			</div>

			<StorageCard />
		</div>
	);
}

// Inline-safe store hook so this file doesn't have to import the
// assets-panel-store directly (kept lightweight to avoid pulling the
// store into the bundle when the bar renders standalone).
function StorageCard() {
	const storage = useStorageEstimate();

	const freeLabel = storage ? formatStorageSize(storage.freeBytes) : "482 GB";
	const usedPercent =
		storage && storage.totalBytes > 0
			? Math.min(
					100,
					Math.max(2, (storage.usedBytes / storage.totalBytes) * 100),
				)
			: 30;

	return (
		<div
			className="m-2 mt-2.5 rounded-xl border border-white/10 bg-[#121213]/90 px-2.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] z-20"
			title={
				storage
					? `${formatStorageSize(storage.usedBytes)} used of ${formatStorageSize(storage.totalBytes)} available`
					: "Storage information unavailable"
			}
		>
			<div className="text-center text-[0.75rem] font-bold tracking-[-0.01em] text-white/90">
				{freeLabel}
			</div>
			<div className="mt-0.5 text-center text-[0.62rem] tracking-wide text-white/40 font-semibold uppercase">
				Free
			</div>
			<div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.07]">
				<div
					className="h-full rounded-full bg-white/85 transition-all duration-700"
					style={{ width: `${usedPercent}%` }}
				/>
			</div>
		</div>
	);
}
