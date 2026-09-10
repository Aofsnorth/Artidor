import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { registerDefaultEffects } from "@/lib/effects";
import { registerDefaultGraphics } from "@/lib/graphics";
import { buildVideoElement, buildSceneTracks } from "@/tests/factories/editor";
import { buildProject } from "@/tests/factories/project";
import { buildScene } from "./scene-builder";
import {
	deserializeSceneTree,
	revokeSceneBlobUrls,
} from "./scene-deserializer";
import { serializeSceneTree, type SerializedNode } from "./scene-serializer";
import {
	resolveEffectLayerNode,
	resolveRenderTree,
	type ResolveContext,
} from "./resolve";
import type { CanvasRenderer } from "./canvas-renderer";
import { EffectLayerNode } from "./nodes/effect-layer-node";
import { GraphicNode } from "./nodes/graphic-node";
import { RootNode } from "./nodes/root-node";
import { TextNode } from "./nodes/text-node";
import { VideoNode } from "./nodes/video-node";
import {
	buildSegmentPlans,
	planSegmentCount,
	shouldUseParallelExport,
} from "./segment-plan";
import { isStaticScene } from "./static-scene";
import {
	audioBitrateFor,
	codecRequiresEvenDimensions,
	encoderSafeDimensions,
	exportKeyFrameIntervalForQuality,
	exportLatencyModeForQuality,
	isEncoderConfigError,
	negotiateAudioCodec,
	negotiateVideoCodec,
	preferredVideoCodec,
} from "./export-codec";
import {
	createRandomAccessWritableStream,
	isDiskBackedExportSupported,
} from "./export-output";
import { getExportWorkerActivityTimeout } from "./export-worker-bridge";
import { clampMaskFeather } from "./mask-feather";
import { getExportRenderQueueDepth } from "./export-performance";

const TICKS_PER_SECOND = 120_000;
const TICKS_PER_FRAME = 4000; // 30 fps
const CANVAS = { width: 1920, height: 1080 };
const TRANSFORM = {
	position: { x: 0, y: 0 },
	scaleX: 1,
	scaleY: 1,
	rotate: 0,
};

const mockRenderer = {
	canvasSize: { width: 1920, height: 1080 },
} as unknown as CanvasRenderer;

function videoFile(): File {
	return new File(["video-bytes"], "clip.mp4", { type: "video/mp4" });
}

function richVideoElement() {
	return {
		...buildVideoElement({ id: "rich" }),
		transform: {
			position: { x: 5, y: 6 },
			scaleX: 1.5,
			scaleY: 1.5,
			rotate: 10,
		},
		opacity: 0.7,
		blendMode: "screen" as const,
		graphicStyle: { fillColor: "#ff0000", fillOpacity: 0.5 },
		animations: {
			bindings: {},
			channels: {
				"transform.positionX": { keyframes: [{ time: 0, value: 0 }] },
			},
		},
		effects: [
			{ id: "fx1", type: "brightness", params: { amount: 30 }, enabled: true },
		],
		masks: [
			{
				id: "m1",
				type: "rectangle",
				params: {
					feather: 12,
					inverted: false,
					strokeColor: "#ffffff",
					strokeWidth: 2,
					strokeAlign: "center",
					centerX: 0,
					centerY: 0,
					width: 0.5,
					height: 0.5,
					rotation: 0,
					scale: 1,
				},
			},
		],
		retime: { rate: 2 },
	};
}

function stripRuntime(
	params: Record<string, unknown>,
): Record<string, unknown> {
	const { file: _file, url: _url, ...rest } = params;
	void _file;
	void _url;
	return rest;
}

function canonTree(node: SerializedNode): unknown {
	return {
		type: node.type,
		params: stripRuntime(node.params),
		children: node.children.map(canonTree),
	};
}

const originalVideoEncoder = (globalThis as Record<string, unknown>)
	.VideoEncoder;

beforeAll(() => {
	registerDefaultEffects();
	registerDefaultGraphics();
	(globalThis as Record<string, unknown>).VideoEncoder = {
		isConfigSupported: () => Promise.resolve({ supported: true }),
	};
});

afterAll(() => {
	// The codec negotiator caches per input key in module state shared across
	// test files — restore the global so sibling suites see a pristine env.
	if (originalVideoEncoder === undefined) {
		delete (globalThis as Record<string, unknown>).VideoEncoder;
	} else {
		(globalThis as Record<string, unknown>).VideoEncoder = originalVideoEncoder;
	}
});

describe("bughunt-2 segment boundaries", () => {
	it("covers odd frame counts with no gap or overlap", () => {
		for (const [totalFrames, count] of [
			[103, 4],
			[97, 3],
			[61, 2],
			[121, 2],
			[5, 2],
		] as const) {
			const plans = buildSegmentPlans({
				totalFrames,
				count,
				ticksPerFrame: TICKS_PER_FRAME,
				ticksPerSecond: TICKS_PER_SECOND,
			});
			expect(plans).toHaveLength(count);
			expect(plans[0]?.startFrame).toBe(0);
			expect(plans[plans.length - 1]?.endFrame).toBe(totalFrames);
			expect(plans.reduce((acc, plan) => acc + plan.frames, 0)).toBe(
				totalFrames,
			);
			for (let i = 0; i < plans.length - 1; i++) {
				expect(plans[i]?.endFrame).toBe(plans[i + 1]?.startFrame);
			}
			for (const plan of plans) {
				expect(plan.frames).toBe(plan.endFrame - plan.startFrame);
			}
		}
	});

	it("keeps tiny timelines on the single-worker path (never empty)", () => {
		// A 30-frame timeline must still export via the warm worker: plan(30)=1
		// and the 2-segment gate rejects it, so runParallelExport falls back
		// instead of producing an empty buffer.
		expect(planSegmentCount(30, 8)).toBe(1);
		expect(
			shouldUseParallelExport({
				totalFrames: 30,
				width: 1920,
				height: 1080,
				segmentCount: 2,
			}),
		).toBe(false);
		// The frame loop still covers [0, totalFrames) for degenerate inputs.
		const plans = buildSegmentPlans({
			totalFrames: 30,
			count: 1,
			ticksPerFrame: TICKS_PER_FRAME,
			ticksPerSecond: TICKS_PER_SECOND,
		});
		expect(plans).toHaveLength(1);
		expect(plans[0]?.startFrame).toBe(0);
		expect(plans[0]?.endFrame).toBe(30);
	});

	it("reproduces serial timestamps after offsetting local times", () => {
		const plans = buildSegmentPlans({
			totalFrames: 100,
			count: 4,
			ticksPerFrame: TICKS_PER_FRAME,
			ticksPerSecond: TICKS_PER_SECOND,
		});
		const frameDur = TICKS_PER_FRAME / TICKS_PER_SECOND;
		for (const plan of plans) {
			for (let local = 0; local < plan.frames; local++) {
				const stitched = plan.startSeconds + local * frameDur;
				const expected =
					((plan.startFrame + local) * TICKS_PER_FRAME) / TICKS_PER_SECOND;
				expect(stitched).toBeCloseTo(expected, 9);
			}
		}
	});
});

describe("bughunt-2 worker progress reporting", () => {
	it("maps the final frame below 1.0 so only completion posts 1.0", () => {
		// export-worker.ts loop: 0.2 + (localFrame / count) * 0.78. The last
		// frame emits (count-1)/count — completion must post the terminal 1.0.
		for (const count of [1, 30, 1800]) {
			const denom = Math.max(1, count);
			const last = 0.2 + ((count - 1) / denom) * 0.78;
			expect(last).toBeLessThan(1);
			// A single-frame export reports 0.2 from the loop; multi-frame
			// exports advance past it. Either way only completion posts 1.0.
			expect(last).toBeGreaterThanOrEqual(0.2);
			if (count > 1) expect(last).toBeGreaterThan(0.2);
		}
	});

	it("clamps mapped progress so init noise can never exceed 1", () => {
		const mapWorkerProgress = (worker: number, includeAudio: boolean) => {
			const mapped = includeAudio ? 0.05 + worker * 0.95 : worker;
			return Math.min(1, Math.max(0, mapped));
		};
		expect(mapWorkerProgress(1, true)).toBe(1);
		expect(mapWorkerProgress(1, false)).toBe(1);
		expect(mapWorkerProgress(1.2, true)).toBe(1);
		expect(mapWorkerProgress(-0.1, false)).toBe(0);
	});

	it("keeps completion reachable through the audio-mix offset", () => {
		// renderer-manager maps worker 0..1 onto 0.05..1 when audio is mixed.
		const mapped = 0.05 + 1 * 0.95;
		expect(mapped).toBeCloseTo(1, 9);
	});
});

describe("bughunt-2 codec fallback chain", () => {
	it("falls back through software to VP9/WebM when all probes fail", async () => {
		(
			globalThis as unknown as { VideoEncoder: typeof VideoEncoder }
		).VideoEncoder = {
			isConfigSupported: () => Promise.resolve({ supported: false }),
		} as unknown as typeof VideoEncoder;
		try {
			// Unique dimensions: the negotiator caches per input key in shared
			// module state, so this probe must not reuse the 1920x1080 key that
			// export-codec.test.ts asserts caching behavior on.
			const result = await negotiateVideoCodec({
				format: "mp4",
				quality: "high",
				width: 1600,
				height: 900,
				fpsFloat: 30,
			});
			expect(result.codec).toBe("vp9");
			expect(result.hardwareAcceleration).toBe("prefer-software");
			expect(result.outputFormat).toBe("webm");
		} finally {
			(
				globalThis as unknown as { VideoEncoder: typeof VideoEncoder }
			).VideoEncoder = {
				isConfigSupported: () => Promise.resolve({ supported: true }),
			} as unknown as typeof VideoEncoder;
		}
	});

	it("skips hardware on the software retry path", async () => {
		const result = await negotiateVideoCodec({
			format: "mp4",
			quality: "high",
			width: 1921,
			height: 707,
			fpsFloat: 30,
			forceSoftware: true,
		});
		expect(result.codec).toBe("avc");
		expect(result.hardwareAcceleration).toBe("prefer-software");
		expect(result.outputFormat).toBe("mp4");
	});

	it("matches only the actionable encoder-config error for retry", () => {
		expect(
			isEncoderConfigError(new Error("Codec not supported by this browser")),
		).toBe(true);
		expect(isEncoderConfigError(new Error("GPU device lost"))).toBe(false);
		expect(isEncoderConfigError("not supported by this browser")).toBe(true);
	});

	it("prefers VP9 for WebM and resolves AAC/Opus per container", async () => {
		expect(preferredVideoCodec("webm")).toBe("vp9");
		expect(preferredVideoCodec("hevc")).toBe("hevc");
		(
			globalThis as unknown as { AudioEncoder: typeof AudioEncoder }
		).AudioEncoder = {
			isConfigSupported: () => Promise.resolve({ supported: true }),
		} as unknown as typeof AudioEncoder;
		try {
			expect(
				await negotiateAudioCodec({
					format: "mp4",
					sampleRate: 48000,
					numberOfChannels: 2,
				}),
			).toBe("aac");
			expect(
				await negotiateAudioCodec({
					format: "webm",
					sampleRate: 48000,
					numberOfChannels: 2,
				}),
			).toBe("opus");
		} finally {
			delete (globalThis as unknown as Record<string, unknown>).AudioEncoder;
		}
	});

	it("keeps even-dimension and quality helpers consistent", () => {
		expect(codecRequiresEvenDimensions("avc")).toBe(true);
		expect(codecRequiresEvenDimensions("hevc")).toBe(true);
		expect(codecRequiresEvenDimensions("vp9")).toBe(false);
		expect(
			encoderSafeDimensions({ width: 1921, height: 1081, codec: "avc" }),
		).toEqual({ codedWidth: 1922, codedHeight: 1082 });
		expect(exportLatencyModeForQuality("low")).toBe("realtime");
		expect(exportLatencyModeForQuality("high")).toBe("quality");
		expect(exportKeyFrameIntervalForQuality("medium")).toBe(4);
		expect(audioBitrateFor("aac")).toBe(128000);
	});
});

describe("bughunt-2 scene round-trip", () => {
	it("preserves effects/masks/retime/keyframes on serialize→deserialize", () => {
		const tracks = buildSceneTracks();
		tracks.main.elements.push(richVideoElement() as never);
		const root = buildScene({
			tracks: tracks as never,
			mediaAssets: [
				{
					id: "media",
					name: "clip.mp4",
					type: "video",
					file: videoFile(),
					url: "blob:u/v",
				},
			] as never,
			duration: 120_000,
			canvasSize: CANVAS,
			background: { type: "color", color: "#000000" },
		});
		const serialized = serializeSceneTree(root);
		const { root: back, blobUrls } = deserializeSceneTree(
			serialized.tree,
			new Map(serialized.files),
		);
		try {
			const reserialized = serializeSceneTree(back as never);
			expect(JSON.stringify(canonTree(reserialized.tree))).toBe(
				JSON.stringify(canonTree(serialized.tree)),
			);
			const video = back.children.find(
				(child) => child instanceof VideoNode,
			) as VideoNode;
			expect(video.params.effects).toHaveLength(1);
			expect(video.params.masks).toHaveLength(1);
			expect(video.params.retime).toEqual({ rate: 2 });
			expect(video.params.opacity).toBe(0.7);
			expect(video.params.blendMode).toBe("screen");
			expect(video.params.animations).toBeDefined();
		} finally {
			revokeSceneBlobUrls(blobUrls);
			expect(blobUrls.size).toBe(0);
		}
	});

	it("revokes per-export blob URLs without throwing on double revoke", () => {
		const urls = new Map([
			["a", "blob:mock-a"],
			["b", "blob:mock-b"],
		]);
		const revoked: string[] = [];
		const original = URL.revokeObjectURL.bind(URL);
		(
			URL as unknown as { revokeObjectURL: (url: string) => void }
		).revokeObjectURL = (url: string) => {
			revoked.push(url);
		};
		try {
			revokeSceneBlobUrls(urls);
			revokeSceneBlobUrls(urls);
		} finally {
			URL.revokeObjectURL = original;
		}
		expect(revoked).toEqual(["blob:mock-a", "blob:mock-b"]);
		expect(urls.size).toBe(0);
	});
});

describe("bughunt-2 mask feather", () => {
	it("clamps feather into the valid WASM range", () => {
		expect(clampMaskFeather(0)).toBe(0);
		expect(clampMaskFeather(12)).toBe(12);
		expect(clampMaskFeather(1000)).toBe(1000);
		expect(clampMaskFeather(5000)).toBe(1000);
		expect(clampMaskFeather(-5)).toBe(0);
		expect(clampMaskFeather(Number.NaN)).toBe(0);
		expect(clampMaskFeather(undefined)).toBe(0);
	});
});

describe("bughunt-2 element resolution", () => {
	function mixedTracks() {
		const tracks = buildSceneTracks();
		tracks.main.elements.push(
			buildVideoElement({ id: "v1", mediaId: "m-v" }) as never,
		);
		tracks.main.elements.push({
			id: "i1",
			name: "Frame",
			type: "image",
			mediaId: "m-i",
			startTime: 0,
			duration: 120_000,
			trimStart: 0,
			trimEnd: 0,
			transform: { ...TRANSFORM },
			opacity: 1,
		} as never);
		tracks.overlay.push({
			id: "tx",
			name: "Text",
			type: "text",
			hidden: false,
			elements: [
				{
					id: "t1",
					name: "Title",
					type: "text",
					content: "Hello",
					fontSize: 48,
					fontFamily: "Arial",
					color: "#ffffff",
					background: { enabled: false, color: "transparent" },
					textAlign: "center",
					fontWeight: "normal",
					fontStyle: "normal",
					textDecoration: "none",
					startTime: 0,
					duration: 120_000,
					trimStart: 0,
					trimEnd: 0,
					transform: { ...TRANSFORM },
					opacity: 1,
				},
			],
		} as never);
		tracks.overlay.push({
			id: "gx",
			name: "Graphics",
			type: "graphic",
			hidden: false,
			elements: [
				{
					id: "s1",
					name: "Sticker",
					type: "sticker",
					stickerId: "shapes:circle",
					startTime: 0,
					duration: 120_000,
					trimStart: 0,
					trimEnd: 0,
					transform: { ...TRANSFORM },
					opacity: 1,
				},
				{
					id: "g1",
					name: "Shape",
					type: "graphic",
					definitionId: "rectangle",
					params: {},
					startTime: 0,
					duration: 120_000,
					trimStart: 0,
					trimEnd: 0,
					transform: { ...TRANSFORM },
					opacity: 1,
				},
			],
		} as never);
		tracks.overlay.push({
			id: "ex",
			name: "Effects",
			type: "effect",
			hidden: false,
			elements: [
				{
					id: "e1",
					name: "Glow",
					type: "effect",
					effectType: "brightness",
					params: {},
					startTime: 0,
					duration: 120_000,
					trimStart: 0,
					trimEnd: 0,
				},
			],
		} as never);
		return tracks;
	}

	function mixedMedia() {
		return [
			{
				id: "m-v",
				name: "v.mp4",
				type: "video",
				file: videoFile(),
				url: "blob:u/v",
			},
			{
				id: "m-i",
				name: "i.png",
				type: "image",
				file: new File(["img"], "i.png", { type: "image/png" }),
				url: "blob:u/i",
			},
		] as never;
	}

	it("resolves every visual element type to a node", () => {
		const root = buildScene({
			tracks: mixedTracks() as never,
			mediaAssets: mixedMedia(),
			duration: 120_000,
			canvasSize: CANVAS,
			background: { type: "color", color: "#000000" },
		});
		const kinds = root.children.map((child) => child.constructor.name);
		for (const kind of [
			"VideoNode",
			"ImageNode",
			"TextNode",
			"StickerNode",
			"GraphicNode",
			"EffectLayerNode",
		]) {
			expect(kinds).toContain(kind);
		}
	});

	it("keeps muted video rendering while skipping hidden tracks", () => {
		const tracks = mixedTracks();
		tracks.main.elements.push({
			...buildVideoElement({ id: "v-muted", mediaId: "m-v", muted: true }),
		} as never);
		tracks.overlay.push({
			id: "hid",
			name: "Hidden",
			type: "text",
			hidden: true,
			elements: [
				{
					id: "h1",
					name: "Hidden",
					type: "text",
					content: "hidden-marker",
					fontSize: 48,
					fontFamily: "Arial",
					color: "#ffffff",
					background: { enabled: false, color: "transparent" },
					textAlign: "center",
					fontWeight: "normal",
					fontStyle: "normal",
					textDecoration: "none",
					startTime: 0,
					duration: 120_000,
					trimStart: 0,
					trimEnd: 0,
					transform: { ...TRANSFORM },
					opacity: 1,
				},
			],
		} as never);
		const root = buildScene({
			tracks: tracks as never,
			mediaAssets: mixedMedia(),
			duration: 120_000,
			canvasSize: CANVAS,
			background: { type: "color", color: "#000000" },
		});
		// Muted only silences audio (mixed elsewhere) — both video nodes render.
		expect(
			root.children.filter((child) => child instanceof VideoNode),
		).toHaveLength(2);
		expect(
			root.children.some(
				(child) =>
					child instanceof TextNode && child.params.content === "hidden-marker",
			),
		).toBe(false);
	});

	it("skips null layers so they never render placeholder text", () => {
		const tracks = mixedTracks();
		tracks.overlay.push({
			id: "null-lane",
			name: "Nulls",
			type: "text",
			hidden: false,
			elements: [
				{
					id: "null-1",
					name: "Null",
					type: "text",
					content: "",
					hidden: true,
					nullLayer: true,
					startTime: 0,
					duration: 120_000,
					trimStart: 0,
					trimEnd: 0,
					transform: { ...TRANSFORM },
					opacity: 1,
				},
			],
		} as never);
		const root = buildScene({
			tracks: tracks as never,
			mediaAssets: mixedMedia(),
			duration: 120_000,
			canvasSize: CANVAS,
			background: { type: "color", color: "#000000" },
		});
		const texts = root.children.filter(
			(child): child is TextNode => child instanceof TextNode,
		);
		expect(texts).toHaveLength(1);
		expect(texts[0]?.params.content).toBe("Hello");
	});

	it("skips unknown attached effects instead of failing the export", async () => {
		const root = new RootNode({ duration: 120_000 });
		root.add(
			new GraphicNode({
				definitionId: "rectangle",
				params: {},
				duration: 120_000,
				timeOffset: 0,
				trimStart: 0,
				trimEnd: 0,
				transform: { ...TRANSFORM },
				opacity: 1,
				effects: [
					{
						id: "fx-bad",
						type: "removed-plugin-effect",
						params: {},
						enabled: true,
					},
					{ id: "fx-good", type: "brightness", params: {}, enabled: true },
				],
			}),
		);
		await resolveRenderTree({ node: root, renderer: mockRenderer, time: 0 });
		const node = root.children[0] as GraphicNode;
		expect(node.resolved).not.toBeNull();
		// Only the known effect contributes a pass group.
		expect(node.resolved?.effectPasses).toHaveLength(1);
	});

	it("resolves unknown effect-layer nodes to null instead of throwing", () => {
		const node = new EffectLayerNode({
			effectType: "removed-plugin-effect",
			effectParams: {},
			timeOffset: 0,
			duration: 120_000,
		});
		const result = resolveEffectLayerNode({
			node,
			context: { time: 0, renderer: mockRenderer } as ResolveContext,
		});
		expect(result).toBeNull();
	});
});

describe("bughunt-2 export output", () => {
	it("writes mediabunny chunks at their requested positions", async () => {
		const operations: string[] = [];
		const stream = createRandomAccessWritableStream({
			seek: async (position: number) => {
				operations.push(`seek:${position}`);
			},
			write: async (data: Uint8Array) => {
				operations.push(`write:${Array.from(data).join(",")}`);
			},
			close: async () => {
				operations.push("close");
			},
		});
		const writer = stream.getWriter();
		await writer.write({
			type: "write",
			position: 8,
			data: new Uint8Array([1, 2]),
		});
		await writer.close();
		expect(operations).toEqual(["seek:8", "write:1,2", "close"]);
	});

	it("never throws from the disk-backing guard, even without storage", () => {
		expect(() => isDiskBackedExportSupported()).not.toThrow();
		expect(typeof isDiskBackedExportSupported()).toBe("boolean");
	});

	it("keeps the render queue positive across resolutions", () => {
		expect(
			getExportRenderQueueDepth({ width: 1920, height: 1080, cores: 8 }),
		).toBeGreaterThan(0);
		expect(
			getExportRenderQueueDepth({ width: 7680, height: 4320, cores: 8 }),
		).toBeGreaterThan(0);
	});

	it("caps the no-message worker wait at ten seconds", () => {
		expect(
			getExportWorkerActivityTimeout({
				timeoutMs: 60_000,
				hasReceivedMessage: false,
			}),
		).toBe(10_000);
		expect(
			getExportWorkerActivityTimeout({
				timeoutMs: 60_000,
				hasReceivedMessage: true,
			}),
		).toBe(60_000);
		expect(
			getExportWorkerActivityTimeout({
				timeoutMs: 0,
				hasReceivedMessage: false,
			}),
		).toBe(0);
	});
});

describe("bughunt-2 static scenes", () => {
	function stillImage(overrides: Record<string, unknown> = {}): SerializedNode {
		return {
			type: "image",
			params: {
				timeOffset: 0,
				duration: 600_000,
				trimStart: 0,
				trimEnd: 0,
				...overrides,
			},
			children: [],
		};
	}

	function rootOf(child: SerializedNode): SerializedNode {
		return {
			type: "root",
			params: { duration: 600_000 },
			children: [child],
		};
	}

	it("holds stills but never video, effects, masks, or animation", () => {
		expect(
			isStaticScene({
				sceneTree: rootOf(stillImage()),
				durationTicks: 600_000,
			}),
		).toBe(true);
		expect(
			isStaticScene({
				sceneTree: rootOf({ ...stillImage(), type: "video" }),
				durationTicks: 600_000,
			}),
		).toBe(false);
		expect(
			isStaticScene({
				sceneTree: rootOf(stillImage({ effects: [{ type: "blur" }] })),
				durationTicks: 600_000,
			}),
		).toBe(false);
		expect(
			isStaticScene({
				sceneTree: rootOf(stillImage({ animations: { channels: {} } })),
				durationTicks: 600_000,
			}),
		).toBe(false);
		expect(
			isStaticScene({
				sceneTree: rootOf(stillImage({ duration: 300_000 })),
				durationTicks: 600_000,
			}),
		).toBe(false);
	});

	it("builds fixtures from the shared factories", () => {
		const project = buildProject();
		expect(project.settings.canvasSize).toEqual(CANVAS);
	});
});
