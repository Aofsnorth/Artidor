"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	AlertCircleIcon,
	ArrowDown01Icon,
	Cancel01Icon,
	LinkSquareIcon,
	UserIcon,
	Calendar03Icon,
} from "@hugeicons/core-free-icons";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/ui";
import type {
	InstalledPlugin,
	PluginCategory,
	PluginExtensionType,
	PluginPermission,
} from "@/lib/plugins/types";
import { DANGEROUS_PERMISSIONS } from "@/lib/plugins/types";
import { useI18n } from "@/lib/i18n";

interface PluginDetailDialogProps {
	plugin: InstalledPlugin | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

/**
 * Full-detail dialog for an installed plugin. Shows everything the
 * user might want to audit before enabling or keeping a plugin:
 * name, version, author, category (with a one-line description of
 * what the category is for), permissions (with a warning icon on the
 * "dangerous" ones), extensions contributed, install/update dates,
 * and a "Show source" toggle that drops into the raw JS so a power
 * user can audit what the plugin actually does at runtime.
 */
export function PluginDetailDialog({
	plugin,
	open,
	onOpenChange,
}: PluginDetailDialogProps) {
	const { t } = useI18n();
	const [showSource, setShowSource] = useState(false);

	if (!plugin) return null;

	const { manifest, enabled, installedAt, updatedAt, source } = plugin;
	const permissions = manifest.permissions ?? [];
	const hasDangerous = permissions.some((p) => DANGEROUS_PERMISSIONS.has(p));

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg overflow-hidden p-0">
				{/* Header — same visual language as the card so the
				   dialog feels like an extension of the plugin row */}
				<div className="border-b border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent px-5 py-4">
					<div className="flex items-start gap-3">
						<div
							className={cn(
								"grid size-10 shrink-0 place-items-center rounded-lg border",
								enabled
									? "border-white/15 bg-white/[0.06] text-white/85"
									: "border-white/[0.06] bg-white/[0.02] text-white/45",
							)}
						>
							<HugeiconsIcon icon={AlertCircleIcon} className="size-5" />
						</div>
						<div className="min-w-0 flex-1">
							<DialogHeader>
								<DialogTitle className="text-[15px] font-semibold tracking-tight text-white">
									{manifest.name}
								</DialogTitle>
								<DialogDescription className="text-[11.5px] text-white/55">
									{manifest.description ?? t("plugins.detail.noDescription")}
								</DialogDescription>
							</DialogHeader>
						</div>
					</div>
				</div>

				<div className="scrollbar-hidden max-h-[60vh] space-y-4 overflow-y-auto px-5 py-4">
					{/* Identity grid — Name / Version / Author / Category */}
					<dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[11.5px]">
						<div className="flex flex-col gap-0.5">
							<dt className="font-mono uppercase tracking-[0.18em] text-white/40 text-[10px]">
								{t("plugins.detail.version")}
							</dt>
							<dd className="flex items-center gap-1 text-white/85">
								<HugeiconsIcon
									icon={Calendar03Icon}
									className="size-3 text-white/40"
								/>
								v{manifest.version}
							</dd>
						</div>
						<div className="flex flex-col gap-0.5">
							<dt className="font-mono uppercase tracking-[0.18em] text-white/40 text-[10px]">
								{t("plugins.detail.author")}
							</dt>
							<dd className="flex items-center gap-1 text-white/85">
								<HugeiconsIcon
									icon={UserIcon}
									className="size-3 text-white/40"
								/>
								{manifest.author ?? t("plugins.detail.unknown")}
							</dd>
						</div>
						<div className="flex flex-col gap-0.5">
							<dt className="font-mono uppercase tracking-[0.18em] text-white/40 text-[10px]">
								{t("plugins.detail.category")}
							</dt>
							<dd className="flex flex-col gap-0.5">
								<span className="inline-flex w-fit items-center rounded-md border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5 text-[10.5px] font-medium text-white/85">
									{t("plugins.detail.pluginSuffix", {
										category: t(
											`plugins.category.${manifest.category}` as `plugins.category.${PluginCategory}`,
										),
									})}
								</span>
								<span className="text-[10.5px] leading-snug text-white/45">
									{t(
										`plugins.categoryDescription.${manifest.category}` as `plugins.categoryDescription.${PluginCategory}`,
									)}
								</span>
							</dd>
						</div>
						<div className="flex flex-col gap-0.5">
							<dt className="font-mono uppercase tracking-[0.18em] text-white/40 text-[10px]">
								{t("plugins.detail.status")}
							</dt>
							<dd>
								<span
									className={cn(
										"inline-flex w-fit items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px] font-medium",
										enabled
											? "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
											: "border-white/[0.08] bg-white/[0.02] text-white/55",
									)}
								>
									<span
										className={cn(
											"size-1.5 rounded-full",
											enabled ? "bg-cyan-300" : "bg-white/30",
										)}
									/>
									{enabled ? t("plugins.enabled") : t("plugins.disabled")}
								</span>
							</dd>
						</div>
					</dl>

					{/* Permissions — with a warning strip if any are dangerous */}
					<section>
						<header className="mb-1.5 flex items-center justify-between">
							<h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
								{t("plugins.detail.permissionsCount", {
									count: permissions.length,
								})}
							</h3>
							{hasDangerous && (
								<span
									className="flex items-center gap-1 rounded-md border border-amber-300/30 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-200"
									title={t("plugins.detail.sensitiveTooltip")}
								>
									<HugeiconsIcon icon={AlertCircleIcon} className="size-3" />
									{t("plugins.detail.sensitive")}
								</span>
							)}
						</header>
						{permissions.length === 0 ? (
							<p className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-[11px] leading-snug text-white/45">
								{t("plugins.detail.noPermissions", { code: "artidor.log()" })}
							</p>
						) : (
							<ul className="flex flex-col gap-1">
								{permissions.map((perm) => {
									const dangerous = DANGEROUS_PERMISSIONS.has(perm);
									return (
										<li
											key={perm}
											className={cn(
												"flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-[11px]",
												dangerous
													? "border-amber-300/20 bg-amber-400/[0.04]"
													: "border-white/[0.08] bg-white/[0.02]",
											)}
										>
											{dangerous && (
												<HugeiconsIcon
													icon={AlertCircleIcon}
													className="mt-0.5 size-3 shrink-0 text-amber-300"
												/>
											)}
											<div className="flex min-w-0 flex-1 flex-col gap-0.5">
												<span className="font-mono text-[10.5px] text-white/85">
													{perm}
												</span>
												<span className="text-[10.5px] leading-snug text-white/55">
													{t(
														`plugins.permission.${perm}` as `plugins.permission.${PluginPermission}`,
													)}
												</span>
											</div>
										</li>
									);
								})}
							</ul>
						)}
					</section>

					{/* Extensions contributed */}
					<section>
						<header className="mb-1.5 flex items-center justify-between">
							<h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
								{t("plugins.detail.extensionsCount", {
									count: manifest.extensions.length,
								})}
							</h3>
						</header>
						<ul className="flex flex-col gap-1">
							{manifest.extensions.map((ext) => (
								<li
									key={`${ext.type}-${ext.id}`}
									className="flex items-center justify-between gap-2 rounded-md border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-[11px]"
								>
									<div className="flex min-w-0 flex-col gap-0.5">
										<span className="truncate text-white/90">{ext.name}</span>
										{ext.description && (
											<span className="line-clamp-1 text-[10.5px] text-white/55">
												{ext.description}
											</span>
										)}
									</div>
									<span className="shrink-0 rounded border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-white/55">
										{t(
											`plugins.extension.${ext.type}` as `plugins.extension.${PluginExtensionType}`,
										)}
									</span>
								</li>
							))}
						</ul>
					</section>

					{/* Metadata — install/update dates + homepage */}
					<section className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10.5px] text-white/55">
						<div>
							<span className="font-mono uppercase tracking-[0.18em] text-white/40">
								{t("plugins.detail.installed")}
							</span>
							<div className="text-white/80">
								{new Date(installedAt).toLocaleString()}
							</div>
						</div>
						<div>
							<span className="font-mono uppercase tracking-[0.18em] text-white/40">
								{t("plugins.detail.updated")}
							</span>
							<div className="text-white/80">
								{new Date(updatedAt).toLocaleString()}
							</div>
						</div>
						{manifest.homepage && (
							<div className="col-span-2 flex items-center gap-1.5 truncate">
								<HugeiconsIcon
									icon={LinkSquareIcon}
									className="size-3 shrink-0 text-white/40"
								/>
								<a
									href={manifest.homepage}
									target="_blank"
									rel="noreferrer"
									className="truncate text-white/80 underline-offset-2 hover:underline"
								>
									{manifest.homepage}
								</a>
							</div>
						)}
					</section>

					{/* Source preview — opt-in. Default collapsed so the
					   dialog stays calm. Power users can flip the toggle
					   to audit what the plugin actually runs. */}
					<section>
						<button
							type="button"
							onClick={() => setShowSource((v) => !v)}
							className="flex w-full items-center justify-between rounded-md border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-[11px] text-white/75 transition hover:border-white/15 hover:bg-white/[0.04]"
						>
							<span className="font-mono uppercase tracking-[0.18em] text-white/55 text-[10px]">
								{t("plugins.detail.showSourceChars", { count: source.length })}
							</span>
							<HugeiconsIcon
								icon={ArrowDown01Icon}
								className={cn("size-3 transition", showSource && "rotate-180")}
							/>
						</button>
						{showSource && (
							<pre className="mt-1.5 max-h-48 overflow-auto rounded-md border border-white/[0.08] bg-black/40 p-2.5 font-mono text-[10.5px] leading-snug text-white/75 scrollbar-thin">
								{source}
							</pre>
						)}
					</section>
				</div>

				<div className="flex items-center justify-end gap-2 border-t border-white/[0.06] bg-black/20 px-5 py-3">
					<Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
						<HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
						{t("plugins.detail.close")}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
