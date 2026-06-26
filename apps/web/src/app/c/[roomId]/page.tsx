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

	// If the user closes the dialog without joining, go to the editor home.
	const handleOpenChange = (next: boolean) => {
		setOpen(next);
		if (!next) {
			router.push("/");
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
