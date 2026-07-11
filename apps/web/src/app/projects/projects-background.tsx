"use client";

/**
 * ProjectsBackground — abstract 3D motion-graphics backdrop for the projects
 * page.
 *
 * A single Canvas 2D stage renders:
 *   1. A drifting field of glowing wireframe primitives (cubes, tori,
 *      octahedra, icosahedra) projected with a tiny fake-3D camera so they
 *      read as 3D objects, not flat 2D shapes. Depth-sorted, slow rotation,
 *      gentle parallax.
 *   2. A particle field of ~110 points that drifts, with thin connecting
 *      lines drawn between near neighbours (constellation look).
 *
 * No 3D library is pulled in: the existing canvas pipeline already uses
 * Canvas 2D, and 7 hand-rolled wireframes at this scale cost less than
 * bootstrapping three.js. If richer 3D is needed later, swap the render
 * loop for three.js without touching the surrounding layers.
 *
 * Design direction:
 *   - Base: deep slate (#0c0d10 → #14161b) so glow reads, not flat black.
 *   - Accent: cool violet → cyan gradient on primitive edges.
 *   - Density: sparse (~7 primitives, ~110 particles) so the page chrome
 *     remains the focus; the background whispers, never shouts.
 *
 * Layout contract (preserved from previous version):
 *   - absolutely positioned, full bleed, behind all page chrome
 *   - positive z-index (z-0 → z-1) because the <body> element carries its
 *     own bg-background layer that would cover any negative z-index
 *   - `aria-hidden` so screen readers skip it
 *   - respects `prefers-reduced-motion`: falls back to a static gradient
 *     and one frame of the composition
 *   - the parent page container MUST keep `z-20` (or higher) so the
 *     page chrome renders above these background layers
 */

import { useEffect, useRef } from "react";

type Vec3 = { x: number; y: number; z: number };
type Primitive = {
	kind: "cube" | "torus" | "octa" | "icosa" | "cylinder";
	position: Vec3;
	rotation: Vec3;
	rotSpeed: Vec3;
	scale: number;
	hue: number;
};

const FOV = 520;
const PRIMITIVE_COUNT = 12;
const PARTICLE_COUNT = 180;
const CONNECT_DIST_SQ = 180 * 180;

function project(point: Vec3, width: number, height: number) {
	const z = point.z + 900;
	const factor = FOV / z;
	return {
		x: width / 2 + point.x * factor,
		y: height / 2 + point.y * factor,
		// depth in [0..1] for sorting/alpha; closer (smaller z) = larger
		depth: 1 - Math.min(1, 900 / Math.max(point.z + 900, 1)),
		factor,
	};
}

function rotate(p: Vec3, r: Vec3): Vec3 {
	// Rotate around Y, then X, then Z — small angles, order doesn't matter
	// perceptually for slow drift.
	const cx = Math.cos(r.x);
	const sx = Math.sin(r.x);
	const cy = Math.cos(r.y);
	const sy = Math.sin(r.y);
	const cz = Math.cos(r.z);
	const sz = Math.sin(r.z);
	const x1 = p.x * cy + p.z * sy;
	const z1 = -p.x * sy + p.z * cy;
	const y1 = p.y * cx - z1 * sx;
	const z2 = p.y * sx + z1 * cx;
	const x2 = x1 * cz - y1 * sz;
	const y2 = x1 * sz + y1 * cz;
	return { x: x2, y: y2, z: z2 };
}

function buildPrimitiveVertices(kind: Primitive["kind"], scale: number): Vec3[] {
	switch (kind) {
		case "cube": {
			const s = scale;
			return [
				{ x: -s, y: -s, z: -s },
				{ x: s, y: -s, z: -s },
				{ x: s, y: s, z: -s },
				{ x: -s, y: s, z: -s },
				{ x: -s, y: -s, z: s },
				{ x: s, y: -s, z: s },
				{ x: s, y: s, z: s },
				{ x: -s, y: s, z: s },
			];
		}
		case "octa": {
			const s = scale * 1.2;
			return [
				{ x: 0, y: -s, z: 0 },
				{ x: s, y: 0, z: 0 },
				{ x: 0, y: s, z: 0 },
				{ x: -s, y: 0, z: 0 },
				{ x: 0, y: 0, z: s },
				{ x: 0, y: 0, z: -s },
			];
		}
		case "icosa": {
			// Simplified icosahedron: 12 vertices of an icosa projected via
			// golden ratio. Sparse but unmistakably icosahedral.
			const s = scale;
			const t = (1 + Math.sqrt(5)) / 2;
			return [
				{ x: -1, y: t, z: 0 },
				{ x: 1, y: t, z: 0 },
				{ x: -1, y: -t, z: 0 },
				{ x: 1, y: -t, z: 0 },
				{ x: 0, y: -1, z: t },
				{ x: 0, y: 1, z: t },
				{ x: 0, y: -1, z: -t },
				{ x: 0, y: 1, z: -t },
				{ x: t, y: 0, z: -1 },
				{ x: t, y: 0, z: 1 },
				{ x: -t, y: 0, z: -1 },
				{ x: -t, y: 0, z: 1 },
			].map((p) => ({ x: (p.x * s) / 2, y: (p.y * s) / 2, z: (p.z * s) / 2 }));
		}
		case "torus": {
			// Two concentric ellipses (top + bottom ring) + 16 connecting
			// lines. Reads as a torus without the trig overhead.
			const s = scale;
			const r = s;
			const tube = s * 0.35;
			const segments = 22;
			const verts: Vec3[] = [];
			for (let i = 0; i < segments; i++) {
				const a = (i / segments) * Math.PI * 2;
				verts.push({
					x: Math.cos(a) * r,
					y: 0,
					z: Math.sin(a) * r,
				});
			}
			for (let i = 0; i < segments; i++) {
				const a = (i / segments) * Math.PI * 2;
				verts.push({
					x: Math.cos(a) * r,
					y: tube,
					z: Math.sin(a) * r,
				});
			}
			// Connecting ribs (sparse)
			const ribCount = 6;
			for (let i = 0; i < ribCount; i++) {
				const idx = Math.floor((i / ribCount) * segments);
				verts.push(verts[idx]);
				verts.push(verts[segments + idx]);
			}
			return verts;
		}
		case "cylinder": {
			const s = scale;
			const r = s;
			const h = s * 1.3;
			const segments = 18;
			const verts: Vec3[] = [];
			for (let i = 0; i < segments; i++) {
				const a = (i / segments) * Math.PI * 2;
				verts.push({ x: Math.cos(a) * r, y: -h, z: Math.sin(a) * r });
			}
			for (let i = 0; i < segments; i++) {
				const a = (i / segments) * Math.PI * 2;
				verts.push({ x: Math.cos(a) * r, y: h, z: Math.sin(a) * r });
			}
			return verts;
		}
	}
}

function edgesForKind(kind: Primitive["kind"]): [number, number][] {
	switch (kind) {
		case "cube":
			return [
				[0, 1], [1, 2], [2, 3], [3, 0],
				[4, 5], [5, 6], [6, 7], [7, 4],
				[0, 4], [1, 5], [2, 6], [3, 7],
			];
		case "octa":
			return [
				[0, 1], [1, 2], [2, 3], [3, 0],
				[4, 0], [4, 1], [4, 2], [4, 3],
				[5, 0], [5, 1], [5, 2], [5, 3],
			];
		case "icosa": {
			// 30 edges of an icosahedron, indexed by pairs of the 12 vertices.
			// This is the canonical icosahedron edge list.
			const e: [number, number][] = [
				[0, 1], [0, 5], [0, 7], [0, 10], [0, 11],
				[1, 5], [1, 7], [1, 8], [1, 9],
				[2, 3], [2, 4], [2, 6], [2, 10], [2, 11],
				[3, 4], [3, 6], [3, 8], [3, 9],
				[4, 5], [4, 9], [4, 11],
				[5, 9], [5, 11],
				[6, 7], [6, 8], [6, 10],
				[7, 8], [7, 10],
				[8, 9],
				[10, 11],
			];
			return e;
		}
		case "torus": {
			// Build dynamically: ring 0 + ring 1 (22 each) + 6 ribs.
			const segments = 22;
			const ribCount = 6;
			const e: [number, number][] = [];
			for (let i = 0; i < segments; i++) {
				e.push([i, (i + 1) % segments]);
				e.push([segments + i, segments + ((i + 1) % segments)]);
			}
			// Ribs are at the end of the verts list (each rib = 2 verts).
			const ribStart = segments * 2;
			for (let i = 0; i < ribCount; i++) {
				e.push([ribStart + i * 2, ribStart + i * 2 + 1]);
			}
			return e;
		}
		case "cylinder": {
			const segments = 18;
			const e: [number, number][] = [];
			for (let i = 0; i < segments; i++) {
				e.push([i, (i + 1) % segments]);
				e.push([segments + i, segments + ((i + 1) % segments)]);
			}
			// 6 vertical connectors
			for (let i = 0; i < 6; i++) {
				const idx = Math.floor((i / 6) * segments);
				e.push([idx, segments + idx]);
			}
			return e;
		}
	}
}

const KINDS: Primitive["kind"][] = [
	"cube", "torus", "octa", "icosa", "cylinder", "icosa", "octa", "cube", "torus", "cylinder", "icosa", "octa",
];

function rand(min: number, max: number) {
	return min + Math.random() * (max - min);
}

function buildPrimitives(): Primitive[] {
	const out: Primitive[] = [];
	for (let i = 0; i < PRIMITIVE_COUNT; i++) {
		out.push({
			kind: KINDS[i % KINDS.length] as Primitive["kind"],
			position: {
				x: rand(-520, 520),
				y: rand(-320, 320),
				z: rand(-300, 200),
			},
			rotation: { x: rand(0, Math.PI * 2), y: rand(0, Math.PI * 2), z: 0 },
			rotSpeed: {
				x: rand(-0.22, 0.22),
				y: rand(-0.28, 0.28),
				z: rand(-0.06, 0.06),
			},
			scale: rand(55, 120),
			hue: rand(180, 300),
		});
	}
	return out;
}

function buildParticles(): { position: Vec3; speed: Vec3; size: number; hue: number }[] {
	const out = [];
	for (let i = 0; i < PARTICLE_COUNT; i++) {
		out.push({
			position: {
				x: rand(-800, 800),
				y: rand(-480, 480),
				z: rand(-350, 250),
			},
			speed: {
				x: rand(-8, 8),
				y: rand(-5, 5),
				z: rand(-1.5, 1.5),
			},
			size: rand(1.0, 3.0),
			hue: rand(180, 310),
		});
	}
	return out;
}

export function ProjectsBackground() {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const prefersReducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		);
		if (prefersReducedMotion.matches) {
			// Static fallback: draw one frame of the composition and stop.
			const ctx = canvas.getContext("2d");
			if (!ctx) return;
			const rect = canvas.getBoundingClientRect();
			canvas.width = Math.round(rect.width * 1);
			canvas.height = Math.round(rect.height * 1);
			ctx.fillStyle = "#0c0d10";
			ctx.fillRect(0, 0, rect.width, rect.height);
			return;
		}

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let frameId = 0;
		let cssWidth = 0;
		let cssHeight = 0;
		let lastTime = performance.now();

		const resize = () => {
			const rect = canvas.getBoundingClientRect();
			cssWidth = rect.width;
			cssHeight = rect.height;
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			canvas.width = Math.round(cssWidth * dpr);
			canvas.height = Math.round(cssHeight * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};

		const primitives = buildPrimitives();
		const particles = buildParticles();

		const draw = (dt: number, timeSeconds: number) => {
			// Gradient clear — deep slate base with subtle hue shift so glow
			// reads against a richer backdrop than flat black.
			const grad = ctx.createRadialGradient(
				cssWidth * 0.5, cssHeight * 0.35, 0,
				cssWidth * 0.5, cssHeight * 0.5, Math.max(cssWidth, cssHeight) * 0.8,
			);
			grad.addColorStop(0, "#12141c");
			grad.addColorStop(0.6, "#0c0d14");
			grad.addColorStop(1, "#08090e");
			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, cssWidth, cssHeight);

			// --- Particles: drift + connect-to-nearest lines -----------------
			for (const p of particles) {
				p.position.x += p.speed.x * dt;
				p.position.y += p.speed.y * dt;
				p.position.z += p.speed.z * dt;
				// Wrap around so the field never empties.
				if (p.position.x > 820) p.position.x = -820;
				if (p.position.x < -820) p.position.x = 820;
				if (p.position.y > 500) p.position.y = -500;
				if (p.position.y < -500) p.position.y = 500;
			}

			const projectedParticles = particles.map((p) => ({
				...project(p.position, cssWidth, cssHeight),
				hue: p.hue,
				size: p.size,
			}));

			ctx.lineWidth = 1.0;
			for (let i = 0; i < projectedParticles.length; i++) {
				const a = projectedParticles.at(i);
				if (!a) continue;
				for (let j = i + 1; j < projectedParticles.length; j++) {
					const b = projectedParticles.at(j);
					if (!b) continue;
					const dx = a.x - b.x;
					const dy = a.y - b.y;
					const dSq = dx * dx + dy * dy;
					if (dSq > CONNECT_DIST_SQ) continue;
					const alpha = (1 - dSq / CONNECT_DIST_SQ) * 0.65;
					ctx.strokeStyle = `hsla(${(a.hue + b.hue) / 2}, 85%, 78%, ${alpha})`;
					ctx.beginPath();
					ctx.moveTo(a.x, a.y);
					ctx.lineTo(b.x, b.y);
					ctx.stroke();
				}
			}

			for (const p of projectedParticles) {
				ctx.fillStyle = `hsla(${p.hue}, 90%, 82%, ${0.65 + p.depth * 0.35})`;
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.size * (0.8 + p.depth * 0.8), 0, Math.PI * 2);
				ctx.fill();
			}

			// --- Primitives: rotate, project, draw wireframe edges ----------
			const drawList: {
				primitive: Primitive;
				projected: { x: number; y: number; depth: number }[];
				depth: number;
			}[] = [];

			for (const primitive of primitives) {
				primitive.rotation.x += primitive.rotSpeed.x * dt;
				primitive.rotation.y += primitive.rotSpeed.y * dt;
				primitive.rotation.z += primitive.rotSpeed.z * dt;
				// Gentle parallax drift
				primitive.position.x += Math.sin(timeSeconds * 0.15 + primitive.hue) * 0.2;
				primitive.position.y += Math.cos(timeSeconds * 0.12 + primitive.hue * 0.5) * 0.15;

				const local = buildPrimitiveVertices(primitive.kind, primitive.scale);
				const transformed = local.map((p) => rotate(p, primitive.rotation));
				const translated = transformed.map((p) => ({
					x: p.x + primitive.position.x,
					y: p.y + primitive.position.y,
					z: p.z + primitive.position.z,
				}));
				const projected = translated.map((p) => project(p, cssWidth, cssHeight));
				const depth =
					projected.reduce((sum, p) => sum + p.depth, 0) / projected.length;
				drawList.push({ primitive, projected, depth });
			}

			// Painter's algorithm: draw far-to-near so nearer edges overlap.
			drawList.sort((a, b) => a.depth - b.depth);

			for (const { primitive, projected } of drawList) {
				const edges = edgesForKind(primitive.kind);
				const baseAlpha = 0.6 + (projected.at(0)?.depth ?? 0) * 0.4;
				ctx.lineWidth = 1.8;
				ctx.strokeStyle = `hsla(${primitive.hue}, 88%, 78%, ${baseAlpha})`;
				ctx.beginPath();
				for (const [a, b] of edges) {
					const pa = projected.at(a);
					const pb = projected.at(b);
					if (!pa || !pb) continue;
					ctx.moveTo(pa.x, pa.y);
					ctx.lineTo(pb.x, pb.y);
				}
				ctx.stroke();

				// Soft glow accent at vertices — makes wireframes pop.
				for (const v of projected) {
					// Outer glow
					ctx.fillStyle = `hsla(${primitive.hue}, 95%, 70%, ${baseAlpha * 0.3})`;
					ctx.beginPath();
					ctx.arc(v.x, v.y, 5, 0, Math.PI * 2);
					ctx.fill();
					// Inner bright dot
					ctx.fillStyle = `hsla(${primitive.hue}, 100%, 88%, ${baseAlpha})`;
					ctx.beginPath();
					ctx.arc(v.x, v.y, 2.5, 0, Math.PI * 2);
					ctx.fill();
				}
			}
		};

		const tick = (timestamp: number) => {
			const dt = Math.min(0.05, (timestamp - lastTime) / 1000);
			lastTime = timestamp;
			draw(dt, timestamp / 1000);
			frameId = window.requestAnimationFrame(tick);
		};

		resize();
		const resizeObserver = new ResizeObserver(resize);
		resizeObserver.observe(canvas);
		frameId = window.requestAnimationFrame(tick);

		return () => {
			window.cancelAnimationFrame(frameId);
			resizeObserver.disconnect();
		};
	}, []);

	return (
		<div
			aria-hidden
			className="pointer-events-none absolute inset-0 z-0"
		>
			{/* 3D wireframe primitives + particle field */}
			<canvas
				ref={canvasRef}
				className="absolute inset-0 size-full"
			/>

			{/* Soft cyan + violet radial wash for atmospheric depth */}
			<div
				className="absolute inset-0"
				style={{
					background: [
						"radial-gradient(ellipse 900px 600px at 18% 22%, rgba(120, 140, 220, 0.10) 0%, transparent 65%)",
						"radial-gradient(ellipse 800px 500px at 82% 78%, rgba(180, 110, 220, 0.09) 0%, transparent 65%)",
					].join(", "),
				}}
			/>

			{/* Vignette */}
			<div
				className="absolute inset-0"
				style={{
					background:
						"radial-gradient(ellipse 100% 100% at 50% 0%, transparent 55%, rgba(6, 7, 10, 0.55) 100%)",
				}}
			/>

			{/* Bottom fade */}
			<div
				className="absolute inset-0"
				style={{
					background:
						"linear-gradient(to bottom, transparent 80%, #08090c 100%)",
				}}
			/>
		</div>
	);
}
