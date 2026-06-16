"use client";

/**
 * Global error boundary — the last line of defense.
 *
 * Next.js renders this (PRODUCTION only; in dev the error overlay shows
 * instead) when the ROOT layout itself throws — something the route-level
 * `error.tsx` cannot catch. It REPLACES the root layout, so it must render
 * its own <html>/<body> and must NOT rely on globals.css, the brand fonts,
 * or any shared component: those may be exactly what broke. Everything here
 * is therefore self-contained inline styles.
 *
 * No error message or stack is shown to the visitor — only the opaque
 * `digest` hash — so nothing internal leaks on artidor.app.
 */

import { useEffect } from "react";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("[Artidor] Root layout error:", error);
	}, [error]);

	return (
		<html lang="en">
			<body
				style={{
					margin: 0,
					minHeight: "100vh",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: "24px",
					backgroundColor: "#0a0a0c",
					color: "#ffffff",
					fontFamily:
						"system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
				}}
			>
				<style>{`
					.ge-btn { transition: background-color .15s ease, border-color .15s ease; }
					.ge-btn-primary:hover { background-color: rgba(255,255,255,.9) !important; }
					.ge-btn-ghost:hover { background-color: rgba(255,255,255,.08) !important; }
				`}</style>
				<div
					style={{
						position: "relative",
						width: "100%",
						maxWidth: "420px",
						borderRadius: "16px",
						border: "1px solid rgba(255,255,255,0.1)",
						backgroundColor: "rgba(255,255,255,0.03)",
						padding: "32px",
						textAlign: "center",
						overflow: "hidden",
					}}
				>
					<div
						aria-hidden
						style={{
							position: "absolute",
							inset: 0,
							pointerEvents: "none",
							background:
								"radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,200,150,0.08), transparent 70%)",
						}}
					/>
					<div
						style={{
							margin: "0 auto 16px",
							width: "48px",
							height: "48px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							borderRadius: "9999px",
							border: "1px solid rgba(255,255,255,0.1)",
							backgroundColor: "rgba(255,255,255,0.05)",
						}}
					>
						<svg
							width="22"
							height="22"
							viewBox="0 0 24 24"
							fill="none"
							stroke="#fcd34d"
							strokeWidth="1.8"
							strokeLinecap="round"
							strokeLinejoin="round"
							role="img"
							aria-label="Error"
						>
							<title>Error</title>
							<circle cx="12" cy="12" r="9" />
							<path d="M12 8v4" />
							<path d="M12 16h.01" />
						</svg>
					</div>
					<h1
						style={{
							margin: 0,
							fontFamily: "Georgia, 'Times New Roman', serif",
							fontStyle: "italic",
							fontSize: "24px",
							fontWeight: 500,
							letterSpacing: "-0.01em",
						}}
					>
						Something broke.
					</h1>
					<p
						style={{
							margin: "8px 0 0",
							fontSize: "13.5px",
							fontWeight: 300,
							lineHeight: 1.6,
							color: "rgba(255,255,255,0.65)",
						}}
					>
						Artidor hit an unexpected error. Your projects are saved locally and
						are safe — reload to get back in.
					</p>
					{error.digest && (
						<p
							style={{
								margin: "12px 0 0",
								fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
								fontSize: "10.5px",
								color: "rgba(255,255,255,0.35)",
							}}
						>
							digest: {error.digest}
						</p>
					)}
					<div
						style={{
							marginTop: "24px",
							display: "flex",
							flexWrap: "wrap",
							gap: "8px",
							justifyContent: "center",
						}}
					>
						<button
							type="button"
							onClick={() => reset()}
							className="ge-btn ge-btn-primary"
							style={{
								height: "36px",
								padding: "0 16px",
								borderRadius: "9999px",
								border: "none",
								cursor: "pointer",
								backgroundColor: "#ffffff",
								color: "#0a0a0c",
								fontSize: "13px",
								fontWeight: 500,
							}}
						>
							Try again
						</button>
						<a
							href="/"
							className="ge-btn ge-btn-ghost"
							style={{
								display: "inline-flex",
								alignItems: "center",
								height: "36px",
								padding: "0 16px",
								borderRadius: "9999px",
								border: "1px solid rgba(255,255,255,0.15)",
								backgroundColor: "rgba(255,255,255,0.04)",
								color: "rgba(255,255,255,0.9)",
								fontSize: "13px",
								fontWeight: 500,
								textDecoration: "none",
							}}
						>
							Back home
						</a>
					</div>
				</div>
			</body>
		</html>
	);
}
