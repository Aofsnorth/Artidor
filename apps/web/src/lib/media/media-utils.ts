import type { MediaAsset, MediaType } from "@/lib/media/types";

export const SUPPORTS_AUDIO: readonly MediaType[] = ["audio", "video"];

export function mediaSupportsAudio({
	media,
}: {
	media: MediaAsset | null | undefined;
}): boolean {
	if (!media) return false;
	return SUPPORTS_AUDIO.includes(media.type);
}

export const getMediaTypeFromFile = ({
	file,
}: {
	file: File;
}): MediaType | null => {
	const { type } = file;

	if (type.startsWith("image/")) {
		return "image";
	}
	if (type.startsWith("video/")) {
		return "video";
	}
	if (type.startsWith("audio/")) {
		return "audio";
	}

	// Browsers and operating systems do not always set the MIME type for audio
	// files (e.g. FLAC uploaded from a file picker that lacks a registered type).
	// Fall back to the file extension so these files are still imported as audio.
	if (/\.(wav|mp3|m4a|aac|ogg|oga|opus|flac)$/i.test(file.name)) {
		return "audio";
	}

	return null;
};
