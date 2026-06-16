"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, UploadIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/utils/ui";

interface MediaDragOverlayProps {
	isVisible: boolean;
	isProcessing?: boolean;
	progress?: number;
	onClick?: () => void;
	// When the parent transitions from visible → hidden without a
	// successful drop (the user dragged files in and then pulled them
	// back out), the overlay briefly animates a "drop cancelled" state
	// before unmounting so the user gets feedback that nothing was
	// imported. Setting `showCancelHint` to true runs that animation.
	showCancelHint?: boolean;
	// Optional error state for invalid drops (e.g. unsupported file type).
	errorMessage?: string | null;
}

export function MediaDragOverlay({
	isVisible,
	isProcessing = false,
	progress = 0,
	onClick,
	showCancelHint = false,
	errorMessage = null,
}: MediaDragOverlayProps) {
	// When the drop is cancelled we want the overlay to linger for a few
	// hundred ms with a "drop cancelled" hint so the user can read it.
	const [phase, setPhase] = useState<"visible" | "cancel" | "hidden">("hidden");
	const [shouldShake, setShouldShake] = useState(false);

	useEffect(() => {
		if (isVisible) {
			setPhase("visible");
			setShouldShake(false);
			return;
		}
		if (showCancelHint) {
			setPhase("cancel");
			const t = window.setTimeout(() => {
				setPhase("hidden");
			}, 900);
			return () => window.clearTimeout(t);
		}
		setPhase("hidden");
	}, [isVisible, showCancelHint]);

	useEffect(() => {
		if (!errorMessage) return;
		setShouldShake(true);
		const t = window.setTimeout(() => setShouldShake(false), 380);
		return () => window.clearTimeout(t);
	}, [errorMessage]);

	if (phase === "hidden" && !isVisible) return null;

	const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		if (isProcessing || !onClick || phase === "cancel") return;
		event.preventDefault();
		event.stopPropagation();
		onClick();
	};

	const showProcessing = isProcessing;
	const showCancel = phase === "cancel" && !showProcessing;

	return (
		<button
			className={cn(
				"glass relative flex w-full flex-1 flex-col items-center justify-center gap-5 overflow-hidden rounded-xl p-8 text-center transition-colors",
				phase === "visible" && "drop-overlay-enter",
				phase === "cancel" && "drop-overlay-exit cursor-default",
				phase === "visible" && "hover:bg-white/[0.08]",
				shouldShake && "drop-shake",
			)}
			type="button"
			disabled={showProcessing || showCancel || !onClick}
			onClick={handleClick}
			aria-label={showCancel ? "Drop cancelled" : "Drop media here"}
		>
			{/* Background pulsing glow */}
			<div
				className={cn(
					"pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.14),transparent_55%)]",
					phase === "visible" && "drop-glow-pulse",
				)}
			/>

			{/* Hero icon: pulsing container with two counter-rotating dashed rings.
			   Nudged up slightly so the rings clear the heading below. */}
			<div className="relative grid size-24 -translate-y-2 place-items-center">
				<div className="absolute size-40 rounded-full border border-dashed border-white/15 drop-ring-rotate-slow" />
				<div className="absolute size-28 rounded-full border border-dashed border-white/20 drop-ring-rotate-fast" />
				<div
					className={cn(
						"relative grid size-24 place-items-center rounded-full border bg-black/35 shadow-inner shadow-white/10",
						phase === "visible" && "drop-icon-pulse",
						errorMessage
							? "border-red-400/40"
							: phase === "visible"
								? "border-white/15"
								: "border-white/10",
					)}
				>
					<HugeiconsIcon
						icon={UploadIcon}
						className={cn(
							"size-8",
							showCancel
								? "text-white/45"
								: errorMessage
									? "text-red-200/85"
									: "text-white/85",
						)}
					/>
				</div>
			</div>

			{/* Heading + subtext */}
			<div
				className={cn(
					"relative max-w-md space-y-2",
					phase === "visible" && "drop-text-float",
				)}
			>
				{showCancel ? (
					<>
						<h3 className="font-serif text-lg text-white/55">Drop cancelled</h3>
						<p className="text-muted-foreground mx-auto max-w-sm text-xs leading-relaxed text-white/45">
							Nothing was imported. Drop a file here anytime to add it to the
							project.
						</p>
					</>
				) : errorMessage ? (
					<>
						<h3 className="font-serif text-lg text-red-100">
							That file isn't supported
						</h3>
						<p className="text-muted-foreground mx-auto max-w-sm text-xs leading-relaxed text-white/55">
							{errorMessage}
						</p>
					</>
				) : showProcessing ? (
					<>
						<h3 className="font-serif text-lg text-white">Adding your media</h3>
						<p className="text-muted-foreground mx-auto max-w-sm text-xs leading-relaxed">
							Processing your files ({progress}%)
						</p>
					</>
				) : (
					<>
						<h3 className="font-serif text-lg text-white">
							Your creative journey begins here
						</h3>
						<p className="text-muted-foreground mx-auto max-w-sm text-xs leading-relaxed">
							Release to import, or drag back out to cancel.
						</p>
					</>
				)}
			</div>

			{/* CTA — only visible in the inviting (visible) state */}
			{phase === "visible" && !showProcessing && !errorMessage && (
				<span className="relative rounded-lg border border-white/10 bg-white/[0.08] px-4 py-2 text-xs text-white/85">
					Import media
				</span>
			)}

			{/* Progress bar while processing */}
			{showProcessing && (
				<div className="relative w-full max-w-xs">
					<div className="h-2 w-full rounded-full bg-white/10">
						<div
							className="h-2 rounded-full bg-white transition-all duration-150"
							style={{ width: `${progress}%` }}
						/>
					</div>
				</div>
			)}

			{/* Cancel hint when the user pulled the drag out */}
			{showCancel && (
				<span className="relative inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/45">
					<HugeiconsIcon icon={Cancel01Icon} className="size-3" />
					Cancelled
				</span>
			)}
		</button>
	);
}
