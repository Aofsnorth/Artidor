"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { EditorCore } from "@/core";
import { startEditorBridge } from "@/lib/api/bridge";
import { CommandPalette } from "@/components/editor/command-palette";
import { useEditor } from "@/hooks/use-editor";
import { useKeybindingsListener } from "@/hooks/use-keybindings";
import { useKeybindingsStore } from "@/stores/keybindings-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useViewerStore } from "@/stores/viewer-store";
import { useEditorActions } from "@/hooks/actions/use-editor-actions";
import { loadFontAtlas } from "@/lib/fonts/google-fonts";
import {
	initializeGpuRenderer,
	isGpuAvailable,
} from "@/services/renderer/gpu-renderer";

interface EditorProviderProps {
	projectId: string;
	children: React.ReactNode;
}

export function EditorProvider({ projectId, children }: EditorProviderProps) {
	const activeProject = useEditor((e) => e.project.getActiveOrNull());
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const { setLoadingProject } = useKeybindingsStore();
	const setViewer = useViewerStore((s) => s.setViewer);

	useEffect(() => {
		setLoadingProject(isLoading);
	}, [isLoading, setLoadingProject]);

	// Read-only viewer enforcement. `EditorCore` is a singleton that survives
	// client navigation, so `command.readOnly` MUST be set on every mount —
	// both to turn it ON for shared links and to turn it back OFF when the
	// same tab later opens an owned project. We read the share id straight from
	// `window.location.search` (rather than `useSearchParams`) so the provider
	// doesn't force the whole editor route into a Suspense boundary at build
	// time; viewer mode is a client-only concern keyed on `projectId` changes.
	// biome-ignore lint/correctness/useExhaustiveDependencies: projectId is an intentional trigger — re-deriving read-only state on every project navigation, even though the value is read from the URL inside the effect.
	useEffect(() => {
		const editor = EditorCore.getInstance();
		const shareId = new URLSearchParams(window.location.search).get("share");
		const isViewer = Boolean(shareId);
		editor.command.readOnly = isViewer;
		setViewer({ isViewer, shareId });
		return () => {
			// Clear the viewer mirror on unmount. We don't fail-safe to
			// read-only here: that would brick an owned project if React
			// remounts the provider. The next mount re-derives the
			// authoritative flag from its own URL.
			setViewer({ isViewer: false, shareId: null });
		};
	}, [projectId, setViewer]);

	useEffect(() => {
		let cancelled = false;
		const editor = EditorCore.getInstance();

		const loadProject = async () => {
			try {
				setIsLoading(true);
				// Load the project first so the editor shell appears immediately.
				// Do NOT block the loading screen on GPU init — WebGPU pipeline
				// compilation can take several seconds on some drivers/GPUs (e.g.
				// laptop RTX cards on a cold driver), which made "New project" feel
				// stuck. The preview render loop now retries each frame instead of
				// sticking, so it renders as soon as the GPU is ready.
				await editor.project.loadProject({ id: projectId });

				if (cancelled) return;

				setIsLoading(false);
				loadFontAtlas();

				// Warm up the GPU renderer in the background; flip the degraded
				// flag once it resolves (or fails).
				void initializeGpuRenderer().then(() => {
					if (!cancelled) {
						editor.renderer.setDegraded(!isGpuAvailable());
					}
				});
			} catch (err) {
				if (cancelled) return;

				const isNotFound =
					err instanceof Error &&
					(err.message.includes("not found") ||
						err.message.includes("does not exist"));

				if (isNotFound) {
					try {
						const newProjectId = await editor.project.createNewProject({
							name: "Untitled Project",
						});
						router.replace(`/editor/${newProjectId}`);
					} catch (_createErr) {
						setError("Failed to create project");
						setIsLoading(false);
					}
				} else {
					setError(
						err instanceof Error ? err.message : "Failed to load project",
					);
					setIsLoading(false);
				}
			}
		};

		loadProject();

		return () => {
			cancelled = true;
		};
	}, [projectId, router]);

	if (error) {
		return (
			<div className="bg-background flex h-screen w-screen items-center justify-center">
				<div className="flex flex-col items-center gap-4">
					<p className="text-destructive text-sm">{error}</p>
				</div>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="bg-background flex h-screen w-screen items-center justify-center">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="text-muted-foreground size-8 animate-spin" />
					<p className="text-muted-foreground text-sm">Loading project...</p>
				</div>
			</div>
		);
	}

	if (!activeProject) {
		return (
			<div className="bg-background flex h-screen w-screen items-center justify-center">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="text-muted-foreground size-8 animate-spin" />
					<p className="text-muted-foreground text-sm">Exiting project...</p>
				</div>
			</div>
		);
	}

	return (
		<>
			<EditorRuntimeBindings />
			{children}
		</>
	);
}

function EditorRuntimeBindings() {
	const editor = useEditor();
	const rippleEditingEnabled = useTimelineStore(
		(state) => state.rippleEditingEnabled,
	);

	useEffect(() => {
		editor.command.isRippleEnabled = rippleEditingEnabled;
	}, [editor, rippleEditingEnabled]);

	// Pause playback when the editor unmounts (e.g. navigating back to
	// project selection via the breadcrumb link). This prevents orphaned
	// audio from continuing to play after the editor is gone.
	useEffect(() => {
		return () => {
			editor.playback.pause();
		};
	}, [editor]);

	useEffect(() => {
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (!editor.save.getIsDirty()) return;
			event.preventDefault();
			(event as unknown as { returnValue: string }).returnValue = "";
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [editor]);

	// Inbound automation bridge: lets same-origin scripts / other tabs / the
	// MCP relay drive the editor via editor.api. Torn down on unmount.
	useEffect(() => startEditorBridge(editor), [editor]);

	useEditorActions();
	useKeybindingsListener();
	return <CommandPalette />;
}
