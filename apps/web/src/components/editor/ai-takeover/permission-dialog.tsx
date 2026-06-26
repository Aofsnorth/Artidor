"use client";

/**
 * Permission dialog shown when the AI requests to "take control" of the
 * editor for the first time in a session. Once approved, subsequent
 * takeovers in the same session skip this dialog.
 *
 * The dialog explains what takeover means: the AI will drive the timeline,
 * preview, and properties on the user's behalf, and the editor chrome is
 * locked (only the chat remains interactive) while takeover is active.
 */

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { useAIControlStore } from "@/stores/ai-control-store";
import { cn } from "@/utils/ui";

export function AITakeoverPermissionDialog() {
	const takeoverState = useAIControlStore((s) => s.takeoverState);
	const approveTakeover = useAIControlStore((s) => s.approveTakeover);
	const denyTakeover = useAIControlStore((s) => s.denyTakeover);

	const open = takeoverState === "requesting";

	return (
		<Dialog
			open={open}
			onOpenChange={(o) => {
				// Closing the dialog without approving = deny.
				if (!o) denyTakeover();
			}}
		>
			<DialogContent
				className={cn(
					"sm:max-w-[440px] p-0 overflow-hidden",
					"bg-gradient-to-b from-[#0c0c10] to-[#08080c]",
					"border border-white/[0.07]",
					"shadow-[0_40px_120px_-20px_rgba(0,0,0,0.75),0_0_80px_-20px_rgba(99,179,237,0.18)]",
				)}
			>
				{/* Ambient aurora glow — previews the takeover visual */}
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0"
					style={{
						background: [
							"radial-gradient(ellipse 60% 30% at 50% 0%, rgba(99, 179, 237, 0.12), transparent 60%)",
							"radial-gradient(ellipse 50% 40% at 50% 100%, rgba(167, 139, 250, 0.08), transparent 55%)",
						].join(", "),
					}}
				/>
				{/* Top accent line */}
				<div
					aria-hidden
					className="absolute top-0 left-0 right-0 h-px"
					style={{
						background:
							"linear-gradient(90deg, transparent, rgba(99,179,237,0.35), rgba(167,139,250,0.35), transparent)",
					}}
				/>

				<div className="relative">
					<DialogHeader className="border-b border-white/[0.06] p-6 pb-4">
						<div className="flex items-center gap-3">
							<div className="grid size-10 place-items-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06]">
								<HugeiconsIcon
									icon={SparklesIcon}
									className="size-5 text-cyan-300/80"
								/>
							</div>
							<div>
								<DialogTitle className="font-serif text-base text-white">
									Allow Arth to take control?
								</DialogTitle>
								<DialogDescription className="text-[0.7rem] text-white/40">
									The AI wants to edit your project directly.
								</DialogDescription>
							</div>
						</div>
					</DialogHeader>

					<div className="px-6 py-5">
						<p className="text-sm leading-relaxed text-white/60">
							Arth is about to perform editing actions on your timeline,
							preview, and properties. While it works:
						</p>
						<ul className="mt-3 space-y-1.5 text-[0.8rem] text-white/50">
							<li className="flex items-start gap-2">
								<span className="mt-1.5 size-1 shrink-0 rounded-full bg-cyan-300/60" />
								The editor is locked — only the AI chat stays interactive.
							</li>
							<li className="flex items-start gap-2">
								<span className="mt-1.5 size-1 shrink-0 rounded-full bg-cyan-300/60" />
								An aurora overlay shows the AI is in control.
							</li>
							<li className="flex items-start gap-2">
								<span className="mt-1.5 size-1 shrink-0 rounded-full bg-cyan-300/60" />
								You can stop it anytime from the chat.
							</li>
							<li className="flex items-start gap-2">
								<span className="mt-1.5 size-1 shrink-0 rounded-full bg-cyan-300/60" />
								Approval lasts for this session — no repeated prompts.
							</li>
						</ul>
					</div>

					<DialogFooter className="border-t border-white/[0.06] p-6 py-4">
						<div className="flex w-full items-center justify-end gap-2">
							<Button
								size="sm"
								variant="ghost"
								onClick={denyTakeover}
								className="text-white/50 hover:text-white/70"
							>
								<HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
								Not now
							</Button>
							<Button
								size="sm"
								onClick={approveTakeover}
								className={cn(
									"border border-cyan-400/30 bg-cyan-400/[0.1] text-cyan-100",
									"hover:bg-cyan-400/[0.18] hover:shadow-[0_0_24px_-6px_rgba(99,179,237,0.4)]",
								)}
							>
								<HugeiconsIcon icon={SparklesIcon} className="size-3.5" />
								Allow takeover
							</Button>
						</div>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
}
