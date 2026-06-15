"use client";

import { Button } from "@/components/ui/button";
import { useEditor } from "@/hooks/use-editor";
import {
	Camera01Icon,
	Layers01Icon,
	ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function CameraTab() {
	const editor = useEditor();
	const scene = useEditor((e) => e.scenes.getActiveSceneOrNull());
	const tracks = scene
		? [...scene.tracks.overlay, scene.tracks.main, ...scene.tracks.audio]
		: [];
	const cameraLayers = tracks.flatMap((track) =>
		track.elements.filter(
			(element) => (element as { type?: string }).type === "camera",
		),
	);
	const nullLayers = tracks.flatMap((track) =>
		track.elements.filter(
			(element) => (element as { nullLayer?: boolean }).nullLayer,
		),
	);

	return (
		<div className="flex flex-col gap-4 p-3">
			<section className="glass rounded-lg p-3">
				<header className="flex items-center gap-2">
					<HugeiconsIcon icon={Camera01Icon} size={14} />
					<h3 className="text-sm font-medium">3D Camera</h3>
				</header>
				<p className="text-muted-foreground mt-2 text-xs leading-relaxed">
					Add a Blurrr-style camera layer. Camera layers can be keyframed and
					used as global scene controls for 3D motion workflows.
				</p>
				<Button
					className="mt-3 w-full"
					size="sm"
					onClick={() => editor.timeline.insertCameraLayer()}
				>
					<HugeiconsIcon icon={Camera01Icon} size={14} />
					Add camera layer
				</Button>
			</section>

			<section className="glass rounded-lg p-3">
				<header className="flex items-center gap-2">
					<HugeiconsIcon icon={Layers01Icon} size={14} />
					<h3 className="text-sm font-medium">Null Objects</h3>
				</header>
				<p className="text-muted-foreground mt-2 text-xs leading-relaxed">
					Create invisible parent anchors for rigging, grouping, and camera
					movement.
				</p>
				<Button
					variant="outline"
					className="mt-3 w-full"
					size="sm"
					onClick={() => editor.timeline.insertNullLayer()}
				>
					Add null object
				</Button>
			</section>

			<section className="flex flex-col gap-2">
				<div className="text-muted-foreground flex items-center gap-2 text-xs uppercase tracking-[0.18em]">
					<HugeiconsIcon icon={ViewIcon} size={12} />
					Scene Layers
				</div>
				<LayerSummary label="Cameras" count={cameraLayers.length} />
				<LayerSummary label="Nulls" count={nullLayers.length} />
			</section>
		</div>
	);
}

function LayerSummary({ label, count }: { label: string; count: number }) {
	return (
		<div className="bg-secondary/40 flex items-center justify-between rounded-md px-3 py-2 text-xs">
			<span>{label}</span>
			<span className="text-muted-foreground tabular-nums">{count}</span>
		</div>
	);
}
