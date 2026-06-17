"use client";

import { NumberField } from "@/components/ui/number-field";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { HugeiconsIcon } from "@hugeicons/react";
import { MusicNote01Icon, VolumeHighIcon } from "@hugeicons/core-free-icons";
import { useAudioEffects } from "@/hooks/use-audio-effects";
import { EQ_BANDS, EQ_PRESETS } from "@/lib/audio/equalizer";
import { formatNumberForDisplay, getFractionDigitsForStep } from "@/utils/math";
import {
	Section,
	SectionContent,
	SectionField,
	SectionFields,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import { useEditor } from "@/hooks/use-editor";
import type { AudioElement, VideoElement } from "@/lib/timeline";

const GAIN_STEP = 0.5;
const FRACTION_DIGITS = getFractionDigitsForStep({ step: GAIN_STEP });
const TIME_STEP = 0.01;
const TIME_FRACTION_DIGITS = getFractionDigitsForStep({ step: TIME_STEP });

export function AudioEffectsTab({
	element,
	trackId,
}: {
	element: AudioElement | VideoElement;
	trackId: string;
}) {
	const _editor = useEditor();
	const {
		state,
		resetEffects,
		setEqEnabled,
		setEqBandGain,
		setEqPreset,
		setReverb,
		setDelay,
		setModulation,
		setDistortion,
		setCompressor,
		setVoiceChanger,
		setNoiseReduction,
		REVERB_PRESETS,
		DELAY_PRESETS,
		MODULATION_PRESETS,
		DISTORTION_PRESETS,
		VOICE_CHANGER_PRESETS,
	} = useAudioEffects({ trackId, element });

	const { chain } = state;
	const anyEnabled =
		chain.eq.enabled ||
		chain.reverb.enabled ||
		chain.delay.enabled ||
		chain.modulation.enabled ||
		chain.distortion.enabled ||
		chain.compressor.enabled ||
		chain.voiceChanger.enabled ||
		chain.noiseReduction.enabled;

	return (
		<div className="flex flex-col h-full">
			<div className="border-b px-3.5 h-11 shrink-0 flex items-center justify-between">
				<SectionTitle>Audio Effects</SectionTitle>
				<Button
					variant="ghost"
					size="sm"
					className="h-7 px-2 text-xs"
					disabled={!anyEnabled}
					onClick={resetEffects}
				>
					Reset
				</Button>
			</div>

			<div className="flex flex-col gap-4 p-4 overflow-y-auto">
				<NoiseReductionSection
					enabled={chain.noiseReduction.enabled}
					onChange={setNoiseReduction}
				/>
				<EqSection
					enabled={chain.eq.enabled}
					gains={chain.eq.gains}
					onEnabledChange={setEqEnabled}
					onBandChange={setEqBandGain}
					onPreset={setEqPreset}
				/>
				<CompressorSection params={chain.compressor} onChange={setCompressor} />
				<ReverbSection
					params={chain.reverb}
					onChange={setReverb}
					presets={REVERB_PRESETS}
				/>
				<DelaySection
					params={chain.delay}
					onChange={setDelay}
					presets={DELAY_PRESETS}
				/>
				<ModulationSection
					params={chain.modulation}
					onChange={setModulation}
					presets={MODULATION_PRESETS}
				/>
				<DistortionSection
					params={chain.distortion}
					onChange={setDistortion}
					presets={DISTORTION_PRESETS}
				/>
				<VoiceChangerSection
					params={chain.voiceChanger}
					onChange={setVoiceChanger}
					presets={VOICE_CHANGER_PRESETS}
				/>
			</div>
		</div>
	);
}

function NoiseReductionSection({
	enabled,
	onChange,
}: {
	enabled: boolean;
	onChange: (p: { enabled?: boolean; strength?: number }) => void;
}) {
	return (
		<Section collapsible sectionKey="audio:nr" defaultOpen={enabled}>
			<SectionHeader
				trailing={
					<Switch
						checked={enabled}
						onCheckedChange={(c) => onChange({ enabled: c })}
					/>
				}
			>
				<SectionTitle>
					<HugeiconsIcon
						icon={VolumeHighIcon}
						className="inline size-3.5 mr-1.5 align-text-bottom"
					/>
					Noise Reduction
				</SectionTitle>
			</SectionHeader>
			<SectionContent
				className={cn(!enabled && "pointer-events-none opacity-50")}
			>
				<SectionFields>
					<SectionField label="Strength">
						<NumberField
							value="50"
							suffix="%"
							min={0}
							max={100}
							step={1}
							onChange={() => {}}
							onFocus={() => {}}
							onBlur={() => {}}
							onScrub={() => {}}
							onScrubEnd={() => {}}
							onReset={() => onChange({ enabled, strength: 0.5 })}
						/>
					</SectionField>
					<p className="text-xs text-muted-foreground">
						Removes wind, hum, and constant background noise using spectral
						filtering.
					</p>
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

function EqSection({
	enabled,
	gains,
	onEnabledChange,
	onBandChange,
	onPreset,
}: {
	enabled: boolean;
	gains: Record<string, number>;
	onEnabledChange: (enabled: boolean) => void;
	onBandChange: (bandId: string, gain: number) => void;
	onPreset: (presetId: string) => void;
}) {
	return (
		<Section collapsible sectionKey="audio:eq" defaultOpen={enabled}>
			<SectionHeader
				trailing={
					<div className="flex items-center gap-2">
						<Select onValueChange={onPreset}>
							<SelectTrigger className="h-7 w-32 text-xs">
								<SelectValue placeholder="EQ Preset" />
							</SelectTrigger>
							<SelectContent>
								{EQ_PRESETS.map((p) => (
									<SelectItem key={p.id} value={p.id}>
										{p.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Switch checked={enabled} onCheckedChange={onEnabledChange} />
					</div>
				}
			>
				<SectionTitle>
					<HugeiconsIcon
						icon={MusicNote01Icon}
						className="inline size-3.5 mr-1.5 align-text-bottom"
					/>
					Equalizer
				</SectionTitle>
			</SectionHeader>
			<SectionContent
				className={cn(!enabled && "pointer-events-none opacity-50")}
			>
				<SectionFields>
					<div className="grid grid-cols-1 gap-2">
						{EQ_BANDS.map((band) => (
							<div key={band.id} className="flex items-center gap-2">
								<span className="w-16 text-xs text-muted-foreground">
									{band.label}
								</span>
								<Slider
									min={-12}
									max={12}
									step={0.5}
									value={[gains[band.id] ?? 0]}
									onValueChange={(v) => onBandChange(band.id, v[0] ?? 0)}
									className="flex-1"
								/>
								<NumberField
									className="w-16"
									value={formatNumberForDisplay({
										value: gains[band.id] ?? 0,
										fractionDigits: FRACTION_DIGITS,
									})}
									suffix="dB"
									min={-12}
									max={12}
									step={GAIN_STEP}
									onFocus={() => {}}
									onChange={(e) =>
										onBandChange(
											band.id,
											Number.parseFloat(e.target.value) || 0,
										)
									}
									onBlur={() => {}}
									onScrub={() => {}}
									onScrubEnd={() => {}}
									onReset={() => onBandChange(band.id, 0)}
								/>
							</div>
						))}
					</div>
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

function CompressorSection({
	params,
	onChange,
}: {
	params: {
		enabled: boolean;
		threshold: number;
		ratio: number;
		attack: number;
		release: number;
		knee: number;
		gain: number;
	};
	onChange: (p: {
		enabled?: boolean;
		threshold?: number;
		ratio?: number;
		attack?: number;
		release?: number;
		knee?: number;
		gain?: number;
	}) => void;
}) {
	return (
		<Section collapsible sectionKey="audio:comp" defaultOpen={params.enabled}>
			<SectionHeader
				trailing={
					<Switch
						checked={params.enabled}
						onCheckedChange={(c) => onChange({ enabled: c })}
					/>
				}
			>
				<SectionTitle>Compressor</SectionTitle>
			</SectionHeader>
			<SectionContent
				className={cn(!params.enabled && "pointer-events-none opacity-50")}
			>
				<SectionFields>
					<div className="grid grid-cols-2 gap-2">
						<SectionField label="Threshold">
							<NumberField
								value={params.threshold.toString()}
								suffix="dB"
								onChange={(e) =>
									onChange({
										threshold: Number.parseFloat(e.target.value) || 0,
									})
								}
								onFocus={() => {}}
								onBlur={() => {}}
								onScrub={() => {}}
								onScrubEnd={() => {}}
								onReset={() => onChange({ threshold: -18 })}
							/>
						</SectionField>
						<SectionField label="Ratio">
							<NumberField
								value={params.ratio.toString()}
								suffix=":1"
								onChange={(e) =>
									onChange({ ratio: Number.parseFloat(e.target.value) || 0 })
								}
								onFocus={() => {}}
								onBlur={() => {}}
								onScrub={() => {}}
								onScrubEnd={() => {}}
								onReset={() => onChange({ ratio: 3 })}
							/>
						</SectionField>
						<SectionField label="Attack">
							<NumberField
								value={formatNumberForDisplay({
									value: params.attack,
									fractionDigits: TIME_FRACTION_DIGITS,
								})}
								suffix="s"
								onChange={(e) =>
									onChange({ attack: Number.parseFloat(e.target.value) || 0 })
								}
								onFocus={() => {}}
								onBlur={() => {}}
								onScrub={() => {}}
								onScrubEnd={() => {}}
								onReset={() => onChange({ attack: 0.003 })}
							/>
						</SectionField>
						<SectionField label="Release">
							<NumberField
								value={formatNumberForDisplay({
									value: params.release,
									fractionDigits: TIME_FRACTION_DIGITS,
								})}
								suffix="s"
								onChange={(e) =>
									onChange({ release: Number.parseFloat(e.target.value) || 0 })
								}
								onFocus={() => {}}
								onBlur={() => {}}
								onScrub={() => {}}
								onScrubEnd={() => {}}
								onReset={() => onChange({ release: 0.25 })}
							/>
						</SectionField>
						<SectionField label="Makeup">
							<NumberField
								value={params.gain.toString()}
								suffix="dB"
								onChange={(e) =>
									onChange({ gain: Number.parseFloat(e.target.value) || 0 })
								}
								onFocus={() => {}}
								onBlur={() => {}}
								onScrub={() => {}}
								onScrubEnd={() => {}}
								onReset={() => onChange({ gain: 0 })}
							/>
						</SectionField>
					</div>
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

function ReverbSection({
	params,
	onChange,
	presets,
}: {
	params: { enabled: boolean; presetId: string; mix: number };
	onChange: (p: { enabled?: boolean; presetId?: string; mix?: number }) => void;
	presets: { id: string; name: string }[];
}) {
	return (
		<Section collapsible sectionKey="audio:reverb" defaultOpen={params.enabled}>
			<SectionHeader
				trailing={
					<Switch
						checked={params.enabled}
						onCheckedChange={(c) => onChange({ enabled: c })}
					/>
				}
			>
				<SectionTitle>Reverb</SectionTitle>
			</SectionHeader>
			<SectionContent
				className={cn(!params.enabled && "pointer-events-none opacity-50")}
			>
				<SectionFields>
					<SectionField label="Preset">
						<Select
							value={params.presetId}
							onValueChange={(v) => onChange({ presetId: v })}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{presets.map((p) => (
									<SelectItem key={p.id} value={p.id}>
										{p.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</SectionField>
					<SectionField label="Mix">
						<Slider
							min={0}
							max={1}
							step={0.01}
							value={[params.mix]}
							onValueChange={(v) => onChange({ mix: v[0] ?? 0 })}
						/>
					</SectionField>
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

function DelaySection({
	params,
	onChange,
	presets,
}: {
	params: {
		enabled: boolean;
		time: number;
		feedback: number;
		mix: number;
		pingPong: boolean;
	};
	onChange: (p: {
		enabled?: boolean;
		time?: number;
		feedback?: number;
		mix?: number;
		pingPong?: boolean;
	}) => void;
	presets: {
		id: string;
		name: string;
		params: { time: number; feedback: number; mix: number; pingPong: boolean };
	}[];
}) {
	return (
		<Section collapsible sectionKey="audio:delay" defaultOpen={params.enabled}>
			<SectionHeader
				trailing={
					<Switch
						checked={params.enabled}
						onCheckedChange={(c) => onChange({ enabled: c })}
					/>
				}
			>
				<SectionTitle>Delay / Echo</SectionTitle>
			</SectionHeader>
			<SectionContent
				className={cn(!params.enabled && "pointer-events-none opacity-50")}
			>
				<SectionFields>
					<SectionField label="Preset">
						<Select
							value={presets[0]?.id ?? "echo"}
							onValueChange={(v) => {
								const preset = presets.find((p) => p.id === v);
								if (preset) {
									onChange({ ...preset.params });
								}
							}}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{presets.map((p) => (
									<SelectItem key={p.id} value={p.id}>
										{p.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</SectionField>
					<SectionField label="Time (s)">
						<NumberField
							value={formatNumberForDisplay({
								value: params.time,
								fractionDigits: TIME_FRACTION_DIGITS,
							})}
							min={0}
							max={2}
							step={TIME_STEP}
							onChange={(e) =>
								onChange({ time: Number.parseFloat(e.target.value) || 0 })
							}
							onFocus={() => {}}
							onBlur={() => {}}
							onScrub={() => {}}
							onScrubEnd={() => {}}
							onReset={() => onChange({ time: 0.3 })}
						/>
					</SectionField>
					<SectionField label="Feedback">
						<Slider
							min={0}
							max={0.95}
							step={0.05}
							value={[params.feedback]}
							onValueChange={(v) => onChange({ feedback: v[0] ?? 0 })}
						/>
					</SectionField>
					<SectionField label="Mix">
						<Slider
							min={0}
							max={1}
							step={0.01}
							value={[params.mix]}
							onValueChange={(v) => onChange({ mix: v[0] ?? 0 })}
						/>
					</SectionField>
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

function ModulationSection({
	params,
	onChange,
	presets,
}: {
	params: {
		enabled: boolean;
		type: string;
		rate: number;
		depth: number;
		mix: number;
	};
	onChange: (p: {
		enabled?: boolean;
		type?: string;
		rate?: number;
		depth?: number;
		mix?: number;
	}) => void;
	presets: { id: string; name: string }[];
}) {
	return (
		<Section collapsible sectionKey="audio:mod" defaultOpen={params.enabled}>
			<SectionHeader
				trailing={
					<Switch
						checked={params.enabled}
						onCheckedChange={(c) => onChange({ enabled: c })}
					/>
				}
			>
				<SectionTitle>Modulation</SectionTitle>
			</SectionHeader>
			<SectionContent
				className={cn(!params.enabled && "pointer-events-none opacity-50")}
			>
				<SectionFields>
					<SectionField label="Type">
						<Select
							value={params.type}
							onValueChange={(v) => onChange({ type: v as "chorus" })}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{presets.map((p) => (
									<SelectItem key={p.id} value={p.id}>
										{p.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</SectionField>
					<SectionField label="Rate (Hz)">
						<NumberField
							value={formatNumberForDisplay({
								value: params.rate,
								fractionDigits: 1,
							})}
							min={0.1}
							max={20}
							step={0.1}
							onChange={(e) =>
								onChange({ rate: Number.parseFloat(e.target.value) || 0 })
							}
							onFocus={() => {}}
							onBlur={() => {}}
							onScrub={() => {}}
							onScrubEnd={() => {}}
							onReset={() => onChange({ rate: 1 })}
						/>
					</SectionField>
					<SectionField label="Depth">
						<Slider
							min={0}
							max={1}
							step={0.01}
							value={[params.depth]}
							onValueChange={(v) => onChange({ depth: v[0] ?? 0 })}
						/>
					</SectionField>
					<SectionField label="Mix">
						<Slider
							min={0}
							max={1}
							step={0.01}
							value={[params.mix]}
							onValueChange={(v) => onChange({ mix: v[0] ?? 0 })}
						/>
					</SectionField>
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

function DistortionSection({
	params,
	onChange,
	presets,
}: {
	params: { enabled: boolean; type: string; amount: number; mix: number };
	onChange: (p: {
		enabled?: boolean;
		type?: string;
		amount?: number;
		mix?: number;
	}) => void;
	presets: { id: string; name: string }[];
}) {
	return (
		<Section collapsible sectionKey="audio:dist" defaultOpen={params.enabled}>
			<SectionHeader
				trailing={
					<Switch
						checked={params.enabled}
						onCheckedChange={(c) => onChange({ enabled: c })}
					/>
				}
			>
				<SectionTitle>Distortion</SectionTitle>
			</SectionHeader>
			<SectionContent
				className={cn(!params.enabled && "pointer-events-none opacity-50")}
			>
				<SectionFields>
					<SectionField label="Type">
						<Select
							value={params.type}
							onValueChange={(v) => onChange({ type: v as "overdrive" })}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{presets.map((p) => (
									<SelectItem key={p.id} value={p.id}>
										{p.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</SectionField>
					<SectionField label="Amount">
						<Slider
							min={0}
							max={1}
							step={0.01}
							value={[params.amount]}
							onValueChange={(v) => onChange({ amount: v[0] ?? 0 })}
						/>
					</SectionField>
					<SectionField label="Mix">
						<Slider
							min={0}
							max={1}
							step={0.01}
							value={[params.mix]}
							onValueChange={(v) => onChange({ mix: v[0] ?? 0 })}
						/>
					</SectionField>
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

function VoiceChangerSection({
	params,
	onChange,
	presets,
}: {
	params: {
		enabled: boolean;
		presetId: string;
		pitchShift: number;
		mix: number;
	};
	onChange: (p: {
		enabled?: boolean;
		presetId?: string;
		pitchShift?: number;
		mix?: number;
	}) => void;
	presets: { id: string; name: string; pitchShift: number }[];
}) {
	return (
		<Section collapsible sectionKey="audio:voice" defaultOpen={params.enabled}>
			<SectionHeader
				trailing={
					<Switch
						checked={params.enabled}
						onCheckedChange={(c) => onChange({ enabled: c })}
					/>
				}
			>
				<SectionTitle>Voice Changer</SectionTitle>
			</SectionHeader>
			<SectionContent
				className={cn(!params.enabled && "pointer-events-none opacity-50")}
			>
				<SectionFields>
					<SectionField label="Preset">
						<Select
							value={params.presetId}
							onValueChange={(v) => {
								const preset = presets.find((p) => p.id === v);
								if (preset) {
									onChange({ presetId: v, pitchShift: preset.pitchShift });
								}
							}}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{presets.map((p) => (
									<SelectItem key={p.id} value={p.id}>
										{p.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</SectionField>
					<SectionField label="Pitch Shift (semitones)">
						<NumberField
							value={params.pitchShift.toString()}
							suffix="st"
							min={-12}
							max={12}
							step={1}
							onChange={(e) =>
								onChange({ pitchShift: Number.parseFloat(e.target.value) || 0 })
							}
							onFocus={() => {}}
							onBlur={() => {}}
							onScrub={() => {}}
							onScrubEnd={() => {}}
							onReset={() => onChange({ pitchShift: 0 })}
						/>
					</SectionField>
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

function cn(...args: Array<string | false | undefined>): string {
	return args.filter(Boolean).join(" ");
}
