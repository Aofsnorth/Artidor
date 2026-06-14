export const LANGUAGES = [
	{ code: "en", name: "English" },
	{ code: "es", name: "Spanish" },
	{ code: "it", name: "Italian" },
	{ code: "fr", name: "French" },
	{ code: "de", name: "German" },
	{ code: "pt", name: "Portuguese" },
	{ code: "ru", name: "Russian" },
	{ code: "ja", name: "Japanese" },
	{ code: "zh", name: "Chinese" },
	{ code: "id", name: "Indonesian" },
	{ code: "ko", name: "Korean" },
	{ code: "hi", name: "Hindi" },
	{ code: "vi", name: "Vietnamese" },
	{ code: "th", name: "Thai" },
	{ code: "ar", name: "Arabic" },
	{ code: "tr", name: "Turkish" },
] as const;

export type Language = (typeof LANGUAGES)[number];
export type LanguageCode = Language["code"];
