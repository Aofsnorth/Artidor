"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Plug01Icon,
	Upload04Icon,
	Delete02Icon as Trash04Icon,
	ToggleOnIcon,
	ToggleOffIcon,
	Download04Icon,
	AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { usePluginsStore } from "@/lib/plugins/store";
import {
	readPluginFile,
	packageToInstalled,
	buildSamplePluginPackage,
} from "@/lib/plugins/importer";
import type { InstalledPlugin, PluginCategory } from "@/lib/plugins/types";
import { PLUGIN_CATEGORIES } from "@/lib/plugins/types";
import { PanelView } from "./base-panel";

const CATEGORY_LABELS: Record<PluginCategory, string> = {
	effects: "Effects",
	transitions: "Transitions",
	shapes: "Shapes",
	presets: "Presets",
	tools: "Tools",
	themes: "Themes",
};

export function PluginsView() {
	const { plugins, loaded, loadPlugins } = usePluginsStore();
	const [filter, setFilter] = useState<PluginCategory | "all">("all");
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!loaded) {
			void loadPlugins();
		}
	}, [loaded, loadPlugins]);

	const handleImportClick = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const installPlugin = usePluginsStore((s) => s.installPlugin);
	const uninstallPlugin = usePluginsStore((s) => s.uninstallPlugin);
	const setPluginEnabled = usePluginsStore((s) => s.setPluginEnabled);

	const handleFileChange = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;
			// Reset the input so the same file can be re-selected later
			e.target.value = "";
			try {
				const pkg = await readPluginFile(file);
				const installed = packageToInstalled({ pkg });
				await installPlugin(installed);
			} catch (err) {
				toast.error(`Failed to install: ${(err as Error).message}`);
			}
		},
		[installPlugin],
	);

	const handleDownloadSample = useCallback(() => {
		try {
			const pkg = buildSamplePluginPackage();
			const json = JSON.stringify(pkg, null, 2);
			const blob = new Blob([json], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "demo-plugin.artidor-plugin";
			a.click();
			URL.revokeObjectURL(url);
			toast.success("Downloaded sample plugin package");
		} catch (err) {
			toast.error(`Failed to download: ${(err as Error).message}`);
		}
	}, []);

	const filteredPlugins =
		filter === "all"
			? plugins
			: plugins.filter((p) => p.manifest.category === filter);

	return (
		<PanelView title="Plugins">
			<div className="flex h-full flex-col gap-2 p-2">
				{/* Import + Sample actions */}
				<div className="flex shrink-0 items-center gap-2">
					<button
						type="button"
						className="flex flex-1 items-center justify-center gap-2 rounded-md border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-[11.5px] font-medium text-white/80 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
						onClick={handleImportClick}
					>
						<HugeiconsIcon icon={Upload04Icon} className="size-3.5" />
						Import Plugin
					</button>
					<button
						type="button"
						className="flex items-center justify-center gap-2 rounded-md border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-[11.5px] font-medium text-white/60 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white/90"
						onClick={handleDownloadSample}
						title="Download a sample .artidor-plugin file for testing"
					>
						<HugeiconsIcon icon={Download04Icon} className="size-3.5" />
						Sample
					</button>
					<input
						ref={fileInputRef}
						type="file"
						accept=".json,.artidor-plugin,application/json"
						className="hidden"
						onChange={(e) => void handleFileChange(e)}
					/>
				</div>

				{/* Category filter */}
				<div className="scrollbar-hidden flex shrink-0 gap-1 overflow-x-auto border-b border-white/[0.06] pb-1.5">
					<CategoryChip
						active={filter === "all"}
						onClick={() => setFilter("all")}
					>
						All ({plugins.length})
					</CategoryChip>
					{PLUGIN_CATEGORIES.map((cat) => {
						const count = plugins.filter(
							(p) => p.manifest.category === cat,
						).length;
						if (count === 0) return null;
						return (
							<CategoryChip
								key={cat}
								active={filter === cat}
								onClick={() => setFilter(cat)}
							>
								{CATEGORY_LABELS[cat]} ({count})
							</CategoryChip>
						);
					})}
				</div>

				{/* Plugin list */}
				<div className="scrollbar-hidden flex-1 space-y-2 overflow-y-auto">
					{!loaded ? (
						<div className="flex h-full items-center justify-center py-12 text-[11.5px] text-white/45">
							<div className="flex items-center gap-2">
								<div className="size-4 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
								Loading plugins…
							</div>
						</div>
					) : filteredPlugins.length === 0 ? (
						<EmptyState hasAnyPlugin={plugins.length > 0} />
					) : (
						filteredPlugins.map((plugin) => (
							<PluginCard
								key={plugin.id}
								plugin={plugin}
								onToggle={() =>
									void setPluginEnabled({
										id: plugin.id,
										enabled: !plugin.enabled,
									})
								}
								onUninstall={() => void uninstallPlugin(plugin.id)}
							/>
						))
					)}
				</div>
			</div>
		</PanelView>
	);
}

function CategoryChip({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			className={`shrink-0 rounded-md px-2 py-1 text-[10.5px] font-medium transition ${
				active
					? "bg-white/15 text-white"
					: "bg-white/[0.04] text-white/55 hover:bg-white/[0.08] hover:text-white/85"
			}`}
			onClick={onClick}
		>
			{children}
		</button>
	);
}

function PluginCard({
	plugin,
	onToggle,
	onUninstall,
}: {
	plugin: InstalledPlugin;
	onToggle: () => void;
	onUninstall: () => void;
}) {
	const { manifest, enabled } = plugin;
	const extensions = manifest.extensions;
	const extensionSummary =
		extensions.length === 1
			? `1 ${extensions[0].type}`
			: `${extensions.length} extensions`;

	return (
		<div
			className={`rounded-lg border p-2.5 transition ${
				enabled
					? "border-white/[0.12] bg-white/[0.03]"
					: "border-white/[0.06] bg-white/[0.015] opacity-60"
			}`}
		>
			<div className="flex items-start gap-2">
				<div
					className={`grid size-8 shrink-0 place-items-center rounded-md border ${
						enabled
							? "border-white/15 bg-white/[0.06] text-white/80"
							: "border-white/[0.06] bg-white/[0.02] text-white/40"
					}`}
				>
					<HugeiconsIcon icon={Plug01Icon} className="size-4" />
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-1.5">
						<span
							className={`truncate text-[12px] font-semibold ${
								enabled ? "text-white" : "text-white/70"
							}`}
						>
							{manifest.name}
						</span>
						<span className="shrink-0 text-[10px] text-white/40">
							v{manifest.version}
						</span>
					</div>
					{manifest.description && (
						<p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/55">
							{manifest.description}
						</p>
					)}
					<div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-white/50">
						<span className="rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 uppercase tracking-[0.1em]">
							{CATEGORY_LABELS[manifest.category]}
						</span>
						{manifest.author && <span>by {manifest.author}</span>}
						<span>·</span>
						<span>{extensionSummary}</span>
					</div>
				</div>
			</div>

			{/* Actions */}
			<div className="mt-2 flex items-center justify-end gap-1">
				<button
					type="button"
					className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-medium transition ${
						enabled
							? "bg-white/[0.06] text-white/80 hover:bg-white/[0.12] hover:text-white"
							: "bg-white/[0.03] text-white/50 hover:bg-white/[0.08] hover:text-white/80"
					}`}
					onClick={onToggle}
					title={enabled ? "Disable plugin" : "Enable plugin"}
				>
					<HugeiconsIcon
						icon={enabled ? ToggleOnIcon : ToggleOffIcon}
						className="size-3.5"
					/>
					{enabled ? "Enabled" : "Disabled"}
				</button>
				<button
					type="button"
					className="flex items-center gap-1 rounded-md bg-white/[0.03] px-2 py-1 text-[10.5px] font-medium text-red-300/80 transition hover:bg-red-500/10 hover:text-red-200"
					onClick={onUninstall}
					title="Uninstall plugin"
				>
					<HugeiconsIcon icon={Trash04Icon} className="size-3.5" />
					Uninstall
				</button>
			</div>
		</div>
	);
}

function EmptyState({ hasAnyPlugin }: { hasAnyPlugin: boolean }) {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
			<div className="grid size-10 place-items-center rounded-full border border-white/[0.08] bg-white/[0.03]">
				<HugeiconsIcon
					icon={AlertCircleIcon}
					className="size-5 text-white/40"
				/>
			</div>
			<p className="max-w-[220px] text-[11.5px] leading-snug text-white/55">
				{hasAnyPlugin
					? "No plugins match this category."
					: "No plugins installed yet. Import a .artidor-plugin file or download the sample to get started."}
			</p>
		</div>
	);
}
