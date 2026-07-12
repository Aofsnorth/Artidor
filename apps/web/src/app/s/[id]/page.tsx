"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HugeiconsIcon } from "@hugeicons/react";
import { LockPasswordIcon, PlayIcon } from "@hugeicons/core-free-icons";
import {
	fetchShareMeta,
	type ShareMeta,
	type SharePayload,
	unlockShare,
} from "@/lib/share/client";

type State =
	| { status: "loading" }
	| { status: "not_found" }
	| { status: "locked"; meta: ShareMeta }
	| { status: "ready"; meta: ShareMeta; payload: SharePayload };

export default function SharePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const router = useRouter();
	const [state, setState] = useState<State>({ status: "loading" });
	const [password, setPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const meta = await fetchShareMeta(id);
				if (cancelled) return;
				if (!meta) {
					setState({ status: "not_found" });
					return;
				}
				if (meta.needsPassword) {
					setState({ status: "locked", meta });
					return;
				}
				// No password — unlock immediately.
				const payload = await unlockShare({ shareId: id });
				if (cancelled) return;
				setState({ status: "ready", meta, payload });
			} catch {
				if (!cancelled) setState({ status: "not_found" });
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [id]);

	const handleUnlock = async () => {
		if (state.status !== "locked") return;
		setSubmitting(true);
		try {
			const payload = await unlockShare({ shareId: id, password });
			setState({ status: "ready", meta: state.meta, payload });
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unlock failed";
			if (message === "invalid_password") {
				toast.error("Incorrect password");
			} else if (message === "not_found") {
				setState({ status: "not_found" });
			} else {
				toast.error(message);
			}
		} finally {
			setSubmitting(false);
		}
	};

	const handleOpen = () => {
		if (state.status !== "ready") return;
		// The full read-only viewer is wired off the resolved payload. For now we
		// route to the editor in viewer mode keyed by the share id; the editor
		// reads the payload's Drive info to load the project read-only.
		router.push(
			`/editor/${state.payload.projectId}?share=${encodeURIComponent(id)}`,
		);
	};

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-[#09090b] px-4 text-white">
			<div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
				{state.status === "loading" && (
					<div className="flex flex-col items-center gap-3 py-8">
						<div className="size-7 animate-spin rounded-full border-2 border-white/20 border-t-white" />
						<p className="text-sm text-white/60">Loading shared project…</p>
					</div>
				)}

				{state.status === "not_found" && (
					<div className="flex flex-col items-center gap-2 py-8 text-center">
						<h1 className="text-lg font-semibold">Share not found</h1>
						<p className="text-sm text-white/55">
							This link may have been revoked, mistyped, or never existed.
						</p>
						<Button
							variant="outline"
							className="mt-3"
							onClick={() => router.push("/projects")}
						>
							Go to your projects
						</Button>
					</div>
				)}

				{state.status === "locked" && (
					<div className="flex flex-col gap-4">
						<div className="flex items-center gap-3">
							<span className="grid size-9 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.05]">
								<HugeiconsIcon
									icon={LockPasswordIcon}
									className="size-4 text-white/85"
								/>
							</span>
							<div>
								<h1 className="text-[0.95rem] font-semibold">
									{state.meta.name}
								</h1>
								<p className="text-[0.78rem] text-white/55">
									This shared project is password-protected.
								</p>
							</div>
						</div>
						<Input
							type="password"
							autoFocus
							value={password}
							placeholder="Enter password"
							onChange={(e) => setPassword(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !submitting) handleUnlock();
							}}
							className="h-10"
						/>
						<Button
							onClick={handleUnlock}
							disabled={submitting || password.length === 0}
							className="h-10 bg-white text-black hover:bg-white/90"
						>
							{submitting ? "Unlocking…" : "Unlock"}
						</Button>
					</div>
				)}

				{state.status === "ready" && (
					<div className="flex flex-col gap-4">
						<div>
							<p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/45">
								Shared project
							</p>
							<h1 className="mt-1 text-xl font-semibold">
								{state.payload.projectName || state.meta.name}
							</h1>
							<p className="mt-1 text-[0.78rem] leading-relaxed text-white/55">
								Read-only. Media streams from the owner's Google Drive — nothing
								is stored on our servers.
							</p>
						</div>
						<Button
							onClick={handleOpen}
							className="h-10 gap-2 bg-white text-black hover:bg-white/90"
						>
							<HugeiconsIcon icon={PlayIcon} className="size-4" />
							Open read-only
						</Button>
					</div>
				)}
			</div>
			<p className="mt-4 text-[0.7rem] text-white/35">
				Powered by Artidor — capability-based private sharing.
			</p>
		</div>
	);
}
