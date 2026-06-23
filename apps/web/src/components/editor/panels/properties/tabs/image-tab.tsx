"use client";

import { useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CloudUploadIcon, Image01Icon } from "@hugeicons/core-free-icons";
import type { ImageElement } from "@/lib/timeline";
import type { MediaAsset } from "@/lib/media/types";
import { useEditor } from "@/hooks/use-editor";
import {
	Section,
	SectionContent,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/components/ui/number-field";
import { usePropertyDraft } from "../hooks/use-property-draft";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { processMediaAssets } from "@/lib/media/processing";
import { toast } from "sonner";
import { useElementPreview } from "@/hooks/use-element-preview";
import { DEFAULTS } from "@/lib/timeline/defaults";
import { cn } from "@/utils/ui";

const DEFAULT_OPACITY = DEFAULTS.element.opacity;

/**
 * Inspector tab for image elements. Surfaces image-specific controls
 * that don't fit elsewhere — the source (file name, dimensions,
 * format) and a one-click replace. Style/transform/animation live
 * on the other tabs so this panel stays focused on what's actually
 * image-specific.
 */
export function ImageTab({
	element,
	trackId,
	mediaAsset,
}: {
	element: ImageElement;
	trackId: string;
	mediaAsset: MediaAsset | undefined;
}) {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());
	const { renderElement } = useElementPreview({
		trackId,
		elementId: element.id,
		fallback: element,
	});
	const [replaceOpen, setReplaceOpen] = useState(false);

	const opacity = usePropertyDraft({
		displayValue: (renderElement.opacity ?? DEFAULT_OPACITY ?? 1).toFixed(2),
		parse: (input) => {
			const parsed = Number.parseFloat(input);
			if (Number.isNaN(parsed)) return null;
			return Math.max(0, Math.min(1, parsed));
		},
		onPreview: (value) =>
			editor.timeline.previewElements({
				updates: [
					{ trackId, elementId: element.id, updates: { opacity: value } },
				],
			}),
		onCommit: () => editor.timeline.commitPreview(),
	});

	const handleReplaceFile = async ({ file }: { file: File }) => {
		if (!activeProject) {
			toast.error("No active project");
			return;
		}
		try {
			const [processed] = await processMediaAssets({ files: [file] });
			if (processed?.type !== "image") {
				toast.error("Please pick an image file");
				return;
			}
			const stored = await editor.media.addMediaAsset({
				projectId: activeProject.metadata.id,
				asset: processed,
			});
			if (!stored) {
				toast.error("Could not save media");
				return;
			}
			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						patch: { mediaId: stored.id, name: stored.name },
					},
				],
			});
			toast.success("Image replaced");
			setReplaceOpen(false);
		} catch (error) {
			console.error("Replace image failed:", error);
			toast.error(
				error instanceof Error ? error.message : "Could not replace image",
			);
		}
	};

	const dims = resolveImageDimensions({ mediaAsset });

	return (
		<>
			<Section
				collapsible
				defaultOpen
				sectionKey={`${element.id}:image-source`}
			>
				<SectionHeader>
					<SectionTitle>Source</SectionTitle>
				</SectionHeader>
				<SectionContent>
					<div className="flex flex-col gap-3">
						{/* Thumbnail preview — uses the cached thumbnailUrl
						    from the media asset so it stays cheap to render
						    even at high panel widths. Falls back to the icon
						    when no asset is bound. */}
						<div
							className={cn(
								"relative mx-auto flex w-full max-w-[180px] items-center justify-center overflow-hidden rounded-lg border border-white/[0.08] bg-black/40",
								dims ? "aspect-[4/3]" : "aspect-square",
							)}
						>
							{mediaAsset?.thumbnailUrl ? (
								// biome-ignore lint/performance/noImgElement: thumbnail is a data URL or static asset, optimisation doesn't apply
								<img
									src={mediaAsset.thumbnailUrl}
									alt={mediaAsset.name}
									className="size-full object-contain"
									draggable={false}
								/>
							) : (
								<HugeiconsIcon
									icon={Image01Icon}
									className="size-10 text-white/30"
								/>
							)}
						</div>
						<dl className="flex flex-col gap-1.5 text-xs">
							<SourceRow label="Name" value={mediaAsset?.name ?? "—"} />
							<SourceRow
								label="Type"
								value={mediaAsset?.type?.toUpperCase() ?? "—"}
							/>
							<SourceRow
								label="Dimensions"
								value={dims ? `${dims.width} × ${dims.height}` : "—"}
							/>
							<SourceRow
								label="Size"
								value={formatBytes(mediaAsset?.file.size)}
							/>
						</dl>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="w-full"
							onClick={() => setReplaceOpen(true)}
						>
							<HugeiconsIcon
								icon={CloudUploadIcon}
								className="mr-1.5 size-3.5"
							/>
							Replace image
						</Button>
					</div>
				</SectionContent>
			</Section>

			<Section
				collapsible
				defaultOpen
				sectionKey={`${element.id}:image-opacity`}
			>
				<SectionHeader>
					<SectionTitle>Opacity</SectionTitle>
				</SectionHeader>
				<SectionContent>
					<NumberField
						value={opacity.displayValue}
						onFocus={opacity.onFocus}
						onChange={opacity.onChange}
						onBlur={opacity.onBlur}
						onScrub={opacity.scrubTo}
						onScrubEnd={opacity.commitScrub}
						onReset={() =>
							editor.timeline.updateElements({
								updates: [
									{
										trackId,
										elementId: element.id,
										patch: { opacity: DEFAULT_OPACITY },
									},
								],
							})
						}
						isDefault={
							(renderElement.opacity ?? DEFAULT_OPACITY ?? 1) ===
							(DEFAULT_OPACITY ?? 1)
						}
						step={0.05}
						min={0}
						max={1}
						dragSensitivity="slow"
						suffix="×"
					/>
				</SectionContent>
			</Section>

			<ReplaceImageDialog
				isOpen={replaceOpen}
				onOpenChange={setReplaceOpen}
				onFilePicked={(file) => void handleReplaceFile({ file })}
			/>
		</>
	);
}

function SourceRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-2">
			<dt className="shrink-0 text-white/45">{label}</dt>
			<dd className="truncate text-right font-mono text-[0.7rem] text-white/85">
				{value}
			</dd>
		</div>
	);
}

function resolveImageDimensions({
	mediaAsset,
}: {
	mediaAsset: MediaAsset | undefined;
}): { width: number; height: number } | null {
	if (!mediaAsset) return null;
	const w = mediaAsset.width;
	const h = mediaAsset.height;
	if (typeof w === "number" && typeof h === "number" && w > 0 && h > 0) {
		return { width: w, height: h };
	}
	return null;
}

function formatBytes(bytes: number | undefined): string {
	if (!bytes || bytes <= 0) return "—";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024)
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function ReplaceImageDialog({
	isOpen,
	onOpenChange,
	onFilePicked,
}: {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onFilePicked: (file: File) => void;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Replace image</DialogTitle>
				</DialogHeader>
				<DialogBody className="gap-3">
					<p className="text-muted-foreground text-sm">
						Pick a new image to swap into this layer. The clip's timing,
						transform, masks, and effects all stay the same.
					</p>
					<div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed p-6">
						<HugeiconsIcon
							icon={Image01Icon}
							size={32}
							className="text-muted-foreground"
						/>
						<Button
							variant="outline"
							type="button"
							onClick={() => inputRef.current?.click()}
						>
							<HugeiconsIcon icon={CloudUploadIcon} className="mr-1.5" />
							Choose image
						</Button>
						<p className="text-muted-foreground text-xs">
							PNG, JPG, WebP, GIF…
						</p>
					</div>
					<input
						ref={inputRef}
						type="file"
						accept="image/*"
						className="hidden"
						onChange={(event) => {
							const file = event.target.files?.[0];
							if (event.target) event.target.value = "";
							if (file) onFilePicked(file);
						}}
					/>
				</DialogBody>
				<DialogFooter>
					<Button
						variant="outline"
						type="button"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onOpenChange(false);
						}}
					>
						Cancel
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
