import { useState, useEffect, useCallback, useRef } from "react";

export function useLocalStorage<T>({
	key,
	defaultValue,
}: {
	key: string;
	defaultValue: T;
}): [
	T,
	({ value }: { value: T | ((previousValue: T) => T) }) => void,
	boolean,
] {
	const [value, setValue] = useState<T>(defaultValue);
	const [isReady, setIsReady] = useState(false);
	const valueRef = useRef(defaultValue);
	// The key whose value has actually been read. Writes are gated on this so a
	// key change can never persist the previous key's value into the new key.
	const [loadedKey, setLoadedKey] = useState<string | null>(null);

	// avoid hydration mismatch by reading after mount
	// biome-ignore lint/correctness/useExhaustiveDependencies: defaultValue only seeds a key change; callers pass inline literals that would re-read on every render.
	useEffect(() => {
		let cancelled = false;
		let nextValue = defaultValue;
		try {
			const storedValue = localStorage.getItem(key);
			if (storedValue !== null) {
				nextValue = JSON.parse(storedValue) as T;
			}
		} catch {
			// localstorage might be unavailable
		}
		if (cancelled) return;

		valueRef.current = nextValue;
		setValue(nextValue);
		setIsReady(true);
		setLoadedKey(key);

		return () => {
			cancelled = true;
		};
		// `defaultValue` intentionally excluded: callers pass inline literals and
		// re-reading on every render would clobber unsaved edits.
	}, [key]);

	// sync to localstorage after hydration
	useEffect(() => {
		if (!isReady || loadedKey !== key) return;

		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {
			// localstorage might be full or disabled
		}
	}, [key, value, isReady, loadedKey]);

	const setValueWithCallback = useCallback(
		({ value: nextValue }: { value: T | ((previousValue: T) => T) }) => {
			const resolvedValue =
				typeof nextValue === "function"
					? (nextValue as (previousValue: T) => T)(valueRef.current)
					: nextValue;

			valueRef.current = resolvedValue;
			setValue(resolvedValue);
		},
		[],
	);

	return [value, setValueWithCallback, isReady && loadedKey === key];
}
