"use client";

import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";

interface Scenario {
	id: string;
	tabLabel: string;
	codeTag: string;
	promptKey?: string;
	promptFallback: string;
	replyKey?: string;
	replyFallback: string;
	profileSummary: string;
	tools: Array<{
		fn: string;
		args: string;
		duration: string;
		track: string;
	}>;
	tracks: Array<{
		name: string;
		type: string;
		segments: Array<{ label: string; width: string; tone: "ink" | "stone" | "ivory" }>;
	}>;
}

const SCENARIOS: Scenario[] = [
	{
		id: "beat-cut",
		tabLabel: "01 / Beat-Synced Rough Cut",
		codeTag: "TRACE #01 · AUDIO TRANSIENTS",
		promptKey: "home.aiShowcase.chat.userPrompt",
		promptFallback:
			"Trim the interview take to 60 seconds, transcribe the dialogue track into 4-word captions, and keyframe a 1.08x push-in on every beat transient.",
		replyKey: "home.aiShowcase.chat.aiReply",
		replyFallback:
			"Splitting the primary take at silence markers, generating caption segments on overlay tracks, and binding scale keyframes to detected audio transients.",
		profileSummary: "4 COMMANDS EXECUTED · UNDOABLE IN 1 STEP (CTRL+Z)",
		tools: [
			{
				fn: "split_element",
				args: "track_v1 @ 00:00:42:14 (silence < -38dB)",
				duration: "12ms",
				track: "V1",
			},
			{
				fn: "transcribe_audio",
				args: "track_a1 -> 47 caption cues (ONNX Whisper)",
				duration: "410ms",
				track: "T1",
			},
			{
				fn: "upsert_keyframe",
				args: "transform.scale 1.00 -> 1.08 (cubic-bezier)",
				duration: "6ms",
				track: "V1",
			},
			{
				fn: "apply_grade_preset",
				args: "look-noir.wgsl · contrast +12 · halation 0.18",
				duration: "4ms",
				track: "FX1",
			},
		],
		tracks: [
			{
				name: "T1 / CAPTIONS",
				type: "TEXT",
				segments: [
					{ label: "CUE 01-12", width: "w-[28%]", tone: "ivory" },
					{ label: "CUE 13-29", width: "w-[36%]", tone: "ivory" },
					{ label: "CUE 30-47", width: "w-[32%]", tone: "ivory" },
				],
			},
			{
				name: "V1 / CAMERA A",
				type: "VIDEO",
				segments: [
					{ label: "INTRO_TAKE.MOV (1.08x)", width: "w-[34%]", tone: "ink" },
					{ label: "MAIN_DIALOGUE.MOV", width: "w-[42%]", tone: "ink" },
					{ label: "B_ROLL_CUT.MOV", width: "w-[22%]", tone: "stone" },
				],
			},
			{
				name: "A1 / DIALOGUE",
				type: "AUDIO",
				segments: [
					{ label: "STEM_VOICE_24BIT.WAV (-14 LUFS)", width: "w-full", tone: "stone" },
				],
			},
		],
	},
	{
		id: "style-transfer",
		tabLabel: "02 / Reference Pacing Transfer",
		codeTag: "TRACE #02 · CADENCE EXTRACTOR",
		promptKey: "home.aiShowcase.chat.followUp",
		promptFallback:
			"Match the cut cadence and warm luminance curve to the reference reel in folder /refs.",
		replyKey: "home.aiShowcase.chat.aiReply2",
		replyFallback:
			"Reference cadence measured at 48 cuts/min with 180ms audio crossfades. Retiming 14 cut points on Track V1 and preserving manual keyframes.",
		profileSummary: "PROFILE LOCKED: 48 CPM · 0.62S AVG SHOT · 180MS CROSSFADE",
		tools: [
			{
				fn: "analyze_reference_style",
				args: "/refs/editorial-reel.mp4 -> 48.2 cpm, warm lift",
				duration: "195ms",
				track: "REF",
			},
			{
				fn: "retime_scene_cuts",
				args: "scene_main -> target 47 cpm (preserve keyframes)",
				duration: "18ms",
				track: "V1",
			},
			{
				fn: "insert_transition_batch",
				args: "cross-dissolve · 180ms @ 14 cut boundaries",
				duration: "9ms",
				track: "V1",
			},
			{
				fn: "update_effect_params",
				args: "color-wheels · lift +0.04 · temp +350K",
				duration: "3ms",
				track: "FX1",
			},
		],
		tracks: [
			{
				name: "FX1 / GRADE",
				type: "WGSL",
				segments: [
					{ label: "WARM_LIFT_350K + HALATION.WGSL", width: "w-full", tone: "ivory" },
				],
			},
			{
				name: "V1 / RETIMED",
				type: "VIDEO",
				segments: [
					{ label: "SHOT 01", width: "w-[18%]", tone: "ink" },
					{ label: "SHOT 02", width: "w-[22%]", tone: "stone" },
					{ label: "SHOT 03", width: "w-[19%]", tone: "ink" },
					{ label: "SHOT 04", width: "w-[21%]", tone: "stone" },
					{ label: "SHOT 05", width: "w-[16%]", tone: "ink" },
				],
			},
			{
				name: "A1 / MASTER",
				type: "AUDIO",
				segments: [
					{ label: "180MS EQUAL-POWER CROSSFADES", width: "w-full", tone: "stone" },
				],
			},
		],
	},
	{
		id: "local-mcp",
		tabLabel: "03 / Local Ollama & MCP Relay",
		codeTag: "TRACE #03 · LOCALHOST WEBSOCKET",
		promptFallback:
			"Connect to local Ollama (qwen2.5-coder:14b) and expose the active timeline to Claude Desktop via ws://127.0.0.1:8765.",
		replyFallback:
			"Local MCP relay bound to 127.0.0.1:8765. 77 JSON-Schema validated tools registered. Zero media frames or project metadata leave localhost.",
		profileSummary: "ENDPOINT: WS://127.0.0.1:8765 · AES-GCM KEY VAULT",
		tools: [
			{
				fn: "mcp_relay_bind",
				args: "127.0.0.1:8765 (strict loopback policy)",
				duration: "2ms",
				track: "SYS",
			},
			{
				fn: "register_tool_catalog",
				args: "77 tools across 15 timeline & compositor domains",
				duration: "5ms",
				track: "MCP",
			},
			{
				fn: "add_mask_feather",
				args: "element_v1 · polygon SDF · JFA feather 24px",
				duration: "8ms",
				track: "MSK",
			},
			{
				fn: "export_project_archive",
				args: "monograph-cut.artpr (encrypted local snapshot)",
				duration: "31ms",
				track: "IO",
			},
		],
		tracks: [
			{
				name: "MCP / RELAY",
				type: "LOCAL",
				segments: [
					{ label: "STDIO <-> WS://127.0.0.1:8765 (SCHEMA VALIDATED)", width: "w-full", tone: "ivory" },
				],
			},
			{
				name: "MSK / JFA SDF",
				type: "MASK",
				segments: [
					{ label: "POLYGON MASK (24PX GPU FEATHER)", width: "w-[64%]", tone: "ink" },
					{ label: "BYPASS", width: "w-[34%]", tone: "stone" },
				],
			},
			{
				name: "IO / OPFS",
				type: "STORAGE",
				segments: [
					{ label: "INDEXEDDB + OPFS SNAPSHOT #42", width: "w-full", tone: "stone" },
				],
			},
		],
	},
];

export function AIShowcaseSection() {
	const { t } = useI18n();

	const pillars = [
		{
			index: "01",
			titleKey: "home.aiShowcase.feature.selfImproving.title",
			bodyKey: "home.aiShowcase.feature.selfImproving.body",
		},
		{
			index: "02",
			titleKey: "home.aiShowcase.feature.styleReference.title",
			bodyKey: "home.aiShowcase.feature.styleReference.body",
		},
		{
			index: "03",
			titleKey: "home.aiShowcase.feature.tools.title",
			bodyKey: "home.aiShowcase.feature.tools.body",
		},
	];

	return (
		<section
			id="ai-copilot"
			aria-labelledby="ai-copilot-heading"
			className="relative mx-auto w-full max-w-7xl border-b border-[#141413]/15 px-4 py-20 sm:px-6 md:py-28 lg:px-8"
		>
			<div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12">
				{/* Left Column: Editorial Thesis & Numbered Architectural Pillars */}
				<div className="flex flex-col gap-6 lg:col-span-5">
					<div className="flex items-center gap-3">
						<span className="ed-rule" aria-hidden="true" />
						<span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[#4A4741]">
							{t("home.aiShowcase.eyebrow")}
						</span>
					</div>

					<h2
						id="ai-copilot-heading"
						className="font-serif text-[clamp(2.1rem,4.1vw,3.5rem)] font-normal leading-[1.02] tracking-[-0.025em] text-[#141413]"
					>
						<span className="block">{t("home.aiShowcase.headline.line1")}</span>
						<span className="block italic text-[#282725]">
							{t("home.aiShowcase.headline.line2")}
						</span>
					</h2>

					<p className="max-w-[52ch] text-[15px] leading-[1.65] text-[#282725]">
						{t("home.aiShowcase.body")}
					</p>

					<dl className="mt-4 flex flex-col divide-y divide-[#141413]/15 border-y border-[#141413]/15">
						{pillars.map((pillar) => (
							<div
								key={pillar.index}
								className="grid grid-cols-[2.5rem_1fr] items-baseline gap-3 py-5"
							>
								<span className="font-serif text-xl italic text-[#4A4741]">
									{pillar.index}
								</span>
								<div>
									<dt className="text-[15px] font-semibold tracking-[-0.01em] text-[#141413]">
										{t(pillar.titleKey)}
									</dt>
									<dd className="mt-1.5 text-[13.5px] leading-[1.6] text-[#4A4741]">
										{t(pillar.bodyKey)}
									</dd>
								</div>
							</div>
						))}
					</dl>
				</div>

				{/* Right Column: Interactive Arth Command & Timeline Inspector built with shadcn Tabs & Card */}
				<div className="lg:col-span-7">
					<Tabs defaultValue="beat-cut" variant="editorial" className="w-full">
						<TabsList aria-label="Arth command execution scenarios">
							{SCENARIOS.map((sc) => (
								<TabsTrigger key={sc.id} value={sc.id}>
									{sc.tabLabel}
								</TabsTrigger>
							))}
						</TabsList>

						{SCENARIOS.map((sc) => (
							<TabsContent key={sc.id} value={sc.id} className="mt-3">
								<Card variant="editorial" className="overflow-hidden">
									<CardHeader className="border-b border-[#141413]/15 bg-[#EAE7DF] p-4 sm:p-5">
										<div className="flex flex-wrap items-center justify-between gap-2">
											<CardTitle className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#141413]">
												{t("home.aiShowcase.chat.windowTitle")} · {sc.codeTag}
											</CardTitle>
											<Badge variant="editorial-ink">
												{t("home.aiShowcase.chat.liveBadge")}
											</Badge>
										</div>
										<CardDescription className="mt-2 font-serif text-lg italic leading-snug text-[#141413] sm:text-xl">
											&ldquo;
											{sc.promptKey ? t(sc.promptKey) : sc.promptFallback}
											&rdquo;
										</CardDescription>
									</CardHeader>

									<CardContent className="flex flex-col gap-5 p-4 sm:p-6">
										{/* Planner response */}
										<div className="rounded-[3px] border border-[#141413]/15 bg-[#EAE7DF]/70 p-3.5 text-[13.5px] leading-relaxed text-[#282725]">
											<span className="mr-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#141413]">
												PLANNER:
											</span>
											{sc.replyKey ? t(sc.replyKey) : sc.replyFallback}
										</div>

										{/* Deterministic Tool Call Table */}
										<div className="flex flex-col gap-2">
											<div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#4A4741]">
												<span>DISPATCHED TIMELINE TOOLS</span>
												<span>LATENCY / TARGET</span>
											</div>

											<div className="divide-y divide-[#141413]/12 overflow-hidden rounded-[3px] border border-[#141413]/20 bg-[#EAE7DF]">
												{sc.tools.map((tool) => (
													<div
														key={tool.fn}
														className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-[12px]"
													>
														<div className="flex min-w-0 items-center gap-2.5">
															<span className="rounded-[2px] bg-[#141413] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#F4F1EA]">
																{tool.track}
															</span>
															<code className="font-mono font-semibold text-[#141413]">
																{tool.fn}
															</code>
															<span className="truncate font-mono text-[11px] text-[#4A4741]">
																{tool.args}
															</span>
														</div>
														<div className="flex items-center gap-2 font-mono text-[10.5px] tabular-nums">
															<span className="text-[#4A4741]">
																{tool.duration}
															</span>
															<span className="font-semibold text-[#141413]">
																[{t("home.aiShowcase.chat.toolStatus")}]
															</span>
														</div>
													</div>
												))}
											</div>
										</div>

										{/* Resulting Timeline Track Map */}
										<div className="rounded-[3px] border border-[#141413] bg-[#141413] p-3.5 text-[#F4F1EA]">
											<div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#F4F1EA]/15 pb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#D2CEC5]">
												<span>RESULTING TIMELINE STATE</span>
												<span>{sc.profileSummary}</span>
											</div>

											<div className="flex flex-col gap-2">
												{sc.tracks.map((track) => (
													<div
														key={track.name}
														className="grid grid-cols-1 gap-1.5 sm:grid-cols-[7.5rem_1fr] sm:items-center"
													>
														<div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#D2CEC5]">
															{track.name}
														</div>
														<div className="flex h-7 w-full gap-1 overflow-hidden rounded-[2px] bg-[#282725] p-0.5">
															{track.segments.map((seg) => (
																<div
																	key={seg.label}
																	className={
																		seg.tone === "ink"
																			? `${seg.width} flex items-center truncate rounded-[1px] border border-[#F4F1EA]/30 bg-[#141413] px-2 font-mono text-[9.5px] text-[#F4F1EA]`
																			: seg.tone === "ivory"
																				? `${seg.width} flex items-center truncate rounded-[1px] bg-[#F4F1EA] px-2 font-mono text-[9.5px] font-semibold text-[#141413]`
																				: `${seg.width} flex items-center truncate rounded-[1px] bg-[#66625A] px-2 font-mono text-[9.5px] text-[#F4F1EA]`
																	}
																>
																	{seg.label}
																</div>
															))}
														</div>
													</div>
												))}
											</div>
										</div>
									</CardContent>
								</Card>
							</TabsContent>
						))}
					</Tabs>
				</div>
			</div>
		</section>
	);
}
