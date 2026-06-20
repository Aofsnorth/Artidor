"use client";

import type { ReactNode } from "react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useEditor } from "@/hooks/use-editor";
import { useKeyframeSelection } from "@/hooks/timeline/element/use-keyframe-selection";
import type { KeyframeEasingMode } from "@/lib/animation";
import type { SelectedKeyframeRef } from "@/lib/animation/types";

const EASING_OPTIONS: ReadonlyArray<{
	mode: KeyframeEasingMode;
	label: string;
	shortcut?: string;
}> = [
	{ mode: "ease", label: "Easy Ease", shortcut: "F9" },
	{ mode: "ease-in", label: "Ease In" },
	{ mode: "ease-out", label: "Ease Out" },
	{ mode: "linear", label: "Linear" },
	{ mode: "hold", label: "Hold" },
];

/**
 * Wraps a keyframe diamond with an After-Effects-style "Keyframe Assistant"
 * right-click menu (Easy Ease / Ease In / Ease Out / Linear / Hold).
 *
 * The chosen preset applies to the whole keyframe selection when the
 * right-clicked keyframe is part of it; otherwise it first selects just that
 * keyframe and applies to it alone — matching standard NLE behaviour.
 */
export function KeyframeContextMenu({
	keyframe,
	children,
}: {
	keyframe: SelectedKeyframeRef;
	children: ReactNode;
}) {
	const editor = useEditor();
	const { selectedKeyframes, isKeyframeSelected, setKeyframeSelection } =
		useKeyframeSelection();

	const getTargets = () => {
		const alreadySelected = isKeyframeSelected({ keyframe });
		if (alreadySelected) return selectedKeyframes;
		setKeyframeSelection({ keyframes: [keyframe] });
		return [keyframe];
	};

	const applyMode = (mode: KeyframeEasingMode) => {
		editor.timeline.applyKeyframeEasing({ keyframes: getTargets(), mode });
	};

	const deleteKeyframe = () => {
		editor.timeline.removeKeyframes({ keyframes: getTargets() });
	};

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent className="min-w-44">
				<ContextMenuLabel className="text-xs">
					Keyframe Assistant
				</ContextMenuLabel>
				<ContextMenuSeparator />
				{EASING_OPTIONS.map((option) => (
					<ContextMenuItem
						key={option.mode}
						textRight={option.shortcut}
						onSelect={() => applyMode(option.mode)}
					>
						{option.label}
					</ContextMenuItem>
				))}
				<ContextMenuSeparator />
				<ContextMenuItem
					variant="destructive"
					icon={<HugeiconsIcon icon={Delete02Icon} />}
					onSelect={deleteKeyframe}
				>
					Delete keyframe
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
