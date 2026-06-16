"use client";

/**
 * DriveAccountButton — the Google Drive account control in the projects
 * header. When connected it shows the signed-in account's avatar (with a
 * live "connected" dot) and a dropdown with the name/email + Sign out.
 * When not connected it shows a "Connect Drive" button.
 *
 * State lives in localStorage (see @/lib/drive/api); we refresh on the
 * `drive-auth-changed` event (fired on sign-in / profile load / logout)
 * and on window focus, so it stays in sync with the Import dialog.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import { GoogleIcon } from "@hugeicons/core-free-icons";
import {
	getGoogleAccessToken,
	getGoogleClientId,
	getGoogleProfile,
	type GoogleProfile,
	initiateGoogleOAuth,
	logoutGoogle,
} from "@/lib/drive/api";

function initialOf(profile: GoogleProfile | null): string {
	const base = profile?.name?.trim() || profile?.email?.trim() || "";
	return base ? base.charAt(0).toUpperCase() : "G";
}

export function DriveAccountButton() {
	const [connected, setConnected] = useState(false);
	const [profile, setProfile] = useState<GoogleProfile | null>(null);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		const refresh = () => {
			setConnected(Boolean(getGoogleAccessToken()));
			setProfile(getGoogleProfile());
		};
		refresh();
		window.addEventListener("drive-auth-changed", refresh);
		window.addEventListener("focus", refresh);
		return () => {
			window.removeEventListener("drive-auth-changed", refresh);
			window.removeEventListener("focus", refresh);
		};
	}, []);

	const handleSignOut = () => {
		logoutGoogle();
		toast.info("Signed out of Google Drive");
	};

	const handleConnect = async () => {
		// The account button is purely the sign-in entry point — it goes straight
		// to the Google login popup. The Client ID is configured once via the
		// separate Import button, so if it's missing we just point there.
		if (!getGoogleClientId()) {
			toast.error("Google Drive isn't set up yet", {
				description: "Add your Google Client ID via Import, then sign in here.",
			});
			return;
		}
		setBusy(true);
		try {
			await initiateGoogleOAuth();
			toast.success("Connected to Google Drive");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Google sign-in failed");
		} finally {
			setBusy(false);
		}
	};

	if (!connected) {
		// Circular icon button — same round footprint as the connected avatar.
		return (
			<button
				type="button"
				aria-label="Connect Google Drive"
				title="Connect Google Drive"
				disabled={busy}
				onClick={handleConnect}
				className="relative grid size-9 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-white/70 outline-none ring-offset-2 ring-offset-black transition hover:border-white/25 hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-50"
			>
				{busy ? (
					<span className="size-3.5 animate-spin rounded-full border-2 border-white/25 border-t-white/80" />
				) : (
					<HugeiconsIcon icon={GoogleIcon} className="size-4" />
				)}
			</button>
		);
	}

	const initials = initialOf(profile);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label="Google Drive account"
					className="relative shrink-0 rounded-full outline-none ring-offset-2 ring-offset-black transition focus-visible:ring-2 focus-visible:ring-white/40"
				>
					<Avatar className="size-9 border border-white/15">
						{profile?.picture ? (
							<AvatarImage
								src={profile.picture}
								alt={profile.name ?? profile.email ?? "Account"}
								referrerPolicy="no-referrer"
							/>
						) : null}
						<AvatarFallback className="bg-white/[0.08] text-[0.8rem] font-medium text-white/85">
							{initials}
						</AvatarFallback>
					</Avatar>
					<span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[#0a0a0c] bg-emerald-400" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-64 border-white/[0.08] bg-[#09090b]/95 text-white/95 backdrop-blur-md"
			>
				<div className="flex items-center gap-3 px-2 py-2">
					<Avatar className="size-10 border border-white/15">
						{profile?.picture ? (
							<AvatarImage
								src={profile.picture}
								alt=""
								referrerPolicy="no-referrer"
							/>
						) : null}
						<AvatarFallback className="bg-white/[0.08] text-sm font-medium text-white/85">
							{initials}
						</AvatarFallback>
					</Avatar>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-1.5 text-[0.7rem] font-medium text-emerald-300/90">
							<HugeiconsIcon icon={GoogleIcon} className="size-3" />
							Google Drive
						</div>
						{profile?.name ? (
							<div className="truncate text-sm font-medium text-white">
								{profile.name}
							</div>
						) : null}
						<div className="truncate text-xs text-white/55">
							{profile?.email ?? "Connected"}
						</div>
					</div>
				</div>
				<DropdownMenuSeparator className="bg-white/[0.08]" />
				<DropdownMenuItem
					variant="destructive"
					onClick={handleSignOut}
					className="gap-2"
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="size-3.5"
						role="img"
						aria-label="Sign out"
					>
						<title>Sign out</title>
						<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
						<path d="M16 17l5-5-5-5" />
						<path d="M21 12H9" />
					</svg>
					Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
