"use client";

import type { ImageElement, TextElement, VideoElement } from "@/lib/timeline";
import { useEditor } from "@/hooks/use-editor";
import { useI18n } from "@/lib/i18n";
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
		<div className="flex flex-col gap-3 px-3.5 py-3">
			<ColorFillSection element={element} trackId={trackId} />
			<StrokeSection element={element} trackId={trackId} />
			<BorderSection element={element} trackId={trackId} />
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
	const { t } = useI18n();
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
		<Section
			card
			collapsible
			defaultOpen
			sectionKey={`${element.id}:graphics-fill`}
		>
			<SectionHeader>
				<SectionTitle>{t("properties.graphics.colorFill")}</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<div className="flex flex-col gap-3">
					{!isText && (
						<div className="flex items-center justify-between gap-2 text-sm">
							<span className="text-white/75">
								{t("properties.graphics.enableFill")}
							</span>
							<Switch
								checked={fillEnabled}
								onCheckedChange={(enabled) =>
									setMediaFillOpacity(enabled ? Math.max(opacity, 0.35) : 0)
								}
							/>
						</div>
					)}
					<SectionFields>
						<SectionField
							label={
								isText
									? t("properties.graphics.textColor")
									: t("properties.graphics.fillColor")
							}
						>
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
							<SectionField label={t("properties.graphics.fillOpacity")}>
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
	const { t } = useI18n();
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
		<Section
			card
			collapsible
			defaultOpen={stroke.enabled}
			sectionKey={`${element.id}:graphics-stroke`}
		>
			<SectionHeader>
				<SectionTitle>{t("properties.graphics.stroke")}</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between gap-2 text-sm">
						<span className="text-white/75">
							{t("properties.graphics.enableStroke")}
						</span>
						<Switch
							checked={stroke.enabled}
							onCheckedChange={(enabled) => patchStroke({ ...stroke, enabled })}
						/>
					</div>
					{stroke.enabled && (
						<SectionFields>
							<SectionField label={t("properties.graphics.strokeColor")}>
								<ColorPicker
									value={uppercase({ string: stroke.color.replace("#", "") })}
									onChange={(color) =>
										patchStroke({ ...stroke, color: `#${color}` })
									}
								/>
							</SectionField>
							<SectionField label={t("properties.graphics.strokeWidth")}>
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

function BorderSection({
	element,
	trackId,
}: {
	element: VideoElement | ImageElement | TextElement;
	trackId: string;
}) {
	const editor = useEditor();
	const { t } = useI18n();

	if (element.type === "text") return null;

	const border = element.graphicStyle?.border ?? {
		enabled: false,
		color: "#ffffff",
		width: 4,
		opacity: 1,
	};
	const patchBorder = (nextBorder: typeof border) =>
		editor.timeline.updateElements({
			updates: [
				{
					trackId,
					elementId: element.id,
					patch: {
						graphicStyle: {
							...element.graphicStyle,
							border: nextBorder,
						},
					},
				},
			],
		});

	return (
		<Section
			card
			collapsible
			defaultOpen={border.enabled}
			sectionKey={`${element.id}:graphics-border`}
		>
			<SectionHeader>
				<SectionTitle>{t("properties.graphics.border")}</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between gap-2 text-sm">
						<span className="text-white/75">
							{t("properties.graphics.enableBorder")}
						</span>
						<Switch
							checked={border.enabled}
							onCheckedChange={(enabled) => patchBorder({ ...border, enabled })}
						/>
					</div>
					{border.enabled && (
						<SectionFields>
							<SectionField label={t("properties.graphics.borderColor")}>
								<ColorPicker
									value={uppercase({
										string: border.color.replace("#", ""),
									})}
									onChange={(color) =>
										patchBorder({ ...border, color: `#${color}` })
									}
								/>
							</SectionField>
							<SectionField label={t("properties.graphics.borderWidth")}>
								<NumberField
									value={String(border.width)}
									min={0}
									max={128}
									onChange={(event) => {
										const parsed = Number.parseFloat(event.currentTarget.value);
										if (!Number.isNaN(parsed)) {
											patchBorder({
												...border,
												width: Math.max(0, parsed),
											});
										}
									}}
									dragSensitivity="slow"
								/>
							</SectionField>
							<SectionField label={t("properties.graphics.borderOpacity")}>
								<NumberField
									icon="%"
									value={Math.round((border.opacity ?? 1) * 100).toString()}
									min={0}
									max={100}
									scrubClamp={{ min: 0, max: 100 }}
									onChange={(event) => {
										const parsed = Number.parseFloat(event.currentTarget.value);
										if (!Number.isNaN(parsed)) {
											patchBorder({
												...border,
												opacity: parsed / 100,
											});
										}
									}}
									onScrub={(value) =>
										patchBorder({
											...border,
											opacity: value / 100,
										})
									}
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
	const { t } = useI18n();
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
		<Section
			card
			collapsible
			defaultOpen={shadow.enabled}
			sectionKey={`${element.id}:graphics-shadow`}
		>
			<SectionHeader>
				<SectionTitle>{t("properties.graphics.shadow")}</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between gap-2 text-sm">
						<span className="text-white/75">
							{t("properties.graphics.enableShadow")}
						</span>
						<Switch
							checked={shadow.enabled}
							onCheckedChange={(enabled) => patchShadow({ ...shadow, enabled })}
						/>
					</div>
					{shadow.enabled && (
						<SectionFields>
							<SectionField label={t("properties.graphics.shadowColor")}>
								<ColorPicker
									value={uppercase({ string: shadow.color.replace("#", "") })}
									onChange={(color) =>
										patchShadow({ ...shadow, color: `#${color}` })
									}
								/>
							</SectionField>
							{(["blur", "offsetX", "offsetY"] as const).map((key) => (
								<SectionField
									key={key}
									label={
										key === "offsetX"
											? t("properties.graphics.shadowX")
											: key === "offsetY"
												? t("properties.graphics.shadowY")
												: t("properties.graphics.shadowBlur")
									}
								>
									<NumberField
										value={String(shadow[key])}
										onChange={(event) => {
											const parsed = Number.parseFloat(
												event.currentTarget.value,
											);
											if (!Number.isNaN(parsed)) {
												patchShadow({
													...shadow,
													[key]: key === "blur" ? Math.max(0, parsed) : parsed,
												});
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
