"use client";

import { useI18n } from "@/lib/i18n";
import { useEditor } from "@/hooks/use-editor";
import { summarizeProjectDetails } from "./project-details-summary";

export function ProjectDetailsCard() {
	const { t } = useI18n();
	const project = useEditor((editor) => editor.project.getActive());
	const scene = useEditor((editor) => editor.scenes.getActiveSceneOrNull());
	const mediaCount = useEditor((editor) => editor.media.getAssets().length);

	if (!project) {
		return null;
	}

	const trackCount = scene
		? scene.tracks.overlay.length + scene.tracks.audio.length + 1
		: 0;
	const details = summarizeProjectDetails({
		name: project.metadata.name,
		durationTicks: project.metadata.duration,
		fps: project.settings.fps,
		canvasSize: project.settings.canvasSize,
		trackCount,
		mediaCount,
	});

	return (
		<aside
			aria-label={t("editor.projectDetails")}
			className="w-full shrink-0 rounded-lg border border-white/10 bg-card/65 p-2 text-[0.65rem] text-white/55"
		>
			<div className="truncate font-medium text-white/90" title={details.name}>
				{details.name}
			</div>
			<dl className="mt-2 grid gap-1">
				<ProjectDetail label={t("editor.duration")} value={details.duration} />
				<ProjectDetail label={t("editor.frameRate")} value={details.frameRate} />
				<ProjectDetail label={t("editor.resolution")} value={details.resolution} />
				<ProjectDetail label={t("editor.tracks")} value={details.tracks} />
				<ProjectDetail label={t("editor.media")} value={details.media} />
			</dl>
		</aside>
	);
}

function ProjectDetail({ label, value }: { label: string; value: string }) {
	return (
		<div className="min-w-0">
			<dt className="text-white/35">{label}</dt>
			<dd className="truncate text-white/75" title={value}>
				{value}
			</dd>
		</div>
	);
}
