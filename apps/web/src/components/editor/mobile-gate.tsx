"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "../ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "mobile-acknowledged";

type GateState = "loading" | "open" | "soft" | "locked";

interface MobileGateProps {
	children: React.ReactNode;
}

export function MobileGate({ children }: MobileGateProps) {
	const router = useRouter();
	const [gate, setGate] = useState<GateState>("loading");

	useEffect(() => {
		// Android is hard-locked out of the editor. The touch + small-screen
		// combination makes the timeline genuinely unusable, so — unlike the
		// soft gate below — there is no "take a look anyway" escape hatch.
		const isAndroid = /android/i.test(navigator.userAgent || "");
		if (isAndroid) {
			setGate("locked");
			return;
		}

		// Every other narrow viewport (iPad, small desktop windows) gets the
		// dismissible heads-up so power users can still poke around at their
		// own risk.
		const isSmall = window.innerWidth < 1024;
		const acknowledged = localStorage.getItem(STORAGE_KEY) === "true";
		setGate(isSmall && !acknowledged ? "soft" : "open");
	}, []);

	if (gate === "loading") return null;
	if (gate === "open") return <>{children}</>;

	// Android: a calm, on-brand wall. No dismiss — just a nudge to the desktop.
	if (gate === "locked") {
		return (
			<div className="bg-[#0a0a0c] relative flex h-screen w-screen items-center justify-center overflow-hidden px-6 text-white">
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0"
					style={{
						background:
							"radial-gradient(ellipse 70% 55% at 50% 0%, rgba(255,255,255,0.07), transparent 70%)",
					}}
				/>
				<div className="panel glass-strong relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 p-8 text-center">
					<div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
						<svg
							width="26"
							height="26"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.6"
							strokeLinecap="round"
							strokeLinejoin="round"
							role="img"
							aria-label="Desktop"
							className="text-white/85"
						>
							<title>Desktop</title>
							<rect x="2" y="3.5" width="20" height="13" rx="2" />
							<path d="M8 20.5h8" />
							<path d="M12 16.5v4" />
						</svg>
					</div>
					<h1 className="font-serif text-2xl font-medium italic tracking-[-0.01em]">
						This one's for the desktop.
					</h1>
					<p className="mt-3 text-[13.5px] font-light leading-relaxed text-white/65">
						Artidor is a full timeline video editor — built around a pointer, a
						keyboard, and a little room to breathe. A phone screen can't quite
						hold all of that yet. Open{" "}
						<span className="font-medium text-white/90">artidor.app</span> on
						your computer for the real thing.
					</p>
					<div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
						<Button
							asChild
							className="h-9 rounded-full bg-white px-4 text-[13px] font-medium text-[#0a0a0c] hover:bg-white/90"
						>
							<Link href="/">Back to home</Link>
						</Button>
						<Button
							variant="outline"
							asChild
							className="h-9 rounded-full border-white/15 bg-white/[0.04] px-4 text-[13px] font-medium text-white/90 hover:bg-white/[0.08]"
						>
							<Link href="/roadmap" className="flex items-center gap-1">
								Mobile is on the roadmap
								<HugeiconsIcon icon={ArrowRight01Icon} size={14} />
							</Link>
						</Button>
					</div>
				</div>
			</div>
		);
	}

	// Soft gate — narrow but non-Android. Dismissible.
	const handleContinue = () => {
		localStorage.setItem(STORAGE_KEY, "true");
		setGate("open");
	};

	const handleGoBack = () => {
		router.back();
	};

	return (
		<div className="bg-background relative flex h-screen w-screen flex-col overflow-hidden">
			<Button
				variant="text"
				className="absolute top-6 left-6 flex items-center gap-1 text-muted-foreground"
				onClick={handleGoBack}
			>
				<HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
				<span className=" text-sm">Go back</span>
			</Button>

			<div className="flex flex-1 flex-col justify-center gap-5 px-7">
				<div className="flex flex-col gap-3">
					<h1 className="text-foreground text-3xl font-bold tracking-tight">
						Desktop only (for now)
					</h1>
					<p className="text-muted-foreground text-sm leading-relaxed">
						Artidor isn't optimized for mobile or iPad yet. Things will break
						and the layout will be a mess. Come back on a desktop for the real
						experience.
					</p>
				</div>
				<div className="flex items-center gap-3">
					<Button onClick={handleContinue}>Take a look anyway</Button>
					<Button variant="ghost" asChild>
						<Link href="/roadmap" className="flex items-center gap-1">
							Roadmap
							<HugeiconsIcon icon={ArrowRight01Icon} size={14} />
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
