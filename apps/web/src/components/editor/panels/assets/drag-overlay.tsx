import { HugeiconsIcon } from "@hugeicons/react";
import { UploadIcon } from "@hugeicons/core-free-icons";

interface MediaDragOverlayProps {
	isVisible: boolean;
	isProcessing?: boolean;
	progress?: number;
	onClick?: () => void;
}

export function MediaDragOverlay({
	isVisible,
	isProcessing = false,
	progress = 0,
	onClick,
}: MediaDragOverlayProps) {
	if (!isVisible) return null;

	const handleClick = ({
		event,
	}: {
		event: React.MouseEvent<HTMLButtonElement>;
	}) => {
		if (isProcessing || !onClick) return;
		event.preventDefault();
		event.stopPropagation();
		onClick();
	};

	return (
		<button
			className="glass relative flex min-h-[20rem] w-full flex-col items-center justify-center gap-5 overflow-hidden rounded-xl p-8 text-center transition hover:bg-white/[0.08]"
			type="button"
			disabled={isProcessing || !onClick}
			onClick={(event) => handleClick({ event })}
		>
			<div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_58%_22%,rgba(255,255,255,0.16),transparent_24%),radial-gradient(circle_at_50%_36%,rgba(255,255,255,0.06),transparent_36%)]" />
			<div className="relative grid size-24 place-items-center rounded-full border border-white/10 bg-black/35 shadow-inner shadow-white/10">
				<div className="absolute size-40 rounded-full border border-dashed border-white/10" />
				<div className="absolute size-28 rounded-full border border-dashed border-white/15" />
				<HugeiconsIcon icon={UploadIcon} className="size-8 text-white/80" />
			</div>

			<div className="relative space-y-2">
				<h3 className="font-serif text-lg text-white">Your creative journey begins here</h3>
				<p className="text-muted-foreground mx-auto max-w-sm text-xs leading-relaxed">
					{isProcessing
						? `Processing your files (${progress}%)`
						: "Import media or drag and drop to get started."}
				</p>
			</div>

			{!isProcessing && (
				<span className="relative rounded-lg border border-white/10 bg-white/[0.08] px-4 py-2 text-xs text-white/85">
					Import media
				</span>
			)}

			{isProcessing && (
				<div className="relative w-full max-w-xs">
					<div className="h-2 w-full rounded-full bg-white/10">
						<div
							className="h-2 rounded-full bg-white"
							style={{ width: `${progress}%` }}
						/>
					</div>
				</div>
			)}
		</button>
	);
}
