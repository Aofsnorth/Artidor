"use client";

import { useParams } from "next/navigation";
import {
	ResizablePanelGroup,
	ResizablePanel,
	ResizableHandle,
} from "@/components/ui/resizable";
import { AssetsPanel } from "@/components/editor/panels/assets";
import { TabBar } from "@/components/editor/panels/assets/tabbar";
import { PropertiesPanel } from "@/components/editor/panels/properties";
import { Timeline } from "@/components/editor/panels/timeline";
import { PreviewPanel } from "@/components/editor/panels/preview";
import { EditorHeader } from "@/components/editor/editor-header";
import { VerticalAudioMeter } from "@/components/editor/vertical-audio-meter";
import { EditorProvider } from "@/components/providers/editor-provider";
import { Onboarding } from "@/components/editor/onboarding";
import { MigrationDialog } from "@/components/editor/dialogs/migration-dialog";
import { usePanelStore } from "@/stores/panel-store";
import { usePasteMedia } from "@/hooks/use-paste-media";
import { MobileGate } from "@/components/editor/mobile-gate";
import { useState } from "react";
import { useEditor } from "@/hooks/use-editor";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { ChangelogNotification } from "@/lib/changelog/components/changelog-notification";

import { PageTransition } from "@/components/page-transition";

import { EditorFooter } from "@/components/editor/editor-footer";

export default function Editor() {
	const params = useParams();
	const projectId = params.project_id as string;

	return (
		<MobileGate>
			<EditorProvider projectId={projectId}>
				<PageTransition className="size-full">
					<div className="editing-screen flex h-screen w-screen flex-col overflow-hidden bg-[#111114] text-white relative">
						{/* Main App Content */}
						<div className="z-10 flex flex-col h-full w-full relative">
							<DegradedRendererBanner />
							<EditorHeader />
							<div className="min-h-0 min-w-0 flex-1 z-10 pb-1">
								<EditorLayout />
							</div>
							<EditorFooter />
							<Onboarding />
							<MigrationDialog />
							<ChangelogNotification />
						</div>
					</div>
				</PageTransition>
			</EditorProvider>
		</MobileGate>
	);
}

function DegradedRendererBanner() {
	const isDegraded = useEditor((e) => e.renderer.isDegraded);
	const [dismissed, setDismissed] = useState(false);
	if (!isDegraded || dismissed) return null;

	return (
		<div className="bg-accent border-b h-9 flex items-center justify-center gap-2 text-xs text-muted-foreground">
			<span>For the best experience, open OpenCut in Chrome.</span>
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

function EditorLayout() {
	usePasteMedia();

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
	const { panels, setPanel } = usePanelStore();

	return (
		<ResizablePanelGroup
			direction="vertical"
			className="size-full gap-2"
			onLayout={(sizes) => {
				setPanel("mainContent", sizes[0] ?? panels.mainContent);
				setPanel("timeline", sizes[1] ?? panels.timeline);
			}}
		>
			<ResizablePanel
				defaultSize={panels.mainContent}
				minSize={30}
				maxSize={85}
				className="min-h-0"
			>
				<ResizablePanelGroup
					direction="horizontal"
					className="size-full gap-2"
					onLayout={(sizes) => {
						setPanel("tools", sizes[0] ?? panels.tools);
						setPanel("preview", sizes[1] ?? panels.preview);
						setPanel("properties", sizes[2] ?? panels.properties);
					}}
				>
					<ResizablePanel
						defaultSize={panels.tools}
						minSize={15}
						maxSize={40}
						className="min-w-0"
					>
						<AssetsPanel />
					</ResizablePanel>

					<ResizableHandle withHandle />

					<ResizablePanel
						defaultSize={panels.preview}
						minSize={30}
						className="min-h-0 min-w-0 flex-1"
					>
						<PreviewPanel />
					</ResizablePanel>

					<ResizableHandle withHandle />

					<ResizablePanel
						defaultSize={panels.properties}
						minSize={15}
						maxSize={40}
						className="min-w-0"
					>
						<div className="flex h-full min-h-0 items-stretch gap-2">
							<div className="flex-1 min-w-0">
								<PropertiesPanel />
							</div>
							<VerticalAudioMeter />
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
			</ResizablePanel>

			<ResizableHandle withHandle />

			<ResizablePanel
				defaultSize={panels.timeline}
				minSize={15}
				maxSize={70}
				className="min-h-0"
			>
				<div className="flex h-full min-w-0 items-stretch">
					<div className="flex-1 min-w-0">
						<Timeline />
					</div>
				</div>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
