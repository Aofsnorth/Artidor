"use client";

import { useEffect, useRef } from "react";
import {
	useAssetsPanelStore,
	VISIBLE_TAB_KEYS,
} from "@/stores/assets-panel-store";
import { usePropertiesStore } from "@/components/editor/panels/properties/stores/properties-store";
import { useEditor } from "@/hooks/use-editor";

export interface ProjectSessionSnapshot {
	activeAssetsTab: string | null;
	activeInspectorTabs: Record<string, string> | null;
	playheadTime: number | null;
}

function buildSessionKey({
	projectId,
}: {
	projectId: string | null;
}): string | null {
	if (!projectId) return null;
	return `artidor:editor-session:v1:${projectId}`;
}

function isValidInspectorTabMap(
	value: unknown,
): value is Record<string, string> {
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
	const setInspectorTab = usePropertiesStore((state) => state.setActiveTab);
	// Restore once per project id: switching projects client-side must load the
	// new project's tabs/playhead instead of being skipped by a boolean flag.
	const restoredProjectIdRef = useRef<string | null>(null);
	const pendingSnapshotRef = useRef<ProjectSessionSnapshot | null>(null);
	const saveTimerRef = useRef<number | null>(null);

	useEffect(() => {
		if (!projectId) {
			restoredProjectIdRef.current = null;
			return;
		}
		if (restoredProjectIdRef.current === projectId) return;
		const snapshot = readSession({ projectId });
		restoredProjectIdRef.current = projectId;
		if (!snapshot) return;
		if (
			typeof snapshot.activeAssetsTab === "string" &&
			(VISIBLE_TAB_KEYS as readonly string[]).includes(snapshot.activeAssetsTab)
		) {
			setActiveTab(
				snapshot.activeAssetsTab as (typeof VISIBLE_TAB_KEYS)[number],
			);
		}
		if (snapshot.activeInspectorTabs) {
			for (const [elementType, tabId] of Object.entries(
				snapshot.activeInspectorTabs,
			)) {
				setInspectorTab(elementType, tabId);
			}
		}
		if (
			typeof snapshot.playheadTime === "number" &&
			snapshot.playheadTime >= 0
		) {
			editor.playback.seek({ time: snapshot.playheadTime });
		}
	}, [projectId, setActiveTab, setInspectorTab, editor]);

	useEffect(() => {
		if (!projectId) return;

		// Read the playhead when the snapshot is written, not when the tab or
		// inspector last changed; otherwise a paused playhead is saved stale.
		const captureSnapshot = (): ProjectSessionSnapshot => ({
			activeAssetsTab: activeTab,
			activeInspectorTabs: { ...activeInspectorTabs },
			playheadTime: editor.playback.getCurrentTime(),
		});

		const flush = () => {
			pendingSnapshotRef.current = null;
			try {
				writeSession({ projectId, snapshot: captureSnapshot() });
			} catch {
				// Session restore is best-effort; never break pagehide/unmount.
			}
		};

		pendingSnapshotRef.current = captureSnapshot();

		if (saveTimerRef.current === null) {
			saveTimerRef.current = window.setTimeout(() => {
				saveTimerRef.current = null;
				const next = pendingSnapshotRef.current;
				pendingSnapshotRef.current = null;
				if (!next) return;
				writeSession({
					projectId,
					snapshot: {
						...next,
						playheadTime: editor.playback.getCurrentTime(),
					},
				});
			}, 250);
		}

		// A tab close does not run React cleanups, so persist the current
		// playhead explicitly.
		window.addEventListener("pagehide", flush);

		return () => {
			window.removeEventListener("pagehide", flush);
			if (saveTimerRef.current !== null) {
				window.clearTimeout(saveTimerRef.current);
				saveTimerRef.current = null;
			}
			pendingSnapshotRef.current = null;
			flush();
		};
	}, [activeTab, activeInspectorTabs, editor, projectId]);
}
