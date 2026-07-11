"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	type Locale,
	isLocale,
	normalizeLocale,
	translate,
} from "./dictionaries";

const LOCALE_STORAGE_KEY = "artidor.locale";

type I18nContextValue = {
	locale: Locale;
	setLocale: (locale: Locale) => void;
	t: (key: string, values?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLocale(): Locale {
	if (typeof window === "undefined") return "en";
	const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
	if (stored && isLocale(stored)) return stored;
	return normalizeLocale(window.navigator.language);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
	const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

	useEffect(() => {
		document.documentElement.lang = locale;
		window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
	}, [locale]);

	const setLocale = useCallback((nextLocale: Locale) => {
		setLocaleState(nextLocale);
	}, []);

	const value = useMemo<I18nContextValue>(
		() => ({
			locale,
			setLocale,
			t: (key, values) => translate({ locale, key, values }),
		}),
		[locale, setLocale],
	);

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
	const context = useContext(I18nContext);
	if (!context) {
		throw new Error("useI18n must be used within I18nProvider");
	}
	return context;
}
