"use client";

import { useCallback, useState } from "react";
import { useEditor } from "@/hooks/use-editor";
import type { AudioEffectsChain } from "@/hooks/audio-effects-engine";
import { EQ_PRESETS, defaultEqGains } from "@/lib/audio/equalizer";
import { REVERB_PRESETS } from "@/lib/audio/reverb";
import { DELAY_PRESETS } from "@/lib/audio/delay";
import { MODULATION_PRESETS } from "@/lib/audio/modulation";
import { DISTORTION_PRESETS } from "@/lib/audio/distortion";
import { COMPRESSOR_PRESETS } from "@/lib/audio/compressor";
import { VOICE_CHANGER_PRESETS } from "@/lib/audio/voice-changer";
import { applyEqPreset } from "@/hooks/eq-presets";
import type { AudioElement, VideoElement } from "@/lib/timeline";

export interface AudioEffectsState {
	chain: AudioEffectsChain;
	isProcessing: boolean;
	lastAppliedAt: number | null;
}

const DEFAULT_CHAIN: AudioEffectsChain = {
	eq: { enabled: false, gains: defaultEqGains() },
	reverb: { enabled: false, presetId: "hall", mix: 0.3 },
	delay: {
		enabled: false,
		time: 0.3,
		feedback: 0.35,
		mix: 0.3,
		pingPong: false,
	},
	modulation: {
		enabled: false,
		type: "chorus",
		rate: 1.0,
		depth: 0.5,
		mix: 0.5,
		stereo: 0.5,
	},
	distortion: { enabled: false, type: "overdrive", amount: 0.5, mix: 1.0 },
	compressor: {
		enabled: false,
		threshold: -18,
		ratio: 3,
		attack: 0.003,
		release: 0.25,
		knee: 6,
		gain: 0,
	},
	voiceChanger: { enabled: false, presetId: "robot", pitchShift: 0, mix: 1.0 },
	noiseReduction: { enabled: false, strength: 0.5 },
};

export function useAudioEffects({
	trackId,
	element,
}: {
	trackId: string;
	element: AudioElement | VideoElement;
}) {
	const _editor = useEditor();
	const [chain, setChain] = useState<AudioEffectsChain>(() => ({
		...DEFAULT_CHAIN,
	}));
	const [isProcessing, _setIsProcessing] = useState(false);
	const [lastAppliedAt, _setLastAppliedAt] = useState<number | null>(null);

	const updateChain = useCallback(
		(updater: (c: AudioEffectsChain) => AudioEffectsChain) => {
			setChain((prev) => updater(prev));
		},
		[],
	);

	const resetEffects = useCallback(() => {
		setChain({
			...DEFAULT_CHAIN,
			eq: { enabled: false, gains: defaultEqGains() },
		});
	}, []);

	const setEqEnabled = useCallback(
		(enabled: boolean) => {
			updateChain((c) => ({ ...c, eq: { ...c.eq, enabled } }));
		},
		[updateChain],
	);

	const setEqBandGain = useCallback(
		(bandId: string, gain: number) => {
			updateChain((c) => ({
				...c,
				eq: {
					...c.eq,
					gains: { ...c.eq.gains, [bandId]: gain },
				},
			}));
		},
		[updateChain],
	);

	const setEqPreset = useCallback(
		(presetId: string) => {
			const preset = EQ_PRESETS.find((p) => p.id === presetId);
			if (!preset) return;
			updateChain((c) => ({
				...c,
				eq: {
					...c.eq,
					enabled: true,
					gains: applyEqPreset(presetId, c.eq.gains) ?? preset.gains,
				},
			}));
		},
		[updateChain],
	);

	const setReverb = useCallback(
		(params: Partial<typeof chain.reverb>) => {
			updateChain((c) => ({ ...c, reverb: { ...c.reverb, ...params } }));
		},
		[updateChain],
	);

	const setDelay = useCallback(
		(params: Partial<typeof chain.delay>) => {
			updateChain((c) => ({ ...c, delay: { ...c.delay, ...params } }));
		},
		[updateChain],
	);

	const setModulation = useCallback(
		(params: {
			enabled?: boolean;
			type?: string;
			rate?: number;
			depth?: number;
			mix?: number;
			stereo?: number;
		}) => {
			updateChain((c) => ({
				...c,
				modulation: { ...c.modulation, ...params } as typeof c.modulation,
			}));
		},
		[updateChain],
	);

	const setDistortion = useCallback(
		(params: {
			enabled?: boolean;
			type?: string;
			amount?: number;
			mix?: number;
		}) => {
			updateChain((c) => ({
				...c,
				distortion: { ...c.distortion, ...params } as typeof c.distortion,
			}));
		},
		[updateChain],
	);

	const setCompressor = useCallback(
		(params: Partial<typeof chain.compressor>) => {
			updateChain((c) => ({
				...c,
				compressor: { ...c.compressor, ...params },
			}));
		},
		[updateChain],
	);

	const setVoiceChanger = useCallback(
		(params: {
			enabled?: boolean;
			presetId?: string;
			pitchShift?: number;
			mix?: number;
		}) => {
			updateChain((c) => ({
				...c,
				voiceChanger: { ...c.voiceChanger, ...params } as typeof c.voiceChanger,
			}));
		},
		[updateChain],
	);

	const setNoiseReduction = useCallback(
		(params: Partial<typeof chain.noiseReduction>) => {
			updateChain((c) => ({
				...c,
				noiseReduction: { ...c.noiseReduction, ...params },
			}));
		},
		[updateChain],
	);

	return {
		state: { chain, isProcessing, lastAppliedAt },
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
		updateChain,
		setChain,
		REVERB_PRESETS,
		DELAY_PRESETS,
		MODULATION_PRESETS,
		DISTORTION_PRESETS,
		COMPRESSOR_PRESETS,
		VOICE_CHANGER_PRESETS,
	};
}
