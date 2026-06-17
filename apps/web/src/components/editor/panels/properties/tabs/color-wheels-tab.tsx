"use client";

import type { VisualElement } from "@/lib/timeline";
import { useEditor } from "@/hooks/use-editor";
import {
	Section,
	SectionContent,
	SectionHeader,
	SectionTitle,
} from "@/components/section";

export function ColorWheelsTab({
	element,
	trackId: _trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	const _editor = useEditor();

	// Very simple placeholder UI for Color Wheels.
	// DaVinci Resolve color wheels are extremely complex, requiring a custom
	// interactive 2D pad (like a color picker) plus a slider below it for luma.
	// Since color-wheels.wgsl is just a basic lift/gamma/gain stub, we will
	// render a stylized UI that represents the 3-way color wheels.

	return (
		<div className="flex flex-col">
			<Section
				collapsible
				defaultOpen
				sectionKey={`${element.id}:color-wheels`}
			>
				<SectionHeader>
					<SectionTitle>Primary Color Wheels</SectionTitle>
				</SectionHeader>
				<SectionContent>
					<div className="flex flex-col gap-6 items-center py-4">
						<Wheel label="Lift (Shadows)" />
						<Wheel label="Gamma (Midtones)" />
						<Wheel label="Gain (Highlights)" />
						<Wheel label="Offset" />
					</div>
					<div className="mt-4 text-[0.68rem] text-white/50 text-center leading-relaxed">
						Color wheels mapping requires advanced WGSL uniform binding for the
						current renderer. Future updates will activate these controls.
					</div>
				</SectionContent>
			</Section>
		</div>
	);
}

function Wheel({ label }: { label: string }) {
	return (
		<div className="flex flex-col items-center gap-2">
			<div className="text-[0.62rem] uppercase tracking-wider text-white/60 font-semibold">
				{label}
			</div>
			<div className="relative size-24 rounded-full border-2 border-white/10 bg-gradient-to-tr from-gray-800 to-gray-900 shadow-inner">
				{/* Crosshair */}
				<div className="absolute top-1/2 left-0 w-full h-px bg-white/10" />
				<div className="absolute left-1/2 top-0 h-full w-px bg-white/10" />
				<div className="absolute top-1/2 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 bg-transparent shadow-sm" />
			</div>
			{/* Luma slider placeholder */}
			<div className="h-1.5 w-24 rounded-full bg-white/10 mt-1 relative">
				<div className="absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" />
			</div>
		</div>
	);
}
