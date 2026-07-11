"use client";

import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import {
	Section,
	SectionContent,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import {
	BACKGROUND_BLUR_INTENSITY_PRESETS,
	DEFAULT_BACKGROUND_BLUR_INTENSITY,
} from "@/lib/background/blur";
import { DEFAULT_BACKGROUND_COLOR } from "@/lib/background/color";
import { patternCraftGradients } from "@/data/colors/pattern-craft";
import { colors } from "@/data/colors/solid";
import { syntaxUIGradients } from "@/data/colors/syntax-ui";
import { useEditor } from "@/hooks/use-editor";
import { useI18n } from "@/lib/i18n";
import { effectPreviewService } from "@/services/renderer/effect-preview";
import { cn } from "@/utils/ui";

const BLUR_PREVIEW_UNIFORM_DIMENSIONS = {
	width: 1920,
	height: 1080,
} as const;

const BlurPreview = memo(
	({
		blur,
		isSelected,
		onSelect,
	}: {
		blur: { label: string; value: number };
		isSelected: boolean;
		onSelect: () => void;
	}) => {
		const { t } = useI18n();
		const canvasRef = useRef<HTMLCanvasElement>(null);

		useEffect(() => {
			const renderPreview = () => {
				if (!canvasRef.current) return;

				effectPreviewService.renderPreview({
					effectType: "blur",
					params: { intensity: blur.value },
					targetCanvas: canvasRef.current,
					uniformDimensions: BLUR_PREVIEW_UNIFORM_DIMENSIONS,
				});
			};

			renderPreview();
			return effectPreviewService.onPreviewImageReady({
				callback: renderPreview,
			});
		}, [blur.value]);

		return (
			<button
				className={cn(
					"border-foreground/15 hover:border-primary relative aspect-square size-20 cursor-pointer overflow-hidden rounded-sm border",
					isSelected && "border-primary border-2",
				)}
				onClick={onSelect}
				type="button"
				aria-label={t("editor.background.selectBlur", { label: blur.label })}
			>
				<canvas
					ref={canvasRef}
					className="absolute inset-0 h-full w-full object-cover"
				/>
				<div className="absolute right-1 bottom-1 left-1 text-center">
					<span className="rounded bg-black/50 px-1 text-xs text-white">
						{blur.label}
					</span>
				</div>
			</button>
		);
	},
);

BlurPreview.displayName = "BlurPreview";

const BackgroundPreviews = memo(
	({
		backgrounds,
		currentBackgroundColor,
		isColorBackground,
		onSelect,
		useBackgroundColor = false,
	}: {
		backgrounds: string[];
		currentBackgroundColor: string;
		isColorBackground: boolean;
		onSelect: (bg: string) => void;
		useBackgroundColor?: boolean;
	}) => {
		const { t } = useI18n();
		return useMemo(
			() =>
				backgrounds.map((bg) => (
					<button
						key={bg}
						className={cn(
							"border-foreground/15 hover:border-primary aspect-square size-20 cursor-pointer rounded-sm border",
							isColorBackground &&
								bg === currentBackgroundColor &&
								"border-primary border-2",
						)}
						style={
							useBackgroundColor
								? { backgroundColor: bg }
								: {
										background: bg,
										backgroundSize: "cover",
										backgroundPosition: "center",
										backgroundRepeat: "no-repeat",
									}
						}
						onClick={() => onSelect(bg)}
						type="button"
						aria-label={t("editor.background.selectBackground", { color: bg })}
					/>
				)),
			[
				backgrounds,
				isColorBackground,
				currentBackgroundColor,
				onSelect,
				useBackgroundColor,
				t,
			],
		);
	},
);

BackgroundPreviews.displayName = "BackgroundPreviews";

const COLOR_SECTIONS = [
	{
		id: "colors",
		titleKey: "editor.background.section.colors",
		backgrounds: colors,
		useBackgroundColor: true,
	},
	{
		id: "pattern-craft",
		titleKey: "editor.background.section.patternCraft",
		backgrounds: patternCraftGradients,
	},
	{
		id: "syntax-ui",
		titleKey: "editor.background.section.syntaxUi",
		backgrounds: syntaxUIGradients,
	},
] as const;

const BLUR_LABEL_KEYS: Record<number, string> = {
	100: "editor.background.blurLight",
	200: "editor.background.blurMedium",
	500: "editor.background.blurHeavy",
};

export function BackgroundContent() {
	const { t } = useI18n();
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());

	const handleBlurSelect = useCallback(
		async (blurIntensity: number) => {
			await editor.project.updateSettings({
				settings: { background: { type: "blur", blurIntensity } },
			});
		},
		[editor.project],
	);

	const handleColorSelect = useCallback(
		async (color: string) => {
			await editor.project.updateSettings({
				settings: { background: { type: "color", color } },
			});
		},
		[editor.project],
	);

	const isBlurBackground = activeProject.settings.background.type === "blur";
	const isColorBackground = activeProject.settings.background.type === "color";

	const currentBlurIntensity = isBlurBackground
		? (activeProject.settings.background as { blurIntensity: number })
				.blurIntensity
		: DEFAULT_BACKGROUND_BLUR_INTENSITY;

	const currentBackgroundColor = isColorBackground
		? (activeProject.settings.background as { color: string }).color
		: DEFAULT_BACKGROUND_COLOR;

	const blurPreviews = useMemo(
		() =>
			BACKGROUND_BLUR_INTENSITY_PRESETS.map((blur) => (
				<BlurPreview
					key={blur.value}
					blur={{ ...blur, label: t(BLUR_LABEL_KEYS[blur.value]) }}
					isSelected={isBlurBackground && currentBlurIntensity === blur.value}
					onSelect={() => handleBlurSelect(blur.value)}
				/>
			)),
		[isBlurBackground, currentBlurIntensity, handleBlurSelect, t],
	);

	return (
		<div className="flex flex-col">
			<Section
				collapsible
				defaultOpen={true}
				sectionKey="background-blur"
				showTopBorder={false}
			>
				<SectionHeader>
					<SectionTitle>{t("editor.background.section.blur")}</SectionTitle>
				</SectionHeader>
				<SectionContent>
					<div className="flex flex-wrap gap-2">{blurPreviews}</div>
				</SectionContent>
			</Section>
			{COLOR_SECTIONS.map((section) => (
				<Section
					key={section.id}
					collapsible
					defaultOpen={false}
					sectionKey={`settings:background-${section.id}`}
				>
					<SectionHeader>
						<SectionTitle>{t(section.titleKey)}</SectionTitle>
					</SectionHeader>
					<SectionContent>
						<div className="flex flex-wrap gap-2">
							<BackgroundPreviews
								backgrounds={section.backgrounds as string[]}
								currentBackgroundColor={currentBackgroundColor}
								isColorBackground={isColorBackground}
								onSelect={handleColorSelect}
								useBackgroundColor={
									"useBackgroundColor" in section
										? section.useBackgroundColor
										: false
								}
							/>
						</div>
					</SectionContent>
				</Section>
			))}
		</div>
	);
}
