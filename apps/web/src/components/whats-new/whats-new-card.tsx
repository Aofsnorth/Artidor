"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Cancel01Icon,
	SparklesIcon,
	ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { useWhatsNewStore } from "@/stores/whats-new-store";
import { WHATS_NEW, type WhatsNewTag } from "@/lib/whats-new/feed";
import { cn } from "@/utils/ui";

const TAG_STYLES: Record<
	WhatsNewTag,
	{ label: string; chip: string; dot: string }
> = {
	feature: {
		label: "New",
		chip: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/20",
		dot: "bg-emerald-400",
	},
	improvement: {
		label: "Improved",
		chip: "bg-sky-400/15 text-sky-300 ring-sky-400/20",
		dot: "bg-sky-400",
	},
	fix: {
		label: "Fix",
		chip: "bg-amber-400/15 text-amber-300 ring-amber-400/20",
		dot: "bg-amber-400",
	},
	performance: {
		label: "Faster",
		chip: "bg-violet-400/15 text-violet-300 ring-violet-400/20",
		dot: "bg-violet-400",
	},
	security: {
		label: "Security",
		chip: "bg-rose-400/15 text-rose-300 ring-rose-400/20",
		dot: "bg-rose-400",
	},
};

export function WhatsNewCard() {
	const { isOpen, open, close, toggle, hasUnseen } = useWhatsNewStore();
	const [mounted, setMounted] = useState(false);
	const autoOpenedRef = useRef(false);

	// Avoid hydration mismatch: the seen marker lives in localStorage.
	useEffect(() => {
		setMounted(true);
	}, []);

	// Auto-open once per session when there's something the user hasn't seen.
	useEffect(() => {
		if (!mounted || autoOpenedRef.current) return;
		autoOpenedRef.current = true;
		if (hasUnseen()) open();
	}, [mounted, hasUnseen, open]);

	if (!mounted) return null;

	const showDot = hasUnseen() && !isOpen;

	return (
		<div className="pointer-events-none fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2">
			{isOpen && <Card onClose={close} />}

			<button
				type="button"
				onClick={toggle}
				className={cn(
					"pointer-events-auto relative flex items-center gap-2 rounded-full border border-white/12 bg-[#17171c]/90 px-3.5 py-2 text-xs font-medium text-white/80 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-xl transition hover:border-white/25 hover:text-white",
					isOpen && "border-white/25 text-white",
				)}
				aria-label="What's new"
			>
				<HugeiconsIcon
					icon={SparklesIcon}
					className="size-3.5 text-amber-300"
				/>
				What's New
				{showDot && (
					<span className="absolute -right-0.5 -top-0.5 flex size-2.5">
						<span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/70" />
						<span className="relative inline-flex size-2.5 rounded-full bg-emerald-400 ring-2 ring-[#17171c]" />
					</span>
				)}
			</button>
		</div>
	);
}

function Card({ onClose }: { onClose: () => void }) {
	return (
		<div className="pointer-events-auto w-84 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#15151a]/95 shadow-[0_24px_70px_-12px_rgba(0,0,0,0.75)] backdrop-blur-2xl">
			{/* Header */}
			<div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3.5">
				<div className="flex items-center gap-2.5">
					<div className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-linear-to-b from-white/8 to-white/2">
						<HugeiconsIcon
							icon={SparklesIcon}
							className="size-4 text-amber-300"
						/>
					</div>
					<div className="flex flex-col gap-0.5">
						<span className="text-sm font-semibold leading-none text-white/95">
							What's New
						</span>
						<span className="text-[11px] leading-none text-white/40">
							Latest updates to Artidor
						</span>
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="grid size-7 shrink-0 place-items-center rounded-lg text-white/40 transition hover:bg-white/6 hover:text-white/80"
					aria-label="Dismiss"
				>
					<HugeiconsIcon icon={Cancel01Icon} className="size-4" />
				</button>
			</div>

			{/* Entries */}
				<div className="flex max-h-[52vh] flex-col gap-4 overflow-x-hidden overflow-y-auto scrollbar-hidden px-4 py-4">
				{WHATS_NEW.map((entry) => {
					const tag = TAG_STYLES[entry.tag];
					return (
						<div key={entry.id} className="flex flex-col gap-2">
							<div className="flex items-center gap-2">
								<span
									className={cn(
										"rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
										tag.chip,
									)}
								>
									{tag.label}
								</span>
								<span className="text-[11px] text-white/35">{entry.date}</span>
							</div>
							<h3 className="text-[13px] font-semibold leading-snug text-white/90">
								{entry.title}
							</h3>
							<ul className="flex flex-col gap-2 pl-0.5">
								{entry.items.map((item) => (
									<li key={item} className="flex gap-2.5">
										<span
											className={cn(
												"mt-[0.42rem] size-1.5 shrink-0 rounded-full",
												tag.dot,
											)}
										/>
										<span className="min-w-0 wrap-break-word text-[12px] leading-relaxed text-white/60">
											{item}
										</span>
									</li>
								))}
							</ul>
						</div>
					);
				})}
			</div>

			{/* Footer */}
			<div className="flex items-center justify-between border-t border-white/[0.07] px-4 py-3">
				<Link
					href="/changelog"
					target="_blank"
					className="group flex items-center gap-1 text-[11.5px] font-medium text-white/50 transition hover:text-white/85"
				>
					Full changelog
					<HugeiconsIcon
						icon={ArrowRight01Icon}
						className="size-3.5 transition-transform group-hover:translate-x-0.5"
					/>
				</Link>
				<button
					type="button"
					onClick={onClose}
					className="rounded-lg bg-white/90 px-3 py-1.5 text-[11.5px] font-semibold text-[#0b0b0d] transition hover:bg-white"
				>
					Got it
				</button>
			</div>
		</div>
	);
}
