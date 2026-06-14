import { HugeiconsIcon } from "@hugeicons/react";
import { SlidersHorizontalIcon } from "@hugeicons/core-free-icons";

export function EmptyView() {
	return (
		<div className="bg-transparent flex h-full flex-col items-center justify-center gap-3.5 p-4 select-none">
			<div className="grid size-12 place-items-center rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/40 shadow-inner">
				<HugeiconsIcon
					icon={SlidersHorizontalIcon}
					className="size-5"
				/>
			</div>
			<div className="flex flex-col gap-1.5 text-center">
				<p className="text-[0.85rem] font-semibold text-white/80">It&apos;s empty here</p>
				<p className="text-[0.68rem] text-white/45 max-w-[190px] leading-relaxed mx-auto">
					Click an element on the timeline to edit its properties
				</p>
			</div>
		</div>
	);
}
