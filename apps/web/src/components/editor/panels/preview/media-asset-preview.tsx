"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor } from "@/hooks/use-editor";
import { useAssetPreviewStore } from "@/stores/asset-preview-store";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	MusicNote01Icon,
	PauseIcon,
	PlayIcon,
	VolumeHighIcon,
} from "@hugeicons/core-free-icons";

/**
 * Full-canvas media preview overlay. When the user clicks a media card
 * in the assets panel, the media is shown full-size on the preview canvas.
 *
 *  - Images render as a fitted <img>
 *  - Videos render as an auto-playing <video> with a scrub slider
 *  - Audio renders a music icon + play/pause + scrub slider
 *
 * The timeline playback is paused while the preview is active and
 * resumes when the preview is closed. Clicking anywhere on the overlay
 * (outside the slider controls) closes the preview.
 */
export function MediaAssetPreview() {
	const editor = useEditor();
	const mediaAssets = useEditor((e) => e.media.getAssets());
	const previewAssetId = useAssetPreviewStore((s) => s.previewAssetId);
	const clearPreview = useAssetPreviewStore((s) => s.clearPreview);
	const timelineIsPlaying = useEditor((e) => e.playback.getIsPlaying());

	const asset = previewAssetId
		? mediaAssets.find((a) => a.id === previewAssetId)
		: null;

	const videoRef = useRef<HTMLVideoElement | null>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const closeOnTimelinePlayRef = useRef(false);

	// Slider state
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const [isSeeking, setIsSeeking] = useState(false);
	const [isClosing, setIsClosing] = useState(false);
	const [previewVolume, setPreviewVolume] = useState(1);

	// Pause timeline playback while asset preview is active.
	useEffect(() => {
		if (!asset) return;
		closeOnTimelinePlayRef.current = false;
		if (editor.playback.getIsPlaying()) {
			editor.playback.pause();
		}
		const timeoutId = window.setTimeout(() => {
			closeOnTimelinePlayRef.current = true;
		}, 250);
		return () => {
			window.clearTimeout(timeoutId);
			closeOnTimelinePlayRef.current = false;
		};
	}, [asset, editor.playback]);

	// If the user starts timeline playback after preview is open, close asset
	// preview and return the canvas to the actual timeline frame.
	useEffect(() => {
		if (!asset || !timelineIsPlaying || !closeOnTimelinePlayRef.current) return;
		videoRef.current?.pause();
		audioRef.current?.pause();
		setIsClosing(true);
		const timeoutId = window.setTimeout(() => {
			clearPreview();
			setIsClosing(false);
		}, 180);
		return () => window.clearTimeout(timeoutId);
	}, [asset, timelineIsPlaying, clearPreview]);

	// Set up media source and auto-play for video/audio.
	useEffect(() => {
		if (!asset?.url) return;
		setCurrentTime(0);
		setDuration(0);
		setIsPlaying(false);

		if (asset.type === "video" && videoRef.current) {
			const video = videoRef.current;
			video.src = asset.url;
			video.volume = previewVolume;
			video.play().then(() => setIsPlaying(true)).catch(() => {});
		} else if (asset.type === "audio" && audioRef.current) {
			const audio = audioRef.current;
			audio.src = asset.url;
			audio.volume = previewVolume;
			audio.play().then(() => setIsPlaying(true)).catch(() => {});
		}
	}, [asset?.type, asset?.url, previewVolume]);

	useEffect(() => {
		if (videoRef.current) videoRef.current.volume = previewVolume;
		if (audioRef.current) audioRef.current.volume = previewVolume;
	}, [previewVolume]);

	// Time update polling via requestAnimationFrame.
	useEffect(() => {
		if (!asset || asset.type === "image") return;
		let rafId: number;
		const tick = () => {
			const el =
				asset.type === "video" ? videoRef.current : audioRef.current;
			if (el && !isSeeking) {
				setCurrentTime(el.currentTime);
				if (el.duration && Number.isFinite(el.duration)) {
					setDuration(el.duration);
				}
				setIsPlaying(!el.paused);
			}
			rafId = requestAnimationFrame(tick);
		};
		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
	}, [asset, isSeeking]);

	const handleClose = useCallback(() => {
		videoRef.current?.pause();
		audioRef.current?.pause();
		setIsClosing(true);
		window.setTimeout(() => {
			clearPreview();
			setIsClosing(false);
		}, 180);
	}, [clearPreview]);

	// Clear preview when Escape is pressed.
	useEffect(() => {
		if (!asset) return;
		const handler = (event: KeyboardEvent) => {
			if (event.key === "Escape") handleClose();
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [asset, handleClose]);

	// Stop media on unmount.
	useEffect(() => {
		return () => {
			videoRef.current?.pause();
			audioRef.current?.pause();
		};
	}, []);

	const togglePlayPause = useCallback(() => {
		const el =
			asset?.type === "video"
				? videoRef.current
				: asset?.type === "audio"
					? audioRef.current
					: null;
		if (!el) return;
		if (el.paused) {
			el.play().catch(() => {});
			setIsPlaying(true);
		} else {
			el.pause();
			setIsPlaying(false);
		}
	}, [asset?.type]);

	const handleSeek = useCallback(
		(value: number) => {
			const el =
				asset?.type === "video"
					? videoRef.current
					: asset?.type === "audio"
						? audioRef.current
						: null;
			if (!el) return;
			el.currentTime = value;
			setCurrentTime(value);
		},
		[asset?.type],
	);

	if (!asset) return null;

	const hasTimeControls = asset.type === "video" || asset.type === "audio";

	return (
		<>
			{/* Hidden audio element */}
			<audio ref={audioRef} preload="metadata">
				<track kind="captions" />
			</audio>

			{/* Full-canvas preview overlay */}
			<div
				className={`pointer-events-auto absolute inset-0 z-30 flex flex-col p-1.5 transition-all duration-180 ease-out ${isClosing ? "scale-[0.985] opacity-0" : "scale-100 opacity-100"}`}
			>
				{/* Media area — fills available space */}
				<div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-md bg-black/80 backdrop-blur-sm">
					{/* Image preview */}
					{asset.type === "image" && asset.url && (
						<Image
							src={asset.url}
							alt={asset.name}
							fill
							sizes="100vw"
							className="object-cover"
							draggable={false}
							unoptimized
						/>
					)}

					{/* Video preview */}
					{asset.type === "video" && asset.url && (
						<video
							ref={videoRef}
							playsInline
							className="size-full object-cover"
						>
							<track kind="captions" />
						</video>
					)}

					{/* Audio preview — icon + name */}
					{asset.type === "audio" && (
						<div className="flex flex-col items-center gap-3">
							<HugeiconsIcon
								icon={MusicNote01Icon}
								size={56}
								className="text-white/60"
							/>
							<span className="max-w-[70%] truncate text-sm font-medium text-white/70">
								{asset.name}
							</span>
						</div>
					)}
				</div>

				{/* Time controls bar — only for video/audio */}
				{hasTimeControls && (
					<div className="flex items-center gap-2 rounded-b-md bg-black/70 px-3 py-2 backdrop-blur-sm">
						{/* Play / Pause button */}
						<button
							type="button"
							onClick={togglePlayPause}
							className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10 text-white/90 transition hover:bg-white/20"
						>
							<HugeiconsIcon
								icon={isPlaying ? PauseIcon : PlayIcon}
								size={14}
							/>
						</button>

						{/* Current time label */}
						<span className="shrink-0 text-[0.65rem] tabular-nums text-white/50">
							{formatTime(currentTime)}
						</span>

						{/* Seek slider */}
						<input
							type="range"
							min={0}
							max={duration || 0}
							step={0.01}
							value={currentTime}
							onChange={(e) => {
								setIsSeeking(true);
								handleSeek(Number(e.target.value));
							}}
							onPointerUp={() => setIsSeeking(false)}
							onPointerDown={() => setIsSeeking(true)}
							className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-white/80 [&::-webkit-slider-thumb]:size-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
							style={{
								background:
									duration > 0
										? `linear-gradient(to right, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.8) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.15) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.15) 100%)`
										: undefined,
							}}
						/>

						{/* Duration label */}
						<span className="shrink-0 text-[0.65rem] tabular-nums text-white/50">
							{formatTime(duration)}
						</span>

						{/* Preview volume */}
						<span className="ml-2 grid size-4 shrink-0 place-items-center text-white/45">
							<HugeiconsIcon icon={VolumeHighIcon} size={12} />
						</span>
						<input
							type="range"
							min={0}
							max={1}
							step={0.01}
							value={previewVolume}
							onChange={(e) => setPreviewVolume(Number(e.target.value))}
							className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/15 accent-white/80 [&::-webkit-slider-thumb]:size-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
							style={{
								background: `linear-gradient(to right, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.8) ${previewVolume * 100}%, rgba(255,255,255,0.15) ${previewVolume * 100}%, rgba(255,255,255,0.15) 100%)`,
							}}
						/>
					</div>
				)}
			</div>
		</>
	);
}

function formatTime(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
	const min = Math.floor(seconds / 60);
	const sec = Math.floor(seconds % 60);
	return `${min}:${sec.toString().padStart(2, "0")}`;
}
