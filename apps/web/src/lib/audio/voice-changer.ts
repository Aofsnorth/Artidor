/**
 * Voice changer: pitch shifting, formant manipulation, gender swap, presets.
 * Uses Web Audio's playbackRate as a basic pitch shifter. Real-time formant
 * shifting is approximated via cascaded filters.
 */
export type VoiceChangerPresetId =
	| "chipmunk"
	| "high-pitch"
	| "deep-voice"
	| "low-pitch"
	| "robot"
	| "echo"
	| "reverb"
	| "megaphone"
	| "radio"
	| "underwater"
	| "cave"
	| "alien"
	| "monster"
	| "child"
	| "old-man"
	| "gender-male"
	| "gender-female"
	| "narrator"
	| "whisper"
	| "shout"
	| "vibrato"
	| "helium"
	| "drunk"
	| "ghost"
	| "demon"
	| "vader"
	| "autotune"
	| "sing"
	| "chorus"
	| "twin"
	| "walkie-talkie"
	| "gramophone"
	| "intercom";

export interface VoiceChangerParams {
	enabled: boolean;
	presetId: VoiceChangerPresetId;
	pitchShift: number; // semitones, -12..+12
	mix: number; // 0..1
}

export const DEFAULT_VOICE_CHANGER_PARAMS: VoiceChangerParams = {
	enabled: false,
	presetId: "robot",
	pitchShift: 0,
	mix: 1.0,
};

export const VOICE_CHANGER_PRESETS: Array<{
	id: VoiceChangerPresetId;
	name: string;
	pitchShift: number;
	description: string;
}> = [
	{
		id: "chipmunk",
		name: "Chipmunk",
		pitchShift: 12,
		description: "Very high pitched voice",
	},
	{
		id: "high-pitch",
		name: "High Pitch",
		pitchShift: 6,
		description: "Higher pitched",
	},
	{
		id: "deep-voice",
		name: "Deep Voice",
		pitchShift: -12,
		description: "Very low pitched voice",
	},
	{
		id: "low-pitch",
		name: "Low Pitch",
		pitchShift: -6,
		description: "Lower pitched",
	},
	{
		id: "robot",
		name: "Robot",
		pitchShift: 0,
		description: "Robotic processing",
	},
	{ id: "echo", name: "Echo", pitchShift: 0, description: "Voice with echo" },
	{
		id: "reverb",
		name: "Reverb",
		pitchShift: 0,
		description: "Voice with reverb",
	},
	{
		id: "megaphone",
		name: "Megaphone",
		pitchShift: 0,
		description: "Megaphone quality",
	},
	{ id: "radio", name: "Radio", pitchShift: 0, description: "Radio quality" },
	{
		id: "underwater",
		name: "Underwater",
		pitchShift: 0,
		description: "Muffled underwater",
	},
	{ id: "cave", name: "Cave", pitchShift: 0, description: "Large cave echo" },
	{
		id: "alien",
		name: "Alien",
		pitchShift: 4,
		description: "Alien/otherworldly",
	},
	{
		id: "monster",
		name: "Monster",
		pitchShift: -8,
		description: "Deep, scary monster",
	},
	{
		id: "child",
		name: "Child",
		pitchShift: 8,
		description: "Higher pitched child-like",
	},
	{
		id: "old-man",
		name: "Old Man",
		pitchShift: -4,
		description: "Lower, rougher tone",
	},
	{
		id: "gender-male",
		name: "Male",
		pitchShift: -4,
		description: "Male voice",
	},
	{
		id: "gender-female",
		name: "Female",
		pitchShift: 4,
		description: "Female voice",
	},
	{
		id: "narrator",
		name: "Narrator",
		pitchShift: -3,
		description: "Deep rich narrator",
	},
	{
		id: "whisper",
		name: "Whisper",
		pitchShift: 0,
		description: "Soft breathy effect",
	},
	{
		id: "shout",
		name: "Shout",
		pitchShift: -2,
		description: "Amplified, compressed",
	},
	{
		id: "vibrato",
		name: "Vibrato",
		pitchShift: 0,
		description: "Wobbling pitch effect",
	},
	{
		id: "helium",
		name: "Helium",
		pitchShift: 10,
		description: "Helium high pitch",
	},
	{
		id: "drunk",
		name: "Drunk",
		pitchShift: -1,
		description: "Slurred wobbling",
	},
	{
		id: "ghost",
		name: "Ghost",
		pitchShift: 2,
		description: "Ethereal echoing",
	},
	{
		id: "demon",
		name: "Demon",
		pitchShift: -6,
		description: "Deep scary distorted",
	},
	{
		id: "vader",
		name: "Darth Vader",
		pitchShift: -3,
		description: "Breathing + deep voice",
	},
	{
		id: "autotune",
		name: "Auto-Tune",
		pitchShift: 0,
		description: "Pitch correction",
	},
	{
		id: "sing",
		name: "Sing",
		pitchShift: 0,
		description: "Musical note quantization",
	},
	{
		id: "chorus",
		name: "Chorus",
		pitchShift: 0,
		description: "Multi-voice effect",
	},
	{
		id: "twin",
		name: "Twin",
		pitchShift: 0,
		description: "Duplicate voice with offset",
	},
	{
		id: "walkie-talkie",
		name: "Walkie Talkie",
		pitchShift: 0,
		description: "Walkie talkie quality",
	},
	{
		id: "gramophone",
		name: "Gramophone",
		pitchShift: -2,
		description: "Old gramophone",
	},
	{
		id: "intercom",
		name: "Intercom",
		pitchShift: 0,
		description: "Building intercom quality",
	},
];

/**
 * A simple noise-reduction profile: spectral subtraction approximation.
 * For real-time use, this returns noise-profile parameters that the audio
 * pipeline applies to an OfflineAudioContext.
 */
export interface NoiseReductionParams {
	enabled: boolean;
	strength: number; // 0..1
	windReduction: boolean;
	humRemoval: boolean; // 50/60 Hz hum
	clickRemoval: boolean;
}

export const DEFAULT_NOISE_REDUCTION_PARAMS: NoiseReductionParams = {
	enabled: false,
	strength: 0.5,
	windReduction: true,
	humRemoval: true,
	clickRemoval: false,
};
