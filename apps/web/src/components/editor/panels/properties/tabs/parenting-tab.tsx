"use client";

import { Button } from "@/components/ui/button";
import { useEditor } from "@/hooks/use-editor";
import { getElementDisplayName } from "@/lib/timeline";
import type {
	TimelineElement,
	TimelineTrack,
	VisualElement,
} from "@/lib/timeline";
import {
	Link01Icon,
	Layers01Icon,
	UnlinkIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo } from "react";

export function ParentingTab({
	element,
	trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	const editor = useEditor();
	const scene = useEditor((e) => e.scenes.getActiveSceneOrNull());
	const mediaAssets = useEditor((e) => e.media.getAssets());
	const labelFor = (candidate: TimelineElement) =>
		getElementDisplayName({
			element: candidate,
			mediaName:
				"mediaId" in candidate
					? mediaAssets.find((asset) => asset.id === candidate.mediaId)?.name
					: undefined,
		});
	const tracks = useMemo<TimelineTrack[]>(() => {
		if (!scene) return [];
		return [...scene.tracks.overlay, scene.tracks.main, ...scene.tracks.audio];
	}, [scene]);
	const elements = useMemo<TimelineElement[]>(() => {
		const result: TimelineElement[] = [];
		for (const track of tracks) {
			result.push(...(track.elements as TimelineElement[]));
		}
		return result;
	}, [tracks]);
	const parent = element.parentId
		? elements.find((candidate) => candidate.id === element.parentId)
		: null;
	const directChildren = elements.filter(
		(candidate) => (candidate as { parentId?: string }).parentId === element.id,
	);
	const candidates = elements.filter(
		(candidate) =>
			candidate.id !== element.id &&
			isVisualTimelineElement(candidate) &&
			(candidate as { parentId?: string }).parentId !== element.id,
	);

	function setParent(parentId: string | undefined) {
		editor.timeline.setParent({
			ref: { trackId, elementId: element.id },
			parentId,
		});
	}

	return (
		<div className="flex flex-col gap-4 p-3">
			<section className="glass rounded-lg p-3">
				<header className="flex items-center gap-2">
					<HugeiconsIcon icon={Link01Icon} size={14} />
					<h3 className="text-sm font-medium">Link Parent Layer</h3>
				</header>
				<p className="text-muted-foreground mt-2 text-xs leading-relaxed">
					Connect this layer to another one. Parent movement, rotation, and
					scale will drive the child layer, like Alight Motion's parent-child
					rigging.
				</p>
				<label
					className="mt-3 block text-xs font-medium"
					htmlFor="parent-layer-select"
				>
					Parent
				</label>
				<select
					id="parent-layer-select"
					className="bg-secondary border-secondary-border text-foreground mt-1 w-full rounded-md border px-2 py-2 text-sm"
					value={element.parentId ?? ""}
					onChange={(event) => setParent(event.target.value || undefined)}
				>
					<option value="">None</option>
					{candidates.map((candidate) => (
						<option key={candidate.id} value={candidate.id}>
							{labelFor(candidate)} ({candidate.type})
						</option>
					))}
				</select>
				{parent && (
					<Button
						variant="outline"
						className="mt-3 w-full"
						size="sm"
						onClick={() =>
							editor.timeline.unlinkParent({
								ref: { trackId, elementId: element.id },
							})
						}
					>
						<HugeiconsIcon icon={UnlinkIcon} size={14} />
						Unlink {labelFor(parent)}
					</Button>
				)}
			</section>

			<section className="glass rounded-lg p-3">
				<header className="flex items-center gap-2">
					<HugeiconsIcon icon={Layers01Icon} size={14} />
					<h3 className="text-sm font-medium">Children</h3>
				</header>
				{directChildren.length === 0 ? (
					<p className="text-muted-foreground mt-2 text-xs">
						No child layers linked to this layer.
					</p>
				) : (
					<ul className="mt-3 flex flex-col gap-1.5">
						{directChildren.map((child) => (
							<li
								key={child.id}
								className="bg-secondary/40 flex items-center justify-between rounded-md px-2 py-1.5 text-xs"
							>
								<span className="truncate">{labelFor(child)}</span>
								<span className="text-muted-foreground">{child.type}</span>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}

function isVisualTimelineElement(
	element: TimelineElement,
): element is VisualElement {
	return (
		element.type === "video" ||
		element.type === "image" ||
		element.type === "text" ||
		element.type === "sticker" ||
		element.type === "graphic"
	);
}
