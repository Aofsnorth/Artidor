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
import { useAIStore } from "@/stores/ai-store";
import { AI_FEATURE_ENABLED } from "@/lib/ai/config";
import {
	isFeatureDisabled,
	useFeatureFlagsStore,
} from "@/stores/feature-flags-store";

export function TabBar() {
	const { activeTab, setActiveTab } = useAssetsPanelStore();
	const aiStatus = useAIStore((s) => s.status);
	const enabledFlags = useFeatureFlagsStore((s) => s.enabled);
	// Hide tabs the user has disabled via the feature-flags (modularity).
	const visibleTabKeys = VISIBLE_TAB_KEYS.filter(
		(tabKey) => !isFeatureDisabled(tabKey, enabledFlags),
	);

	return (
		<div className="panel glass-strong relative flex h-full w-[4.5rem] shrink-0 flex-col overflow-hidden rounded-xl border border-white/10">
			{/* Navigation Tabs. Each tab grows to fill the available
		   vertical space (1fr) so the column always reaches the
		   storage card below, regardless of the panel height. The
		   grid layout replaces a fixed-height list so a short editor
		   and a tall editor both produce a clean distribution.

		   Sized tight: 13 visible tabs (incl. the new AI Edit) need
		   to fit without scrolling on a ~600px tall editor. With
		   auto-rows-fr + min-h-[1.95rem] (~31px) each, the tabs use
		   ~25.4rem of vertical space and leave the rest for the
		   storage card and any padding. */}
			<div className="relative grid min-h-0 flex-1 auto-rows-fr content-start gap-[2px] overflow-y-auto scrollbar-hidden px-1.5 py-2 z-20">
				{visibleTabKeys.map((tabKey) => {
					const tab = tabs[tabKey];
					const isAI = tabKey === "ai";
					// AI is feature-flagged off: keep the tab visible (so the tool
					// doesn't vanish) but render it inert — dimmed, non-selectable,
					// and labelled "coming soon". The /api/ai/chat route is 404 too.
					const aiDisabled = isAI && !AI_FEATURE_ENABLED;
					return (
						<Tooltip key={tabKey} delayDuration={10}>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									aria-label={tab.label}
									aria-disabled={aiDisabled || undefined}
									className={cn(
										"relative h-full w-full flex-col items-center justify-center gap-0.5 rounded-lg border border-transparent px-1 py-1 min-h-[1.95rem]",
										activeTab === tabKey
											? "border-white/12 bg-white/[0.14] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.05)_inset,0_8px_22px_rgba(0,0,0,0.55)]"
											: "text-white/[0.55] hover:bg-white/[0.06] hover:text-white",
										aiDisabled &&
											"opacity-40 cursor-not-allowed hover:bg-transparent hover:text-white/[0.55]",
									)}
									onClick={() => {
										if (aiDisabled) return;
										setActiveTab(tabKey);
									}}
								>
									<tab.icon className="size-[1.15rem]" />
									<span className="text-[0.55rem] leading-none tracking-[0.02em]">
										{tab.label}
									</span>
									{isAI && !aiDisabled && aiStatus === "streaming" && (
										<span
											role="status"
											aria-label="AI is processing"
											className="absolute right-1 top-1 size-1.5 animate-pulse rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]"
										/>
									)}
									{isAI && !aiDisabled && aiStatus === "awaiting-tools" && (
										<span
											role="status"
											aria-label="AI is executing"
											className="absolute right-1 top-1 size-1.5 animate-pulse rounded-full bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.8)]"
										/>
									)}
								</Button>
							</TooltipTrigger>
							<TooltipContent
								side="right"
								align="center"
								variant="sidebar"
								sideOffset={8}
							>
								<div className="text-foreground text-sm leading-none font-medium">
									{aiDisabled ? `${tab.label} · Coming soon` : tab.label}
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

function StorageCard() {
	const storage = useStorageEstimate();

	const freeLabel = storage ? formatStorageSize(storage.freeBytes) : "—";
	const usedPercent =
		storage && storage.totalBytes > 0
			? Math.min(
					100,
					Math.max(2, (storage.usedBytes / storage.totalBytes) * 100),
				)
			: 0;

	return (
		<div
			className="m-1.5 mt-2 rounded-xl border border-white/10 bg-[#121213]/90 px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] z-20"
			title={
				storage
					? `${formatStorageSize(storage.usedBytes)} used of ${formatStorageSize(storage.totalBytes)} available`
					: "Storage information unavailable"
			}
		>
			<div className="text-center text-[0.7rem] font-bold tracking-[-0.01em] text-white/90">
				{freeLabel}
			</div>
			<div className="mt-0.5 text-center text-[0.58rem] tracking-wide text-white/40 font-semibold uppercase">
				Free
			</div>
			<div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
				<div
					className="h-full rounded-full bg-white/85 transition-all duration-700"
					style={{ width: `${usedPercent}%` }}
				/>
			</div>
		</div>
	);
}
