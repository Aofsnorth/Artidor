"use client";

/**
 * Inline permission card shown inside the AI chat when the AI requests
 * to "take control" of the editor for the first time in a session.
 * Once approved, subsequent takeovers in the same session skip this card.
 *
 * This replaces the previous popup dialog — the permission request now
 * appears as a chat bubble so it doesn't break the user's flow with a
 * modal popup.
 */

import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { useAIControlStore } from "@/stores/ai-control-store";
import { useSettingsStore } from "@/stores/settings-store";
import { cn } from "@/utils/ui";

export function TakeoverPermissionCard() {
	const takeoverState = useAIControlStore((s) => s.takeoverState);
	const approveTakeover = useAIControlStore((s) => s.approveTakeover);
	const denyTakeover = useAIControlStore((s) => s.denyTakeover);
	const coEditMode = useSettingsStore((s) => s.aiCoEditMode);

	if (takeoverState !== "requesting") return null;

	return (
		<div className="flex justify-center py-1">
			<div
				className={cn(
					"w-full max-w-sm overflow-hidden rounded-2xl rounded-tl-md",
					"border border-white/[0.08] bg-gradient-to-b from-[#0c0c10] to-[#08080c]",
					"shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6),0_0_40px_-12px_rgba(255,255,255,0.08)]",
				)}
			>
				{/* Top accent line — thin white glow */}
				<div
					aria-hidden
					className="h-px w-full"
					style={{
						background:
							"linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
					}}
				/>

				<div className="p-4">
					{/* Header */}
					<div className="flex items-center gap-2.5">
						<div className="grid size-8 place-items-center rounded-lg border border-white/15 bg-white/[0.06]">
							<HugeiconsIcon
								icon={SparklesIcon}
								className="size-4 text-white/80"
							/>
						</div>
						<div>
							<h3 className="font-serif text-[0.82rem] text-white">
								Allow Arth to take control?
							</h3>
							<p className="text-[10.5px] text-white/40">
								The AI wants to edit your project directly.
							</p>
						</div>
					</div>

					{/* Body */}
					<div className="mt-3 space-y-1.5">
						<p className="text-[0.78rem] leading-relaxed text-white/55">
							Arth will perform editing actions on your timeline, preview, and
							properties.
						</p>
						<ul className="space-y-1 text-[0.72rem] text-white/45">
							<li className="flex items-start gap-1.5">
								<span className="mt-1 size-1 shrink-0 rounded-full bg-white/50" />
								{coEditMode
									? "Co-edit mode is ON — you can keep editing alongside the AI."
									: "The editor is locked — only the AI chat stays interactive."}
							</li>
							<li className="flex items-start gap-1.5">
								<span className="mt-1 size-1 shrink-0 rounded-full bg-white/50" />
								A thin border glow shows the AI is in control.
							</li>
							<li className="flex items-start gap-1.5">
								<span className="mt-1 size-1 shrink-0 rounded-full bg-white/50" />
								You can stop it anytime. Approval lasts for this session.
							</li>
						</ul>
					</div>

					{/* Actions */}
					<div className="mt-3.5 flex items-center justify-end gap-2">
						<Button
							size="sm"
							variant="ghost"
							onClick={denyTakeover}
							className="h-7 text-[11px] text-white/50 hover:text-white/70"
						>
							<HugeiconsIcon icon={Cancel01Icon} className="size-3" />
							Not now
						</Button>
						<Button
							size="sm"
							onClick={approveTakeover}
							className={cn(
								"h-7 border border-white/20 bg-white/[0.08] text-[11px] text-white/90",
								"hover:bg-white/[0.14] hover:shadow-[0_0_20px_-6px_rgba(255,255,255,0.3)]",
							)}
						>
							<HugeiconsIcon icon={SparklesIcon} className="size-3" />
							Allow takeover
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
