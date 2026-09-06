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
import { useEffect } from "react";
import { useAIStore } from "@/stores/ai-store";
import { AI_FEATURE_ENABLED } from "@/lib/ai/config";
import {
	isFeatureDisabled,
	useFeatureFlagsStore,
} from "@/stores/feature-flags-store";

/** Scrollable tool rail: labels stay readable instead of shrinking to fit. */
export function TabBar() {
	const { activeTab, setActiveTab } = useAssetsPanelStore();
	const aiStatus = useAIStore((s) => s.status);
	const enabledFlags = useFeatureFlagsStore((s) => s.enabled);
	// Hide tabs the user has disabled via the feature-flags (modularity).
	const visibleTabKeys = VISIBLE_TAB_KEYS.filter(
		(tabKey) => !isFeatureDisabled(tabKey, enabledFlags),
	);

	return (
		<div className="panel glass-strong relative flex h-full w-20 shrink-0 flex-col overflow-hidden rounded-xl border border-white/10">
			{/* Keep minimum target sizes; short workspaces scroll rather than compress labels. */}
			<div className="relative grid min-h-0 flex-1 auto-rows-[minmax(2.75rem,1fr)] content-start gap-1 overflow-y-auto scrollbar-thin px-1 py-2 z-20">
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
									aria-pressed={activeTab === tabKey}
									aria-disabled={aiDisabled || undefined}
									className={cn(
										"relative h-full w-full flex-col items-center justify-center gap-1 rounded-md border border-transparent px-1 py-1 min-h-11",
										activeTab === tabKey
											? "border-white/20 bg-white/10 text-white"
											: "text-muted-foreground hover:bg-white/6 hover:text-white",
										aiDisabled &&
											"opacity-40 cursor-not-allowed hover:bg-transparent hover:text-white/[0.55]",
									)}
									onClick={() => {
										if (aiDisabled) return;
										setActiveTab(tabKey);
									}}
								>
									<tab.icon className="size-[1.15rem]" />
									<span className="block max-w-full truncate text-[0.6875rem] leading-tight">
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

	useEffect(() => {
		const handleStorageChanged = () => storage.refresh();
		window.addEventListener("artidor:storage-changed", handleStorageChanged);
		return () =>
			window.removeEventListener(
				"artidor:storage-changed",
				handleStorageChanged,
			);
	}, [storage.refresh]);

	const usedLabel = storage ? formatStorageSize(storage.usedBytes) : "—";
	const totalLabel = storage ? formatStorageSize(storage.totalBytes) : "—";
	const freeLabel = storage ? formatStorageSize(storage.freeBytes) : "—";
	const usedPercent =
		storage && storage.totalBytes > 0
			? Math.min(
					100,
					Math.max(0, (storage.usedBytes / storage.totalBytes) * 100),
				)
			: 0;

	return (
		<div
			role="status"
			className="shrink-0 border-t border-border px-2 py-3 z-20"
			aria-label={
				storage
					? `Local browser storage: ${usedLabel} used of ${totalLabel}. ${freeLabel} available.`
					: "Browser storage information unavailable"
			}
			title={
				storage
					? `${usedLabel} used of ${totalLabel} browser storage quota. ${freeLabel} available to Artidor on this device. This is not your SSD/OS free disk space.`
					: "Browser storage information unavailable"
			}
		>
			<div className="text-center text-[0.7rem] font-bold tracking-[-0.01em] text-white/90">
				{usedLabel}
			</div>
			<div className="mt-0.5 text-center text-[0.6875rem] text-muted-foreground whitespace-nowrap">
				Used
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
