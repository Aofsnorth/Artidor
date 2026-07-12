"use client";

import {
	ThemeProvider as NextThemesProvider,
	type ThemeProviderProps,
} from "next-themes";
import { useSyncExternalStore } from "react";

/**
 * `next-themes` injects an inline `<script>` that sets the initial theme
 * before hydration so the page renders with the correct color scheme
 * (avoiding a flash of unstyled content). React 19 emits a dev-only warning
 * whenever a `<script>` element is rendered inside a React component during
 * a client render, even when that script already ran on the server and is
 * required for correct behavior.
 *
 * This wrapper keeps the theme script on the server and during hydration
 * (so the theme is applied before first paint), then switches the injected
 * script's `type` to `application/json` after hydration. Non-executable
 * script types are ignored by React's warning and the browser, removing the
 * false-positive console error without changing user-facing behavior.
 */
function useIsHydrated() {
	return useSyncExternalStore(
		() => () => {},
		() => true,
		() => false,
	);
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
	const hydrated = useIsHydrated();
	return (
		<NextThemesProvider
			{...props}
			scriptProps={hydrated ? { type: "application/json" } : undefined}
		>
			{children}
		</NextThemesProvider>
	);
}
