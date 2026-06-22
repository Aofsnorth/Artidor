"use client";

import { useEffect, useState } from "react";

export default function OAuthCallbackPage() {
	const [status, setStatus] = useState("Processing authorization...");

	useEffect(() => {
		if (typeof window === "undefined") return;

		// Google OAuth implicit flow returns variables in the hash fragment:
		// #access_token=ya29...&token_type=Bearer&expires_in=3600&state=...
		const hash = window.location.hash;
		const search = window.location.search;

		if (!hash && !search) {
			setStatus("No authorization details found. You can close this window.");
			return;
		}

		// Try parsing from hash (implicit token grant)
		const hashParams = new URLSearchParams(hash.substring(1));
		const searchParams = new URLSearchParams(search);
		const accessToken = hashParams.get("access_token");
		const expiresIn = hashParams.get("expires_in");
		const state = hashParams.get("state") || searchParams.get("state");
		const error = hashParams.get("error") || searchParams.get("error");

		if (accessToken) {
			if (window.opener) {
				window.opener.postMessage(
					{
						type: "oauth-success",
						token: accessToken,
						expiresIn: expiresIn ? Number.parseInt(expiresIn, 10) : 3600,
						state,
					},
					window.location.origin,
				);
				setStatus("Authorization successful! Closing window...");
				setTimeout(() => {
					window.close();
				}, 500);
			} else {
				setStatus("Authorization token parsed but opener window is missing.");
			}
		} else if (error) {
			if (window.opener) {
				window.opener.postMessage(
					{
						type: "oauth-error",
						error: decodeURIComponent(error),
						state,
					},
					window.location.origin,
				);
				setStatus("Authorization failed! Closing window...");
				setTimeout(() => {
					window.close();
				}, 500);
			} else {
				setStatus(`Authorization failed: ${error}`);
			}
		} else {
			setStatus("Unrecognized callback payload. You can close this window.");
		}
	}, []);

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-[#09090b] px-4 text-center text-white">
			<div className="flex flex-col items-center gap-4">
				<div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
				<h1 className="text-lg font-medium">{status}</h1>
				<p className="text-xs text-white/40">
					This window will close automatically once authentication completes.
				</p>
			</div>
		</div>
	);
}
