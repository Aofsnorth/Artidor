export interface TeleprompterSettings {
	scrollSpeed: number; // pixels per second
	fontSize: number; // pixels
	textColor: string;
	backgroundColor: string;
	mirrored: boolean;
	highlightLine: boolean;
}

export const DEFAULT_TELEPROMPTER_SETTINGS: TeleprompterSettings = {
	scrollSpeed: 60,
	fontSize: 48,
	textColor: "#ffffff",
	backgroundColor: "#000000",
	mirrored: false,
	highlightLine: true,
};
