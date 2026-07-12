"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Plug01Icon,
	Upload04Icon,
	Delete02Icon as Trash04Icon,
	ToggleOnIcon,
	ToggleOffIcon,
	Download04Icon,
	AlertCircleIcon,
	InformationCircleIcon,
	ArrowDown01Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { usePluginsStore } from "@/lib/plugins/store";
import {
	readPluginFile,
	packageToInstalled,
	buildSamplePluginPackage,
} from "@/lib/plugins/importer";
import type { InstalledPlugin } from "@/lib/plugins/types";
import {
	DANGEROUS_PERMISSIONS,
	PLUGIN_CATEGORIES,
	type PluginCategory,
	type PluginExtensionType,
} from "@/lib/plugins/types";
import { PanelView } from "./base-panel";
import { PopOutAction } from "@/components/editor/floating-window";
import { PluginDetailDialog } from "./plugin-detail-dialog";
import { cn } from "@/utils/ui";
import {
	CatalogSearch,
	filterCatalogItems,
} from "@/components/editor/panels/assets/views/components/catalog-search";
import { useI18n } from "@/lib/i18n";

/**
 * Plugin Manager panel. Lives in the left assets panel under the
 * "Plugins" tab. Surfaces:
 *   - Import button (file picker) + "Sample" download so first-time
 *     users can see what a plugin package looks like before writing one.
 *   - Category filter chips (with count + description tooltip on hover).
 *   - The full list of installed plugins as PluginCards.
 *   - A detail dialog that opens when the user clicks "Details".
 *
 * All destructive actions (uninstall) and toggles (enable/disable) go
 * through the zustand store so the UI stays in sync with IndexedDB.
 */
export function PluginsView() {
	const { t } = useI18n();
	const { plugins, loaded, loadPlugins } = usePluginsStore();
	const [filter, setFilter] = useState<PluginCategory | "all">("all");
	const [query, setQuery] = useState("");
	const [detailPlugin, setDetailPlugin] = useState<InstalledPlugin | null>(
		null,
	);
	const [detailOpen, setDetailOpen] = useState(false);
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
				toast.error(
					t("plugins.failedToInstall", { error: (err as Error).message }),
				);
			}
		},
		[installPlugin, t],
	);

	const handleDownloadSample = useCallback(() => {
		try {
			const pkg = buildSamplePluginPackage();
			const json = JSON.stringify(pkg, null, 2);
			const blob = new Blob([json], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "demo-plugin.artpl";
			a.click();
			URL.revokeObjectURL(url);
			toast.success(t("plugins.downloadedSample"));
		} catch (err) {
			toast.error(
				t("plugins.failedToDownload", { error: (err as Error).message }),
			);
		}
	}, [t]);

	const openDetail = useCallback((plugin: InstalledPlugin) => {
		setDetailPlugin(plugin);
		setDetailOpen(true);
	}, []);

	const filteredPlugins = useMemo(() => {
		const categoryFiltered =
			filter === "all"
				? plugins
				: plugins.filter((plugin) => plugin.manifest.category === filter);
		return filterCatalogItems({
			items: categoryFiltered,
			query,
			getText: (plugin) => [
				plugin.manifest.name,
				plugin.manifest.id,
				plugin.manifest.description,
				t(
					`plugins.category.${plugin.manifest.category}` as `plugins.category.${PluginCategory}`,
				),
				...(plugin.manifest.permissions ?? []),
			],
		});
	}, [filter, plugins, query, t]);

	return (
		<PanelView
			title={t("catalog.titlePlugins")}
			actions={<PopOutAction id="plugins" title={t("catalog.titlePlugins")} />}
		>
			<div className="flex h-full flex-col gap-2 p-2">
				{/* Import + Sample actions */}
				<div className="flex shrink-0 items-center gap-2">
					<button
						type="button"
						className="flex flex-1 items-center justify-center gap-2 rounded-md border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-[11.5px] font-medium text-white/80 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
						onClick={handleImportClick}
					>
						<HugeiconsIcon icon={Upload04Icon} className="size-3.5" />
						{t("plugins.importPlugin")}
					</button>
					<button
						type="button"
						className="flex items-center justify-center gap-2 rounded-md border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-[11.5px] font-medium text-white/60 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white/90"
						onClick={handleDownloadSample}
						title={t("plugins.sampleTooltip")}
					>
						<HugeiconsIcon icon={Download04Icon} className="size-3.5" />
						{t("plugins.sample")}
					</button>
					<input
						ref={fileInputRef}
						type="file"
						accept=".json,.artpl,application/json"
						className="hidden"
						onChange={(e) => void handleFileChange(e)}
					/>
				</div>

				{/* Category filter — every known category shows up as a
				   chip, even when there are zero plugins in it, so the
				   user can see what kinds exist. Hover for the one-line
				   category description. */}
				<div className="scrollbar-hidden flex shrink-0 gap-1 overflow-x-auto border-b border-white/[0.06] pb-1.5">
					<CategoryChip
						active={filter === "all"}
						onClick={() => setFilter("all")}
						count={plugins.length}
					>
						{t("catalog.allCategory")}
					</CategoryChip>
					{PLUGIN_CATEGORIES.map((cat) => {
						const count = plugins.filter(
							(p) => p.manifest.category === cat,
						).length;
						return (
							<CategoryChip
								key={cat}
								active={filter === cat}
								onClick={() => setFilter(cat)}
								count={count}
								tooltip={t(
									`plugins.categoryDescription.${cat}` as `plugins.categoryDescription.${PluginCategory}`,
								)}
							>
								{t(
									`plugins.category.${cat}` as `plugins.category.${PluginCategory}`,
								)}
							</CategoryChip>
						);
					})}
				</div>

				<CatalogSearch
					value={query}
					onChange={setQuery}
					placeholder={t("catalog.searchPlugins")}
				/>

				{/* Plugin list */}
				<div className="scrollbar-hidden flex-1 space-y-2 overflow-y-auto">
					{!loaded ? (
						<div className="flex h-full items-center justify-center py-12 text-[11.5px] text-white/45">
							<div className="flex items-center gap-2">
								<div className="size-4 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
								{t("plugins.loading")}
							</div>
						</div>
					) : filteredPlugins.length === 0 ? (
						<EmptyState hasAnyPlugin={plugins.length > 0} />
					) : (
						filteredPlugins.map((plugin) => (
							<PluginCard
								key={plugin.id}
								plugin={plugin}
								onOpenDetail={() => openDetail(plugin)}
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

			<PluginDetailDialog
				plugin={detailPlugin}
				open={detailOpen}
				onOpenChange={setDetailOpen}
			/>
		</PanelView>
	);
}

function CategoryChip({
	active,
	onClick,
	children,
	count,
	tooltip,
}: {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
	count: number;
	tooltip?: string;
}) {
	return (
		<button
			type="button"
			title={tooltip}
			className={cn(
				"flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-medium transition",
				active
					? "bg-white/15 text-white"
					: "bg-white/[0.04] text-white/55 hover:bg-white/[0.08] hover:text-white/85",
				count === 0 && !active && "opacity-60",
			)}
			onClick={onClick}
		>
			{children}
			<span
				className={cn(
					"rounded px-1 text-[9.5px] tabular-nums",
					active
						? "bg-white/15 text-white/80"
						: "bg-white/[0.06] text-white/45",
				)}
			>
				{count}
			</span>
		</button>
	);
}

function PluginCard({
	plugin,
	onOpenDetail,
	onToggle,
	onUninstall,
}: {
	plugin: InstalledPlugin;
	onOpenDetail: () => void;
	onToggle: () => void;
	onUninstall: () => void;
}) {
	const { t } = useI18n();
	const { manifest, enabled } = plugin;
	const extensions = manifest.extensions;
	const extensionSummary =
		extensions.length === 1
			? t("plugins.extension", {
					type: t(
						`plugins.extension.${extensions[0].type}` as `plugins.extension.${PluginExtensionType}`,
					),
				})
			: t("plugins.extensions", { count: extensions.length });
	const permissions = manifest.permissions ?? [];
	const visiblePermissions = permissions.slice(0, 3);
	const overflowPermissions = permissions.length - visiblePermissions.length;
	const hasDangerous = permissions.some((p) => DANGEROUS_PERMISSIONS.has(p));

	return (
		<div
			className={cn(
				"rounded-lg border p-2.5 transition",
				enabled
					? "border-white/[0.12] bg-white/[0.03]"
					: "border-white/[0.06] bg-white/[0.015] opacity-60",
			)}
		>
			<div className="flex items-start gap-2">
				<div
					className={cn(
						"grid size-8 shrink-0 place-items-center rounded-md border",
						enabled
							? "border-white/15 bg-white/[0.06] text-white/80"
							: "border-white/[0.06] bg-white/[0.02] text-white/40",
					)}
				>
					<HugeiconsIcon icon={Plug01Icon} className="size-4" />
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-1.5">
						<span
							className={cn(
								"truncate text-[12px] font-semibold",
								enabled ? "text-white" : "text-white/70",
							)}
						>
							{manifest.name}
						</span>
						<span className="shrink-0 text-[10px] text-white/40">
							v{manifest.version}
						</span>
						{hasDangerous && (
							<span
								title={t("plugins.sensitiveTooltip")}
								className="ml-auto flex shrink-0 items-center gap-0.5 rounded border border-amber-300/30 bg-amber-400/10 px-1 py-px text-[9px] font-medium text-amber-200"
							>
								<HugeiconsIcon icon={AlertCircleIcon} className="size-2.5" />
								{t("plugins.sensitive")}
							</span>
						)}
					</div>
					{manifest.description && (
						<p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/55">
							{manifest.description}
						</p>
					)}
					<div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-white/50">
						<span className="rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 uppercase tracking-[0.1em]">
							{t(
								`plugins.category.${manifest.category}` as `plugins.category.${PluginCategory}`,
							)}
						</span>
						{manifest.author && (
							<span>{t("plugins.byAuthor", { author: manifest.author })}</span>
						)}
						<span>·</span>
						<span>{extensionSummary}</span>
						{visiblePermissions.length > 0 && (
							<>
								<span>·</span>
								<span className="flex items-center gap-1">
									{visiblePermissions.map((perm) => (
										<span
											key={perm}
											className={cn(
												"rounded px-1 py-px text-[9px] font-mono uppercase tracking-wider",
												DANGEROUS_PERMISSIONS.has(perm)
													? "bg-amber-400/10 text-amber-200/80"
													: "bg-white/[0.04] text-white/45",
											)}
										>
											{perm}
										</span>
									))}
									{overflowPermissions > 0 && (
										<span className="text-[9px] text-white/40">
											+{overflowPermissions}
										</span>
									)}
								</span>
							</>
						)}
					</div>
				</div>
			</div>

			{/* Actions row — each button stops propagation so a click
			   here doesn't also bubble to a future full-card handler. */}
			<div className="mt-2 flex items-center justify-between gap-2">
				<button
					type="button"
					className="flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-medium text-white/55 transition hover:bg-white/[0.06] hover:text-white"
					onClick={(e) => {
						e.stopPropagation();
						onOpenDetail();
					}}
				>
					<HugeiconsIcon icon={InformationCircleIcon} className="size-3" />
					{t("plugins.details")}
					<HugeiconsIcon
						icon={ArrowDown01Icon}
						className="size-2.5 -rotate-90"
					/>
				</button>
				<div className="flex items-center gap-1">
					<button
						type="button"
						className={cn(
							"flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-medium transition",
							enabled
								? "bg-white/[0.06] text-white/80 hover:bg-white/[0.12] hover:text-white"
								: "bg-white/[0.03] text-white/50 hover:bg-white/[0.08] hover:text-white/80",
						)}
						onClick={(e) => {
							e.stopPropagation();
							onToggle();
						}}
						title={
							enabled ? t("plugins.disablePlugin") : t("plugins.enablePlugin")
						}
					>
						<HugeiconsIcon
							icon={enabled ? ToggleOnIcon : ToggleOffIcon}
							className="size-3.5"
						/>
						{enabled ? t("plugins.enabled") : t("plugins.disabled")}
					</button>
					<button
						type="button"
						className="flex items-center gap-1 rounded-md bg-white/[0.03] px-2 py-1 text-[10.5px] font-medium text-red-300/80 transition hover:bg-red-500/10 hover:text-red-200"
						onClick={(e) => {
							e.stopPropagation();
							onUninstall();
						}}
						title={t("plugins.uninstallPlugin")}
					>
						<HugeiconsIcon icon={Trash04Icon} className="size-3.5" />
						{t("plugins.uninstall")}
					</button>
				</div>
			</div>
		</div>
	);
}

function EmptyState({ hasAnyPlugin }: { hasAnyPlugin: boolean }) {
	const { t } = useI18n();
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
					? t("catalog.emptyPluginsNoMatch")
					: t("catalog.emptyPluginsNoInstalled")}
			</p>
		</div>
	);
}
