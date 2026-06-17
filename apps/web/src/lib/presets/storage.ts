import { IndexedDBAdapter } from "@/services/storage/indexeddb-adapter";
import type { UserPreset } from "./types";

/**
 * Persistent store for user-saved presets. Presets live in their own IndexedDB
 * database (independent of projects) so they're available across every project.
 */
const presetsAdapter = new IndexedDBAdapter<UserPreset>(
	"video-editor-presets",
	"presets",
	1,
);

export async function loadAllPresets(): Promise<UserPreset[]> {
	const presets = await presetsAdapter.getAll();
	return presets.sort((a, b) => b.createdAt - a.createdAt);
}

export async function savePreset({
	preset,
}: {
	preset: UserPreset;
}): Promise<void> {
	await presetsAdapter.set(preset.id, preset);
}

export async function deletePreset({ id }: { id: string }): Promise<void> {
	await presetsAdapter.remove(id);
}

export async function renamePreset({
	id,
	name,
}: {
	id: string;
	name: string;
}): Promise<UserPreset | null> {
	const preset = await presetsAdapter.get(id);
	if (!preset) return null;
	const updated: UserPreset = { ...preset, name };
	await presetsAdapter.set(id, updated);
	return updated;
}
