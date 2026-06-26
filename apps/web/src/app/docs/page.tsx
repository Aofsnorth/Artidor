import type { Metadata } from "next";
import { BasePage } from "@/app/base-page";
import { cn } from "@/utils/ui";

export const metadata: Metadata = {
	title: "Docs — Artidor",
	description:
		"Documentation for Artidor — AI copilot, MCP server integration, keyboard shortcuts, and editor features.",
	alternates: {
		canonical: "/docs",
	},
};

interface DocSection {
	id: string;
	title: string;
	icon: string;
	content: DocBlock[];
}

type DocBlock =
	| { type: "p"; text: string }
	| { type: "h3"; text: string }
	| { type: "ul"; items: string[] }
	| { type: "code"; lang: string; code: string }
	| { type: "callout"; variant: "info" | "warn" | "tip"; text: string }
	| { type: "table"; headers: string[]; rows: string[][] };

const SECTIONS: DocSection[] = [
	{
		id: "getting-started",
		title: "Getting Started",
		icon: "🚀",
		content: [
			{
				type: "p",
				text: "Artidor is a privacy-first, open-source video editor that runs entirely in your browser. No uploads, no cloud rendering — your media stays on your machine.",
			},
			{
				type: "h3",
				text: "Quick Start",
			},
			{
				type: "ul",
				items: [
					"Open the editor at /editor and create a new project.",
					"Drag and drop media files into the Assets panel, or click Import.",
					"Drag clips from Assets onto the timeline to start editing.",
					"Use the AI panel (Arth) to edit with natural language — just describe what you want.",
					"Export your video from the Export button when you're done.",
				],
			},
			{
				type: "callout",
				variant: "tip",
				text: "Everything runs locally in your browser. Your media, projects, and edit history never leave your machine unless you explicitly export or share them.",
			},
		],
	},
	{
		id: "ai-copilot",
		title: "AI Copilot (Arth)",
		icon: "✨",
		content: [
			{
				type: "p",
				text: "Arth is the built-in AI assistant that can edit your video project using natural language. Tell it what you want in plain English and it calls tools to make it happen.",
			},
			{
				type: "h3",
				text: "Using Arth",
			},
			{
				type: "ul",
				items: [
					"Open the AI panel in the right sidebar of the editor.",
					"Type a request like 'Add a text layer that says Hello World' or 'Trim the first clip to 5 seconds'.",
					"Arth will plan, call the right tools, and show you each action as it executes.",
					"You can queue messages while Arth is busy — they'll be sent in order when the current task finishes.",
					"Use Steer to interrupt the current generation and send a new message immediately.",
					"Click Stop to cancel the current generation (queued messages continue).",
				],
			},
			{
				type: "h3",
				text: "AI Providers",
			},
			{
				type: "p",
				text: "Arth supports multiple AI providers. You can use:",
			},
			{
				type: "ul",
				items: [
					"Puter.js — free, no API key needed, runs in the browser.",
					"OpenAI — bring your own API key (GPT-4, GPT-4o, etc.).",
					"Anthropic — bring your own API key (Claude models).",
					"Ollama — run models locally on your machine.",
					"Custom OpenAI-compatible — any provider that implements the OpenAI chat API.",
				],
			},
			{
				type: "callout",
				variant: "info",
				text: "API keys are encrypted with AES-GCM before being stored in localStorage. They never leave your browser except to call the provider's API directly.",
			},
			{
				type: "h3",
				text: "Media Generation",
			},
			{
				type: "p",
				text: "When using Puter.js, Arth can generate video, images, and audio directly. The available models are fetched dynamically from your Puter account — just select them from the dropdown when configuring a Puter provider.",
			},
			{
				type: "h3",
				text: "Auto-Learn",
			},
			{
				type: "p",
				text: "Auto-learn lets Arth learn from your editing style. When enabled, it defaults to project-scoped learning (only learns from edits in the current project). You can switch to global scope to learn across all projects, or turn it off entirely.",
			},
		],
	},
	{
		id: "mcp-server",
		title: "MCP Server — External AI Integration",
		icon: "🔌",
		content: [
			{
				type: "p",
				text: "Artidor includes a built-in MCP (Model Context Protocol) server that lets external AI agents — like Claude Desktop, Cursor, or any MCP-compatible client — directly edit your Artidor projects. This means you can use your favorite AI tool to drive Artidor's timeline, add effects, manipulate clips, and more.",
			},
			{
				type: "callout",
				variant: "info",
				text: "Yes — if you give the MCP server to another AI (like Claude Desktop or Cursor), that AI can directly edit your Artidor project in real-time. The AI calls Artidor's tools through the MCP protocol, and the changes appear instantly in your editor tab.",
			},
			{
				type: "h3",
				text: "How It Works",
			},
			{
				type: "p",
				text: "The MCP server uses a relay-based architecture. It doesn't run commands itself — instead, it relays tool calls from the external AI to a running Artidor editor tab over a localhost WebSocket:",
			},
			{
				type: "code",
				lang: "text",
				code: "MCP client (Claude/Cursor) ──stdio──▶ @artidor/mcp-server ──ws://127.0.0.1:8765──▶ Editor tab",
			},
			{
				type: "ul",
				items: [
					"The tool catalog is fetched live from the connected editor tab, so it always matches the editor's current build.",
					"All 77+ editor tools are exposed — the same tools Arth uses internally.",
					"Tool calls are validated against JSON Schema before execution.",
					"Changes appear in real-time in the editor tab.",
				],
			},
			{
				type: "h3",
				text: "Setup: Let External AIs Edit Your Project",
			},
			{
				type: "p",
				text: "Step 1 — Build the MCP server:",
			},
			{
				type: "code",
				lang: "bash",
				code: "bun install\ncd packages/mcp-server && bun run build",
			},
			{
				type: "p",
				text: "Step 2 — Enable the relay in the editor. Add this to apps/web/.env.local:",
			},
			{
				type: "code",
				lang: "bash",
				code: "NEXT_PUBLIC_MCP_RELAY_URL=ws://127.0.0.1:8765",
			},
			{
				type: "p",
				text: "Step 3 — Open the Artidor editor in your browser (use http://localhost, not https://, so the browser allows the local WebSocket connection).",
			},
			{
				type: "p",
				text: "Step 4 — Configure your MCP client. For Claude Desktop, add this to your config file:",
			},
			{
				type: "code",
				lang: "json",
				code: `{
  "mcpServers": {
    "artidor": {
      "command": "node",
      "args": ["path/to/artidor/packages/mcp-server/dist/index.js"]
    }
  }
}`,
			},
			{
				type: "p",
				text: "For Cursor, add the same config to your MCP settings.",
			},
			{
				type: "callout",
				variant: "warn",
				text: "The Artidor editor tab must be open and connected for the MCP server to work. Without an open tab, tools/list returns empty and tool calls fail with 'editor not connected'.",
			},
			{
				type: "h3",
				text: "Available Tool Categories",
			},
			{
				type: "p",
				text: "The MCP server exposes 77+ tools across 15 categories. All tools use the same validated command vocabulary as the in-app AI:",
			},
			{
				type: "table",
				headers: ["Category", "Tools", "What You Can Do"],
				rows: [
					["Project", "4", "Set FPS, canvas size, background, save project"],
					["Scene", "4", "Create/rename scenes, add/remove bookmarks"],
					["Track", "4", "Add/remove tracks, mute/solo, visibility"],
					["Element", "15+", "Insert/move/split/trim/delete elements, transforms, opacity, blend modes, speed"],
					["Effect", "6", "Add/remove effects, set parameters, enable/disable, reorder, copy"],
					["Mask", "3", "Add/remove masks, set mask parameters"],
					["Keyframe", "6", "Add/remove keyframes, set values, easing, copy/paste"],
					["Transition", "2", "Add/remove transitions between elements"],
					["Playback", "4", "Play, pause, seek, set playback speed"],
					["Asset", "6", "List assets, add media to timeline, manage folders"],
					["Capture", "2", "Capture frames, capture audio regions"],
					["Style", "2", "Apply/save presets"],
					["Export", "2", "Export video, export frame"],
					["History", "3", "Undo, redo, get history"],
					["Selection", "3", "Select/deselect elements, get current selection"],
					["Clipboard", "4", "Copy, paste, cut, clear clipboard"],
					["Planning", "2", "Create plans, update todo items"],
					["Generate", "6+", "Generate video, images, audio, thumbnails, voiceovers, music (requires configured media models)"],
				],
			},
			{
				type: "h3",
				text: "Security",
			},
			{
				type: "ul",
				items: [
					"Localhost only — the relay binds to 127.0.0.1, so only local processes can connect.",
					"All tool calls are validated against JSON Schema before execution.",
					"MCP policy enforces least privilege, typed tools, logging, and deny-by-default.",
					"Dangerous tools (shell execution, network requests, secret access) are disabled.",
					"All tool calls are logged for audit purposes.",
				],
			},
			{
				type: "callout",
				variant: "tip",
				text: "You can change the relay port with the ARTIDOR_MCP_PORT environment variable if 8765 is already in use.",
			},
		],
	},
	{
		id: "mcp-client",
		title: "MCP Client — Connect External MCP Servers to Arth",
		icon: "🧩",
		content: [
			{
				type: "p",
				text: "Artidor can also act as an MCP client. This means you can connect external MCP servers to Arth, giving the in-app AI access to tools from other services (databases, APIs, file systems, etc.).",
			},
			{
				type: "h3",
				text: "Adding an MCP Server",
			},
			{
				type: "ul",
				items: [
					"Open the AI panel in the editor.",
					"Click the puzzle icon (MCP Server chip) in the AI panel header.",
					"Click 'Add MCP Server'.",
					"Enter a name, the SSE endpoint URL, and an optional bearer token.",
					"Click Add — Arth will connect and discover available tools.",
				],
			},
			{
				type: "p",
				text: "Once connected, tools from the external MCP server appear in Arth's tool list with the prefix 'mcp__'. Arth can call them just like any built-in tool.",
			},
			{
				type: "callout",
				variant: "info",
				text: "MCP server configurations are stored in localStorage and persist across sessions. You can enable/disable individual servers without removing them.",
			},
		],
	},
	{
		id: "keyboard-shortcuts",
		title: "Keyboard Shortcuts",
		icon: "⌨️",
		content: [
			{
				type: "table",
				headers: ["Shortcut", "Action"],
				rows: [
					["Space", "Play / Pause"],
					["Ctrl/Cmd + Z", "Undo"],
					["Ctrl/Cmd + Shift + Z", "Redo"],
					["Ctrl/Cmd + S", "Save project"],
					["Ctrl/Cmd + C", "Copy selection"],
					["Ctrl/Cmd + V", "Paste"],
					["Ctrl/Cmd + X", "Cut"],
					["Delete", "Delete selected elements"],
					["S", "Split element at playhead"],
					["Arrow Left/Right", "Move playhead frame by frame"],
					["Shift + Arrow", "Move playhead 10 frames"],
					["Enter (in AI panel)", "Send message / Queue if busy"],
					["Shift + Enter (in AI panel)", "New line in message"],
				],
			},
		],
	},
	{
		id: "project-management",
		title: "Project Management",
		icon: "📁",
		content: [
			{
				type: "h3",
				text: "Saving & Loading",
			},
			{
				type: "ul",
				items: [
					"Projects are saved locally in your browser by default (IndexedDB).",
					"Use Ctrl/Cmd + S to save manually.",
					"Projects can also be saved to Google Drive for cloud backup.",
					"The .artpr format is an encrypted project file that can be exported and imported.",
				],
			},
			{
				type: "h3",
				text: "Google Drive Integration",
			},
			{
				type: "p",
				text: "Connect your Google Drive account from the Projects page to save and load projects from the cloud. Drive access tokens are stored in sessionStorage (per-tab) for security, not in persistent localStorage.",
			},
			{
				type: "h3",
				text: "Sharing",
			},
			{
				type: "p",
				text: "You can share projects via shareable links. Shared projects can be viewed by anyone with the link. You can optionally password-protect shared projects.",
			},
		],
	},
	{
		id: "collaboration",
		title: "Real-time Collaboration",
		icon: "👥",
		content: [
			{
				type: "p",
				text: "Artidor supports real-time collaboration. You can invite others to edit a project with you in real-time, with live cursors, synchronized playback, and shared edit history.",
			},
			{
				type: "ul",
				items: [
					"Click the Share button in the editor to create a collaboration room.",
					"Share the room link with your collaborators.",
					"Each collaborator's cursor and selections are visible in real-time.",
					"Edits are synchronized and can be undone/redone by any participant.",
					"Collaboration uses WebSocket-based real-time communication.",
				],
			},
		],
	},
	{
		id: "export",
		title: "Export & Rendering",
		icon: "🎬",
		content: [
			{
				type: "p",
				text: "Artidor renders video locally in your browser using WebCodecs and Web Workers. No cloud rendering — everything happens on your machine.",
			},
			{
				type: "ul",
				items: [
					"Export to MP4 with configurable resolution, bitrate, and FPS.",
					"Export a single frame as an image.",
					"Rendering happens in a Web Worker to keep the UI responsive.",
					"Progress is shown in real-time during export.",
				],
			},
			{
				type: "callout",
				variant: "tip",
				text: "For faster exports, close other heavy browser tabs. Rendering uses your GPU via WebCodecs when available.",
			},
		],
	},
	{
		id: "privacy-security",
		title: "Privacy & Security",
		icon: "🔒",
		content: [
			{
				type: "p",
				text: "Artidor is designed privacy-first. Here's what that means in practice:",
			},
			{
				type: "ul",
				items: [
					"All editing happens locally in your browser — no media is uploaded to any server.",
					"AI provider API keys are encrypted with AES-GCM before storage.",
					"Google Drive tokens are stored in sessionStorage (per-tab), not persistent localStorage.",
					"Rate limiting on all API endpoints with fail-closed local fallback.",
					"Content Security Policy (CSP) headers protect against XSS.",
					"SSRF protection on AI provider URLs.",
					"No tracking, no analytics on your edit data.",
					"Auto-learn is opt-in (off by default) — your edit data is never collected without consent.",
				],
			},
		],
	},
	{
		id: "troubleshooting",
		title: "Troubleshooting",
		icon: "🔧",
		content: [
			{
				type: "h3",
				text: "AI not responding",
			},
			{
				type: "ul",
				items: [
					"Check that you have at least one AI provider configured (Settings → AI or click the provider name in the AI panel).",
					"If using Puter.js, make sure you're signed in to your Puter account.",
					"If using an API key provider, verify the key is correct and has sufficient credits.",
					"Check the error message in the AI panel — it will tell you what went wrong.",
				],
			},
			{
				type: "h3",
				text: "MCP server not connecting",
			},
			{
				type: "ul",
				items: [
					"Make sure the Artidor editor tab is open in your browser.",
					"Verify NEXT_PUBLIC_MCP_RELAY_URL is set and points to the correct port.",
					"Use http://localhost (not https://) to avoid mixed-content blocking.",
					"Check that port 8765 (or your custom ARTIDOR_MCP_PORT) is not in use.",
					"If the MCP client can't connect, verify the path to packages/mcp-server/dist/index.js is correct.",
				],
			},
			{
				type: "h3",
				text: "Export failing",
			},
			{
				type: "ul",
				items: [
					"Make sure your browser supports WebCodecs (Chrome 94+ or Edge 94+).",
					"Try a lower resolution or bitrate if rendering runs out of memory.",
					"Close other tabs to free up GPU memory.",
				],
			},
			{
				type: "h3",
				text: "Connection dropped mid-task",
			},
			{
				type: "p",
				text: "If the AI connection drops while executing tools, Artidor will automatically retry up to 4 times with exponential backoff (1s, 2s, 4s delays). If all retries fail, your queued messages are preserved — just send a new message to continue.",
			},
		],
	},
];

export default function DocsPage() {
	return (
		<BasePage maxWidth="6xl">
			<div className="flex flex-col gap-2 text-center">
				<h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
					Documentation
				</h1>
				<p className="mx-auto max-w-2xl text-lg leading-relaxed text-white/55">
					Everything you need to know about Artidor — AI copilot, MCP server
					integration, features, and troubleshooting.
				</p>
			</div>

			{/* Table of contents */}
			<div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
				<div className="mb-3 text-sm font-semibold text-white/70">
					Table of Contents
				</div>
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
					{SECTIONS.map((s) => (
						<a
							key={s.id}
							href={`#${s.id}`}
							className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/55 transition-colors hover:bg-white/[0.04] hover:text-white/85"
						>
							<span className="text-base">{s.icon}</span>
							{s.title}
						</a>
					))}
				</div>
			</div>

			{/* Doc sections */}
			<div className="flex flex-col gap-12">
				{SECTIONS.map((section) => (
					<section
						key={section.id}
						id={section.id}
						className="scroll-mt-20 flex flex-col gap-4"
					>
						<div className="flex items-center gap-3 border-b border-white/[0.08] pb-3">
							<span className="text-2xl">{section.icon}</span>
							<h2 className="text-2xl font-bold tracking-tight text-white">
								{section.title}
							</h2>
						</div>
						<div className="flex flex-col gap-3">
							{section.content.map((block) => {
								const blockKey =
									block.type === "p"
										? `p-${block.text.slice(0, 40)}`
										: block.type === "h3"
											? `h3-${block.text}`
											: block.type === "code"
												? `code-${block.code.slice(0, 40)}`
												: block.type === "callout"
													? `callout-${block.text.slice(0, 40)}`
													: block.type === "ul"
														? `ul-${block.items[0]?.slice(0, 30)}`
														: `table-${block.headers.join("-")}`;
								return (
									<DocBlockRenderer
										key={blockKey}
										block={block}
									/>
								);
							})}
						</div>
					</section>
				))}
			</div>
		</BasePage>
	);
}

function DocBlockRenderer({ block }: { block: DocBlock }) {
	switch (block.type) {
		case "p":
			return (
				<p className="text-[15px] leading-relaxed text-white/65">{block.text}</p>
			);
		case "h3":
			return (
				<h3 className="mt-2 text-lg font-semibold text-white/90">
					{block.text}
				</h3>
			);
		case "ul":
			return (
				<ul className="flex flex-col gap-1.5 pl-1">
					{block.items.map((item) => (
						<li
							key={item}
							className="flex gap-2 text-[15px] leading-relaxed text-white/65"
						>
							<span className="mt-2 size-1 shrink-0 rounded-full bg-white/30" />
							<span>{item}</span>
						</li>
					))}
				</ul>
			);
		case "code":
			return (
				<pre className="overflow-x-auto rounded-xl border border-white/[0.08] bg-black/40 p-4 text-[13px] leading-relaxed text-white/80">
					<code>{block.code}</code>
				</pre>
			);
		case "callout": {
			const styles = {
				info: "border-blue-400/20 bg-blue-500/[0.06] text-blue-200/80",
				warn: "border-amber-400/20 bg-amber-500/[0.06] text-amber-200/80",
				tip: "border-emerald-400/20 bg-emerald-500/[0.06] text-emerald-200/80",
			};
			const icons = { info: "ℹ️", warn: "⚠️", tip: "💡" };
			return (
				<div
					className={cn(
						"flex gap-3 rounded-xl border p-4 text-[14px] leading-relaxed",
						styles[block.variant],
					)}
				>
					<span className="shrink-0 text-base">{icons[block.variant]}</span>
					<span>{block.text}</span>
				</div>
			);
		}
		case "table":
			return (
				<div className="overflow-x-auto rounded-xl border border-white/[0.08]">
					<table className="w-full text-left text-[14px]">
						<thead>
							<tr className="border-b border-white/[0.08] bg-white/[0.02]">
								{block.headers.map((h) => (
									<th
										key={h}
										className="px-4 py-2.5 font-semibold text-white/80"
									>
										{h}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{block.rows.map((row) => (
								<tr
									key={row[0]}
									className="border-b border-white/[0.04] last:border-0"
								>
									{row.map((cell) => (
										<td
											key={cell}
											className={cn(
												"px-4 py-2.5 text-white/60",
												cell === row[0] && "font-medium text-white/75",
											)}
										>
											{cell}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			);
	}
}
