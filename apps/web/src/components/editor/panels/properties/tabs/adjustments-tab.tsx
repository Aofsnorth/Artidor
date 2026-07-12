"use client";

import type { ParamValues } from "@/lib/params";
import type { Effect } from "@/lib/effects/types";
import type { VisualElement } from "@/lib/timeline";
import { effectsRegistry } from "@/lib/effects";
import { useEditor } from "@/hooks/use-editor";
import { useElementPreview } from "@/hooks/use-element-preview";
import {
	Section,
	SectionContent,
	SectionHeader,
	SectionTitle,
	SectionFields,
} from "@/components/section";
import { PropertyParamField } from "../components/property-param-field";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Delete02Icon,
	ViewIcon,
	ViewOffSlashIcon,
	Add01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/utils/ui";
import { isAdjustmentEffect } from "@/lib/effects/css-filter";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AdjustmentsTab({
	element,
	trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	const editor = useEditor();
	const { renderElement, previewUpdates, commit } = useElementPreview({
		trackId,
		elementId: element.id,
		fallback: element,
	});

	const allEffects: Effect[] = element.effects ?? [];
	const adjustments = allEffects.filter((ef) =>
		isAdjustmentEffect({ effectType: ef.type }),
	);

	const allDefinitions = effectsRegistry.getAll();
	const availableAdjustments = allDefinitions.filter(
		(def) =>
			isAdjustmentEffect({ effectType: def.type }) &&
			!adjustments.some((adj) => adj.type === def.type),
	);

	const getRenderParams = ({ effectId }: { effectId: string }): ParamValues => {
		return (
			(renderElement as VisualElement).effects?.find((ef) => ef.id === effectId)
				?.params ??
			allEffects.find((ef) => ef.id === effectId)?.params ??
			{}
		);
	};

	const buildPreviewParam =
		(effectId: string) =>
		(key: string) =>
		(value: number | string | boolean) => {
			const updatedEffects = (
				(renderElement as VisualElement).effects ?? []
			).map((existing) =>
				existing.id !== effectId
					? existing
					: { ...existing, params: { ...existing.params, [key]: value } },
			);
			previewUpdates({ effects: updatedEffects });
		};

	const handleAddAdjustment = (type: string) => {
		editor.timeline.addClipEffect({
			trackId,
			elementId: element.id,
			effectType: type,
		});
	};

	return (
		<div className="flex flex-col h-full">
			<div className="border-b px-3.5 h-11 shrink-0 flex items-center justify-between">
				<SectionTitle>Adjustments</SectionTitle>
				{availableAdjustments.length > 0 && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
								<HugeiconsIcon icon={Add01Icon} className="mr-1 size-3" />
								Add
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-48">
							{availableAdjustments.map((def) => (
								<DropdownMenuItem
									key={def.type}
									onClick={() => handleAddAdjustment(def.type)}
								>
									{def.name}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>

			{adjustments.length === 0 ? (
				<EmptyView
					onAdd={() => handleAddAdjustment(availableAdjustments[0]?.type)}
					hasAvailable={availableAdjustments.length > 0}
				/>
			) : (
				<ul className="flex flex-col gap-3 px-3.5 py-3">
					{adjustments.map((effect) => (
						<li key={effect.id} className="list-none">
							<AdjustmentSection
								effect={effect}
								renderParams={getRenderParams({ effectId: effect.id })}
								previewParam={buildPreviewParam(effect.id)}
								onCommit={commit}
								onToggle={() =>
									editor.timeline.toggleClipEffect({
										trackId,
										elementId: element.id,
										effectId: effect.id,
									})
								}
								onRemove={() =>
									editor.timeline.removeClipEffect({
										trackId,
										elementId: element.id,
										effectId: effect.id,
									})
								}
							/>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function EmptyView({
	onAdd,
	hasAvailable,
}: {
	onAdd: () => void;
	hasAvailable: boolean;
}) {
	return (
		<div className="flex flex-col h-full items-center justify-center gap-4 text-center p-6">
			<div className="flex flex-col gap-2">
				<h3 className="font-medium text-foreground">No adjustments</h3>
				<p className="text-muted-foreground text-sm text-balance max-w-44">
					Add color grading adjustments to this layer.
				</p>
			</div>
			{hasAvailable && (
				<Button variant="default" size="sm" onClick={onAdd}>
					Add adjustment
				</Button>
			)}
		</div>
	);
}

function AdjustmentSection({
	effect,
	renderParams,
	previewParam,
	onCommit,
	onToggle,
	onRemove,
}: {
	effect: Effect;
	renderParams: ParamValues;
	previewParam: (key: string) => (value: number | string | boolean) => void;
	onCommit: () => void;
	onToggle: () => void;
	onRemove: () => void;
}) {
	const definition = effectsRegistry.get(effect.type);

	return (
		<Section
			card
			collapsible
			sectionKey={`clip-adjustment:${effect.id}`}
			showTopBorder={false}
		>
			<SectionHeader
				trailing={
					<div className="flex items-center gap-1">
						<Button
							variant={effect.enabled ? "secondary" : "ghost"}
							size="icon"
							aria-label={`Toggle ${definition.name}`}
							onClick={onToggle}
						>
							<HugeiconsIcon
								icon={effect.enabled ? ViewIcon : ViewOffSlashIcon}
							/>
						</Button>
						<Button
							variant="ghost"
							size="icon"
							aria-label={`Remove ${definition.name}`}
							onClick={onRemove}
						>
							<HugeiconsIcon icon={Delete02Icon} />
						</Button>
					</div>
				}
			>
				<SectionTitle
					className={cn(!effect.enabled && "text-muted-foreground")}
				>
					{definition.name}
				</SectionTitle>
			</SectionHeader>
			<SectionContent className={cn("p-0", !effect.enabled && "opacity-50")}>
				<SectionFields>
					{definition.params.map((param) => (
						<div key={param.key} className="flex flex-col gap-3.5">
							<div className="px-4 pb-2">
								<PropertyParamField
									param={param}
									value={renderParams[param.key] ?? param.default}
									onPreview={previewParam(param.key)}
									onCommit={onCommit}
								/>
							</div>
						</div>
					))}
				</SectionFields>
			</SectionContent>
		</Section>
	);
}
