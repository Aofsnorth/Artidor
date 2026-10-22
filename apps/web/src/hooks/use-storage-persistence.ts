"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "opencut-storage-persist-dismissed";

function isFirefox(): boolean {
	return navigator.userAgent.toLowerCase().includes("firefox");
}

export function useStoragePersistence() {
	const [showDialog, setShowDialog] = useState(false);

	useEffect(() => {
		if (!navigator.storage?.persist) return;

		const run = async () => {
			const persisted = navigator.storage.persisted;
			const alreadyPersisted =
				typeof persisted === "function"
					? await persisted.call(navigator.storage)
					: false;
			if (alreadyPersisted) return;

			const dismissed = localStorage.getItem(DISMISSED_KEY) === "true";
			if (dismissed) return;

			if (isFirefox()) {
				setShowDialog(true);
			} else {
				await navigator.storage.persist?.();
			}
		};

		void run().catch((error: unknown) => {
			// Permission/API failures must not become unhandled rejections; the
			// app keeps working on best-effort storage.
			console.warn("Storage persistence request failed:", error);
		});
	}, []);

	const onConfirm = async () => {
		setShowDialog(false);
		try {
			await navigator.storage.persist?.();
		} catch (error) {
			console.warn("Storage persistence request failed:", error);
		}
	};

	const onDismiss = () => {
		setShowDialog(false);
		localStorage.setItem(DISMISSED_KEY, "true");
	};

	return { showDialog, onConfirm, onDismiss };
}
