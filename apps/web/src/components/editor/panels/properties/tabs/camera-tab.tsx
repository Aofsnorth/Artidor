"use client";

import { Button } from "@/components/ui/button";
import { useEditor } from "@/hooks/use-editor";
import type { CameraElement } from "@/lib/camera";
import { findActiveCamera } from "@/lib/camera";
import {
	Section,
	SectionContent,
	SectionField,
	SectionFields,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import {
	Camera01Icon,
	Layers01Icon,
	ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Switch } from "@/components/ui/switch";

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
					Add a camera layer for 3D motion, depth of field, and fog effects.
					All properties are keyframeable.
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
					Invisible parent anchors for rigging, grouping, and camera movement.
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

			{cameraLayers.length > 1 && (
				<CameraSwitcher cameras={cameraLayers as unknown as CameraElement[]} />
			)}
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

function CameraSwitcher({ cameras }: { cameras: CameraElement[] }) {
	const editor = useEditor();
	const activeCamera = findActiveCamera({ cameras });

	const toggleCameraVisibility = (camera: CameraElement) => {
		editor.timeline.updateElements({
			updates: [
				{
					trackId: camera.trackId,
					elementId: camera.id,
					patch: { hidden: !camera.hidden },
				},
			],
		});
	};

	return (
		<section className="glass rounded-lg p-3">
			<header className="flex items-center gap-2 mb-2">
				<HugeiconsIcon icon={Camera01Icon} size={14} />
				<h3 className="text-sm font-medium">Camera Switcher</h3>
			</header>
			<p className="text-muted-foreground mb-3 text-xs leading-relaxed">
				The highest visible camera is the active camera. Toggle visibility to
				switch between cameras.
			</p>
			<div className="flex flex-col gap-1.5">
				{cameras.map((camera, idx) => {
					const isActive = activeCamera?.id === camera.id;
					return (
						<button
							key={camera.id}
							type="button"
							onClick={() => toggleCameraVisibility(camera)}
							className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs transition ${
								isActive
									? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
									: camera.hidden
										? "border-white/[0.04] bg-white/[0.02] text-white/40"
										: "border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.06]"
							}`}
						>
							<div className="flex items-center gap-2 min-w-0">
								<div
									className={`size-2 rounded-full ${
										isActive
											? "bg-cyan-400"
											: camera.hidden
												? "bg-white/20"
												: "bg-white/40"
									}`}
								/>
								<span className="truncate">
									{camera.name || `Camera ${idx + 1}`}
								</span>
							</div>
							{isActive && (
								<span className="shrink-0 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-cyan-300">
									Active
								</span>
							)}
						</button>
					);
				})}
			</div>
		</section>
	);
}

function CameraNumberInput({
	label,
	value,
	onChange,
	min,
	max,
	step = 1,
}: {
	label: string;
	value: number;
	onChange: (v: number) => void;
	min?: number;
	max?: number;
	step?: number;
}) {
	const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
		const parsed = parseFloat(e.target.value);
		if (Number.isNaN(parsed)) return;
		const clamped =
			min != null && max != null
				? Math.min(max, Math.max(min, parsed))
				: parsed;
		if (clamped !== value) onChange(clamped);
	};

	return (
		<div className="flex items-center justify-between gap-2">
			<span className="text-muted-foreground text-xs">{label}</span>
			<input
				type="number"
				defaultValue={value}
				onBlur={handleBlur}
				min={min}
				max={max}
				step={step}
				className="h-7 w-24 rounded-md border border-white/10 bg-white/[0.04] px-2 text-right text-xs text-white outline-none focus:border-white/25"
			/>
		</div>
	);
}

function CameraToggle({
	label,
	description,
	enabled,
	onToggle,
}: {
	label: string;
	description: string;
	enabled: boolean;
	onToggle: (v: boolean) => void;
}) {
	return (
		<div className="flex items-center justify-between gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2">
			<div className="min-w-0">
				<p className="text-xs font-medium text-white/80">{label}</p>
				<p className="text-[0.65rem] text-white/40">{description}</p>
			</div>
			<Switch checked={enabled} onCheckedChange={onToggle} />
		</div>
	);
}

export function CameraInspectTab({
	element,
	trackId,
}: {
	element: CameraElement;
	trackId: string;
}) {
	const editor = useEditor();

	const update = (patch: Partial<CameraElement>) => {
		editor.timeline.updateElements({
			updates: [{ trackId, elementId: element.id, patch }],
		});
	};

	return (
		<div className="flex flex-col gap-1">
			<Section sectionKey="camera-position" showTopBorder={false}>
				<SectionHeader>
					<SectionTitle>Position</SectionTitle>
				</SectionHeader>
				<SectionContent>
					<SectionFields>
						<SectionField label="X">
							<CameraNumberInput
								label="X"
								value={element.position3D.x}
								onChange={(v) =>
									update({ position3D: { ...element.position3D, x: v } })
								}
								step={0.1}
							/>
						</SectionField>
						<SectionField label="Y">
							<CameraNumberInput
								label="Y"
								value={element.position3D.y}
								onChange={(v) =>
									update({ position3D: { ...element.position3D, y: v } })
								}
								step={0.1}
							/>
						</SectionField>
						<SectionField label="Z">
							<CameraNumberInput
								label="Z"
								value={element.position3D.z}
								onChange={(v) =>
									update({ position3D: { ...element.position3D, z: v } })
								}
								step={0.1}
							/>
						</SectionField>
					</SectionFields>
				</SectionContent>
			</Section>

			<Section sectionKey="camera-target">
				<SectionHeader>
					<SectionTitle>Target</SectionTitle>
				</SectionHeader>
				<SectionContent>
					<SectionFields>
						<SectionField label="X">
							<CameraNumberInput
								label="X"
								value={element.target3D.x}
								onChange={(v) =>
									update({ target3D: { ...element.target3D, x: v } })
								}
								step={0.1}
							/>
						</SectionField>
						<SectionField label="Y">
							<CameraNumberInput
								label="Y"
								value={element.target3D.y}
								onChange={(v) =>
									update({ target3D: { ...element.target3D, y: v } })
								}
								step={0.1}
							/>
						</SectionField>
						<SectionField label="Z">
							<CameraNumberInput
								label="Z"
								value={element.target3D.z}
								onChange={(v) =>
									update({ target3D: { ...element.target3D, z: v } })
								}
								step={0.1}
							/>
						</SectionField>
					</SectionFields>
				</SectionContent>
			</Section>

			<Section sectionKey="camera-lens">
				<SectionHeader>
					<SectionTitle>Lens</SectionTitle>
				</SectionHeader>
				<SectionContent>
					<SectionFields>
						<SectionField label="FOV">
							<CameraNumberInput
								label="FOV"
								value={element.fov}
								onChange={(v) => update({ fov: v })}
								min={1}
								max={179}
								step={1}
							/>
						</SectionField>
						<SectionField label="Roll">
							<CameraNumberInput
								label="Roll"
								value={element.roll}
								onChange={(v) => update({ roll: v })}
								step={1}
							/>
						</SectionField>
						<SectionField label="Near">
							<CameraNumberInput
								label="Near"
								value={element.near}
								onChange={(v) => update({ near: v })}
								min={0.01}
								step={0.1}
							/>
						</SectionField>
						<SectionField label="Far">
							<CameraNumberInput
								label="Far"
								value={element.far}
								onChange={(v) => update({ far: v })}
								min={1}
								step={10}
							/>
						</SectionField>
					</SectionFields>
				</SectionContent>
			</Section>

			<Section sectionKey="camera-dof">
				<SectionHeader>
					<SectionTitle>Focus Blur</SectionTitle>
				</SectionHeader>
				<SectionContent>
					<div className="px-3 pb-2">
						<CameraToggle
							label="Enable Focus Blur"
							description="Blur layers based on distance from focus plane"
							enabled={element.focusBlurEnabled}
							onToggle={(v) => update({ focusBlurEnabled: v })}
						/>
					</div>
					{element.focusBlurEnabled && (
						<SectionFields>
							<SectionField label="Focus Distance">
								<CameraNumberInput
									label="Focus"
									value={element.focusDistance}
									onChange={(v) => update({ focusDistance: v })}
									min={0.1}
									step={0.5}
								/>
							</SectionField>
							<SectionField label="Depth of Field">
								<CameraNumberInput
									label="DOF"
									value={element.depthOfField}
									onChange={(v) => update({ depthOfField: v })}
									min={0.1}
									step={0.5}
								/>
							</SectionField>
							<SectionField label="Blur Strength">
								<CameraNumberInput
									label="Strength"
									value={element.dofStrength}
									onChange={(v) => update({ dofStrength: v })}
									min={0}
									max={1}
									step={0.01}
								/>
							</SectionField>
						</SectionFields>
					)}
				</SectionContent>
			</Section>

			<Section sectionKey="camera-fog">
				<SectionHeader>
					<SectionTitle>Fog</SectionTitle>
				</SectionHeader>
				<SectionContent>
					<div className="px-3 pb-2">
						<CameraToggle
							label="Enable Fog"
							description="Atmospheric depth haze based on distance"
							enabled={element.fogEnabled}
							onToggle={(v) => update({ fogEnabled: v })}
						/>
					</div>
					{element.fogEnabled && (
						<SectionFields>
							<SectionField label="Color">
								<div className="flex items-center gap-2">
									<input
										type="color"
										value={element.fogColor}
										onChange={(e) => update({ fogColor: e.target.value })}
										className="h-7 w-10 cursor-pointer rounded border border-white/10 bg-transparent"
									/>
									<span className="text-xs text-white/50">
										{element.fogColor}
									</span>
								</div>
							</SectionField>
							<SectionField label="Strength">
								<CameraNumberInput
									label="Strength"
									value={element.fogStrength}
									onChange={(v) => update({ fogStrength: v })}
									min={0}
									max={1}
									step={0.01}
								/>
							</SectionField>
							<SectionField label="Near">
								<CameraNumberInput
									label="Near"
									value={element.fogStart}
									onChange={(v) => update({ fogStart: v })}
									min={0}
									step={1}
								/>
							</SectionField>
							<SectionField label="Far">
								<CameraNumberInput
									label="Far"
									value={element.fogEnd}
									onChange={(v) => update({ fogEnd: v })}
									min={0}
									step={1}
								/>
							</SectionField>
						</SectionFields>
					)}
				</SectionContent>
			</Section>
		</div>
	);
}
