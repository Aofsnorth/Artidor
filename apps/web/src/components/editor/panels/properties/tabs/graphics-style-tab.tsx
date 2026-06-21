"use client";

import type { ImageElement, TextElement, VideoElement } from "@/lib/timeline";
import { useEditor } from "@/hooks/use-editor";
import {
	Section,
	SectionContent,
	SectionField,
	SectionFields,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import { ColorPicker } from "@/components/ui/color-picker";
import { NumberField } from "@/components/ui/number-field";
import { Switch } from "@/components/ui/switch";
import { uppercase } from "@/utils/string";

export function GraphicsStyleTab({
	element,
	trackId,
}: {
	element: VideoElement | ImageElement | TextElement;
	trackId: string;
}) {
	return (
		<div className="flex flex-col">
			<ColorFillSection element={element} trackId={trackId} />
			<StrokeSection element={element} trackId={trackId} />
			<ShadowSection element={element} trackId={trackId} />
		</div>
	);
}

function ColorFillSection({
	element,
	trackId,
}: {
	element: VideoElement | ImageElement | TextElement;
	trackId: string;
}) {
	const editor = useEditor();
	const isText = element.type === "text";
	const color = isText
		? element.color
		: (element.graphicStyle?.fillColor ?? "#ffffff");
	const opacity = isText ? 1 : (element.graphicStyle?.fillOpacity ?? 0);
	const fillEnabled = isText || opacity > 0;
	const setMediaFillOpacity = (nextOpacity: number) => {
		if (isText) return;
		const fillOpacity = Math.max(0, Math.min(1, nextOpacity));
		editor.timeline.updateElements({
			updates: [
				{
					trackId,
					elementId: element.id,
					patch: {
						graphicStyle: {
							...element.graphicStyle,
							fillOpacity,
							fillColor: element.graphicStyle?.fillColor ?? "#ffffff",
						},
					},
				},
			],
		});
	};

	return (
		<Section collapsible defaultOpen sectionKey={`${element.id}:graphics-fill`}>
			<SectionHeader>
				<SectionTitle>Color & Fill</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<div className="flex flex-col gap-3">
					{!isText && (
						<div className="flex items-center justify-between gap-2 text-sm">
							<span className="text-white/75">Enable fill</span>
							<Switch
								checked={fillEnabled}
								onCheckedChange={(enabled) =>
									setMediaFillOpacity(enabled ? Math.max(opacity, 0.35) : 0)
								}
							/>
						</div>
					)}
					<SectionFields>
					<SectionField label={isText ? "Text color" : "Fill color"}>
						<ColorPicker
							value={uppercase({ string: color.replace("#", "") })}
							onChange={(nextColor) => {
								const hexColor = `#${nextColor}`;
								editor.timeline.updateElements({
									updates: [
										{
											trackId,
											elementId: element.id,
											patch: isText
												? { color: hexColor }
												: {
														graphicStyle: {
															...element.graphicStyle,
															fillColor: hexColor,
														},
													},
										},
									],
								});
							}}
						/>
					</SectionField>
					{!isText && fillEnabled && (
						<SectionField label="Fill opacity">
							<NumberField
								icon="%"
								value={Math.round(opacity * 100).toString()}
								min={0}
								max={100}
								scrubClamp={{ min: 0, max: 100 }}
								onChange={(event) => {
									const parsed = Number.parseFloat(event.currentTarget.value);
									if (!Number.isNaN(parsed)) {
										setMediaFillOpacity(parsed / 100);
									}
								}}
								onScrub={(value) => setMediaFillOpacity(value / 100)}
								dragSensitivity="slow"
							/>
						</SectionField>
					)}
					</SectionFields>
				</div>
			</SectionContent>
		</Section>
	);
}

function StrokeSection({
	element,
	trackId,
}: {
	element: VideoElement | ImageElement | TextElement;
	trackId: string;
}) {
	const editor = useEditor();
	const stroke =
		element.type === "text"
			? (element.stroke ?? { enabled: false, color: "#000000", width: 2 })
			: (element.graphicStyle?.stroke ?? {
					enabled: false,
					color: "#000000",
					width: 2,
				});
	const patchStroke = (nextStroke: typeof stroke) =>
		editor.timeline.updateElements({
			updates: [
				{
					trackId,
					elementId: element.id,
					patch:
						element.type === "text"
							? { stroke: nextStroke }
							: {
									graphicStyle: {
										...element.graphicStyle,
										stroke: nextStroke,
									},
								},
				},
			],
		});

	return (
		<Section collapsible defaultOpen={stroke.enabled} sectionKey={`${element.id}:graphics-stroke`}>
			<SectionHeader>
				<SectionTitle>Stroke</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between gap-2 text-sm">
						<span className="text-white/75">Enable stroke</span>
						<Switch checked={stroke.enabled} onCheckedChange={(enabled) => patchStroke({ ...stroke, enabled })} />
					</div>
					{stroke.enabled && (
						<SectionFields>
							<SectionField label="Color">
								<ColorPicker
									value={uppercase({ string: stroke.color.replace("#", "") })}
									onChange={(color) => patchStroke({ ...stroke, color: `#${color}` })}
								/>
							</SectionField>
							<SectionField label="Width">
								<NumberField
									value={String(stroke.width)}
									min={0}
									max={128}
									onChange={(event) => {
										const parsed = Number.parseFloat(event.currentTarget.value);
										if (!Number.isNaN(parsed)) {
											patchStroke({ ...stroke, width: Math.max(0, parsed) });
										}
									}}
									dragSensitivity="slow"
								/>
							</SectionField>
						</SectionFields>
					)}
				</div>
			</SectionContent>
		</Section>
	);
}

function ShadowSection({
	element,
	trackId,
}: {
	element: VideoElement | ImageElement | TextElement;
	trackId: string;
}) {
	const editor = useEditor();
	const shadow =
		element.type === "text"
			? (element.shadow ?? {
					enabled: false,
					color: "#000000",
					blur: 4,
					offsetX: 2,
					offsetY: 2,
				})
			: (element.graphicStyle?.shadow ?? {
					enabled: false,
					color: "#000000",
					blur: 8,
					offsetX: 0,
					offsetY: 4,
				});
	const patchShadow = (nextShadow: typeof shadow) =>
		editor.timeline.updateElements({
			updates: [
				{
					trackId,
					elementId: element.id,
					patch:
						element.type === "text"
							? { shadow: nextShadow }
							: {
									graphicStyle: {
										...element.graphicStyle,
										shadow: nextShadow,
									},
								},
				},
			],
		});

	return (
		<Section collapsible defaultOpen={shadow.enabled} sectionKey={`${element.id}:graphics-shadow`}>
			<SectionHeader>
				<SectionTitle>Shadow</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between gap-2 text-sm">
						<span className="text-white/75">Enable shadow</span>
						<Switch checked={shadow.enabled} onCheckedChange={(enabled) => patchShadow({ ...shadow, enabled })} />
					</div>
					{shadow.enabled && (
						<SectionFields>
							<SectionField label="Color">
								<ColorPicker
									value={uppercase({ string: shadow.color.replace("#", "") })}
									onChange={(color) => patchShadow({ ...shadow, color: `#${color}` })}
								/>
							</SectionField>
							{(["blur", "offsetX", "offsetY"] as const).map((key) => (
								<SectionField key={key} label={key === "offsetX" ? "X" : key === "offsetY" ? "Y" : "Blur"}>
									<NumberField
										value={String(shadow[key])}
										onChange={(event) => {
											const parsed = Number.parseFloat(event.currentTarget.value);
											if (!Number.isNaN(parsed)) {
												patchShadow({ ...shadow, [key]: key === "blur" ? Math.max(0, parsed) : parsed });
											}
										}}
										dragSensitivity="slow"
									/>
								</SectionField>
							))}
						</SectionFields>
					)}
				</div>
			</SectionContent>
		</Section>
	);
}
