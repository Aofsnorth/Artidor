/**
 * Collaboration join page — /c/[roomId]
 *
 * When a collaborator opens a join link, they land here. The page shows
 * a nickname input dialog. Once they enter their name and join, they're
 * redirected to the editor with the collaboration session active.
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { JoinCollabDialog } from "@/components/editor/collab/collab-dialogs";
import { useCollabStore } from "@/stores/collab-store";

export default function CollabJoinPage({
	params,
}: {
	params: Promise<{ roomId: string }>;
}) {
	const router = useRouter();
	const [roomId, setRoomId] = useState<string>("");
	const [open, setOpen] = useState(false);

	useEffect(() => {
		void params.then((p) => {
			setRoomId(p.roomId);
			setOpen(true);
		});
	}, [params]);

	// If the user joined successfully, take them straight into the editor
	// with the collab session active; otherwise return to home.
	const handleOpenChange = (next: boolean) => {
		setOpen(next);
		if (!next) {
			const { status, hostProjectId, hostProjectName } =
				useCollabStore.getState();
			if (status !== "connected") {
				router.push("/");
				return;
			}
			// The guest's browser does not have the host's project stored locally,
			// and the collab protocol is notification-only — the host's project data
			// is NOT shared. The editor provider detects the unknown id and creates
			// a fresh LOCAL placeholder project so the joiner lands in the editor.
			// The host's project name is passed along so the placeholder is labeled
			// with what the session is about, instead of implying shared data.
			if (hostProjectId) {
				const name = encodeURIComponent(hostProjectName ?? "Shared session");
				router.push(`/editor/${hostProjectId}?collabPlaceholder=${name}`);
			} else {
				// Legacy rooms created before the room carried a project id.
				router.push("/projects");
			}
		}
	};

	if (!roomId) return null;

	return (
		<div className="flex min-h-screen items-center justify-center bg-[#09090b]">
			<JoinCollabDialog
				roomId={roomId}
				open={open}
				onOpenChange={handleOpenChange}
			/>
		</div>
	);
}
