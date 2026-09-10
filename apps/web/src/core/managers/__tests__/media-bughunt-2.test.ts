import { afterEach, describe, expect, mock, test } from "bun:test";

/**
 * media-bughunt-2 R06/R07: teleprompter manager routing + font loader
 * never-blocks semantics. DOM is stubbed per-test and restored afterEach
 * so nothing leaks into other suites sharing the bun process.
 */
type DialogsState = {
	open: Record<string, boolean>;
	setOpen: (key: string, open: boolean) => void;
};

const dialogsState: DialogsState = {
	open: {},
	setOpen: (key, open) => {
		dialogsState.open[key] = open;
	},
};

const teleState = { isPlaying: false };

mock.module("@/stores/open-dialogs-store", () => ({
	useOpenDialogsStore: {
		getState: () => dialogsState,
	},
}));
mock.module("@/stores/teleprompter-store", () => ({
	useTeleprompterStore: {
		getState: () => ({
			open: false,
			setOpen: () => {},
			setPlaying: (value: boolean) => {
				teleState.isPlaying = value;
			},
		}),
	},
}));

const { TeleprompterManager } = await import(
	"@/core/managers/teleprompter-manager"
);

afterEach(() => {
	dialogsState.open = {};
	teleState.isPlaying = false;
	const g = globalThis as unknown as { document?: unknown };
	delete g.document;
});

describe("teleprompter + fonts bughunt-2 regressions", () => {
	test("R06: open/close/toggle drive the mounted dialog store key", () => {
		const manager = new TeleprompterManager({} as never);
		manager.open();
		expect(dialogsState.open.teleprompter).toBe(true);
		teleState.isPlaying = true;
		manager.close();
		expect(dialogsState.open.teleprompter).toBe(false);
		expect(teleState.isPlaying).toBe(false);
		manager.toggle();
		expect(dialogsState.open.teleprompter).toBe(true);
		manager.toggle();
		expect(dialogsState.open.teleprompter).toBe(false);
	});

	test("R07: loadFonts resolves offline (never blocks project load)", async () => {
		(globalThis as unknown as { document: unknown }).document = {
			head: { appendChild: () => {} },
			createElement: () => ({
				addEventListener: (_event: string, callback: () => void) => {
					// Simulate immediate CDN failure.
					callback();
				},
			}),
			fonts: {
				load: async () => {
					throw new Error("offline");
				},
			},
		};
		const { loadFonts, clearFontAtlasCache } = await import(
			"@/lib/fonts/google-fonts"
		);
		clearFontAtlasCache();
		await expect(
			loadFonts({ families: ["Inter", "Arial"] }),
		).resolves.toBeUndefined();
	});
});
