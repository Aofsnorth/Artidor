"use client";

/**
 * TemplateCard — a single quick-start card used in the empty
 * state's "Start from template" row. Each card has:
 *   - a generated gradient thumbnail (16:9, with monogram)
 *   - a serif title + 1-line description
 *   - a small metadata strip (duration, aspect)
 *
 * Vertical card layout (thumbnail on top, metadata + title
 * below) — same visual language as the project grid, so the
 * empty state reads as a preview of what's about to populate
 * the page. Four cards in a row.
 *
 * Clicking fires `onSelect(template)`. The parent page is
 * responsible for actually creating the project.
 */

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/utils/ui";
import { thumbnailGradientFor } from "./thumbnail-gradient";

export interface ProjectTemplate {
	id: string;
	title: string;
	description: string;
	durationLabel: string;
	aspect: string;
	format: string;
}

const DEFAULT_TEMPLATES: ProjectTemplate[] = [
	{
		id: "yt-1080",
		title: "YouTube video",
		description: "16:9 landscape, 5 min default. Captions + intro card.",
		durationLabel: "5:00",
		aspect: "16:9",
		format: "MP4 H.264",
	},
	{
		id: "reel-9-16",
		title: "Vertical reel",
		description: "9:16 portrait, 60s. Captions + safe-area guides.",
		durationLabel: "0:60",
		aspect: "9:16",
		format: "MP4 H.264",
	},
	{
		id: "tiktok-9-16",
		title: "TikTok / Short",
		description: "9:16, 30s. Beat-synced cuts, captions on top.",
		durationLabel: "0:30",
		aspect: "9:16",
		format: "MP4 H.264",
	},
	{
		id: "blank",
		title: "Blank canvas",
		description: "16:9, no constraints. Bring your own media.",
		durationLabel: "∞",
		aspect: "16:9",
		format: "Any",
	},
];

export function getDefaultTemplates(): ProjectTemplate[] {
	return DEFAULT_TEMPLATES;
}

function TemplateCard({
	template,
	onSelect,
}: {
	template: ProjectTemplate;
	onSelect: (template: ProjectTemplate) => void;
}) {
	const gradient = thumbnailGradientFor({ seed: template.id });
	return (
		<button
			type="button"
			onClick={() => onSelect(template)}
			className={cn(
				"group relative flex flex-col gap-1.5 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-1.5 text-left",
				"transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.05]",
				"hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
			)}
		>
			<div
				aria-hidden
				className="relative aspect-video w-full overflow-hidden rounded-md border border-white/[0.05]"
				style={{ background: gradient.background }}
			>
				<div className="absolute inset-0 flex items-center justify-center">
					<span className="font-serif text-xl font-medium italic text-white/85 mix-blend-overlay drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
						{gradient.monogram}
					</span>
				</div>
				<div className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 font-mono text-[9.5px] text-white/75 backdrop-blur">
					{template.durationLabel} · {template.aspect}
				</div>
				<div className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white/85 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
					<HugeiconsIcon icon={ArrowRight01Icon} className="size-3" />
				</div>
			</div>
			<div className="flex flex-col gap-0 px-0.5 pb-0.5">
				<div className="font-serif text-[12px] font-medium italic leading-tight text-white">
					{template.title}
				</div>
				<div className="line-clamp-1 text-[10px] font-light leading-snug text-white/50">
					{template.description}
				</div>
			</div>
		</button>
	);
}

export function TemplatesRow({
	onSelect,
}: {
	onSelect: (template: ProjectTemplate) => void;
}) {
	return (
		<div className="mt-3 w-full">
			<div className="mb-2 flex items-center gap-2 text-[9.5px] uppercase tracking-[0.18em] text-white/45">
				<span>Or start from a template</span>
				<span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
			</div>
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
				{DEFAULT_TEMPLATES.map((t) => (
					<TemplateCard key={t.id} template={t} onSelect={onSelect} />
				))}
			</div>
		</div>
	);
}
