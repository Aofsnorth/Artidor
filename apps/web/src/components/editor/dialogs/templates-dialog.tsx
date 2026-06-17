"use client";

import { useState, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/ui";

/**
 * Templates dialog.
 *
 * A browse-and-apply picker for project templates. Each template
 * has a name, a one-line description, and a thumbnail. The list is
 * static for now (we'd plug in a remote catalog or user-saved
 * templates later), but the wiring — search, category filter,
 * apply callback — is production-shaped so the data source can be
 * swapped without touching the UI.
 */

type TemplateCategory = "All" | "Social" | "Trailer" | "Slideshow" | "Ad";

type Template = {
	id: string;
	name: string;
	description: string;
	category: Exclude<TemplateCategory, "All">;
	durationLabel: string;
};

const TEMPLATES: Template[] = [
	{
		id: "tpl-vertical-story",
		name: "Vertical Story",
		description: "9:16 short-form with animated captions and b-roll",
		category: "Social",
		durationLabel: "0:30",
	},
	{
		id: "tpl-product-demo",
		name: "Product Demo",
		description: "16:9 walkthrough with side-by-side comparison",
		category: "Ad",
		durationLabel: "0:45",
	},
	{
		id: "tpl-movie-trailer",
		name: "Movie Trailer",
		description: "Cinematic 21:9 with bold typography and score",
		category: "Trailer",
		durationLabel: "1:30",
	},
	{
		id: "tpl-photo-slideshow",
		name: "Photo Slideshow",
		description: "Ken Burns transitions with a music bed",
		category: "Slideshow",
		durationLabel: "1:00",
	},
	{
		id: "tpl-tiktok-hook",
		name: "TikTok Hook",
		description: "First-3-seconds attention grabber, vertical",
		category: "Social",
		durationLabel: "0:15",
	},
	{
		id: "tpl-app-ads",
		name: "App Ad",
		description: "Lightweight install-focused 30s spot",
		category: "Ad",
		durationLabel: "0:30",
	},
];

const CATEGORIES: TemplateCategory[] = [
	"All",
	"Social",
	"Trailer",
	"Slideshow",
	"Ad",
];

export function TemplatesDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [query, setQuery] = useState("");
	const [category, setCategory] = useState<TemplateCategory>("All");
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const visibleTemplates = useMemo(() => {
		const lowered = query.trim().toLowerCase();
		return TEMPLATES.filter((template) => {
			if (category !== "All" && template.category !== category) {
				return false;
			}
			if (!lowered) return true;
			return (
				template.name.toLowerCase().includes(lowered) ||
				template.description.toLowerCase().includes(lowered)
			);
		});
	}, [query, category]);

	const handleApply = () => {
		if (!selectedId) return;
		// Real template application would push a command onto the
		// editor's undo stack (template-apply command). For the
		// dialog stub we just close and toast; the action stays
		// discoverable but the heavy lifting is the next milestone.
		const template = TEMPLATES.find((t) => t.id === selectedId);
		if (template) {
			// eslint-disable-next-line no-console
			console.info("[templates] apply requested", template.id);
		}
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl border-white/10 bg-[#0c0c0e]/95 backdrop-blur-xl">
				<DialogHeader>
					<DialogTitle className="text-white">Templates</DialogTitle>
					<DialogDescription className="text-white/55">
						Pick a starting point for your project. You can customise anything
						afterwards.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-3">
					{/* Search + category chips */}
					<div className="flex flex-wrap items-center gap-2">
						<div className="relative flex-1 min-w-[180px]">
							<HugeiconsIcon
								icon={Search01Icon}
								className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/40"
							/>
							<input
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder="Search templates…"
								className="w-full rounded-md border border-white/[0.08] bg-black/30 py-1.5 pl-8 pr-3 text-sm text-white/85 placeholder:text-white/30 focus:border-white/20 focus:outline-none"
							/>
						</div>
						<div className="flex items-center gap-1">
							{CATEGORIES.map((cat) => (
								<button
									key={cat}
									type="button"
									onClick={() => setCategory(cat)}
									className={cn(
										"rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide transition-colors",
										category === cat
											? "border-white/20 bg-white/[0.12] text-white"
											: "border-white/[0.06] bg-white/[0.02] text-white/45 hover:bg-white/[0.06] hover:text-white/70",
									)}
								>
									{cat}
								</button>
							))}
						</div>
					</div>

					{/* Template grid */}
					<div className="grid max-h-[420px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
						{visibleTemplates.length === 0 ? (
							<div className="col-span-full rounded-lg border border-dashed border-white/[0.08] bg-white/[0.02] p-6 text-center text-sm text-white/45">
								No templates match your search.
							</div>
						) : (
							visibleTemplates.map((template) => {
								const isSelected = selectedId === template.id;
								return (
									<button
										key={template.id}
										type="button"
										onClick={() => setSelectedId(template.id)}
										className={cn(
											"group relative flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors",
											isSelected
												? "border-white/30 bg-white/[0.1] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
												: "border-white/[0.08] bg-white/[0.02] text-white/75 hover:border-white/15 hover:bg-white/[0.05]",
										)}
									>
										{/* Thumbnail placeholder — real thumbnails
										    will replace this once the template
										    catalog is wired in. */}
										<div className="grid aspect-video w-full place-items-center rounded-md border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-black/30 text-[0.65rem] uppercase tracking-[0.18em] text-white/30">
											{template.category}
										</div>
										<div className="flex w-full items-center justify-between gap-1">
											<div className="truncate text-sm font-semibold">
												{template.name}
											</div>
											<span className="text-[0.65rem] text-white/40 tabular-nums">
												{template.durationLabel}
											</span>
										</div>
										<p className="line-clamp-2 text-[0.7rem] text-white/45">
											{template.description}
										</p>
										{isSelected ? (
											<HugeiconsIcon
												icon={Tick02Icon}
												className="absolute right-2 top-2 size-3.5 text-emerald-400"
											/>
										) : null}
									</button>
								);
							})
						)}
					</div>

					<div className="flex items-center justify-end gap-2 pt-1">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							variant="default"
							size="sm"
							disabled={!selectedId}
							onClick={handleApply}
						>
							Apply template
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
