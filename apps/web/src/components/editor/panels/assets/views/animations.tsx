"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";

import { HugeiconsIcon } from "@hugeicons/react";
import {
	PlayIcon,
	ArrowDown01Icon,
	ArrowUp01Icon,
	RefreshIcon,
	SparklesIcon,
	MotionIcon,
} from "@hugeicons/core-free-icons";
import {
	useAnimationPresets,
	useApplyAnimationPreset,
} from "@/hooks/use-animation-presets";
import { motionPresets } from "@/lib/presets/motion";
import type { MotionPreset } from "@/lib/presets/types";
import type { AnimationPath } from "@/lib/animation/types";
import type {
	AnimationPreset,
	AnimationPresetCategory,
} from "@/lib/animation/presets";
import {
	ALL_CATEGORY,
	CategoryBar,
	filterByCategory,
} from "@/components/editor/panels/assets/views/category-bar";
import { cn } from "@/utils/ui";
import { MarqueeText } from "@/components/ui/marquee-text";
import { useAssetsPanelStore } from "@/stores/assets-panel-store";

const ANIMATION_CATEGORIES: { key: AnimationPresetCategory; label: string }[] =
	[
		{ key: "entrance", label: "Entrance" },
		{ key: "emphasis", label: "Emphasis" },
		{ key: "exit", label: "Exit" },
		{ key: "combo", label: "Combo" },
		{ key: "loop", label: "Loop" },
	];
const ANIMATION_LABELS = ANIMATION_CATEGORIES.map((c) => c.label);
const ANIMATION_KEY_TO_LABEL = new Map(
	ANIMATION_CATEGORIES.map((c) => [c.key, c.label]),
);

const MOTION_CATEGORY_TO_ANIMATION_CATEGORY: Record<
	MotionPreset["category"],
	AnimationPresetCategory
> = {
	In: "entrance",
	Out: "exit",
	InOut: "combo",
	Loop: "loop",
};

const MOTION_PROPERTY_PATHS = {
	opacity: ["opacity"],
	scale: ["transform.scaleX", "transform.scaleY"],
	rotate: ["transform.rotate"],
	blur: ["params.blur"],
} as const satisfies Record<
	Exclude<MotionPreset["targetProperties"][number], "translate">,
	string[]
>;

function getMotionPropertyPaths(
	motion: MotionPreset,
	property: MotionPreset["targetProperties"][number],
): AnimationPath[] {
	if (property !== "translate") {
		return [...MOTION_PROPERTY_PATHS[property]];
	}
	const text = `${motion.id} ${motion.name}`.toLowerCase();
	return text.includes("left") || text.includes("right")
		? ["transform.positionX"]
		: ["transform.positionY"];
}

const motionAnimationPresets: AnimationPreset[] = motionPresets.map(
	(motion) => ({
		id: motion.id,
		type: motion.id,
		name: motion.name,
		keywords: [motion.category.toLowerCase(), ...motion.targetProperties],
		category: MOTION_CATEGORY_TO_ANIMATION_CATEGORY[motion.category],
		duration: 1000,
		keyframes: ({ elementDuration }) =>
			motion.targetProperties.flatMap((property) =>
				getMotionPropertyPaths(motion, property).flatMap((propertyPath) =>
					motion.keyframes.map((keyframe) => ({
						propertyPath,
						time: Math.round(keyframe.t * elementDuration),
						value: keyframe.value,
						interpolation: "linear" as const,
					})),
				),
			),
	}),
);

const CATEGORY_ICONS: Record<AnimationPresetCategory, React.ReactNode> = {
	entrance: <HugeiconsIcon icon={ArrowDown01Icon} className="size-3" />,
	emphasis: <HugeiconsIcon icon={SparklesIcon} className="size-3" />,
	exit: <HugeiconsIcon icon={ArrowUp01Icon} className="size-3" />,
	combo: <HugeiconsIcon icon={RefreshIcon} className="size-3" />,
	loop: <HugeiconsIcon icon={MotionIcon} className="size-3" />,
};

export function AnimationsView() {
	const existingPresets = useAnimationPresets();
	const apply = useApplyAnimationPreset();
	const all = useMemo(() => {
		const existingTypes = new Set(existingPresets.map((preset) => preset.type));
		return [
			...existingPresets,
			...motionAnimationPresets.filter(
				(preset) => !existingTypes.has(preset.type),
			),
		];
	}, [existingPresets]);
	const [category, setCategory] = useState(ALL_CATEGORY);
	const assetCardSize = useAssetsPanelStore((s) => s.assetCardSize);

	const filtered = useMemo(
		() =>
			filterByCategory({
				items: all,
				category,
				getCategory: (p) => ANIMATION_KEY_TO_LABEL.get(p.category),
			}),
		[all, category],
	);

	const handleApplyPreset = useCallback(
		(preset: AnimationPreset) => {
			const result = apply(preset);
			if (!result.ok) {
				toast.error(result.error ?? "Could not apply animation");
				return;
			}
			toast.success(`${preset.name} applied`);
		},
		[apply],
	);

	return (
		<PanelView title="Animations">
			<div className="flex flex-col gap-3 pb-3">
				<p className="text-muted-foreground text-xs">
					Select an element on the timeline, then choose an animation to apply.
				</p>
				<CategoryBar
					categories={ANIMATION_LABELS}
					value={category}
					onChange={setCategory}
				/>
				<div
					className="grid gap-2"
					style={{
						gridTemplateColumns: `repeat(auto-fill, minmax(${assetCardSize}px, 1fr))`,
					}}
				>
					{filtered.map((preset) => (
						<AnimationPresetItem
							key={preset.type}
							preset={preset}
							onApply={handleApplyPreset}
						/>
					))}
				</div>
			</div>
		</PanelView>
	);
}

function getAnimationPhotoUrl(_presetId: string): null {
	// Backwards-compat. The animation preview uses procedural CSS via
	// `getPaletteForId` — no remote thumbnail fetch.
	return null;
}

const AnimationPresetItem = memo(function AnimationPresetItem({
	preset,
	onApply,
}: {
	preset: AnimationPreset;
	onApply: (preset: AnimationPreset) => void;
}) {
	const [busy, setBusy] = useState(false);
	const photoUrl = getAnimationPhotoUrl(preset.type);
	void photoUrl;

	const handleApply = useCallback(() => {
		setBusy(true);
		try {
			onApply(preset);
		} finally {
			setBusy(false);
		}
	}, [onApply, preset]);

	const previewStyle = useMemo(() => presetPreviewStyle(preset), [preset]);

	return (
		// biome-ignore lint/a11y/useSemanticElements: card contains hover badges and nested affordances; outer button would be invalid
		<div
			role="button"
			tabIndex={0}
			onClick={handleApply}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					handleApply();
				}
			}}
			className={cn(
				`asset-preview-container group ${busy ? "opacity-50 pointer-events-none" : "cursor-pointer"}`,
			)}
		>
			<div className="asset-preview-overlay" />

			<div
				className="relative size-full overflow-hidden rounded-sm mx-auto mt-2"
				style={{ width: "80%", height: "80%" }}
			>
				<div
					aria-hidden
					className="absolute inset-0 bg-black"
				/>
				<div
					className="absolute inset-0 flex items-center justify-center z-10"
					style={previewStyle}
				>
					<PresetIcon preset={preset} />
				</div>
			</div>
			<MarqueeText
				className="text-foreground z-10 w-full px-2 text-[0.7rem] font-medium drop-shadow-md"
				pxPerSecond={30}
			>
				{preset.name}
			</MarqueeText>
			<div className="text-white/70 absolute left-1.5 top-1.5 z-20 flex items-center gap-0.5 rounded bg-black/60 border border-white/10 px-1 py-0.5 text-[0.55rem] backdrop-blur-sm">
				{CATEGORY_ICONS[preset.category]}
			</div>
		</div>
	);
});

const PresetIcon = memo(function PresetIcon({ preset }: { preset: AnimationPreset }) {
	const keyframes = useMemo(() => presetStyleKeyframes(preset), [preset]);

	return (
		<div
			className="flex size-12 items-center justify-center rounded-md bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 text-white"
			style={{
				animation: `${preset.type} 2.4s ease-in-out infinite alternate`,
			}}
		>
			<HugeiconsIcon icon={PlayIcon} className="size-5" />
			<style>{keyframes}</style>
		</div>
	);
});

function presetPreviewStyle(preset: AnimationPreset): React.CSSProperties {
	return {
		animation: `${preset.type} 2.4s ease-in-out infinite alternate`,
	};
}

function presetStyleKeyframes(preset: AnimationPreset): string {
	switch (preset.type) {
		case "fade-up":
			return `@keyframes fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`;
		case "pop-in":
			return `@keyframes pop-in { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }`;
		case "slide-in-left":
			return `@keyframes slide-in-left { from { transform: translateX(-30px); } to { transform: translateX(0); } }`;
		case "slide-in-right":
			return `@keyframes slide-in-right { from { transform: translateX(30px); } to { transform: translateX(0); } }`;
		case "rotate-in":
			return `@keyframes rotate-in { from { opacity: 0; transform: rotate(-45deg); } to { opacity: 1; transform: rotate(0); } }`;
		case "bounce-in":
			return `@keyframes bounce-in { 0% { transform: scale(0); } 60% { transform: scale(1.15); } 80% { transform: scale(0.9); } 100% { transform: scale(1); } }`;
		case "fade-out":
			return `@keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }`;
		case "slide-out-left":
			return `@keyframes slide-out-left { from { transform: translateX(0); } to { transform: translateX(-30px); } }`;
		case "zoom-out":
			return `@keyframes zoom-out { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(1.5); } }`;
		case "combo-fade-up-and-out":
			return `@keyframes combo-fade-up-and-out { 0% { opacity: 0; transform: translateY(20px); } 30% { opacity: 1; transform: translateY(0); } 60% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(0); } }`;
		case "combo-pop-and-zoom-out":
			return `@keyframes combo-pop-and-zoom-out { 0% { opacity: 0; transform: scale(0.6); } 30% { opacity: 1; transform: scale(1); } 60% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.5); } }`;
		case "type-writer":
			return `@keyframes type-writer { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`;
		case "pulse":
			return `@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } }`;
		case "shake":
			return `@keyframes shake { 0% { transform: translateX(0); } 25% { transform: translateX(-10px); } 50% { transform: translateX(10px); } 75% { transform: translateX(-6px); } 100% { transform: translateX(0); } }`;
		case "flash":
			return `@keyframes flash { 0% { opacity: 1; } 33% { opacity: 0.2; } 66% { opacity: 1; } 100% { opacity: 0.2; } }`;
		case "wobble":
			return `@keyframes wobble { 0% { transform: rotate(0); } 25% { transform: rotate(-8deg); } 50% { transform: rotate(8deg); } 75% { transform: rotate(-4deg); } 100% { transform: rotate(0); } }`;
		case "breathe":
			return `@keyframes breathe { 0% { transform: scale(1); } 50% { transform: scale(1.06); } 100% { transform: scale(1); } }`;
		case "float":
			return `@keyframes float { 0% { transform: translateY(0); } 50% { transform: translateY(-12px); } 100% { transform: translateY(0); } }`;
		default:
			if (preset.type.startsWith("m-")) {
				return motionPresetStyleKeyframes(preset);
			}
			if (preset.type.startsWith("gen-animation-")) {
				const i = parseInt(preset.type.split("-")[2] || "0", 10);
				const dir = i % 4;
				if (dir === 0)
					return `@keyframes ${preset.type} { from { opacity: 0; transform: translateY(20px) rotate(${i % 30}deg); } to { opacity: 1; transform: translateY(0) rotate(0); } }`;
				if (dir === 1)
					return `@keyframes ${preset.type} { from { opacity: 0; transform: scale(0.5) rotate(-${i % 30}deg); } to { opacity: 1; transform: scale(1) rotate(0); } }`;
				if (dir === 2)
					return `@keyframes ${preset.type} { from { opacity: 0; transform: translateX(${i % 2 === 0 ? "-" : ""}30px); } to { opacity: 1; transform: translateX(0); } }`;
				return `@keyframes ${preset.type} { from { opacity: 0; transform: translateY(-20px) scale(1.2); } to { opacity: 1; transform: translateY(0) scale(1); } }`;
			}
			return "";
	}
}

function motionPresetStyleKeyframes(preset: AnimationPreset): string {
	const motion = motionPresets.find((item) => item.id === preset.type);
	if (!motion) return "";
	const frames = motion.keyframes
		.map((keyframe) => {
			const declarations = motion.targetProperties
				.map((property) =>
					motionCssDeclaration(motion, property, Number(keyframe.value)),
				)
				.filter(Boolean)
				.join(" ");
			return `${Math.round(keyframe.t * 100)}% { ${declarations} }`;
		})
		.join(" ");
	return `@keyframes ${preset.type} { ${frames} }`;
}

function motionCssDeclaration(
	motion: MotionPreset,
	property: MotionPreset["targetProperties"][number],
	value: number,
): string {
	switch (property) {
		case "opacity":
			return `opacity: ${value};`;
		case "translate": {
			const axis = getMotionPropertyPaths(motion, property).includes(
				"transform.positionX",
			)
				? "X"
				: "Y";
			return `transform: translate${axis}(${value}px);`;
		}
		case "scale":
			return `transform: scale(${value});`;
		case "rotate":
			return `transform: rotate(${value}deg);`;
		case "blur":
			return `filter: blur(${value}px);`;
	}
}
