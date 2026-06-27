"use client";

/**
 * Copy/Paste property buttons — a compact pair of icon buttons that
 * copy a single property category (e.g. just Transform, just Effects,
 * just Text Style) from the selected element and paste it onto other
 * elements. This is independent from the global Copy Style / Paste
 * Style (which copies ALL properties at once).
 *
 * Usage: place inside a Section's `trailing` prop.
 *
 *   <SectionHeader
 *     trailing={
 *       <CopyPasteButtons
 *         category="Transform"
 *         extract={(el) => ({
 *           transform: "transform" in el ? { ...el.transform } : undefined,
 *         })}
 *       />
 *     }
 *   >
 */

import { useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Copy01Icon,
	ClipboardPasteIcon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { useEditor } from "@/hooks/use-editor";
import type { TimelineElement } from "@/lib/timeline";
import type { ElementStyle } from "@/lib/clipboard/types";
import { cn } from "@/utils/ui";

export function CopyPasteButtons({
	category,
	extract,
	className,
}: {
	/** Human-readable label shown in tooltips/toasts. */
	category: string;
	/**
	 * Pick the relevant fields from the source element. Only the fields
	 * present in the returned partial style are copied and pasted.
	 */
	extract: (element: TimelineElement) => ElementStyle;
	className?: string;
}) {
	const editor = useEditor();

	const handleCopy = useCallback(() => {
		const ok = editor.clipboard.copyProperty({ category, extract });
		if (ok) {
			toast.success(`${category} copied`);
		} else {
			toast.error(`Nothing to copy for ${category}`);
		}
	}, [editor, category, extract]);

	const handlePaste = useCallback(() => {
		const entry = editor.clipboard.getPropertyEntry();
		if (!entry) {
			toast.error("No property copied yet");
			return;
		}
		const ok = editor.clipboard.pasteProperty();
		if (ok) {
			toast.success(`${entry.category} pasted`);
		} else {
			toast.error("Nothing to paste onto");
		}
	}, [editor]);

	const hasProperty = editor.clipboard.hasPropertyEntry();
	const propertyCategory = editor.clipboard.getPropertyEntry()?.category;

	return (
		<div className={cn("flex items-center gap-0.5", className)}>
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					handleCopy();
				}}
				title={`Copy ${category}`}
				className={cn(
					"flex size-6 items-center justify-center rounded-md",
					"text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white/70",
				)}
			>
				<HugeiconsIcon icon={Copy01Icon} className="size-3" />
			</button>
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					handlePaste();
				}}
				disabled={!hasProperty}
				title={
					hasProperty
						? `Paste ${propertyCategory ?? category}`
						: "No property copied yet"
				}
				className={cn(
					"flex size-6 items-center justify-center rounded-md transition-colors",
					hasProperty
						? "text-white/40 hover:bg-white/[0.08] hover:text-white/70"
						: "cursor-not-allowed text-white/15",
				)}
			>
				<HugeiconsIcon icon={ClipboardPasteIcon} className="size-3" />
			</button>
		</div>
	);
}
