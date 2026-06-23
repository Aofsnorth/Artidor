"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

const STORAGE_KEY = "artidor-ai-disclaimer-dismissed";

export function AiDisclaimerBanner() {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		setVisible(localStorage.getItem(STORAGE_KEY) !== "true");
	}, []);

	if (!visible) return null;

	return (
		<div className="sticky top-0 z-50 border-b border-amber-500/30 bg-amber-950/80 backdrop-blur-md">
			<div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 text-sm text-amber-100">
				<AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
				<p>
					<strong>AI-Generated Codebase</strong> — This project was built almost
					entirely by AI (Claude, GPT, and other LLMs). Use at your own risk.
				</p>
				<button
					type="button"
					onClick={() => {
						localStorage.setItem(STORAGE_KEY, "true");
						setVisible(false);
					}}
					className="ml-auto shrink-0 rounded p-1 text-amber-300 transition-colors hover:bg-amber-800/50 hover:text-amber-100"
					aria-label="Dismiss"
				>
					<X className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
}
