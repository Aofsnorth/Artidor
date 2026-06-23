"use client";

import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { useParams } from "next/navigation";
import {
	ResizablePanelGroup,
	ResizablePanel,
	ResizableHandle,
	type ImperativePanelHandle,
} from "@/components/ui/resizable";
import { AssetsPanel } from "@/components/editor/panels/assets";
import { TabBar } from "@/components/editor/panels/assets/tabbar";
import { PropertiesPanel } from "@/components/editor/panels/properties";
import { Timeline } from "@/components/editor/panels/timeline";
import { PreviewPanel } from "@/components/editor/panels/preview";
import { EffectsView } from "@/components/editor/panels/assets/views/effects";
import { TransitionsView } from "@/components/editor/panels/assets/views/transitions";
import { AdjustmentsView } from "@/components/editor/panels/assets/views/adjustments";
import { PluginsView } from "@/components/editor/panels/assets/views/plugins";
import { EditorHeader } from "@/components/editor/editor-header";
import { VerticalAudioMeter } from "@/components/editor/vertical-audio-meter";
import { EditorProvider } from "@/components/providers/editor-provider";
import { usePanelStore } from "@/stores/panel-store";
import { useOpenDialogsStore } from "@/stores/open-dialogs-store";
import { useEditorUIStore } from "@/stores/editor-ui-store";
import { usePasteMedia } from "@/hooks/use-paste-media";
import { useProjectSessionPersistence } from "@/hooks/use-project-session-persistence";
import { MobileGate } from "@/components/editor/mobile-gate";
import { useEditor } from "@/hooks/use-editor";
import { usePluginsStore } from "@/lib/plugins/store";
import { useViewerStore } from "@/stores/viewer-store";
import { Cancel01Icon, ViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	FloatingWindow,
	DockPlaceholder,
	PopOutButton,
} from "@/components/editor/floating-window";

import { PageTransition } from "@/components/page-transition";

import { EditorFooter } from "@/components/editor/editor-footer";

// Lazy-loaded dialogs/overlays. These are only mounted when their
// internal state decides to show, so defer the JS until first use.
// Lazy-loaded dialogs/overlays. These are only mounted when their
// internal state decides to show, so defer the JS until first use.
// Cuts the initial editor route's bundle by a meaningful chunk
// because each dialog drags in its own icon set + hooks graph.
const Onboarding = lazy(() =>
	import("@/components/editor/onboarding").then((m) => ({
		default: m.Onboarding,
	})),
);
const MigrationDialog = lazy(() =>
	import("@/components/editor/dialogs/migration-dialog").then((m) => ({
		default: m.MigrationDialog,
	})),
);
const TeleprompterDialog = lazy(() =>
	import("@/components/editor/dialogs/teleprompter-dialog").then((m) => ({
		default: m.TeleprompterDialog,
	})),
);
const TemplatesDialog = lazy(() =>
	import("@/components/editor/dialogs/templates-dialog").then((m) => ({
		default: m.TemplatesDialog,
	})),
);
const SettingsDialog = lazy(() =>
	import("@/components/editor/dialogs/settings-dialog").then((m) => ({
		default: m.SettingsDialog,
	})),
);

export default function Editor() {
	const params = useParams();
	const projectId = params.project_id as string;

	return (
		<MobileGate>
			<EditorProvider projectId={projectId}>
				<PageTransition className="size-full">
					{/* The editor is designed dark-only — its panels use hardcoded
					   dark colors, so light mode renders broken. Pin the `dark`
					   class here so the whole editor subtree stays dark regardless
					   of the global theme toggle. */}
					<div className="dark editing-screen flex h-screen w-screen flex-col overflow-hidden bg-[#111114] text-white relative">
						{/* Main App Content */}
						<div className="z-10 flex flex-col h-full w-full relative">
							<ReadOnlyBanner />
							<DegradedRendererBanner />
							<EditorChrome />
							<div className="min-h-0 min-w-0 flex-1 z-10 pb-1">
								<EditorLayout />
							</div>
							<EditorFooterChrome />
							{/* Lazy overlays — Suspense keeps a render-time safety net
							   in case the dynamic chunks fail to load. The fallback
							   is null because each dialog manages its own visibility
							   via internal state, so the boundary never actually
							   shows anything to the user. */}
							<Suspense fallback={null}>
								<PluginRegistryBootstrap />
								<Onboarding />
								<MigrationDialog />
								<FeedbackPrompt />
								<LazyOverlays />
							</Suspense>
						</div>
					</div>
				</PageTransition>
			</EditorProvider>
		</MobileGate>
	);
}

function FeedbackPrompt() {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (sessionStorage.getItem("artidor-feedback-prompt-shown") === "true") {
			return;
		}
		const timeoutId = window.setTimeout(
			() => {
				sessionStorage.setItem("artidor-feedback-prompt-shown", "true");
				setOpen(true);
			},
			5 * 60 * 1000,
		);
		return () => window.clearTimeout(timeoutId);
	}, []);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="border-white/10 bg-[#0c0c0e]/95 text-white">
				<DialogHeader>
					<DialogTitle>Please give a feedback</DialogTitle>
					<DialogDescription>
						Help us improve the editor after trying it for a few minutes.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="ghost" onClick={() => setOpen(false)}>
						Later
					</Button>
					<Button asChild>
						<a href="baru place holder" target="_blank" rel="noreferrer">
							Open form
						</a>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function PluginRegistryBootstrap() {
	const loaded = usePluginsStore((s) => s.loaded);
	const loadPlugins = usePluginsStore((s) => s.loadPlugins);

	useEffect(() => {
		if (!loaded) {
			void loadPlugins();
		}
	}, [loaded, loadPlugins]);

	return null;
}

// Persistent strip shown while viewing a shared project read-only. The hard
// edit block lives in `CommandManager.readOnly`; this is the user-facing
// explanation for why the timeline won't accept changes. Intentionally not
// dismissible — the constraint is in effect for the whole session.
function ReadOnlyBanner() {
	const isViewer = useViewerStore((s) => s.isViewer);
	if (!isViewer) return null;

	return (
		<div className="flex h-9 items-center justify-center gap-2 border-b border-white/10 bg-white/[0.04] text-xs text-white/70">
			<HugeiconsIcon icon={ViewIcon} className="size-3.5" />
			<span>
				You're viewing a shared project in read-only mode. Edits are disabled.
			</span>
		</div>
	);
}

function DegradedRendererBanner() {
	const isDegraded = useEditor((e) => e.renderer.isDegraded);
	const [dismissed, setDismissed] = useState(false);
	if (!isDegraded || dismissed) return null;

	return (
		<div className="bg-accent border-b h-9 flex items-center justify-center gap-2 text-xs text-muted-foreground">
			<span>For the best experience, open Artidor in Chrome.</span>
			<Button
				variant="text"
				size="icon"
				className="p-0 w-auto [&_svg]:size-3.5"
				onClick={() => setDismissed(true)}
				aria-label="Dismiss"
			>
				<HugeiconsIcon icon={Cancel01Icon} />
			</Button>
		</div>
	);
}

// Focus mode collapses the editor chrome (header + footer) for a
// distraction-free, keyboard-first editing surface. Shift+F (or the command
// palette) toggles it; the preference persists in the editor-ui store.
function EditorChrome() {
	const focusMode = useEditorUIStore((s) => s.focusMode);
	if (focusMode) return null;
	return <EditorHeader />;
}

function EditorFooterChrome() {
	const focusMode = useEditorUIStore((s) => s.focusMode);
	if (focusMode) return null;
	return <EditorFooter />;
}

function EditorLayout() {
	usePasteMedia();
	const params = useParams();
	const projectId = (params.project_id as string) || null;
	useProjectSessionPersistence({ projectId });

	return (
		<div className="flex size-full gap-2 p-2 pt-0">
			<TabBar />
			<div className="min-h-0 min-w-0 flex-1">
				<EditorPanels />
			</div>
		</div>
	);
}

function EditorPanels() {
	const { panels, setPanel, resetPanels } = usePanelStore();
	const floatingPanels = useEditorUIStore((s) => s.floatingPanels);
	const [layoutVersion, setLayoutVersion] = useState(0);

	// Self-healing: reset corrupt/collapsed layouts from old migrations
	useEffect(() => {
		if (
			panels.tools < 10 ||
			panels.properties < 10 ||
			panels.preview < 15 ||
			panels.timeline < 10
		) {
			resetPanels();
			setLayoutVersion((v) => v + 1);
		}
	}, [panels.tools, panels.properties, panels.preview, panels.timeline, resetPanels]);
	// Pin the top row (which holds the preview) to a fixed pixel height
	// when the editor viewport changes size — e.g. when the window enters
	// or exits fullscreen. The vertical split is otherwise purely
	// percentage-based, so extra height would inflate the preview along
	// with everything else. Instead we keep the preview's pixel height
	// steady and let the timeline below absorb the delta (grow up /
	// shrink down).
	const containerRef = useRef<HTMLDivElement>(null);
	const mainPanelRef = useRef<ImperativePanelHandle>(null);
	const lastHeightRef = useRef<number | null>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const observer = new ResizeObserver((entries) => {
			const height = entries[0]?.contentRect.height ?? 0;
			if (height <= 0) return;

			const previousHeight = lastHeightRef.current;
			lastHeightRef.current = height;
			// The first measurement just seeds the baseline; the persisted
			// percentage layout is honoured on the initial mount.
			if (previousHeight === null || Math.abs(height - previousHeight) < 1) {
				return;
			}

			const mainPanel = mainPanelRef.current;
			if (!mainPanel) return;

			// Re-express the top row's previous pixel height as a percentage
			// of the new container height; resize() clamps to the panel's
			// configured min/max sizes.
			const mainPixels =
				(mainPanel.getSize().asPercentage / 100) * previousHeight;
			const nextMainPercent = Math.min(
				100,
				Math.max(0, (mainPixels / height) * 100),
			);
			// v4 treats bare numbers as pixels; pass a percentage string.
			mainPanel.resize(`${nextMainPercent}%`);
		});

		observer.observe(container);
		return () => observer.disconnect();
	}, []);

	return (
		<div ref={containerRef} className="size-full">
			<ResizablePanelGroup
				id="editor-main"
				key={layoutVersion}
				direction="vertical"
				className="size-full gap-1"
				onLayoutChanged={(layout) => {
					if (layout.mainContent !== undefined && layout.mainContent >= 10) {
						setPanel("mainContent", layout.mainContent);
					}
					if (layout.timeline !== undefined && layout.timeline >= 10) {
						setPanel("timeline", layout.timeline);
					}
				}}
			>
				<ResizablePanel
					id="mainContent"
					panelRef={mainPanelRef}
					defaultSize={`${panels.mainContent}%`}
					minSize="30%"
					maxSize="85%"
					className="min-h-0"
				>
					<ResizablePanelGroup
						id="editor-row"
						direction="horizontal"
						className="size-full gap-1"
						onLayoutChanged={(layout) => {
							if (layout.tools !== undefined && layout.tools >= 10) {
								setPanel("tools", layout.tools);
							}
							if (layout.preview !== undefined && layout.preview >= 15) {
								setPanel("preview", layout.preview);
							}
							if (layout.properties !== undefined && layout.properties >= 10) {
								setPanel("properties", layout.properties);
							}
						}}
					>
						<ResizablePanel
							id="tools"
							defaultSize={`${panels.tools}%`}
							minSize="15%"
							maxSize="40%"
							className="min-w-0"
						>
							{floatingPanels.assets ? (
								<DockPlaceholder id="assets" title="Assets" />
							) : (
								<div className="group/panel-slot relative size-full">
									<AssetsPanel />
									<PopOutButton id="assets" title="Assets" />
								</div>
							)}
						</ResizablePanel>

						<ResizableHandle withHandle />

						<ResizablePanel
							id="preview"
							defaultSize={`${panels.preview}%`}
							minSize="30%"
							className="min-h-0 min-w-0 flex-1"
						>
							{floatingPanels.preview ? (
								<DockPlaceholder id="preview" title="Preview" />
							) : (
								<div className="group/panel-slot relative size-full">
									<PreviewPanel />
									<PopOutButton id="preview" title="Preview" />
								</div>
							)}
						</ResizablePanel>

						<ResizableHandle withHandle />

						<ResizablePanel
							id="properties"
							defaultSize={`${panels.properties}%`}
							minSize="15%"
							maxSize="40%"
							className="min-w-0"
						>
							{floatingPanels.properties ? (
								<DockPlaceholder id="properties" title="Properties" />
							) : (
								<div className="group/panel-slot relative size-full">
									<div className="flex h-full min-h-0 items-stretch gap-2">
										<div className="flex-1 min-w-0">
											<PropertiesPanel />
										</div>
										<VerticalAudioMeter />
									</div>
									<PopOutButton id="properties" title="Properties" />
								</div>
							)}
						</ResizablePanel>
					</ResizablePanelGroup>
				</ResizablePanel>

				<ResizableHandle withHandle />

				<ResizablePanel
					id="timeline"
					defaultSize={`${panels.timeline}%`}
					minSize="15%"
					maxSize="70%"
					className="min-h-0"
				>
					{floatingPanels.timeline ? (
						<DockPlaceholder id="timeline" title="Timeline" />
					) : (
						<div className="group/panel-slot relative size-full">
							<div className="flex h-full min-w-0 items-stretch">
								<div className="flex-1 min-w-0">
									<Timeline />
								</div>
							</div>
							<PopOutButton id="timeline" title="Timeline" />
						</div>
					)}
				</ResizablePanel>
			</ResizablePanelGroup>

			{/* Floating window overlays for any detached panels */}
			{floatingPanels.assets && (
				<FloatingWindow
					id="assets"
					title="Assets"
					state={floatingPanels.assets}
				>
					<AssetsPanel />
				</FloatingWindow>
			)}
			{floatingPanels.preview && (
				<FloatingWindow
					id="preview"
					title="Preview"
					state={floatingPanels.preview}
				>
					<PreviewPanel />
				</FloatingWindow>
			)}
			{floatingPanels.properties && (
				<FloatingWindow
					id="properties"
					title="Properties"
					state={floatingPanels.properties}
				>
					<div className="flex h-full min-h-0 items-stretch gap-2 p-1">
						<div className="flex-1 min-w-0">
							<PropertiesPanel />
						</div>
						<VerticalAudioMeter />
					</div>
				</FloatingWindow>
			)}
			{floatingPanels.timeline && (
				<FloatingWindow
					id="timeline"
					title="Timeline"
					state={floatingPanels.timeline}
				>
					<Timeline />
				</FloatingWindow>
			)}
			{floatingPanels.effects && (
				<FloatingWindow
					id="effects"
					title="Effects"
					state={floatingPanels.effects}
				>
					<EffectsView />
				</FloatingWindow>
			)}
			{floatingPanels.transitions && (
				<FloatingWindow
					id="transitions"
					title="Transitions"
					state={floatingPanels.transitions}
				>
					<TransitionsView />
				</FloatingWindow>
			)}
			{floatingPanels.adjust && (
				<FloatingWindow
					id="adjust"
					title="Adjustments"
					state={floatingPanels.adjust}
				>
					<AdjustmentsView />
				</FloatingWindow>
			)}
			{floatingPanels.plugins && (
				<FloatingWindow
					id="plugins"
					title="Plugins"
					state={floatingPanels.plugins}
				>
					<PluginsView />
				</FloatingWindow>
			)}
		</div>
	);
}

/**
 * Houses the dialogs that are opened by toolbar actions (teleprompter,
 * templates). They live outside `Editor` so they can be triggered
 * from the action layer (which doesn't have direct access to the
 * component tree) without prop-drilling.
 */
function LazyOverlays() {
	const isTeleprompterOpen = useOpenDialogsStore(
		(state) => state.open.teleprompter ?? false,
	);
	const isTemplatesOpen = useOpenDialogsStore(
		(state) => state.open.templates ?? false,
	);
	const isSettingsOpen = useOpenDialogsStore(
		(state) => state.open.settings ?? false,
	);
	const setOpen = useOpenDialogsStore((state) => state.setOpen);

	return (
		<>
			<TeleprompterDialog
				open={isTeleprompterOpen}
				onOpenChange={(open) => setOpen("teleprompter", open)}
			/>
			<TemplatesDialog
				open={isTemplatesOpen}
				onOpenChange={(open) => setOpen("templates", open)}
			/>
			<SettingsDialog
				isOpen={isSettingsOpen}
				onOpenChange={(open) => setOpen("settings", open)}
			/>
		</>
	);
}
