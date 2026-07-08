"use client";

import { useEditor } from "@/hooks/use-editor";
import { useEffect, useRef, useState } from "react";
import { timelineHasAudio } from "@/lib/media/audio";

const DB_LABELS = [
	"0",
	"-6",
	"-12",
	"-18",
	"-24",
	"-30",
	"-36",
	"-42",
	"-48",
	"-54",
	"-60",
];

interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	size: number;
	alpha: number;
	decay: number;
}

export function AudioMetersCard() {
	const editor = useEditor();
	const isPlaying = useEditor(
		(e) => e.playback.getIsPlaying(),
		["playback"],
	);
	// Whether the timeline currently has any audible candidate. When
	// false (e.g. a video with no audio track, or all elements/tracks
	// muted), the meter must stay flat instead of reading the analyser
	// — which can report a non-silent baseline even for silent content.
	// The selector returns a primitive boolean, so `useEditor`'s
	// shallow-equality memoization prevents re-renders unless the value
	// actually flips.
	const hasAudio = useEditor((e) => {
		const scene = e.scenes.getActiveSceneOrNull();
		if (!scene) return false;
		return timelineHasAudio({
			tracks: scene.tracks,
			mediaAssets: e.media.getAssets(),
		});
	});

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const requestRef = useRef<number | null>(null);

	// Meter levels
	const [levels, setLevels] = useState({ left: 0, right: 0 });

	// References to hold animation state values for the loop
	const animState = useRef({
		left: 0,
		right: 0,
		isPlaying: false,
		hasAudio: true,
	});

	// Keep animation state sync'd with React playback + audio state
	useEffect(() => {
		animState.current.isPlaying = isPlaying;
	}, [isPlaying]);
	useEffect(() => {
		animState.current.hasAudio = hasAudio;
	}, [hasAudio]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let particles: Particle[] = [];

		const resizeCanvas = () => {
			const rect = canvas.getBoundingClientRect();
			canvas.width = rect.width * (window.devicePixelRatio || 1);
			canvas.height = rect.height * (window.devicePixelRatio || 1);
		};
		resizeCanvas();
		window.addEventListener("resize", resizeCanvas);

		const render = () => {
			const w = canvas.width;
			const h = canvas.height;
			ctx.clearRect(0, 0, w, h);

			const state = animState.current;
			const { left: leftAnalyser, right: rightAnalyser } =
				editor.audio.getAnalysers();

			// 1. Update Levels
			// Only read the analyser when there is audible content on the
			// timeline. Without this gate, a video with no audio track (or
			// with all elements/tracks muted) can still drive the meter via
			// a non-silent analyser baseline, making the bars light up even
			// though nothing audible is playing.
			if (state.isPlaying && state.hasAudio && leftAnalyser && rightAnalyser) {
				const bufferLengthL = leftAnalyser.frequencyBinCount;
				const dataArrayL = new Uint8Array(bufferLengthL);
				leftAnalyser.getByteTimeDomainData(dataArrayL);

				let maxValL = 0;
				for (let i = 0; i < bufferLengthL; i++) {
					const val = (dataArrayL[i] - 128) / 128;
					const absVal = Math.abs(val);
					if (absVal > maxValL) maxValL = absVal;
				}

				const bufferLengthR = rightAnalyser.frequencyBinCount;
				const dataArrayR = new Uint8Array(bufferLengthR);
				rightAnalyser.getByteTimeDomainData(dataArrayR);

				let maxValR = 0;
				for (let i = 0; i < bufferLengthR; i++) {
					const val = (dataArrayR[i] - 128) / 128;
					const absVal = Math.abs(val);
					if (absVal > maxValR) maxValR = absVal;
				}

				// Convert to dB
				const _dbL = maxValL > 0 ? 20 * Math.log10(maxValL) : -100;
				const _dbR = maxValR > 0 ? 20 * Math.log10(maxValR) : -100;

				// Map amplitude to percentage using a more dynamic perceived-loudness curve (square root)
				const targetL = maxValL ** 0.5 * 100;
				const targetR = maxValR ** 0.5 * 100;

				// Fast attack, constant decay
				if (targetL > state.left) {
					state.left = state.left + (targetL - state.left) * 0.9;
				} else {
					state.left -= 3;
				}

				if (targetR > state.right) {
					state.right = state.right + (targetR - state.right) * 0.9;
				} else {
					state.right -= 3;
				}

				// Clamp to min/max. Floor is 0 (true silence), not a
				// visible baseline, so the bar rests fully hidden when
				// there is no signal.
				state.left = Math.max(0, Math.min(100, state.left));
				state.right = Math.max(0, Math.min(100, state.right));
			} else {
				// Decay to quiet floor (0 = fully hidden bar).
				state.left = Math.max(0, state.left - 4);
				state.right = Math.max(0, state.right - 4);
			}

			// Push levels to React state for UI rendering
			setLevels({
				left: state.left,
				right: state.right,
			});

			// 2. Particle Starfield Visualizer
			const maxVal = Math.max(state.left, state.right) / 100;

			// Spawn particles — only when audible content is playing,
			// so the starfield does not animate for silent videos.
			if (state.isPlaying && state.hasAudio && Math.random() < 0.35 + maxVal * 0.3) {
				particles.push({
					x: w * 0.8,
					y: h * (0.4 + Math.random() * 0.5),
					vx: (Math.random() - 0.5) * (1.5 + maxVal * 4),
					vy: (Math.random() - 0.7) * (1.5 + maxVal * 4),
					size: Math.random() * 2.2 + 0.6,
					alpha: 0.9 + Math.random() * 0.1,
					decay: 0.008 + Math.random() * 0.015,
				});
			}

			// Gentle drift particles when idle
			if (!state.isPlaying && Math.random() < 0.08) {
				particles.push({
					x: w * (0.2 + Math.random() * 0.7),
					y: h * 0.9,
					vx: (Math.random() - 0.5) * 0.4,
					vy: -0.2 - Math.random() * 0.4,
					size: Math.random() * 1.5 + 0.5,
					alpha: 0.5 + Math.random() * 0.3,
					decay: 0.005 + Math.random() * 0.008,
				});
			}

			// Render & filter particles
			particles = particles.filter((p) => {
				p.x += p.vx;
				p.y += p.vy;
				p.alpha -= p.decay;

				if (p.alpha <= 0) return false;

				ctx.beginPath();
				ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);

				// Star glow gradient
				const radGrad = ctx.createRadialGradient(
					p.x,
					p.y,
					0,
					p.x,
					p.y,
					p.size * 2,
				);
				radGrad.addColorStop(0, `rgba(255, 255, 255, ${p.alpha})`);
				radGrad.addColorStop(0.3, `rgba(255, 255, 255, ${p.alpha * 0.4})`);
				radGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

				ctx.fillStyle = radGrad;
				ctx.fill();
				return true;
			});

			requestRef.current = requestAnimationFrame(render);
		};

		requestRef.current = requestAnimationFrame(render);

		return () => {
			if (requestRef.current) {
				cancelAnimationFrame(requestRef.current);
			}
			window.removeEventListener("resize", resizeCanvas);
		};
	}, [editor]);

	return (
		<aside className="panel glass-strong relative flex h-full w-[135px] sm:w-[150px] shrink-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0d0d0e] p-2.5 select-none">
			{/* Starfield Visualizer Background */}
			<canvas
				ref={canvasRef}
				className="absolute inset-0 pointer-events-none z-0 opacity-70"
				style={{ mixBlendMode: "screen" }}
			/>

			{/* Content container */}
			<div className="relative z-10 flex h-full flex-col justify-between">
				{/* Header */}
				<div className="flex items-center justify-between mb-3 shrink-0">
					<div className="flex items-center gap-1.5">
						<svg
							aria-hidden="true"
							className="size-3 text-white/40"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
						>
							<line x1="12" y1="5" x2="12" y2="19" />
							<line x1="5" y1="12" x2="19" y2="12" />
						</svg>
						<span className="font-serif text-xs font-semibold text-white/90">
							Meters
						</span>
					</div>
					<button
						type="button"
						className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-white/10 bg-white/[0.04] text-[0.62rem] text-white/70 hover:bg-white/[0.08] hover:text-white transition focus:outline-none cursor-pointer"
					>
						<span>Full</span>
						<svg
							aria-hidden="true"
							className="size-2 text-white/40"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="3"
						>
							<polyline points="6 9 12 15 18 9" />
						</svg>
					</button>
				</div>

				{/* Level meters area */}
				<div className="flex flex-1 items-stretch gap-2.5 min-h-0 py-1">
					{/* DB labels scale */}
					<div className="flex flex-col justify-between text-[0.55rem] text-white/30 font-medium select-none w-5 leading-none py-1">
						{DB_LABELS.map((label) => (
							<span key={label} className="text-right pr-1">
								{label}
							</span>
						))}
					</div>

					{/* Vertical level tracks */}
					<div className="flex flex-1 items-stretch gap-2 relative py-1">
						{/* Channel Left */}
						<VerticalTrack level={levels.left} />

						{/* Channel Right */}
						<VerticalTrack level={levels.right} />
					</div>
				</div>

				{/* Footer channel labels */}
				<div className="flex items-center shrink-0 h-4 border-t border-white/5 mt-1.5 pt-1">
					<div className="w-5 shrink-0" />
					<div className="flex flex-1 gap-2 text-[0.58rem] font-bold text-white/40">
						<span className="flex-1 text-center">L</span>
						<span className="flex-1 text-center">R</span>
					</div>
				</div>
			</div>
		</aside>
	);
}

function VerticalTrack({ level }: { level: number }) {
	return (
		<div className="flex-1 flex flex-col justify-end relative rounded-sm bg-black/60 shadow-inner shadow-black/80 p-[1.5px] overflow-hidden border border-white/5">
			{/* Rising dynamic audio bar */}
			<div
				className="w-full rounded-sm transition-all duration-75 relative"
				style={{
					height: `${level}%`,
					background:
						"linear-gradient(to top, #10b981 0%, #10b981 60%, #eab308 78%, #ef4444 100%)",
					boxShadow: "0 0 4px rgba(16, 185, 129, 0.4)",
				}}
			/>
		</div>
	);
}
