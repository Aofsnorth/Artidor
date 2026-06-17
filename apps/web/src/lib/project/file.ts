import type { TProject } from "@/lib/project/types";
import type { UserPreset } from "@/lib/presets/types";
import { getProjectDurationFromScenes } from "@/lib/scenes";
import { generateUUID } from "@/utils/id";

export type ArtidorFileKind = "artidor-project" | "artidor-preset";

export interface ArtidorFile<TPayload> {
	version: 1;
	kind: ArtidorFileKind;
	createdAt: string;
	payload: TPayload;
}

export function exportProject(project: TProject) {
	downloadJson({
		name: `${safeFileName(project.metadata.name || "project")}.artidor`,
		data: wrapArtidorFile({ kind: "artidor-project", payload: project }),
	});
}

export async function importProject(file: File): Promise<TProject> {
	const data = await parseArtidorFile<TProject>({
		file,
		kind: "artidor-project",
	});
	const now = new Date();
	const project = reviveProjectDates(data.payload);
	return {
		...project,
		metadata: {
			...project.metadata,
			id: generateUUID(),
			name: project.metadata.name || file.name.replace(/\.[^/.]+$/, ""),
			thumbnail: project.metadata.thumbnail,
			duration: getProjectDurationFromScenes({ scenes: project.scenes }),
			createdAt: now,
			updatedAt: now,
			googleDriveFolderId: null,
			googleDriveFileId: null,
		},
	};
}

export function exportPreset(preset: UserPreset) {
	downloadJson({
		name: `${safeFileName(preset.name || "preset")}.artidor`,
		data: wrapArtidorFile({ kind: "artidor-preset", payload: preset }),
	});
}

export async function importPreset(file: File): Promise<UserPreset> {
	const data = await parseArtidorFile<UserPreset>({
		file,
		kind: "artidor-preset",
	});
	return {
		...data.payload,
		id: generateUUID(),
		createdAt: Date.now(),
	};
}

function wrapArtidorFile<TPayload>({
	kind,
	payload,
}: {
	kind: ArtidorFileKind;
	payload: TPayload;
}): ArtidorFile<TPayload> {
	return {
		version: 1,
		kind,
		createdAt: new Date().toISOString(),
		payload,
	};
}

async function parseArtidorFile<TPayload>({
	file,
	kind,
}: {
	file: File;
	kind: ArtidorFileKind;
}): Promise<ArtidorFile<TPayload>> {
	const data = JSON.parse(await file.text()) as
		| ArtidorFile<TPayload>
		| TPayload;
	if (isArtidorFile<TPayload>(data)) {
		if (data.kind !== kind) {
			throw new Error(`Expected ${kind} file`);
		}
		return data;
	}
	return wrapArtidorFile({ kind, payload: data });
}

function isArtidorFile<TPayload>(data: unknown): data is ArtidorFile<TPayload> {
	return (
		typeof data === "object" &&
		data !== null &&
		"version" in data &&
		"kind" in data &&
		"payload" in data
	);
}

function downloadJson({ name, data }: { name: string; data: unknown }) {
	const blob = new Blob([JSON.stringify(data, null, 2)], {
		type: "application/json",
	});
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = name;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

function safeFileName(name: string): string {
	return name.replace(/[<>:"/\\|?*]+/g, "-").trim() || "artidor";
}

function reviveProjectDates(project: TProject): TProject {
	return {
		...project,
		metadata: {
			...project.metadata,
			createdAt: new Date(project.metadata.createdAt),
			updatedAt: new Date(project.metadata.updatedAt),
		},
		scenes: project.scenes.map((scene) => ({
			...scene,
			createdAt: new Date(scene.createdAt),
			updatedAt: new Date(scene.updatedAt),
		})),
	};
}
