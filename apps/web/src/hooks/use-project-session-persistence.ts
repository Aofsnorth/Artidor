"use client";

import { useEffect, useRef } from "react";
import { useAssetsPanelStore, VISIBLE_TAB_KEYS } from "@/stores/assets-panel-store";
import { usePropertiesStore } from "@/components/editor/panels/properties/stores/properties-store";
import { useEditor } from "@/hooks/use-editor";

export interface ProjectSessionSnapshot {
	activeAssetsTab: string | null;
	activeInspectorTabs: Record<string, string> | null;
	playheadTime: number | null;
}

function buildSessionKey({ projectId }: { projectId: string | null }): string | null {
	if (!projectId) return null;
	return `artidor:editor-session:v1:${projectId}`;
}

function isValidInspectorTabMap(value: unknown): value is Record<string, string> {
	if (!value || typeof value !== "object") return false;
	for (const entry of Object.values(value as Record<string, unknown>)) {
		if (typeof entry !== "string") return false;
	}
	return true;
}

function readSession({
	projectId,
}: {
	projectId: string | null;
}): ProjectSessionSnapshot | null {
	if (typeof window === "undefined") return null;
	const key = buildSessionKey({ projectId });
	if (!key) return null;
	try {
		const raw = window.localStorage.getItem(key);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object") return null;
		const activeAssetsTab =
			typeof parsed.activeAssetsTab === "string"
				? parsed.activeAssetsTab
				: null;
		const activeInspectorTabs = isValidInspectorTabMap(
			parsed.activeInspectorTabs,
		)
			? parsed.activeInspectorTabs
			: null;
		const playheadTime =
			typeof parsed.playheadTime === "number" &&
			Number.isFinite(parsed.playheadTime)
				? parsed.playheadTime
				: null;
		return { activeAssetsTab, activeInspectorTabs, playheadTime };
	} catch {
		return null;
	}
}

function writeSession({
	projectId,
	snapshot,
}: {
	projectId: string | null;
	snapshot: ProjectSessionSnapshot;
}): void {
	if (typeof window === "undefined") return;
	const key = buildSessionKey({ projectId });
	if (!key) return;
	try {
		window.localStorage.setItem(key, JSON.stringify(snapshot));
	} catch {
		// ignore quota/serialization failures
	}
}

export function useProjectSessionPersistence({
	projectId,
}: {
	projectId: string | null;
}) {
	const editor = useEditor();
	const activeTab = useAssetsPanelStore((state) => state.activeTab);
	const setActiveTab = useAssetsPanelStore((state) => state.setActiveTab);
	const activeInspectorTabs = usePropertiesStore(
		(state) => state.activeTabPerType,
	);
	const restoredRef = useRef(false);
	const pendingSnapshotRef = useRef<ProjectSessionSnapshot | null>(null);
	const saveTimerRef = useRef<number | null>(null);

	useEffect(() => {
		if (restoredRef.current || !projectId) return;
		const snapshot = readSession({ projectId });
		restoredRef.current = true;
		if (!snapshot) return;
		if (
			typeof snapshot.activeAssetsTab === "string" &&
			(VISIBLE_TAB_KEYS as readonly string[]).includes(snapshot.activeAssetsTab)
		) {
			setActiveTab(snapshot.activeAssetsTab as (typeof VISIBLE_TAB_KEYS)[number]);
		}
		if (
			typeof snapshot.playheadTime === "number" &&
			snapshot.playheadTime >= 0
		) {
			editor.playback.seek({ time: snapshot.playheadTime });
		}
	}, [projectId, setActiveTab, editor]);

	useEffect(() => {
		if (!projectId) return;
		const snapshot: ProjectSessionSnapshot = {
			activeAssetsTab: activeTab,
			activeInspectorTabs: { ...activeInspectorTabs },
			playheadTime: editor.playback.getCurrentTime(),
		};
		pendingSnapshotRef.current = snapshot;
		if (saveTimerRef.current !== null) return;
		saveTimerRef.current = window.setTimeout(() => {
			const next = pendingSnapshotRef.current;
			saveTimerRef.current = null;
			if (next) writeSession({ projectId, snapshot: next });
		}, 250);
		return () => {
			if (saveTimerRef.current !== null) {
				window.clearTimeout(saveTimerRef.current);
				saveTimerRef.current = null;
			}
			const next = pendingSnapshotRef.current;
			pendingSnapshotRef.current = null;
			if (next) writeSession({ projectId, snapshot: next });
		};
	}, [activeTab, activeInspectorTabs, editor, projectId]);
}
