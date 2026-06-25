"use client";

import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { cn } from "@/utils/ui";
import { Download, X } from "lucide-react";

interface ExportModalProps {
	isOpen: boolean;
	progress: number;
	onCancel: () => void;
}

export function ExportModal({ isOpen, progress, onCancel }: ExportModalProps) {
	// Prevent all keyboard shortcuts and escape key when modal is open
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			// Allow escape to cancel
			if (e.key === "Escape") {
				e.preventDefault();
				onCancel();
				return;
			}
			// Block all other keys
			e.preventDefault();
			e.stopPropagation();
		};

		const handleKeyUp = (e: KeyboardEvent) => {
			e.preventDefault();
			e.stopPropagation();
		};

		window.addEventListener("keydown", handleKeyDown, true);
		window.addEventListener("keyup", handleKeyUp, true);

		return () => {
			window.removeEventListener("keydown", handleKeyDown, true);
			window.removeEventListener("keyup", handleKeyUp, true);
		};
	}, [isOpen, onCancel]);

	if (!isOpen) return null;

	// Stop all pointer events on the backdrop so clicks outside the card don't cancel export
	const handleBackdropMouseDown = (e: React.PointerEvent) => {
		e.preventDefault();
		e.stopPropagation();
	};

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Export progress"
			className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md select-none"
			onPointerDownCapture={handleBackdropMouseDown}
			onContextMenu={(e) => {
				e.preventDefault();
				e.stopPropagation();
			}}
		>
			{/* Card: stopPropagation so clicks inside don't bubble up */}
			<div
				className="relative w-full max-w-md mx-4 rounded-xl border border-white/10 bg-gradient-to-b from-[#0a0a0a] to-[#050505] p-8 shadow-2xl"
				onPointerDownCapture={(e) => e.stopPropagation()}
			>
				{/* Close button - top right (only way to cancel besides Cancel button) */}
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onCancel();
					}}
					className="absolute top-4 right-4 rounded-md p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
					aria-label="Cancel export"
				>
					<X className="h-4 w-4" />
				</button>

				{/* Content */}
				<div className="flex flex-col items-center space-y-6">
					{/* Header with icon */}
					<div className="flex flex-col items-center space-y-3 pt-2">
						{/* Animated download icon */}
						<div className="relative">
							<div className="absolute inset-0 rounded-full bg-white/10 blur-xl animate-pulse" />
							<div className="relative flex size-14 items-center justify-center rounded-full border border-white/15 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
								<Download className="size-6 text-white" />
							</div>
						</div>

						<div className="text-center">
							<h2 className="font-sans text-lg font-semibold tracking-wide text-white">
								Exporting Project
							</h2>
							<p className="mt-1 text-xs font-light text-white/50">
								Please wait while we render your video...
							</p>
						</div>
					</div>

					{/* Progress circle */}
					<div className="relative flex items-center justify-center">
						<svg
							aria-hidden="true"
							className="h-36 w-36 -rotate-90 transform"
							viewBox="0 0 100 100"
						>
							{/* Background ring */}
							<circle
								cx="50"
								cy="50"
								r="42"
								stroke="currentColor"
								strokeWidth="6"
								fill="transparent"
								className="text-white/8"
							/>
							{/* Progress ring */}
							<circle
								cx="50"
								cy="50"
								r="42"
								stroke="currentColor"
								strokeWidth="6"
								fill="transparent"
								strokeDasharray={2 * Math.PI * 42}
								strokeDashoffset={2 * Math.PI * 42 * (1 - progress)}
								className="text-white transition-all duration-300 ease-out"
								strokeLinecap="round"
							/>
						</svg>
						<div className="absolute flex flex-col items-center">
							<span className="font-sans text-3xl font-bold tabular-nums text-white">
								{(progress * 100).toFixed(1)}
								<span className="text-lg font-medium text-white/50">%</span>
							</span>
						</div>
					</div>

					{/* Cancel button */}
					<Button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onCancel();
						}}
						className={cn(
							"w-full gap-2 rounded-lg border border-white/15 bg-white/5 py-5",
							"text-white/70 hover:bg-white/10 hover:text-white hover:border-white/25",
							"transition-all duration-200 font-sans text-xs uppercase tracking-widest font-semibold",
						)}
					>
						Cancel Export
					</Button>

					{/* Warning */}
					<p className="text-[10px] font-light text-white/30 text-center">
						Press{" "}
						<kbd className="rounded border border-white/15 bg-white/5 px-1 py-0.5 font-mono text-[10px]">
							Esc
						</kbd>{" "}
						to abort the export
					</p>
				</div>
			</div>
		</div>
	);
}
