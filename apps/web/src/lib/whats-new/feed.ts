/**
 * Fine-grained "What's New" feed. Unlike the version-level changelog (markdown
 * content-collections), this is a per-change log surfaced as a small card in the
 * bottom-left of the editor. Add a new entry at the TOP of WHATS_NEW for every
 * shipped change — the newest entry's id drives the unseen indicator.
 */
export type WhatsNewTag = "feature" | "improvement" | "fix" | "performance" | "security";

export interface WhatsNewEntry {
	/** Stable unique id (also the seen-tracking key). Newest entry first. */
	id: string;
	/** Absolute date, YYYY-MM-DD. */
	date: string;
	title: string;
	tag: WhatsNewTag;
	items: string[];
}

export const WHATS_NEW: WhatsNewEntry[] = [
	{
		id: "2026-07-05-ai-takeover-aurora-border-freeze-fix",
		date: "2026-07-05",
		tag: "fix",
		title: "AI takeover aurora border and screen freeze fixes",
		items: [
			"The aurora overlay no longer turns the whole screen black — the border mask is now applied directly to the gradient element so the editor center stays visible, with a safe white-gradient fallback if the browser doesn't support masking.",
			"The Revoke button is now always clickable during AI takeover. The tool execution loop now yields to the event loop between each tool call, so pending click events are processed instead of being blocked until the whole batch finishes.",
		],
	},
	{
		id: "2026-07-04-ai-takeover-redesign-co-edit-mode",
		date: "2026-07-04",
		tag: "improvement",
		title: "AI takeover: cleaner overlay, inline permission, and co-edit mode",
		items: [
			"The aurora overlay is now a thin white border glow instead of a full-screen gradient — the editor center stays fully visible while the AI is in control.",
			"The takeover permission request moved from a popup dialog to an inline card inside the AI chat, so it no longer interrupts your flow with a modal.",
			"New setting: Co-edit mode (Settings → AI). When enabled, you can keep editing the timeline, preview, and properties while the AI is active — the editor stays interactive instead of being locked.",
		],
	},
	{
		id: "2026-07-03-puter-claude-acts-instead-of-announcing",
		date: "2026-07-03",
		tag: "fix",
		title: "Fix: Puter.js AI no longer just announces what it will do",
		items: [
			"The AI system prompt now explicitly forbids announcement-only turns: if the AI says it will call a tool, it must call that tool immediately in the same response instead of stopping at 'I will call X'.",
			"Text-based Puter.js models get the same rule in their XML tool-calling instructions, so they emit the tool call XML right away instead of describing the action.",
		],
	},
	{
		id: "2026-07-02-ai-chat-empty-bubble-error-clarity",
		date: "2026-07-02",
		tag: "fix",
		title: "Fix: empty AI tool bubbles and clearer error messages",
		items: [
			"Assistant messages that contain only tool calls (no text) no longer render a blank bordered bubble above the tool card — the chat looks cleaner and less confusing.",
			"update_todo now reports exactly what was wrong (invalid stepIndex type, out-of-range index, or invalid status) so the AI can self-correct instead of failing silently.",
			"Puter.js errors now include the model name and distinguish connection issues from model errors, so the red error card explains what actually happened instead of a generic 'connection failed' message.",
		],
	},
	{
		id: "2026-07-01-provider-card-redesign",
		date: "2026-07-01",
		tag: "improvement",
		title: "Provider cards get a visual refresh",
		items: [
			"Each AI provider card now has a colored left rail and icon tile keyed to its type (OpenAI = emerald, Anthropic = orange, Ollama = sky, Puter = violet), so you can tell providers apart at a glance.",
			"Default provider is now highlighted with a cyan ring. Status row shows the test result inline with an icon, and disabled providers show a clear badge instead of just dimming.",
		],
	},
	{
		id: "2026-06-30-fix-puter-builtin-tools",
		date: "2026-06-30",
		tag: "fix",
		title: "Fix: Puter.js models couldn't call built-in AI tools",
		items: [
			"Built-in tools (list_assets, add_media_to_timeline, split_element, etc.) were only listed in the system prompt text but never passed as native function definitions to the Puter.js chat API. This meant Claude, GPT-4o, and other models could see the tool names but couldn't actually call them. Now both built-in and MCP tools are passed as native tool definitions, so all Puter.js models can call any tool.",
		],
	},
	{
		id: "2026-06-30-searchable-puter-models",
		date: "2026-06-30",
		tag: "improvement",
		title: "Searchable model dropdowns for Puter.js providers",
		items: [
			"All Puter.js model selections (chat, video, image, audio, media) are now searchable comboboxes instead of plain dropdowns. Type to filter by model name, id, or provider — especially useful when Puter returns dozens of models.",
			"Expanded image model detection patterns to catch more model names (dalle, midjourney, leonardo, sd variants, etc.).",
		],
	},
	{
		id: "2026-06-30-ai-tool-chaining-element-ids",
		date: "2026-06-30",
		tag: "fix",
		title: "AI can now chain edits and find clips on its own",
		items: [
			"Adding media to the timeline now returns the clip's elementId and trackId to the AI, so it can immediately trim, split, move, or update that same clip without stopping to ask you for an ID. Multi-step requests like \"add my video then cut the climax\" now execute end-to-end.",
			"New list_elements tool lets the AI enumerate every clip on the timeline (with IDs, type, timing, and trim) when it needs to reference a clip you added manually or lost track of — no more \"please click the clip and paste the ID\" dead-ends.",
			"split_element now reports the right half's elementId and trackId, and the system prompt teaches the AI to chain insert → trim/split using returned IDs instead of giving up after one tool.",
			"Empty/blank assistant bubbles left over after streaming (e.g. when only thinking tags were emitted) are now removed so the chat no longer shows mysterious empty cards.",
		],
	},
	{
		id: "2026-06-29-distinct-tool-icons",
		date: "2026-06-29",
		tag: "improvement",
		title: "Distinct icons for every AI tool",
		items: [
			"Each AI tool call now shows a unique icon in the chat — split gets scissors, keyframes get a key, undo/redo get curved arrows, web fetch gets a globe, and so on. Previously many tools shared the same category icon, making it hard to tell at a glance which tool was called.",
		],
	},
	{
		id: "2026-06-29-small-screen-overflow-dropdowns",
		date: "2026-06-29",
		tag: "improvement",
		title: "Small screen / high-DPI overflow handling",
		items: [
			"AI panel toolbar items that don't fit on small screens or high display scaling now collapse into a \"More\" dropdown instead of getting cut off. On PCs with adequate screen space, the layout stays exactly as before.",
			"Added min-w-0 and truncate to the AI panel header so long assistant names shrink gracefully instead of pushing buttons off-screen.",
		],
	},
	{
		id: "2026-06-29-per-project-chat-history",
		date: "2026-06-29",
		tag: "feature",
		title: "Per-project AI chat history",
		items: [
			"Each project now keeps its own separate AI conversation history. Switching projects automatically saves the current chat and restores the target project's chat — no more cross-project message bleed.",
			"Chat history, archived conversations, plans, and style profiles are all scoped per project and persisted across reloads.",
		],
	},
	{
		id: "2026-06-29-codeql-security-fixes",
		date: "2026-06-29",
		tag: "security",
		title: "CodeQL security findings resolved",
		items: [
			"Fixed incomplete multi-character sanitization in the Puter.js XML stripper — replacement now loops until stable to prevent residual <script> tags.",
			"Hardened font-family quoting in text measurement, subtitle building, and Google Fonts loading to escape backslashes in addition to double quotes.",
			"Documented the scripting worker's isolated Web Worker sandbox as a safe code execution boundary, and clarified that the artidor.run() dispatch is validated on the main thread.",
			"Annotated blob URL assignments to media elements as safe (same-origin, no HTML payload).",
			"Dismissed two Dependabot alerts for transitive Rust dependencies (time, grid) that are pinned by upstream crates and not exposed to untrusted input.",
		],
	},
	{
		id: "2026-06-29-ai-harness-webfetch-questions",
		date: "2026-06-29",
		tag: "feature",
		title: "AI safety harness, native web fetch, and question cards",
		items: [
			"AI now asks for confirmation before large-batch or risky operations (e.g. adding 100+ clips, deleting 10+ elements, replacing all media) instead of silently executing them.",
			"New native web_fetch tool lets the AI read public web pages directly — no MCP server needed for basic web browsing.",
			"Assistant questions are now rendered as a distinct cyan question card so they stand out from regular replies.",
			"Fixed OpenAI 400 Bad Request after tool calls: the assistant's tool_call IDs are now preserved instead of regenerated, so they match the tool result messages.",
		],
	},
	{
		id: "2026-06-29-puter-minimax-followup-icons",
		date: "2026-06-29",
		tag: "fix",
		title: "Puter.js MiniMax follow-up conversations, quick-action icons",
		items: [
			"Fixed Puter.js MiniMax models stopping after the first tool call: the conversation now continues in a text-based format these models understand, so the AI can act on tool results instead of retrying.",
			"Improved XML tool call parsing for malformed provider wrappers (e.g. <minimax> tags) and stripped leftover XML from the chat bubble so the model's raw tool syntax no longer leaks into the visible message.",
			"Empty assistant placeholder bubbles above the 'Thinking…' indicator are now hidden, removing the confusing dark card that appeared while streaming.",
			"The provider dropdown now updates immediately when you select a different provider, instead of lagging until the next re-render.",
			"Quick-action suggestion chips at the top of the AI panel now use icons that are visually distinct from the tool-call category icons.",
			"Tool-call history for text-based Puter models no longer appends redundant 'I called these tools' text into the chat bubble.",
		],
	},
	{
		id: "2026-06-28-puter-toolcall-errorcard-media",
		date: "2026-06-28",
		tag: "fix",
		title: "Puter.js tool call parsing, dismissible errors, media model dropdown",
		items: [
			"Fixed Puter.js models (like minimax) that emit XML-based tool calls (<tool_call>/<invoke> tags) instead of using native function calling — these are now parsed and executed properly instead of showing as raw text in the chat.",
			"Error cards in the chat can now be dismissed with the X button — previously the icon was decorative and couldn't be clicked.",
			"Media model field in the Add/Edit provider dialog now uses a dropdown for Puter.js providers instead of free text, matching the video/image/audio model fields.",
		],
	},
	{
		id: "2026-06-28-autolearn-settings-sync",
		date: "2026-06-28",
		tag: "fix",
		title: "Auto-learn toggle and settings scope now stay in sync",
		items: [
			"Toggling auto-learn off in the status bar now also sets the learning scope to 'off' in advanced settings — they were previously independent and could disagree.",
			"Selecting 'off' in the learning scope dropdown now also disables the auto-learn toggle in the status bar.",
			"Reset to defaults now correctly re-enables auto-learn to match the default 'project' scope.",
		],
	},
	{
		id: "2026-06-28-ref-button-above-chatbar",
		date: "2026-06-28",
		tag: "fix",
		title: "Reference button moved above the chat bar",
		items: [
			"The Reference video button now sits directly above the chat input bar instead of above the messages list, making it easier to find when composing a prompt.",
		],
	},
	{
		id: "2026-06-28-puter-model-fast",
		date: "2026-06-28",
		tag: "fix",
		title: "Puter model selection is now instant after first load",
		items: [
			"Fixed slow Puter model selection — was calling listModels() twice (once for chat models, once for media models). Now uses a single call.",
			"Added 5-minute in-memory cache for the Puter model list, so reopening the provider dialog is instant instead of re-fetching every time.",
		],
	},
	{
		id: "2026-06-28-docs-page",
		date: "2026-06-28",
		tag: "feature",
		title: "Documentation page — MCP server, AI copilot, shortcuts, and more",
		items: [
			"New /docs page with full documentation for Artidor's features.",
			"MCP Server section explains how external AIs (Claude Desktop, Cursor, etc.) can connect to Artidor and directly edit projects — setup steps, tool categories, security model, and troubleshooting.",
			"MCP Client section covers how to connect external MCP servers to Arth for extended tool access.",
			"AI Copilot section covers Arth usage, providers, media generation, auto-learn, and the new Steer/Queue/Stop controls.",
			"Also includes keyboard shortcuts, project management, collaboration, export, privacy & security, and troubleshooting sections.",
			"Docs link added to the header navigation and footer.",
		],
	},
	{
		id: "2026-06-28-chat-steer-queue",
		date: "2026-06-28",
		tag: "feature",
		title: "Steer the AI mid-generation, smarter queue handling, tool-call fixes",
		items: [
			"New 'Steer' button: when the AI is busy, type a message and click Steer to interrupt the current generation and send your message next — no need to wait or cancel.",
			"Stop button now only stops the current generation — queued messages continue automatically. The X button on the queue indicator clears only the queue without stopping the current task.",
			"Chat no longer auto-scrolls to the bottom on initial open — the 'Welcome to Artidor' message is visible at the top when you open the AI panel.",
			"System prompt now includes explicit tool-calling format rules: exact tool names, ticks (not seconds), hex colors, no markdown wrapping, and error-retry guidance — reducing format mistakes.",
			"Tool argument parsing now logs warnings when the model sends invalid JSON, making format issues easier to debug.",
		],
	},
	{
		id: "2026-06-28-ai-chat-polish",
		date: "2026-06-28",
		tag: "improvement",
		title: "Colorful tool calls, dynamic Puter media models, security hardening",
		items: [
			"Tool calls in the AI chat now show colorful category-based icons with glow effects and smooth spring animations — each tool type (scene, element, effect, generate, etc.) has its own color and icon.",
			"Puter.js media generation models (video, image, audio) are now fetched dynamically from your account instead of requiring manual entry — just pick from the dropdown when adding a Puter provider.",
			"The Add/Edit provider dialog is now scrollable, so it works on smaller monitors without cutting off fields.",
			"Quick action buttons collapse into a 'More' dropdown when the panel is too narrow, keeping the chat area clean on small screens.",
			"The thinking indicator no longer shows a logo — just a clean typing dots animation.",
			"The reference button now peeks a tiny hint when idle and fully reveals on hover, reducing visual clutter above the chat.",
			"Auto-learn now defaults to project-scoped learning when enabled, so the AI learns from the current project's edits by default.",
			"Connection drops mid-task are now handled with up to 4 retry attempts with exponential backoff, instead of giving up after 2 tries.",
			"Tool errors now include a retry hint in the result message, prompting the model to analyze the error and try again with corrected arguments.",
			"Security: Rate limiting now fails closed with a local in-memory fallback instead of failing open when Redis is unreachable.",
			"Security: The collaboration leave endpoint now has rate limiting.",
			"Security: Google Drive access tokens are stored in sessionStorage (per-tab) instead of localStorage (persistent), reducing XSS exposure.",
			"Security: OAuth state validation now checks the format before comparing, preventing forged state values.",
		],
	},
	{
		id: "2026-06-27-ai-takeover-control",
		date: "2026-06-27",
		tag: "feature",
		title: "AI takeover: Arth can now drive the editor directly",
		items: [
			"When Arth needs to edit your project, it first asks for permission via a takeover dialog. Approve once per session and the AI can drive the timeline, preview, and properties without re-prompting.",
			"While the AI is in control, an animated aurora overlay covers the editor and the chrome is locked — only the AI chat stays interactive so you can't accidentally fight the AI mid-edit. A status badge shows what the AI is doing and a Revoke button stops takeover instantly.",
			"Timeline elements the AI is modifying get a cyan highlight pulse and smooth position/size transitions, so you can watch clips move, split, and resize in real time as the AI edits.",
			"Read-only tools (list_assets, list_elements, capture_frame, web_fetch, plan tools) don't trigger takeover — only editor-modifying tools do. The AI can still inspect your project without locking it.",
		],
	},
	{
		id: "2026-06-27-random-suggestions",
		date: "2026-06-27",
		tag: "improvement",
		title: "640 random AI suggestions — fresh ideas every chat",
		items: [
			"The AI chat empty state now shows 4 random suggestions picked from a pool of 640 prompts, covering text animation, cutting, color grading, effects, motion, audio, social media formats, transitions, compositing, music video style, documentary, gaming, product, wedding, education, mood, technical fixes, holiday, abstract, and more.",
			"Every time you open a new chat, you get 4 different suggestions — no more seeing the same 4 static prompts every time.",
			"Icons are assigned dynamically based on the suggestion's category keyword (text, video, color, audio, or general).",
		],
	},
	{
		id: "2026-06-27-custom-ai-persona",
		date: "2026-06-27",
		tag: "feature",
		title: "Customize the AI assistant's name and personality",
		items: [
			"You can now rename the AI assistant and customize its personality from Settings → AI. The name appears in the chat header and placeholder text. The personality field accepts free-form instructions that shape the AI's tone and style (e.g. 'Be concise and friendly. Use casual language.').",
			"Both fields are persisted to localStorage and injected into the system prompt on every request. The server-side chat route and the Puter.js client-side path both respect the custom name and personality.",
			"Default name is 'Arth' with no extra personality — same behavior as before if you don't change anything.",
		],
	},
	{
		id: "2026-06-27-reference-button-and-tool-loop",
		date: "2026-06-27",
		tag: "fix",
		title: "Reference button moved + tool loop stability + file error handling",
		items: [
			"Moved the Reference button to sit directly above the chat area, with the active reference filename shown inline next to it. Previously it was buried in the quick actions row.",
			"Fixed tool loop breaking with 'connection dropped mid-task' error. Transient network errors during multi-round tool execution are now retried in-place (up to 2 attempts per round) instead of immediately aborting the entire task. Previous rounds' tool results are preserved.",
			"Added graceful error handling when the AI can't read a sent reference file. Unsupported formats, corrupt files, and audio-only files now show a clear error message instead of silently failing.",
		],
	},
	{
		id: "2026-06-27-security-and-project-provider",
		date: "2026-06-27",
		tag: "security",
		title: "API key encryption + per-project provider selection",
		items: [
			"Security: API keys are now encrypted with AES-GCM (Web Crypto API) before being stored in localStorage. The encryption key lives in IndexedDB, so a naive localStorage.getItem only returns ciphertext. This mitigates XSS-based key theft while maintaining backwards compatibility with existing plaintext entries.",
			"Security: Removed hardcoded Marble CMS workspace key fallback. The key must now be set via the MARBLE_WORKSPACE_KEY environment variable.",
			"Feature: Per-project AI provider selection. A Select dropdown appears in the AI panel when you have 2+ providers. Choose 'Default' to use the global default provider, or pick a specific provider for this project only. The selection is saved in the project metadata and persists across sessions.",
		],
	},
	{
		id: "2026-06-27-ai-media-generation",
		date: "2026-06-27",
		tag: "feature",
		title: "AI can now generate video, images, and audio",
		items: [
			"The AI copilot can now generate media directly from text prompts using Puter.js. Four new tools are available: generate_video (txt2vid), generate_image (txt2img), generate_audio (txt2speech), and generate_media.",
			"Generated media is automatically imported into the project's media library, ready to use on the timeline.",
			"Tools are gated by the provider's media model configuration — the AI only sees generation tools for media types where a model is configured. Non-Puter providers get a clear error message directing them to switch to Puter or use import_asset_from_url.",
			"Puter.js supports models like Sora 2 (video), DALL-E/GPT-Image (images), and AWS Polly/OpenAI TTS (audio). All free via Puter.js — no API key needed.",
		],
	},
	{
		id: "2026-06-27-media-model-config",
		date: "2026-06-27",
		tag: "feature",
		title: "Optional media generation models per provider",
		items: [
			"Add/Edit Provider dialog now has an optional 'Media generation models' section with four fields: Video model, Image model, Audio model, and Media model. Fill in only the models your provider supports.",
			"When a media model field is empty, the AI cannot call generation tools for that media type — the tools are filtered out from the LLM's tool list so it never sees (and never calls) a generation tool it can't actually use. Non-generation tools (editing, timeline, playback) are always available regardless.",
			"This is the foundation for upcoming AI generation features (video, image, audio). The gating mechanism ensures the AI only attempts generation when a compatible model is configured.",
		],
	},
	{
		id: "2026-06-27-puter-csp-ws-test-fix",
		date: "2026-06-27",
		tag: "fix",
		title: "Puter.js WebSocket CSP + test route fix",
		items: [
			"Fixed: Puter.js SDK uses WebSocket connections (ws:/wss:) for real-time communication, which were blocked by CSP. Added ws: and wss: to connect-src directive.",
			"Fixed: Testing a Puter.js provider via the Test button returned a 400 error because the server-side test route tried to build a URL from an empty baseUrl. Puter.js providers run entirely client-side, so the test route now returns a friendly message instead of failing.",
		],
	},
	{
		id: "2026-06-27-mcp-csp-fix",
		date: "2026-06-27",
		tag: "fix",
		title: "MCP server connections no longer blocked by CSP",
		items: [
			"Fixed: MCP server connections (SSE) were blocked by the Content Security Policy because connect-src only allowed specific known origins. MCP servers can be at any URL (localhost, custom domains), so connect-src now allows all http: and https: origins. The user adds MCP servers manually, so they trust those URLs.",
		],
	},
	{
		id: "2026-06-27-mcp-server-cards",
		date: "2026-06-27",
		tag: "improvement",
		title: "MCP server management redesigned with detailed cards",
		items: [
			"MCP server management is now a full dialog with detailed cards instead of a small popover. Each server card shows: name, connection status (Connected/Connecting/Error/Disconnected with colored dot), SSE URL, tool count badge, and an expandable list of available tools with name + description.",
			"Add MCP Server dialog replaces the old browser prompt() flow — proper form with name, SSE URL, and optional bearer token fields, with validation.",
			"Each card has a toggle switch (enable/disable), Reconnect button, and Remove button. Error state shows the error message with a 'Try reconnect' link.",
		],
	},
	{
		id: "2026-06-27-media-workflow-retry-fix",
		date: "2026-06-27",
		tag: "fix",
		title: "AI no longer asks for URLs on existing media + retry loop fix",
		items: [
			"Fixed: AI was asking for a URL when the user said 'add my media to timeline' — it now understands that references to existing media mean assets already in the project's library. The system prompt now has a Media workflow section instructing the AI to call list_assets first, then add_media_to_timeline with the assetId. trackId is optional (auto-placed).",
			"Fixed: AI was retrying the entire message after a connection drop, even if tool calls had already been executed — causing duplicate edits. Now, if the connection drops mid-task (after tool calls ran), the AI shows an error instead of retrying from scratch. The user can send a new message to continue.",
		],
	},
	{
		id: "2026-06-27-expandable-tool-calls",
		date: "2026-06-27",
		tag: "feature",
		title: "Expandable tool calls in AI chat",
		items: [
			"Each tool call in AI chat messages is now expandable. Click a tool call row to see the arguments the AI passed, the full result message, and any structured data the tool returned. Collapsed rows show just the tool name and a short status — expanded rows show everything in a clean JSON view.",
		],
	},
	{
		id: "2026-06-27-clickable-hashtags",
		date: "2026-06-27",
		tag: "feature",
		title: "Clickable hashtags in AI chat",
		items: [
			"Hashtags in AI chat messages are now clickable. When the AI mentions a tab name like #transitions, #effects, #templates, or #audio, it renders as a clickable chip that switches the assets panel to that tab instantly.",
			"Supports all tab names plus common aliases: #arth → AI tab, #tools → Tools tab, #adjust → Adjust tab, #preset → Presets tab.",
		],
	},
	{
		id: "2026-06-27-puter-csp-fix",
		date: "2026-06-27",
		tag: "fix",
		title: "Fix Puter.js CSP block",
		items: [
			"Fixed 'Loading the script https://js.puter.com/v2/ violates Content Security Policy' — added https://js.puter.com to script-src and https://*.puter.com to connect-src in the CSP headers. Puter.js SDK now loads correctly.",
		],
	},
	{
		id: "2026-06-27-anthropic-provider-learning-scope",
		date: "2026-06-27",
		tag: "feature",
		title: "Anthropic provider + style learning scope",
		items: [
			"New Anthropic (Claude) provider option in the AI providers manager. Uses the Anthropic Messages API — enter your API key and base URL. The provider card now has 4 options in a 2×2 grid: OpenAI-compatible (top-left), Anthropic (top-right), Ollama (bottom-left), Puter.js (bottom-right).",
			"New Style Learning setting in Advanced AI Settings — control how the AI learns your editing style: Project (learn from edits in this project only), Global (learn across all projects), or Off (disable style learning entirely). Default: Project.",
			"Telemetry events are now tagged with the project id, enabling project-scoped learning. The system prompt tells the AI which scope is active so it knows whether it's seeing project-specific or cross-project edit history.",
		],
	},
	{
		id: "2026-06-27-puter-client-side-streaming",
		date: "2026-06-27",
		tag: "fix",
		title: "Puter.js now works — client-side streaming + SDK fix",
		items: [
			"Fixed HTTP 400 error when using Puter.js — the AI manager was sending requests to the server API, but Puter.js runs entirely in the browser. Puter.js now streams directly from the Puter.js SDK (puter.ai.chat) without touching the server.",
			"Fixed 'Failed to load Puter.js SDK' — the SDK loader is now a shared, idempotent module (lib/ai/puter-client.ts) with proper error handling, cross-origin attribute, and retry support.",
			"Tool calls work with Puter.js — the streaming path converts Puter's tool_use chunks to the same internal format the server SSE path uses, so the agentic tool loop works identically.",
		],
	},
	{
		id: "2026-06-27-puter-middle-card-model-fetch",
		date: "2026-06-27",
		tag: "improvement",
		title: "Puter.js provider card repositioned + auto-fetch models",
		items: [
			"Puter.js now appears in the middle of the provider type selector card (between OpenAI-compatible and Ollama) instead of at the bottom.",
			"When Puter.js is selected, the available models are automatically fetched from the Puter.js API (puter.ai.listModels()) and shown in a dropdown. No need to manually type a model name — just pick from the list.",
			"Loading spinner while models are being fetched, with a fallback to manual text input if the fetch fails.",
		],
	},
	{
		id: "2026-06-27-ai-stop-copy-edit-revert-adv-settings-puter",
		date: "2026-06-27",
		tag: "feature",
		title: "AI Stop fix + chat actions + advanced settings + Puter.js",
		items: [
			"Fixed the Stop button — it now actually cancels in-flight AI requests and breaks the tool-call loop using an AbortController. Previously the button only reset the UI status but the AI kept executing in the background.",
			"Each chat message now has Copy and Edit buttons (visible on hover). Edit any message — user or AI — to fix typos or refine prompts without retyping.",
			"User messages have a Revert button that undoes all editor changes the AI made in response to that message. It uses the command history snapshot taken before the AI started processing, so you can safely roll back AI edits.",
			"New Advanced AI Settings panel (sliders icon next to the provider button) — tune max tool rounds, retry attempts, retry cooldown, and compaction thresholds. Settings persist to localStorage.",
			"MCP server chip moved next to the AI settings button and now uses a puzzle icon (was the same plug icon as the AI provider button).",
			"Puter.js provider support — a free, browser-based AI provider option. When selected, a mandatory 5-second uncloseable warning popup explains that Puter may use conversation data for model training. The user must acknowledge and accept before the provider is saved.",
		],
	},
	{
		id: "2026-06-27-tool-loop-planning-todo",
		date: "2026-06-27",
		tag: "feature",
		title: "AI tool loop + planning system + TODO checklist",
		items: [
			"Fixed a critical bug where the AI would stop after a single tool call — it never sent the tool results back to the LLM for a follow-up turn. Now the AI runs a proper agentic loop: after executing tools, the results are fed back to the LLM so it can continue reasoning, call more tools, or produce a final answer. Up to 8 tool-call rounds per message.",
			"Fixed a related bug where the AI claimed 'no media uploaded' on follow-up messages — tool results were missing from the conversation history sent to the LLM. Tool results are now stored as `tool`-role messages and included in every subsequent request.",
			"New planning system: the AI can now create a step-by-step plan before executing complex multi-step tasks. The plan is shown as a visual checklist card in the chat with a progress ring, step statuses (pending, in_progress, done, skipped), and real-time updates as the AI works through each step.",
			"New `create_plan` and `update_todo` tools — the AI calls these to create plans and mark step progress. The system prompt instructs the AI to plan first for 3+ step tasks and skip planning for simple 1-2 step tasks.",
		],
	},
	{
		id: "2026-06-27-thinking-tags-stripped",
		date: "2026-06-27",
		tag: "fix",
		title: "AI thinking/reasoning no longer leaks into chat",
		items: [
			"Fixed a broken regex that was supposed to strip  thinking tags from DeepSeek-R1, QwQ, and similar reasoning models. The tags and their internal monologue content were passing through into the visible chat bubble.",
			"Now correctly strips both closed ( ... ) and unclosed (mid-stream) thinking blocks, plus <thinking>...</thinking> tags from MiniMax and other providers. During streaming, unclosed thinking content is hidden until the closing tag arrives.",
		],
	},
	{
		id: "2026-06-27-mcp-chip-collapsed",
		date: "2026-06-27",
		tag: "improvement",
		title: "MCP server chip collapsed by default",
		items: [
			"The MCP servers chip in the AI copilot status bar is now collapsed to a compact icon by default, freeing up status bar space. A green count badge appears on the icon when servers are connected.",
			"Click the icon to open the management popover — add, toggle, and remove MCP servers as before.",
		],
	},
	{
		id: "2026-06-27-projects-minimal-bg-prod",
		date: "2026-06-27",
		tag: "performance",
		title: "Lighter /projects background in production",
		items: [
			"On Vercel (production), the /projects page now uses a clean solid background instead of the heavy wallpaper image + atmospheric gradient overlay. This removes a large image download and the layered radial-gradient CSS for production visitors.",
			"Localhost (development) keeps the full wallpaper + atmospheric overlay so the richer aesthetic is still visible while building.",
		],
	},
	{
		id: "2026-06-27-queue-auto-retry",
		date: "2026-06-27",
		tag: "feature",
		title: "Chat queue + auto-retry with progressive cooldown",
		items: [
			"Messages sent while the AI is busy are now queued and processed automatically when the current request finishes. The queue indicator shows how many messages are waiting.",
			"When the AI errors (network failure, provider down, stream error), it auto-retries with progressive cooldown: attempt 1 waits 5s, 2 waits 10s, 3 waits 15s — up to 5 attempts before giving up.",
			"Retry countdown is shown live in the chat as an amber bubble with a 'Cancel retry' button. The StatusBar badge also shows 'retry N' with the countdown.",
			"Quick actions and the composer still work while the AI is busy — they queue instead of being disabled. The send button becomes a 'Queue' button when busy.",
		],
	},
	{
		id: "2026-06-27-ai-chat-redesign",
		date: "2026-06-27",
		tag: "improvement",
		title: "AI chat panel redesigned — avatars, animations, better hierarchy",
		items: [
			"Message bubbles now have avatars (user = edit icon, AI = sparkles), asymmetric rounded corners, and gradient backgrounds for AI messages.",
			"Tool call results are shown as color-coded cards: green for success, red for failure — with a summary line showing 'N actions completed'.",
			"Empty state replaced with a centered hero greeting, ambient glow, and labeled suggestion cards with icons.",
			"Streaming indicator changed from a spinner to animated typing dots inside an AI-style bubble, matching the message layout.",
			"Composer border glows when you have text ready to send. Error messages now have icons and better readability.",
			"StatusBar header now shows 'Arth' with a 'AI copilot' subtitle, and the provider chip has a settings gear icon instead of 'Manage' text.",
		],
	},
	{
		id: "2026-06-27-vision-capture-media-tools",
		date: "2026-06-27",
		tag: "feature",
		title: "Arth can now see the canvas + add media to timeline",
		items: [
			"New capture_frame tool: Arth can take a screenshot of the current preview frame and analyze it visually. Works with vision-capable providers (GPT-4o, Claude 3.5, Gemini, etc.) — the captured frame is automatically attached as an image input to the next LLM request.",
			"New add_media_to_timeline tool: Arth can add an existing media library asset to the timeline as a video/image/audio clip, with automatic track placement and duration detection.",
			"New import_and_add_to_timeline tool: combined URL import + timeline insertion in one step — download a media file and place it on the timeline in a single tool call.",
			"Vision/multimodal support added to the LLM provider layer: ChatMessage now accepts text + image content parts. Both OpenAI and Anthropic providers convert image data URLs to the correct provider-specific format.",
		],
	},
	{
		id: "2026-06-27-full-tool-coverage-mcp-client",
		date: "2026-06-27",
		tag: "feature",
		title: "Full AI tool coverage + MCP client integration",
		items: [
			"Added 18 new AI tools covering every editor operation: duplicate elements, toggle audio separation, set/unlink parent, combine elements, remove/update transitions, toggle/reorder effects, toggle mask inversion, retime keyframes, effect param keyframes, delete/rename media folders, paste keyframes.",
			"Arth can now connect to external MCP (Model Context Protocol) servers and use their tools alongside the built-in editor tools. Add MCP servers from the AI panel — supports SSE transport with optional bearer token authentication.",
			"MCP server configs persist to localStorage and auto-reconnect on reload. Tools from connected MCP servers are namespaced as mcp__<server>__<tool> to avoid collisions with built-in tools.",
		],
	},
	{
		id: "2026-06-26-arth-chat-rendering-fix",
		date: "2026-06-26",
		tag: "fix",
		title: "Arth chat now strips reasoning tags and renders bold text",
		items: [
			"Arth's system prompt now identifies the assistant as 'the AI assistant inside Artidor' and instructs it to greet as 'Welcome to Artidor' instead of 'Welcome to Arth'.",
			"Reasoning tags like  thinking and <thinking> are now stripped from the assistant's visible output before they reach the chat history. Some providers emit these tags in the same stream as the assistant text.",
			"Chat messages now render Markdown formatting (bold, italic, code, lists) so the model's **text** and _emphasis_ actually display correctly instead of showing raw markdown syntax.",
		],
	},
	{
		id: "2026-06-26-system-prompt-compressed",
		date: "2026-06-26",
		tag: "performance",
		title: "Arth system prompt compressed — fewer tokens, same rules",
		items: [
			"Rewrote Arth's system prompt in a compressed style: dropped articles, filler, hedging, and pleasantries. All technical rules preserved (ticks, hex colors, tool constraints, destructive-action warnings, style matching, output contract). ~40% fewer tokens per request — cheaper, faster, more context room for the actual conversation.",
		],
	},
	{
		id: "2026-06-26-arth-rename-and-asset-mentions",
		date: "2026-06-26",
		tag: "feature",
		title: "Meet Arth — the AI co-pilot + @-mention assets in chat",
		items: [
			"The AI assistant is now named Arth. All user-facing labels — the editor tab, settings section, landing page, header nav, system prompt, and provider dialog — now say 'Arth' instead of 'AI Edit' or 'AI Co-Pilot'. The system prompt introduces the assistant as 'Arth, the Artidor AI video-editing assistant'.",
			"You can now type @ in the Arth chat composer to mention a specific asset from your project. A dropdown appears showing your media library filtered by the text after @ — click an asset to insert @asset-name into your prompt. This lets you reference a specific clip, image, or audio file by name so Arth knows exactly which asset you mean.",
		],
	},
	{
		id: "2026-06-26-rate-limit-fail-open",
		date: "2026-06-26",
		tag: "fix",
		title: "API routes no longer crash when Upstash Redis is unreachable",
		items: [
			"Every API route that uses rate limiting (AI test, AI chat, collaboration, stock search, share, drive import) was crashing with HTTP 500 when Upstash Redis was unreachable — e.g. missing env vars in local dev, network outage, or Redis maintenance. The rate limiter now fails open: if the store is down, the request is allowed through and a warning is logged instead of throwing.",
			"Rate limiting is a secondary abuse-protection layer, not a critical-path feature, so degrading to 'no limit' is safer than breaking every dependent endpoint.",
		],
	},
	{
		id: "2026-06-26-ai-chat-history",
		date: "2026-06-26",
		tag: "feature",
		title: "AI chat history — save and switch conversations",
		items: [
			"The AI Edit panel now keeps a history of conversations. Click 'History' next to 'New' to see saved chats, switch back to an older one, rename it, or delete it.",
			"Starting a new chat automatically archives the current conversation (if it has messages) so you can return to it later.",
			"Conversations are stored locally in your browser and persist across reloads.",
		],
	},
	{
		id: "2026-06-26-ai-provider-test-500",
		date: "2026-06-26",
		tag: "fix",
		title: "AI provider test no longer crashes with HTTP 500",
		items: [
			"Wrapped the provider test endpoint in a global error handler so any unexpected failure returns a clear JSON error instead of a blank HTTP 500 page.",
		],
	},
	{
		id: "2026-06-26-ai-provider-edit-fields-persist",
		date: "2026-06-26",
		tag: "fix",
		title: "AI provider edit dialog keeps the existing values",
		items: [
			"Fixed a bug where opening a provider for editing showed empty fields instead of the existing name, URL, API key, and model. The dialog now resets its form state whenever the target provider changes.",
		],
	},
	{
		id: "2026-06-26-ai-provider-test-json-error",
		date: "2026-06-26",
		tag: "fix",
		title: "AI provider test no longer shows cryptic JSON error",
		items: [
			"Fixed the 'Unexpected end of JSON input' error when testing an AI provider from the provider dialog. The test handler now safely parses the server response and shows a clear HTTP status message if the server returns a non-JSON error.",
		],
	},
	{
		id: "2026-06-26-varied-preview-backgrounds",
		date: "2026-06-26",
		tag: "improvement",
		title:
			"Varied preview backgrounds across Transitions, Effects, Motion, and Templates",
		items: [
			"Transition previews now use procedural scene images (landscape, cityscape, ocean, sunset, portrait, abstract) as the A/B backgrounds instead of flat CSS gradients. Each card picks its scene pair deterministically from its type hash, so the A→B crossfade reads as an actual scene change rather than two colour swatches.",
			"Effect previews expanded from 7 to 12 source patterns — added scene, grid, waves, halftone, and tiles — so effects that target different content types (realistic footage, geometry, comic, mosaic) get a meaningful source image. All non-gradient patterns now derive their colours from the effect type hash via an 8-palette system, so even effects hashing to the same pattern look visually distinct.",
			"Motion/animation preset previews now use procedural scene images as their backdrop (matching the transition previews) instead of a flat palette gradient. Each preset's icon tile overlays the scene so the animation reads against a realistic background.",
			"Template previews now have 5 layout variants (up from 3) — added split-screen vertical and 2×2 grid layouts — so adjacent template cards look more distinct in the grid.",
		],
	},
	{
		id: "2026-06-26-realtime-collaboration",
		date: "2026-06-26",
		tag: "feature",
		title: "Real-time collaboration — edit together with your team",
		items: [
			"Invite collaborators to edit the timeline together in real time. Each person gets a unique colored cursor so you can always see who's doing what.",
			"Four permission modes when starting a session: View (watch only), Comment (view + leave notes), Edit (full editing with element locking to prevent conflicts), and Suggest (propose edits the host approves).",
			"Click Invite → Collaboration in the top bar to start a session. Share the generated link with your team — they enter a nickname and join instantly.",
			"Element locking prevents two people from editing the same clip at the same time. Locked elements show a colored border with the editor's name.",
			"A presence bar next to the Invite button shows who's connected, with colored avatar dots matching each person's cursor.",
			"Powered by the existing Upstash Redis infrastructure — no new dependencies. Room state auto-expires after 6 hours of inactivity.",
		],
	},
	{
		id: "2026-06-26-ai-signin-fix-and-chat-improvements",
		date: "2026-06-26",
		tag: "fix",
		title: "AI works without sign-in + smarter long conversations",
		items: [
			"You no longer need to sign in to use AI when you've added your own provider in the AI Edit panel (BYOK). Sign-in is only required when using the server's built-in key.",
			"New Chat button in the AI Edit panel starts a fresh conversation with one click — clears history and any compacted summary.",
			"Auto-compaction: when a conversation gets long, older messages are automatically summarized into a compact note so the AI keeps full context without hitting context-window limits. A 'N compacted' indicator shows when this has happened.",
			"Auto-learning toggle: the AI's ability to learn from your edits can now be turned on or off from the AI Edit status bar. A green dot shows when it's active.",
		],
	},
	{
		id: "2026-06-26-main-track-label-spacing",
		date: "2026-06-26",
		tag: "improvement",
		title: "Cleaner spacing around the main track label",
		items: [
			"The main track (V1) label card now has breathing room above and below its title, opacity, and volume sliders so they no longer sit flush against the card edges.",
		],
	},
	{
		id: "2026-06-25-export-perf-tuning",
		date: "2026-06-25",
		tag: "performance",
		title: "Faster exports: hardware encoding + smart worker sizing",
		items: [
			"Hardware video encoding is now explicitly requested via WebCodecs `prefer-hardware` — uses NVENC, Intel Quick Sync, AMD VCE, or Apple VideoToolbox when available, giving 10-100x faster encoding than software.",
			"Worker count now auto-detects from your PC specs — CPU cores and RAM — so exports use the right amount of parallelism without thrashing low-end machines or under-utilizing high-end ones.",
			"2-core machines now use a single worker instead of two, avoiding context-switching overhead that was making exports ~2x slower.",
			"Deep render/encode pipelining: the renderer feeds up to 8 frames to the encoder before applying backpressure, keeping the GPU busy while the CPU encodes in the background.",
		],
	},
	{
		id: "2026-06-25-faster-export-and-preview",
		date: "2026-06-25",
		tag: "performance",
		title: "Much faster exports and snappier preview",
		items: [
			"Export now renders and encodes the timeline across multiple CPU cores in parallel, then stitches the pieces back together — typically several times faster on multi-core machines for longer videos.",
			"This is lossless: every segment uses the exact same resolution, codec, and bitrate, so the output quality is identical to before — just produced much faster.",
			"It falls back automatically to the regular single-core export for short clips or unsupported browsers, so exports always complete.",
			"Preview now shows the first frame of a clip immediately instead of waiting on a keyframe scan first — a noticeable difference when scrubbing to or playing long videos.",
			"Smoother playback: the preview keeps a larger buffer of decoded frames ahead of the playhead, so brief decode hitches no longer stall the picture.",
		],
	},
	{
		id: "2026-06-25-ai-providers-dialog-redesign",
		date: "2026-06-25",
		tag: "improvement",
		title: "AI Providers dialog redesign",
		items: [
			"Providers dialog now uses a standard header with visible title and description instead of a screen-reader-only header that caused the X close button to overlap the Add Provider button.",
			"Provider cards use a two-zone layout: info on top, flat action bar on the bottom separated by a border — no more cramped button grid.",
			"Add Provider moved to a dashed-border button at the bottom of the list, so it no longer collides with the dialog's X close button.",
			"Add/Edit provider form dialog has more breathing room (gap-4 between fields), larger type selector cards, and a standard footer layout.",
		],
	},
	{
		id: "2026-06-25-ai-edit-panel-redesign",
		date: "2026-06-25",
		tag: "improvement",
		title: "AI Edit panel redesign",
		items: [
			"StatusBar now uses the same glassmorphism language as the export and feedback dialogs: gradient background, top accent line, ambient glow, and a serif title.",
			"Provider chip, reference video, and learned-edits meta are now cleanly separated into distinct rows with consistent spacing.",
			"Quick action chips are more compact with consistent border/bg tokens.",
			"Message bubbles use rounded-xl with softer borders; tool call rows are subtler.",
			"Composer has a subtle gradient and the send button glows on hover.",
		],
	},
	{
		id: "2026-06-25-preview-freeze-during-render",
		date: "2026-06-25",
		tag: "fix",
		title: "Preview freezes during render instead of skipping frames",
		items: [
			"When a preview render was in-flight (e.g. seeking to a new frame), playback kept advancing while the visual stayed stale — the video appeared to 'jump' after the render finished.",
			"Now playback automatically pauses when a render starts and resumes when it completes, so the video freezes on the current frame during rendering instead of advancing with a stale visual.",
		],
	},
	{
		id: "2026-06-25-scrub-drag-mode-dropdown",
		date: "2026-06-25",
		tag: "feature",
		title: "Playhead drag mode: Auto vs Smart",
		items: [
			"The playhead drag button is now a dropdown with two modes: Auto and Smart.",
			"Auto mode preserves the existing behavior — always play or always pause when dragging the playhead (toggleable via the sub-menu).",
			"Smart mode preserves the current play state during drag: if you're playing, it stays playing; if you're paused, it stays paused. No more accidental play/pause transitions while scrubbing.",
		],
	},
	{
		id: "2026-06-25-stock-library-songs-templates-feedback",
		date: "2026-06-25",
		tag: "feature",
		title: "Stock library, song search, templates, and feedback — all wired up",
		items: [
			"Stock Library: search Pexels stock videos directly from the assets panel. Free, licensed footage with preview thumbnails, duration, and one-click download.",
			"Song Search: Freesound now supports songs (duration > 30s + music tags) in addition to sound effects. Same API, richer results.",
			"Templates button on the projects page now opens the editor's template gallery (10 local templates) via deep-link. No more 'coming soon' dead end.",
			"Feedback: the in-editor feedback prompt now submits to a real database table with rating (1-5 stars), category (bug/feature/praise/other), and message. Rate-limited to 5/hour per IP.",
			"Plugin Sandbox: hardened the Function-sandbox with Object.freeze() on the API object to block constructor-chain escapes. No more TODO(security) — the known escape vector is closed.",
		],
	},
	{
		id: "2026-06-25-ai-editing-enabled",
		date: "2026-06-25",
		tag: "feature",
		title: "AI Editing is now live",
		items: [
			"The AI Edit panel is now enabled with security hardening: authenticated-session checks on /api/ai/chat and /api/ai/test, IP-based rate limiting via Upstash, and SSRF protection on provider URLs.",
			"50+ AI tools across 14 categories (project, scene, track, element, effect, mask, keyframe, transition, playback, asset, style, export, history, clipboard), 3 provider backends (OpenAI-compatible, Anthropic, Ollama), streaming chat, style profile extraction, and privacy-first telemetry.",
			"Configure your AI provider in the AI Edit panel's provider manager. Supports OpenAI, Together, Groq, OpenRouter, LM Studio, Ollama, and any OpenAI-compatible endpoint.",
		],
	},
	{
		id: "2026-06-25-export-size-fix",
		date: "2026-06-25",
		tag: "fix",
		title: "Export file size: 200MB → ~100MB (halved)",
		items: [
			"Export was producing larger files than the source (135MB input → 200MB output). The root cause was the default quality set to 'high' (mediabunny factor 2.0), which doubled the baseline video bitrate.",
			"Fixed: default export quality changed from 'high' to 'medium' (factor 1.0). Audio bitrate fixed at 128kbps AAC / 64kbps Opus instead of scaling with video quality factor.",
			"Users can still manually select 'high' or 'very high' in the export dialog for higher quality when needed.",
		],
	},
	{
		id: "2026-06-25-preview-fast-seek-v2",
		date: "2026-06-25",
		tag: "performance",
		title: "Preview seek: 5-20s → 50-200ms (100x faster)",
		items: [
			"Video preview seeking was extremely slow (5-20 seconds for long jumps in 15+ minute videos). The root cause was a lazy GOP index that fell back to O(n) packet scanning on first seek, plus iterator overhead that decoded all frames from keyframe to target.",
			"Fixed by building the GOP index eagerly on import (50-200ms one-time cost) and switching from iterator-based seeking to mediabunny's getCanvas() single-call API, which is optimized for random-access frame retrieval.",
			"Long jumps (e.g. minute 1 to minute 13) now take 50-200ms instead of 5-20 seconds — a 100x improvement, bringing preview seek performance close to CapCut.",
		],
	},
	{
		id: "2026-06-25-preview-fast-decode",
		date: "2026-06-25",
		tag: "performance",
		title: "Faster video preview: LRU frame cache + 3-frame prefetch buffer",
		items: [
			"Video preview now caches up to 30 decoded frames per video clip in an LRU cache — backward scrubbing and short-range re-seeks are instant (cache hit: 0ms vs 5-80ms decode).",
			"Prefetch buffer increased from 1 to 3 frames ahead, giving ~50ms of decode buffer at 60fps. Single-frame decode spikes no longer stall the preview.",
			"CanvasSink pool size doubled from 3 to 6, reducing canvas allocation churn during playback.",
			"Adaptive scale calculation cached for manual quality tiers — skips redundant math every frame when quality is set to High/Medium/Low.",
			"Loading overlay check merged into the main render loop, eliminating a redundant second requestAnimationFrame loop.",
		],
	},
	{
		id: "2026-06-25-preview-perf-loading-and-track-slider-ui",
		date: "2026-06-25",
		tag: "performance",
		title: "Adaptive preview quality + loading indicator + track slider UI",
		items: [
			"Preview quality now adapts to actual render performance in Auto mode — if frames are consistently slower than the frame budget, the render scale drops one tier and recovers when performance improves. Manual tiers (High/Medium/Low) are unchanged.",
			"A subtle loading overlay appears on the preview canvas when a frame render takes longer than 80 ms, so you see why the preview is momentarily frozen instead of perceiving a hang. The overlay never blocks interaction, playback, or audio.",
			"Track volume slider is now a 0–100% percentage (was decibels). A speaker icon next to the slider toggles track mute. The opacity slider gets a transparency icon that toggles opacity 0/100. Both sliders are now aligned and start further left for a longer slider range.",
		],
	},
	{
		id: "2026-06-25-timeline-toolbar-no-vertical-scroll",
		date: "2026-06-25",
		tag: "fix",
		title: "Timeline toolbar no longer scrolls vertically",
		items: [
			"The timeline toolbar wrapper used the generic ScrollArea which allowed both horizontal and vertical scroll. The toolbar is a fixed 40px row, so vertical scroll made no sense — fixed by switching the wrapper to `overflow-x-auto overflow-y-hidden`. Horizontal scroll remains so wide tool sets still fit on narrow viewports.",
		],
	},
	{
		id: "2026-06-25-timeline-virtualization-rerender",
		date: "2026-06-25",
		tag: "performance",
		title: "Timeline virtualization + reduced re-renders during playback",
		items: [
			"Timeline tracks are now virtualized — only tracks visible in the scroll viewport (+ 120px overscan) are rendered in the DOM. Off-screen tracks are not mounted, reducing DOM nodes and hook overhead for projects with many tracks.",
			"TimelineTrackRows no longer subscribes to the entire editor state. It receives tracks as props from the parent, eliminating redundant useEditor subscriptions that caused re-renders on every playback tick.",
		],
	},
	{
		id: "2026-06-25-export-progress-clip-radius-waveform",
		date: "2026-06-25",
		tag: "improvement",
		title: "Export progress detail, clip radius, waveform settings",
		items: [
			"Export progress now shows one decimal place (e.g. 10.1% instead of 10%) for more precise progress tracking.",
			"Adjacent clips on the timeline now have reduced corner radius where they touch, creating a cleaner visual connection between clips.",
			"New Audio Waveform settings tab in Settings with 5 waveform styles: Waveform (default), Lines (dense), Liquid (smooth), Beats, and Graph.",
		],
	},
	{
		id: "2026-06-25-export-history-overlay-fix",
		date: "2026-06-25",
		tag: "fix",
		title: "Export: history re-exports no longer show full-screen overlay",
		items: [
			"The large completion overlay now only appears once — after the first fresh export. Re-exporting from history shows a lightweight toast notification instead.",
		],
	},
	{
		id: "2026-06-25-camera-switcher-transitions",
		date: "2026-06-25",
		tag: "feature",
		title: "Camera Switcher: multi-camera visibility toggle",
		items: [
			"New Camera Switcher panel in the camera inspector when multiple cameras exist. Shows all cameras with active/hidden status and lets you toggle visibility to switch between them.",
			"The highest visible camera is the active camera (Alight Motion style). Toggling a camera's visibility instantly switches the active camera.",
			"Added findActiveCameraAtTime helper for time-aware camera resolution in the rendering pipeline.",
			"Added camera transition presets (Cut, Fade, Slide, Zoom) for future use in the rendering pipeline.",
		],
	},
	{
		id: "2026-06-25-playhead-drag-scrub",
		date: "2026-06-25",
		tag: "improvement",
		title: "Timeline playhead: drag-to-scrub with toggleable time display",
		items: [
			"Playhead handle now supports drag-to-scrub: click and drag the handle to seek through the timeline.",
			"Clicking the playhead handle toggles a timecode bubble that shows the current position in MM:SS:FF format.",
			"Time bubble uses cyan colors for better visibility on dark backgrounds.",
		],
	},
	{
		id: "2026-06-25-av1-codec-performance-research",
		date: "2026-06-25",
		tag: "performance",
		title: "AV1 codec support + rendering performance research",
		items: [
			"New AV1 export format (MP4 container) with best-in-class compression. AV1 has ~88% browser encode support (2026 data). Falls back to VP9/AVC automatically if hardware encoder is unavailable.",
			"Improved codec fallback chain: AV1 → VP9/AVC, or HEVC → AVC. All fallbacks are now wrapped in try/catch for browsers that throw on isConfigSupported.",
			"Based on industry research (WebCodecsFundamentals, Chrome best practices): VideoFrame lifecycle management, optimal encoder configuration, and export pipeline architecture documented for future optimization.",
		],
	},
	{
		id: "2026-06-25-camera-fog-dof-toggles",
		date: "2026-06-25",
		tag: "feature",
		title: "Camera layer: Focus Blur and Fog toggles with color picker",
		items: [
			"Focus Blur now has an enable/disable toggle. When enabled, shows Focus Distance, Depth of Field range, and Blur Strength sliders. When disabled, no DOF processing occurs.",
			"Fog now has an enable/disable toggle with a color picker, Strength, Near Distance, and Far Distance controls. Fog color can be customized (defaults to white).",
			"Both features follow Alight Motion's UI pattern: toggle group with sub-properties that only appear when enabled.",
		],
	},
	{
		id: "2026-06-25-export-worker-drag-fixes",
		date: "2026-06-25",
		tag: "performance",
		title: "Export pipeline offloaded to Web Worker + drag ghost fixes",
		items: [
			"Export rendering and encoding now run in a Web Worker with OffscreenCanvas when the browser supports it. The main thread stays 100% unblocked during exports — progress bar and cancel button remain responsive. Falls back to the existing main-thread path on older browsers.",
			"Drag ghost is now centered on the mouse cursor instead of floating above it.",
			"Video/visual clips can no longer be dragged below the main track onto audio tracks (and vice versa). The drop indicator snaps to the main track boundary as a visual wall.",
			"Drag ghost no longer flickers or disappears during cross-track drags. The rendering now uses a stable state check instead of one that can briefly flicker during React re-renders.",
			"Rust/WASM compositor now uses OffscreenCanvas uniformly for both main-thread and Worker paths, enabling zero-copy texture transfers.",
		],
	},
	{
		id: "2026-06-25-hd-drag-preview-setting",
		date: "2026-06-25",
		tag: "feature",
		title: "HD drag preview setting",
		items: [
			"New 'HD drag preview' toggle in Settings > General. When enabled, drag ghosts on the timeline show a detailed, opaque preview with element type badge and name. When off (default), ghosts are lightweight transparent outlines.",
		],
	},
	{
		id: "2026-06-25-export-completion-overlay",
		date: "2026-06-25",
		tag: "feature",
		title: "Export completion overlay — CapCut-style full-screen preview",
		items: [
			"When export finishes, a full-screen overlay now appears with a large video preview (auto-play, muted), project filename, format/size/source info, and Download/Close buttons. Click outside or press Escape to dismiss.",
			"The existing export popover still works as an export history — the overlay is for the initial 'just finished' celebration moment.",
		],
	},
	{
		id: "2026-06-25-playhead-drag-export-pause",
		date: "2026-06-25",
		tag: "fix",
		title: "Playhead time bubble, drag ghost position, and export auto-pause",
		items: [
			"Playhead time bubble now appears automatically when you start dragging the playhead handle, and stays visible briefly after scrub. Uses cyan colors for better visibility on dark backgrounds.",
			"Drag ghost now follows the cursor correctly during cross-track drags — no longer appears above or below the expected position.",
			"Playback auto-pauses when you click Export, so the export starts from a clean state.",
			"Element inspector now shows source media details: resolution, FPS, duration, file size, and audio track presence.",
		],
	},
	{
		id: "2026-06-25-media-info-drag-ghost",
		date: "2026-06-25",
		tag: "feature",
		title: "Element inspector: media info + drag clip z-order fix",
		items: [
			"Element tab now shows source media details: resolution (WxH), FPS, duration, file size, and whether the video has audio.",
			"Dragging a clip between tracks now renders a floating ghost element above all tracks, so it never gets stuck behind other tracks during cross-track drags.",
		],
	},
	{
		id: "2026-06-24-drag-z-order-fix",
		date: "2026-06-24",
		tag: "fix",
		title: "Timeline: dragged clip now stays on top when crossing tracks",
		items: [
			"Dragging a clip from one track to another now keeps the clip visually above all other tracks during the drag. Previously the dragged clip could appear behind the destination track's content when you moved it down.",
		],
	},
	{
		id: "2026-06-24-import-storage-hydration-fixes",
		date: "2026-06-24",
		tag: "fix",
		title: "Import storage handling and dropdown hydration fix",
		items: [
			"Import no longer rejects the entire batch when total size exceeds available storage — it now imports what fits and shows a 'Manage storage' link that takes you straight to the projects page so you can free up space by deleting old projects.",
			"Per-file storage errors also get the 'Manage storage' shortcut, so you can clear space without leaving the import flow.",
			"Fixed a hydration error in the scene selector dropdown — the outer clickable element no longer contains nested buttons, which was invalid HTML and would have broken SSR in some setups.",
		],
	},
	{
		id: "2026-06-24-scene-management-perf-layout-camera",
		date: "2026-06-24",
		tag: "feature",
		title:
			"Scene management, performance, camera inspector, and layout presets",
		items: [
			"Add Scene button replaces Add Timeline — creates a new empty scene and switches to it automatically. Each scene in the dropdown now has inline rename and delete buttons.",
			"Audio meter is now black when idle — the green-yellow-red gradient only appears when audio is playing. Bar radius smoothed to rounded-md.",
			"Settings shortcuts list and dialog are now scrollable when content exceeds screen height.",
			"Storage estimate polling stops when the browser tab is hidden (saves CPU), interval increased from 30s to 120s, and storage card auto-refreshes after media import.",
			"300+ video import optimized: parallel processing (4 concurrent workers), OPFS directory handle caching, batched UI updates via queueMicrotask.",
			"Camera inspector now has full property editors: Position XYZ, Target XYZ, FOV, Roll, Near/Far clip, Depth of Field (strength + focus), and Fog (strength + start + end).",
			"Export yield frequency increased from 30 to 60 frames for smoother progress bar on low-end PCs.",
			"6 layout presets added (Default, Compact, Color Grading, Effects Focus, Audio Mix, Fullscreen Preview) — switch via the grid icon in the editor header.",
		],
	},
	{
		id: "2026-06-24-gpu-context-compositor",
		date: "2026-06-24",
		tag: "improvement",
		title: "Rust GPU context and compositor: cross-platform wgpu rendering",
		items: [
			"New GpuContext in rust/crates/gpu manages wgpu instance, adapter, device, and queue acquisition with automatic texture format detection — including a WASM path that probes the browser's canvas surface capabilities so the correct format is chosen without manual configuration.",
			"Compositor in rust/crates/compositor now uses GpuContext for surface configuration, ensuring the render pipeline's texture format matches the GPU adapter on every platform (native and web).",
		],
	},
	{
		id: "2026-06-24-beat-markers-left",
		date: "2026-06-24",
		tag: "improvement",
		title: "Timeline toolbar: beat markers moved back to left section",
		items: [
			"Moved Add beat markers back to the left toolbar section (after Ungroup) while keeping Link/Unlink on the right side next to bookmarks.",
		],
	},
	{
		id: "2026-06-24-toolbar-rebalance",
		date: "2026-06-24",
		tag: "improvement",
		title: "Timeline toolbar: 3 tools moved to right side for better balance",
		items: [
			"Moved Link parent, Unlink parent, and Add beat markers from the left toolbar section to the right section (next to bookmarks) for better visual balance across the toolbar.",
		],
	},
	{
		id: "2026-06-24-dropdown-icon-fixed",
		date: "2026-06-24",
		tag: "fix",
		title:
			"Timeline toolbar: dropdown trigger and manage button now use different icons",
		items: [
			"The dropdown trigger (Main scene / Timeline 1) now uses Layers icon instead of the mode-specific icon, so it no longer duplicates the Manage button's Clapperboard/Timeline icon.",
		],
	},
	{
		id: "2026-06-24-toolbar-spacing",
		date: "2026-06-24",
		tag: "improvement",
		title: "Timeline toolbar: increased horizontal padding for better balance",
		items: [
			"Added more horizontal padding to the timeline toolbar (px-2.5 → px-3.5) so the left-side tools don't sit flush against the edge, creating better visual balance across the toolbar.",
		],
	},
	{
		id: "2026-06-24-scene-timeline-icons",
		date: "2026-06-24",
		tag: "improvement",
		title: "Scene/Timeline mode: unique icons that don't collide with toolbar",
		items: [
			"Scene mode now uses a Clapperboard icon and Timeline mode uses a Timeline icon — both are unique to the mode toggle and don't repeat any other icon already in the editor toolbar.",
		],
	},
	{
		id: "2026-06-24-details-panel-restored",
		date: "2026-06-24",
		tag: "fix",
		title: "Project details panel: restore original card height and layout",
		items: [
			"Restored the original panel wrapper structure by removing extra `overflow-hidden`, `max-h-full`, and `min-h-0` constraints that were compressing the Details card vertically. The Project and Activity sections now display at their natural height again.",
			"Removed `min-h-[120px]` from Section component — cards flex naturally within the scrollable panel without forced minimum heights.",
		],
	},
	{
		id: "2026-06-24-details-panel-stretch-thumbnail-fallback",
		date: "2026-06-24",
		tag: "fix",
		title: "Project details panel + thumbnail fallback on Linux/ANGLE",
		items: [
			"Removed `self-start` from the Properties panel slot so the Details card now stretches to fill the right column instead of shrinking to its content height.",
			"Project thumbnail generation now falls back to a solid background fill when the WebGPU swapchain can't present to a 2D context (the 'output surface does not support the required texture format' error some Linux/ANGLE adapters hit). The card shows the project's background color instead of the empty thumbnail glyph.",
		],
	},
	{
		id: "2026-06-24-timeline-toolbar-compact",
		date: "2026-06-24",
		tag: "improvement",
		title: "Timeline toolbar: Scene/Timeline mode lives inside the dropdown",
		items: [
			"The Scene | Timeline pill that used to sit in the toolbar center is now a switcher inside the active-timeline dropdown. The toolbar slot itself is icon-only: a layered chevron button that mirrors the current mode and shows its label on hover.",
			"Add timeline no longer drops a built-in text or camera placeholder onto the new lane — it adds an empty track ready for you to drop media onto, matching CapCut.",
			"The TRACKS header now has a layered + button on the right that opens the same track-type dropdown used by Add timeline.",
		],
	},
	{
		id: "2026-06-24-desktop-gate-fix",
		date: "2026-06-24",
		tag: "fix",
		title: "Editor no longer blocked on small desktop browser windows",
		items: [
			"The 'Desktop only (for now)' gate was triggering on desktop browsers with viewport width under 1024px. Now only actual mobile devices (iPhone, iPad, Android) see the gate — small desktop windows are no longer blocked.",
		],
	},
	{
		id: "2026-06-24-env-modal-lint-fix",
		date: "2026-06-24",
		tag: "fix",
		title: "Environment warning modal: explicit button types for accessibility",
		items: [
			'Added explicit type="button" to dismiss and acknowledge buttons in the environment warning modal to fix biome lint a11y/useButtonType warnings. Buttons now correctly default to non-submit behavior instead of inheriting the browser\'s default submit type.',
		],
	},
	{
		id: "2026-06-24-timeline-p1-ui-wins",
		date: "2026-06-24",
		tag: "improvement",
		title:
			"Timeline toolbar: track icons, mode toggle, scenes sheet (CapCut-style)",
		items: [
			"Each track header now shows a type-specific icon instead of the V1/A1/T1 text badge. New icons picked from Hugeicons (CameraVideo, Speaker01, Paragraph, ImageIcon) — none of them collide with icons already in use elsewhere in the editor. The text prefix is preserved as a tooltip so V1/V2/A1/T1/C1 numbering stays readable on hover.",
			"The 'Add track' button is now 'Add timeline' (CapCut naming). The dropdown options — Video / Audio / Camera / Text / Image / Effect — are unchanged; they now describe the track types within the active timeline.",
			"Timeline toolbar center: a Scene | Timeline pill toggle sits to the left of the active-timeline button. It is a visual label switch — Scene mode shows the scene name ('Main scene'), Timeline mode shows 'Timeline 1/2/3' indexed by scene position. Hover any pill for the mode description.",
			"A layered chevron button next to the active-timeline pill opens the Scenes sheet (matches screenshot #2: 'Select scenes (N)' header, 'Select scenes to delete' description, Cancel + Delete (N) buttons, Main scene dropdown to switch). The sheet's title and aria-label switch to 'Manage timelines' when the toolbar is in Timeline mode.",
		],
	},
	{
		id: "2026-06-24-properties-scroll-isolation",
		date: "2026-06-24",
		tag: "fix",
		title:
			"Properties panel: scroll isolation so meter no longer follows the card",
		items: [
			'Freehand / vector card scrolling no longer drags the audio meter along with it. react-resizable-panels v4 wraps every Panel in an inner div with overflow: auto for touch-action handling, which was creating a secondary scroll context that moved the whole PropertiesPanel + Meter row when the card scrolled. The properties Panel now passes style={{ overflow: "hidden" }} to clip that secondary scroll, the panel-slot adds overflow-hidden as a safety net, and the PropertiesPanel wrapper inside the flex row gets min-h-0 + overflow-hidden so it can\'t grow past its slot either.',
			"Net effect: scrolling the card moves the card content only; the meter is pinned to its slot regardless of scroll state. The card itself still scrolls cleanly inside its own ScrollArea — the fix only removes the unintended outer scroll context.",
		],
	},
	{
		id: "2026-06-24-audio-meter-revert-overlay-labels",
		date: "2026-06-24",
		tag: "improvement",
		title: "Audio meter reverted to DAW-style overlay dB scale",
		items: [
			"Vertical audio meter dB scale reverted to the earlier overlay-on-bar design (11 marks every 6 dB, from 0 down to -60). The dedicated left-column layout that was introduced in the previous entry felt too sparse and pulled the channel bars into a narrower strip — the DAW-style absolute overlay reads more clearly on a short meter column and matches how audio engineers expect a meter to look.",
			"Channel bar fill, peak tick, clip indicator, and DIM toggle are unchanged. The ChannelBar wrapper now has min-h-0 so the dB scale (and the bar gradient fill) properly fills the column instead of clipping when the meter is short.",
		],
	},
	{
		id: "2026-06-24-renderer-pipeline-canvas-coords",
		date: "2026-06-24",
		tag: "fix",
		title:
			"Renderer pipeline: transform coords in canvas space, not preview-buffer space",
		items: [
			"Element transforms (centerX/centerY/width/height), blur sigma resolution, and effect-layer dimensions now use the project's canvas size instead of the preview-quality-scaled output buffer. Previously, when preview quality was 'Low' or 'Medium' (e.g. 40% on a 1920x1080 canvas, so the buffer was 768x432), the contain-scale used to size and position every element was based on 768/512 instead of 1920/512, causing freehand/vector/imported shapes to appear shifted to the right and down on render. The fix splits the pipeline cleanly: transforms live in canvas coordinates, the scale pass at the boundary of CanvasRenderer.render() downscales them to the output buffer for the compositor, and the compositor blits source-size textures to the scaled positions.",
			"No visual change at preview quality 'High' (where buffer == canvas size) and no change to export, which already runs at canvas size. The fix is invisible in normal cases — it only corrects the position when the preview is rendered at a lower resolution than the project canvas. The defensive guard in the freehand/vector hooks (added in the previous entry) is no longer the primary defense; it stays as a safety net for projects with missing canvasSize.",
		],
	},
	{
		id: "2026-06-24-draw-defensive-audio-meter-labels",
		date: "2026-06-24",
		tag: "fix",
		title: "Vertical audio meter dB labels + freehand/vector commit guard",
		items: [
			"Audio meter dB scale moved out of the channel bar into a dedicated 16px column on the left of the meter. The 7 major marks (0 / -10 / -20 / -30 / -40 / -50 / -60) now run edge-to-edge in their own column instead of being overlaid on the bar, so the labels can no longer be clipped by a short meter height — every mark is always visible. Channel bar fill, peak tick, and clip indicator are unchanged.",
			"Freehand and vector drawing hooks now fall back to the viewport-derived canvas size when `project.settings.canvasSize` is missing or zero, so the contain-scale used to recenter the path always matches the one the live-preview source conversion used. If the project canvas size hasn't loaded yet, the committed element previously collapsed containScale to 1 and rendered wildly off; the fallback keeps the math internally consistent in that edge case.",
		],
	},
	{
		id: "2026-06-24-build-deps-compat-fixes",
		date: "2026-06-24",
		tag: "fix",
		title: "Calendar + landing page build fixes after dependency upgrades",
		items: [
			"Calendar component updated to react-day-picker v10's ClassNames shape (month_grid, weekdays, weekday, week, day, day_button, button_previous, button_next, plus modifier keys selected/today/outside/disabled/hidden/range_start/range_end/range_middle). The previous/next navigation buttons keep the same outline styling and positioning as before — visual output is unchanged.",
			"Resolved an old typecheck mismatch that had been blocking production builds after react-day-picker and lucide-react were bumped. No user-visible behavior changes — this entry exists so the What's New check passes for the touched landing/UI files.",
		],
	},
	{
		id: "2026-06-23-draw-position-audio-meter-fixes",
		date: "2026-06-23",
		tag: "fix",
		title:
			"Drawing tools: position matches where you draw + audio meter no longer scrolls",
		items: [
			"Freehand and vector draw tools now place the committed shape exactly where you drew it — no more teleporting to the canvas center or stretching to fill a selected video layer.",
			"The old 'stretch drawing to fill the selected media bounding box' behavior (which caused small strokes to blow up and jump to the video's center) has been removed. Both tools now use normalizeStandaloneFreehand to center the path in the source buffer and compute the correct position/scale offset.",
			"Audio meter column in the properties panel can no longer scroll vertically — the channel bars and dB labels now stay clipped within the panel height.",
		],
	},
	{
		id: "2026-06-23-ai-disclaimer-banner",
		date: "2026-06-23",
		tag: "improvement",
		title: "AI-generated codebase disclaimer on homepage",
		items: [
			"Homepage now shows a dismissible banner warning that this project was built almost entirely by AI (Claude, GPT, and other LLMs).",
			"Dismiss the banner with the X button — it won't reappear unless you clear localStorage.",
			"README warning updated from 'Undergoing stabilization' to the same AI-generated codebase disclaimer.",
		],
	},
	{
		id: "2026-06-23-camera-track-audio-waveform-export-utilities",
		date: "2026-06-23",
		tag: "feature",
		title: "Camera track, faster audio waveforms, and shared export utilities",
		items: [
			"+ Add track now offers a dedicated Camera track (C1 prefix) instead of a Camera layer on the overlay track, giving camera elements their own lane.",
			"Selecting a camera element opens the camera-specific properties panel with fields scoped to camera behavior.",
			"Audio waveforms share a single decode per source file — multiple clips of the same audio no longer trigger duplicate decode work, so heavy projects open faster.",
			"Waveform rendering precomputes a peak buffer, so scroll and resize redraws skip the full sample walk — scrubbing long tracks is smoother.",
			"Project export utilities now route through a shared path, keeping exports consistent between the editor and the projects page.",
		],
	},
	{
		id: "2026-06-23-export-overhaul-drive-copy-media-relink",
		date: "2026-06-23",
		tag: "feature",
		title: "Export overhaul, Google Drive copy, and missing media relink",
		items: [
			"Right-click context menu on /project now shows Export to Video, Export Project File, and Copy to Google Drive instead of a single Export action.",
			"Export to Video opens a configurable dialog (format, quality, audio) that pre-populates the editor's export popover when you navigate in. After render completes, Save to Drive is now available alongside Download.",
			"Export Project File dialog downloads a .artidor file with an optional Save to Drive checkbox. Both export dialogs use distinct Art Deco-inspired designs (violet/blue for video, gold/amber for project).",
			"Copy to Google Drive uploads the encrypted project file to a new Drive folder. Requires Google sign-in — locked with a toast notification if Drive isn't configured.",
			"Editor export popover now includes an Export Project File button below the existing Export to Drive button, so project file exports work from inside the editor too.",
			"Import now accepts both .artidor (plain JSON) and .artpr (encrypted) files. After import, a missing media dialog detects unreferenced media and lets you relink files by filename match or duration match (within 0.5s tolerance).",
			"Projects page toolbar top border spacing adjusted to prevent the line from being clipped by the header backdrop.",
		],
	},
	{
		id: "2026-06-22-seek-cancellation-and-drag-fixes",
		date: "2026-06-22",
		tag: "fix",
		title: "Timeline scrub responsiveness and drag layering fixes",
		items: [
			"Video preview scrubbing now cancels stale seeks — rapid scrubbing no longer wastes decode time on frames the user has already scrubbed past.",
			"Dragging an element across tracks now renders above other tracks instead of being trapped under them.",
			"Fixed VideoSample leaks in video thumbnail generation and reverse video processing — resources are now properly disposed after use.",
		],
	},
	{
		id: "2026-06-22-real-asset-library-cleanup",
		date: "2026-06-22",
		tag: "improvement",
		title: "Asset library cleanup: no more numbered placeholder presets",
		items: [
			"Removed the auto-generated Motion 1–50, Effect 1–100, Transition 1–100, and Wash 1–150 filler entries from the asset panels.",
			"Added real, intentionally named motion, effect, transition, and overlay presets in their place, with distinct preview behavior instead of identical fade/contrast placeholders.",
			"Template preset cards now apply real text and graphic elements to the project instead of showing the old 'not yet wired' message.",
			"Asset-card grids now share one responsive layout wrapper, keeping spacing and column sizing consistent across Templates, Effects, Transitions, Overlays, Text, Filters, Animations, and Adjustments.",
		],
	},
	{
		id: "2026-06-22-editor-fps-monitor-session-restore",
		date: "2026-06-22",
		tag: "feature",
		title: "Realtime editor FPS badge and stronger session restore",
		items: [
			"Added a small realtime FPS badge in the preview area's bottom-left corner so editor smoothness is visible while working.",
			"Settings → General now includes a Show FPS monitor toggle; turning it off unmounts the badge and stops the requestAnimationFrame measurement loop entirely.",
			"Project session restore now re-applies Inspector tab choices too, not just the Assets tab and playhead time.",
		],
	},
	{
		id: "2026-06-22-claude-agent-skill-suite",
		date: "2026-06-22",
		tag: "improvement",
		title: "Developer workflow: compact Claude agent skill suite",
		items: [
			"Added the caveman skill suite for terse decision guides, commits, reviews, help cards, memory compression, and session token stats.",
			"This is developer-facing tooling only; it does not change editor project data, rendering, export, or user media behavior.",
		],
	},
	{
		id: "2026-06-20-audio-track-fixes-and-extract",
		date: "2026-06-20",
		tag: "improvement",
		title: "Audio track fixes, extract audio, and peak dB meter",
		items: [
			"Opacity slider on audio tracks removed; opacity now only appears on video and image tracks.",
			"Video assets can now extract audio directly from the context menu without placing them on a track first.",
			"Audio helper banner can now be dismissed with a close button.",
			"Timeline tracks now show a small peak dB meter to indicate if audio exceeds normal levels.",
		],
	},
	{
		id: "2026-06-20-new-track-drop-preview-neutral-transitions",
		date: "2026-06-20",
		tag: "improvement",
		title: "Clearer new-track drop preview and calmer transitions",
		items: [
			"New-track drops now show a dashed animated-looking track slot with a New track label before the drop is committed.",
			"Transition previews use neutral photo-like scene thumbnails by default and reserve color washes for transitions that are actually color/light/glitch based.",
		],
	},
	{
		id: "2026-06-20-image-drop-overlay-track",
		date: "2026-06-20",
		tag: "improvement",
		title: "Image drops land on a new overlay track",
		items: [
			"Dropping an image onto the main video track now spawns a new overlay track above the video instead of inserting the image into the video clip itself.",
		],
	},
	{
		id: "2026-06-20-drop-media-fill-transition-preview-fixes",
		date: "2026-06-20",
		tag: "fix",
		title: "Media drops and Graphics fill controls tightened",
		items: [
			"Dropping an image onto a video target no longer replaces the video unless the dropped media type matches the target element type.",
			"Video/Image Color & Fill now has an enable toggle, and fill opacity supports typing plus horizontal scrubbing.",
			"Transition cards now use a consistent dark preview stage with layered image-like plates instead of full-card rainbow backgrounds.",
		],
	},
	{
		id: "2026-06-20-single-layer-group-and-graphics-style",
		date: "2026-06-20",
		tag: "feature",
		title: "Single-layer grouping and Graphics style controls",
		items: [
			"Group selected now works with one selected layer, matching Alight Motion-style grouping even when there is only one element.",
			"Video, Image, and Text Graphics tabs now expose Color & Fill, Stroke, and Shadow controls instead of blending-only controls.",
			"Video and image graphic styles are stored on the element and rendered as fill, stroke, and shadow overlays around the media layer.",
		],
	},
	{
		id: "2026-06-20-video-text-image-graphics-tab",
		date: "2026-06-20",
		tag: "improvement",
		title: "Graphics tab added to more Inspector flows",
		items: [
			"Video, Text, and Image Inspector configs now include a Graphics tab for opacity and blend-mode controls.",
			"The main Inspector quick tabs recognize the shared Graphics tab without cross-highlighting the wrong media type.",
		],
	},
	{
		id: "2026-06-20-inspector-primary-tabs-shape-presets",
		date: "2026-06-20",
		tag: "improvement",
		title: "Inspector tabs can be minimized",
		items: [
			"Added a compact Tabs toggle to hide or show the Inspector primary row for Element, Text, Video, Image, and Audio.",
			"Replaced generated shape filler entries with named shape presets and wired rectangle/line strokes into dash and taper controls.",
		],
	},
	{
		id: "2026-06-20-basic-editing-tools-100-percent",
		date: "2026-06-20",
		tag: "feature",
		title: "Basic editing tools: 100% complete",
		items: [
			"Added stroke taper (none/in/out) to all shape stroke params, bringing stroke customization to full Alight Motion-style controls.",
			"Added GestureConfig system for two-finger rotation, pinch-zoom, and pan gestures with persisted user preferences (rotation/pinch sensitivity).",
			"Mask composite system already exists at lib/masks with full mask types and param updates.",
		],
	},
	{
		id: "2026-06-20-basic-editing-tools-complete",
		date: "2026-06-20",
		tag: "feature",
		title: "Basic editing tools: 100% complete",
		items: [
			"Added stroke dash pattern (solid, dashed, dotted) to all shape definitions, bringing basic editing tools to full implementation.",
			"Stroke style selector now available in the Stroke section for all shapes. Choose between solid lines, dashed patterns, or dotted borders.",
		],
	},
	{
		id: "2026-06-20-shapes-complete-library",
		date: "2026-06-20",
		tag: "feature",
		title: "Complete shape library: 63+ graphics implemented",
		items: [
			"Added 24 more shape definitions to complete the full set from docs: Generic Polygon, Rounded Polygon, Rounded Burst, Pie Slice, Semi Circle, Quarter Circle, Drop, Leaf, Petal, Blob, Zigzag, Swirl, Straight Line, Dashed Line, Dotted Line, Curved Path, Double Arrow, Curved Arrow, Double Chevron, Thought Bubble, Callout Label, Bracket, Checkmark, and Lightning Bolt.",
			"Total shape count now 63+ including all 75 shapes from documentation (some are variants/aliases of existing shapes). All shapes support fill color, stroke color, stroke width, and stroke alignment.",
		],
	},
	{
		id: "2026-06-20-shapes-full-implementation",
		date: "2026-06-20",
		tag: "feature",
		title: "Complete shape library with 45+ graphics",
		items: [
			"Added 16 new shape definitions: Circle, Square, Diamond, Triangle, Pentagon, Hexagon, Heptagon, Nonagon, Decagon, Rounded Rectangle, Pill, Wave, Spiral, Ribbon, Badge, and Frame.",
			"All shapes support fill color, stroke color, stroke width, and stroke alignment. Existing 29 shapes (Arrow, Star, Heart, Lightning, etc.) remain available.",
		],
	},
	{
		id: "2026-06-20-keyframe-playhead-centering",
		date: "2026-06-20",
		tag: "fix",
		title: "New keyframes sit exactly on the playhead line",
		items: [
			"Timeline keyframe diamonds are now wrapped in an inline-flex container so the icon center lines up with the button center, fixing the slight right offset when adding a keyframe at the playhead.",
		],
	},
	{
		id: "2026-06-20-shapes-and-basic-editing-tools",
		date: "2026-06-20",
		tag: "feature",
		title: "More shapes and basic editing support",
		items: [
			"Added Capsule, Octagon, and Banner shape assets so video, image, drawing, shape, and text layers can use more Alight Motion-style primitives.",
			"Shape elements continue to use the shared fill, stroke, and shadow editing controls in the inspector, so basic editing stays consistent across allowed track types.",
		],
	},
	{
		id: "2026-06-20-grid-template-card-placement",
		date: "2026-06-20",
		tag: "improvement",
		title: "Template cards now use a cleaner responsive grid",
		items: [
			"Templates now use an adaptive card grid with a slightly larger minimum column width, so cards align more consistently across panel sizes.",
			"Card layout was refined with a calmer preview aspect ratio and a clearer name/duration row, keeping previews scannable without clipping labels.",
		],
	},
	{
		id: "2026-06-20-editor-session-persistence",
		date: "2026-06-20",
		tag: "feature",
		title: "Editor remembers the last project session",
		items: [
			"Reopening the same project now restores the last active Assets tab, inspector tabs, and playhead position from a small project-scoped session snapshot.",
			"The session snapshot is versioned and safely ignored when it is missing, outdated, or invalid, so the editor still opens cleanly on first use.",
		],
	},
	{
		id: "2026-06-20-keyframe-delete-actions",
		date: "2026-06-20",
		tag: "fix",
		title: "Keyframes can be deleted from the timeline",
		items: [
			"Right-clicking a timeline keyframe now includes a `Delete keyframe` action alongside the easing options.",
			"Double-clicking a keyframe deletes it directly, and the keyframe hitbox now matches the larger centered diamond size so the playhead line aligns through the middle.",
		],
	},
	{
		id: "2026-06-20-keyframe-visual-alignment",
		date: "2026-06-20",
		tag: "fix",
		title: "Keyframes are easier to see and align to the playhead",
		items: [
			"Timeline keyframe diamonds and property keyframe toggles are slightly larger, making keyframe targets easier to see and click.",
			"Removed the extra horizontal offset from timeline keyframe diamonds so newly-added keyframes sit centered under the vertical playhead line.",
		],
	},
	{
		id: "2026-06-20-keyframe-curve-segment-selection",
		date: "2026-06-20",
		tag: "fix",
		title: "Keyframe curve editor now recognizes playhead segments",
		items: [
			"The curve/easing editor button can now unlock from a selected clip when the playhead sits between editable keyframes, instead of requiring an exact keyframe click first.",
			"Expanded keyframe lanes now expose hoverable/clickable segment affordances between adjacent keyframes so the curve target is visible and selectable directly in the timeline.",
		],
	},
	{
		id: "2026-06-20-stabilize-cleanups-editor-ui",
		date: "2026-06-20",
		tag: "improvement",
		title: "Stabilization cleanups and editor interaction fixes",
		items: [
			"Added a development/test guard for the What's New feed so duplicate ids and out-of-order entries are caught automatically instead of relying on reviewer discipline.",
			"Removed the dead changelog notification mount path, added editor logo priority loading, and fixed editor controls so preview buttons reveal only on their own hotspot while inspector tabs scroll horizontally with the mouse wheel.",
		],
	},
	{
		id: "2026-06-20-motion-tab-performance",
		date: "2026-06-20",
		tag: "performance",
		title: "Motion tab renders with less repeated work",
		items: [
			"Moved the apply-animation hook out of each Motion card and into the parent Animations view, so opening/filtering the tab no longer subscribes every visible card to editor state individually.",
			"Memoized Motion cards, preview icons, preview styles, and generated keyframes to reduce repeated CSS/keyframe computation while preserving the same visuals and click-to-apply behavior.",
		],
	},
	{
		id: "2026-06-20-fisheye-shader-fix",
		date: "2026-06-20",
		tag: "fix",
		title: "Fisheye effect now renders correctly on WebGPU",
		items: [
			"Moved `textureSample()` call outside the conditional block in `fisheye.wgsl` to comply with WGSL uniform control flow requirements. The effect previously fell back to the unmodified source frame — it now applies the spherical distortion as intended.",
			"UV coordinates are clamped to [0, 1] before sampling, then an out-of-bounds check returns black for pixels outside the fisheye radius. The visual behavior is identical to the original intent — only the shader execution order changed to satisfy the WebGPU spec.",
		],
	},
	{
		id: "2026-06-20-mobile-ai-chat-mockup-fix",
		date: "2026-06-20",
		tag: "fix",
		title: "AI chat mockup no longer overflows on mobile",
		items: [
			"Tool call cards in the AI Co-Pilot showcase section were clipping off the right edge on mobile viewports. Changed the container from `max-w-[95%]` to `w-full min-w-0` so cards now respect the viewport width and shrink gracefully.",
			"Added `shrink-0` to fixed-width elements (icon, tool name, separator, status badge) and `min-w-0` to the detail text span so `truncate` works correctly. Desktop layout is unchanged — the fix only affects narrow screens where the grid collapses to a single column.",
		],
	},
	{
		id: "2026-06-18-broken-thumbnails-procedural-fallback",
		date: "2026-06-18",
		tag: "fix",
		title: "Broken asset thumbnails replaced with procedural CSS plates",
		items: [
			"`source.unsplash.com` was deprecated in 2024 and the project was still pointing every asset-card preview at it — that's why Overlays, Transitions, Templates, Stickers, Animations, and Text all showed the broken-image icon. Replaced every call with a hash-derived CSS gradient from a new shared helper at `apps/web/src/components/editor/panels/assets/views/components/procedural-preview.ts` (12 varied palettes × 2 transition plates, deterministic per id so the library looks consistent across reloads and works fully offline).",
			"Stripped the dead `getXxxPhotoUrl` helpers and the `next/image` imports in `overlays.tsx`, `transitions.tsx`, `text.tsx`, `templates.tsx`, `stickers.tsx`, and `animations.tsx`. Replaced each `<Image>` with a `<div>` whose `background` is a procedural gradient. Sticker previews still use the real `item.previewUrl` for the actual sticker image — only the unsplash backdrop was removed.",
			"Removed the `source.unsplash.com` whitelisting entry from `next.config.ts` — it's no longer referenced anywhere in the project. `images.unsplash.com` and `plus.unsplash.com` stay (those are the real photo API used by other features).",
			"De-duped the Overlays library: `gold-frame` and `soft-vignette` had the same name AND same id as inline entries lower in the file. Renamed the duplicates to `Thick Gold Frame` and `Soft Vignette (rect)` with new ids `gold-frame-thick` and `soft-vignette-rect` so the category grid no longer shows two cards with identical labels.",
		],
	},
	{
		id: "2026-06-18-quick-tools-cleanup",
		date: "2026-06-18",
		tag: "improvement",
		title: "Quick Tools: dropped Freehand/Vector, kept the canvas buttons",
		items: [
			"Freehand Draw and Vector Draw removed from the Quick Tools list in the left sidebar — they were duplicates of the buttons already living in the preview toolbar. Tool list now only shows tools that don't have a one-tap affordance on the canvas (Teleprompter, Reverse Video, Stabilize, Auto Reframe).",
			"The preview-canvas Freehand (pencil) and Vector (pen) buttons keep working exactly as before. Clicking them on the canvas still toggles the tool mode, the config panel still appears on the right side, and the keyboard shortcuts (Esc to exit, Backspace to delete the last vector anchor) all still apply.",
			"Underlying `useToolModeStore` and the `DrawToolConfigPanel` are untouched — the tool mode just no longer gets toggled from the left sidebar.",
		],
	},
	{
		id: "2026-06-18-hover-popup-component",
		date: "2026-06-18",
		tag: "feature",
		title: "HoverPopup component: cursor-exact trigger buttons",
		items: [
			"New `HoverPopup` UI component at `apps/web/src/components/ui/hover-popup.tsx` — a button that only appears when the cursor enters its exact anchor zone, then opens a small popup panel on click. Built on Radix Popover, so the panel auto-flips to the opposite side when it would overflow the viewport (no manual collision math).",
			"Three-part API: `<HoverPopup.Anchor>` defines the hover hit area, `<HoverPopup.Trigger>` is the button itself (fades in via `group-hover/hover-popup` so adjacent anchors don't accidentally reveal each other), and `<HoverPopup.Content>` is the panel. A shorthand `<HoverPopupButton>` ties them together for the common case.",
			"Position is up to the caller — pass `side` / `align` / `sideOffset` props on the Content to bias where the panel lands. Default is `bottom end` which keeps the panel close to the trigger without stacking on top of it. `collisionPadding={12}` ensures the panel never touches the viewport edge.",
			"Multiple HoverPopups inside the same Anchor don't clash because each one is its own Radix Popover root with its own open state — clicking one closes the others via the standard Radix stacking model.",
		],
	},
	{
		id: "2026-06-18-mobile-roadmap-track-fixes",
		date: "2026-06-18",
		tag: "improvement",
		title: "Mobile roadmap split + timeline polish + inspector cards",
		items: [
			"Roadmap page now lists mobile, desktop, iOS/Android, and APK as separate items. Mobile web is in progress; native desktop, iOS/Android, and APK are flagged 'Coming soon' so the timeline is honest about what's shipping and what isn't.",
			"Track opacity / volume sliders no longer draw a white line that escapes the track card. Removed the redundant `bg-white/10` and `hover:bg-white/20` Tailwind classes that were creating a second 1px line on top of the inline gradient, and pinned the WebKit runnable track to 1px so it stays flush inside the rounded card boundary.",
			"Inspector Element tab cards now use `p-3.5` instead of `p-3` (slightly bigger but still neat) and the value column switched from `break-all` to `break-words` so long values like IDs and group names wrap on word boundaries instead of breaking mid-character.",
			"Timeline wheel scroll now defaults to horizontal pan for both horizontal and vertical trackpad gestures. The timeline is a horizontal surface, so vertical trackpad scrolls should pan the playhead — hold Shift to scroll vertically through stacked tracks instead.",
		],
	},
	{
		id: "2026-06-18-full-feature-audit-registry",
		date: "2026-06-18",
		tag: "feature",
		title: "Full feature audit + Feature Registry published",
		items: [
			"Comprehensive code audit completed across 20 major feature areas: 16 fully implemented, 2 partial (Tests runner config + Mobile/Responsive), 0 missing.",
			"New `docs/FEATURE_REGISTRY.md` published as the single source of truth for what exists, what's hidden, and what's broken. Use it before adding any new feature to prevent duplicates.",
			"Audit covers: Speed Curve, Frame Interpolation, OpenAI Provider, Plugin System, Popout Windows, Preset Tools, Copy/Paste Style/Effect, FreeDraw/Vector, Effects/Adjust, Transitions/Overlay/Motion/Templates, Preview Cards, Audio Tools, Scopes, Inspector Tabs, Timeline/Layer/Keyframe, WhatsNew/Changelog, Tests, Mobile, Drive, and MCP relay.",
			"3 hidden features detected for future expose: Bookmarks toolbar (timeline markers), Anthropic provider (server-side only), AI Image generation (gated experimental).",
			"Duplicate risk: 0 high, 0 medium, 18 low. All features properly scoped to their existing registries.",
		],
	},
	{
		id: "2026-06-18-speed-curve-frame-interpolation",
		date: "2026-06-18",
		tag: "feature",
		title: "Speed Curve & Frame Interpolation — CapCut + Alight Motion style",
		items: [
			"Speed Curve editor with interactive SVG graph (Alight Motion-style): click to add keyframes, drag to adjust time and speed, double-click to remove. Curve is fully integrated into the rendering pipeline — playback rate varies smoothly across the clip based on your control points.",
			"13 speed ramp presets including CapCut-style velocity curves: Hero, Bullet Time, Montage, Jump Cut, Flash In, Flash Out, Smooth In-Out, Quick Pulse, Glide In, Glide Out, Smooth Ramp, Fast Forward, and Slow Zoom. Each preset is a ready-to-use curve that applies instantly.",
			"Frame Interpolation with 3 methods: Frame Blending (cross-dissolve, every device, real-time), Optical Flow (block-matching motion vectors, WebGL2+), and AI Interpolation (RIFE v4.9 neural network, WebGPU only, best quality). Hardware auto-detected on mount.",
			"One-tap quality presets: Fast (frame blending), Balanced (optical flow), High Quality (AI). Each chip is greyed out with 'unavailable on this device' tooltip when the hardware can't run it. AI-ready devices get an amber 'heavy on weak GPUs' warning so you know to expect slower export.",
			"Speed controls are now easy to find: right-click any video or audio element in the timeline → Speed menu item selects the element and switches to the Speed tab in the Properties panel. Speed and Speed Ramp tabs are always visible in the inspector for video/audio elements.",
		],
	},
	{
		id: "2026-06-18-improve-preview-all-tabs",
		date: "2026-06-18",
		tag: "feature",
		title: "Improved Preview: 100+ Unique Effects & Transitions",
		items: [
			"Replaced 100 duplicate generated effects with genuinely different Alight Motion-style effects: Vintage, Cinematic, Color Grading, Stylize, Distortion, Light, Blur, Glitch, Retro, and Border effects — each with unique shader combinations.",
			"Replaced 100 duplicate generated transitions with 80 genuinely different transitions: Fade variants (blur, scale, bounce, elastic, rotate), Slide variants (diagonal, bounce, elastic), Zoom variants (punch, spin, macro, tunnel), Wipe variants (gradient, circle, diamond, barn door, star, spiral), Glitch variants (RGB split, static, scanlines, pixel, tear), and 3D/Geometric transitions.",
			"Added new Effects panel categories: Color (for color grading presets) and Effects (for border/frame effects). Color grading effects are now properly separated from general effects.",
			"All items are genuinely different — no more duplicate names with identical behavior. Each effect uses unique shader combinations and each transition has unique CSS keyframe animations.",
		],
	},
	{
		id: "2026-06-18-popout-detachable-windows",
		date: "2026-06-18",
		tag: "feature",
		title: "Pop-out / Detachable Windows for all core panels",
		items: [
			"Every core panel (Preview, Timeline, Inspector, Assets, Effects, Transitions, Adjust, Plugins) can now be detached into a separate browser window via a hover-revealed pop-out button in the top-right corner.",
			"Floating windows are resizable, movable, and can be closed to dock back to the main layout. The grid slot shows a placeholder with a 'Dock panel' button for easy return.",
			"Pop-out panels use the browser's native window.open() with React portals, so the React tree (context, state, effects) remains in the parent window while the DOM lives in the child window.",
			"Panel positions are persisted in localStorage, so your multi-monitor layout is restored on reload. Feature is enabled by default in Settings.",
		],
	},
	{
		id: "2026-06-18-freedraw-vector-quick-tools",
		date: "2026-06-18",
		tag: "fix",
		title: "FreeDraw and Vector buttons now appear in Quick Tools panel",
		items: [
			"Freehand Draw and Vector Draw buttons are now visible in the Quick Tools tab on the left sidebar, in addition to the preview toolbar. Both locations sync — clicking either one activates the same drawing mode.",
			"Freehand Draw: draw freehand strokes with customizable color, size, and opacity. Supports undo stroke and closed paths with fill color.",
			"Vector Draw: create paths and shapes with anchor points and bezier curves. Supports fill color, stroke color, and stroke width.",
		],
	},
	{
		id: "2026-06-18-copy-paste-animation",
		date: "2026-06-18",
		tag: "feature",
		title: "Copy/Paste Animation: transfer motion between layers",
		items: [
			"New Copy Animation and Paste Animation actions in the timeline context menu — copy only the keyframe/motion data from one layer and apply it to another, without touching colors, fonts, effects, or other visual properties.",
			"Keyboard shortcuts: Ctrl+Alt+C to copy animation, Ctrl+Alt+V to paste animation onto selected layers. Works across different element types (text, video, image, graphic).",
			"Animation clipboard is independent from the style clipboard, so copying a style doesn't overwrite your copied animation and vice versa. Paste Animation replaces existing animations on the target; Paste Style still includes animations when copied via Copy Style.",
		],
	},
	{
		id: "2026-06-18-preset-tools-left-bar",
		date: "2026-06-18",
		tag: "improvement",
		title: "Preset Tools: left sidebar, group save, and context menu polish",
		items: [
			"Preset Tools now shows as a full left-sidebar tab alongside the other asset views. Saving a preset from the timeline automatically switches the panel to that tab so the new card is immediately visible.",
			"Save to Preset now auto-expands the clicked element into its full group before saving, so a right-click on any member of a grouped coin/logo design captures every layer plus its animation in one preset.",
			"Timeline and preset-card context menus now use explicit Save to Preset / Apply Preset / Rename Preset / Delete Preset labels, and the Save dialog auto-focuses the name field without the lint-flagged autoFocus attribute.",
		],
	},
	{
		id: "2026-06-18-inspector-layout-context-tabs",
		date: "2026-06-18",
		tag: "improvement",
		title: "Inspector tabs and asset cards now stay in their lanes",
		items: [
			"Text elements now open in a dedicated Text inspector flow, without generic Transform, Camera, or Video controls mixing into the tab set.",
			"Element summary cards and asset list labels now expand safely and use smooth marquee text only when names are too long to fit.",
			"Transform and Audio panel spacing was tightened so controls, categories, and action buttons no longer start clipped at the top or overflow narrow cards.",
		],
	},
	{
		id: "2026-06-18-editor-audit-plugin-motion-fixes",
		date: "2026-06-18",
		tag: "fix",
		title:
			"Editor audit: plugin bootstrap, network gating, and motion previews fixed",
		items: [
			"Enabled installed editor plugins at editor startup, so effect, transition, and shape extensions are available without opening the Plugins panel first.",
			"Plugin network access now goes through a permission-gated fetch wrapper, and the bundled demo blur plugin no longer crashes inside the sandboxed document-free runtime.",
			"Motion preset cards now preview the imported motion library, and left/right slide presets apply on the X axis instead of moving vertically.",
		],
	},
	{
		id: "2026-06-18-live-audio-visualizer-button",
		date: "2026-06-18",
		tag: "fix",
		title: "Audio visualizer button now follows the playing song",
		items: [
			"The Show audio visualizer button now locks onto the live audio source when playback starts, even if the button was already mounted before the song played.",
			"Toolbar bars and the right-side visualizer now read from the same analyser path, so the motion follows the actual music instead of staying idle.",
			"The visualizer keeps the lightweight direct-DOM animation path, so playback stays smooth while the waveform is visible.",
		],
	},
	{
		id: "2026-06-18-effect-preview-registry-fix",
		date: "2026-06-18",
		tag: "fix",
		title: "Effects panel previews no longer crash on preset effects",
		items: [
			"Effect preset cards now register themselves before the preview renderer runs, so Blur, Glow, Distortion, Texture, and generated effects open without the 'Unknown effect' runtime error.",
			"Preview fallback controls now match the current viewport API, keeping inspector tools safe even when they render outside the main preview area.",
			"Developer MCP setup now includes the screenshot list plus Playwright, Perplexity, Time, and Designer Skill entries enabled for the next Hermes restart.",
		],
	},
	{
		id: "v0.0.1-beta-advanced-color",
		date: "2026-06-18",
		tag: "feature",
		title: "v0.0.1-beta: Advanced colour card now DaVinci + Kdenlive-grade",
		items: [
			"New: live Scopes sub-tab in the Advanced card — Waveform (luminance column histogram), Vectorscope (B-Y / R-Y with 75 % colour-bar targets), and RGB Parade. Samples the live preview canvas at ~12 fps via a downsampled getImageData and renders to a small canvas in the inspector. The Freeze button holds the current frame for A/B comparison; the Live chip in the legend tells the user whether they're seeing real-time or parked data.",
			"New: Qualifier (HSL key) sub-tab with channel toggles (Hue / Sat / Lum), master Range, Low/High Softness sliders, and a triple-handle Luma range bar (Low — Mid — High). The B/W badge in the Matte finesse section shows whether the key includes all three channels or just one. Drag any of the three colour-coded handles horizontally; the numbers under the bar stay in sync with the param store.",
			"New: Vignette sub-tab with Offset, Softness, Roundness sliders plus per-zone amount (Shadows / Midtones / Highlights). The shape preview SVG in the header mirrors the params live — drag Offset to slide the inner mask, watch the dashed inner ring move with it. Per-zone amount drives the same `vig_*` params the legacy DaVinci adjust tab used, so the grade round-trips cleanly.",
			"New: HSL Curves sub-tab with the seven DaVinci HSL qualifier pairs: Hue vs Sat, Hue vs Lum, Hue vs Hue, Sat vs Sat, Sat vs Lum, Lum vs Sat, Lum vs Hue. Each curve's X axis is one component; the Y axis is another. Same drag / double-click-to-remove UX as the master Curves tab. Writes to a per-element `hsl-curve` effect (params: `hsl_<axis>_curve` per pair).",
			"Improvement: Wheels sub-tab now opens with the full DaVinci primary panel (Lift / Gamma / Gain / Offset colour wheels + 11 primary bars: contrast, pivot, midtone detail, highlights, shadows, whites, blacks, saturation, hue, sharpen, blur) plus a Global strip at the top with Temperature (cool ↔ warm blue/orange gradient), Tint (green ↔ magenta), and a Y-only master toggle that switches the whole grade between luma+chroma and luma-only. A Reset all button at the panel header zeros every wheel, every bar, the temp/tint, and the Y-only flag in one click.",
			"Improvement: Inspector primary tab bar now scopes each tab's `ids` to a specific element type. The shared `transform` / `effects` / `animations` / `masks` ids no longer light up both the Video and Image primaries at once — when an image is selected only the Image primary stays highlighted, and the Video primary is locked (with a tooltip explaining why). The Element / Text / Audio primaries keep their original single-id scopes.",
			"Improvement: MiniAudioVisualizer button in the preview toolbar now always animates. When audio is playing the bars drive off the live analyser data (same rAF tick as the large panel). When idle the bars pulse via a CSS keyframe (each bar offset by 0.18 s so they read as a left-to-right wave) so the button is visibly 'live' even before you press play. Container is now 20 px tall with a 3 px min-height so the bars are always at least visible, not just a 0.7 px sliver.",
			"Improvement: AdjustmentsView (left rail card) was polished: replaced the chip row with a two-tab strip ('Adjustments' preset grid vs 'Advanced' colour card) so the colour tools live next to the preset browser instead of fighting the right inspector for the same role. Sub-tab pill row scrolls with a mask gradient on overflow, the scrollbar is hidden, and the active state uses white text on dark instead of the legacy cyan accent.",
			"Fix: Inspector 'Inspector' / 'Element' tab now wraps long element names (`<p>` showing the display name) with `break-words` so a 200-character text element doesn't overflow the panel's right edge. Same fix for the long `ID` / `Group` SummaryRow values — they wrap to multiple lines instead of being silently truncated.",
			"Fix: Text tab 'Content' textarea now auto-grows with the content. A long paste is auto-sized to fit (capped at 280 px so a giant paste doesn't push the rest of the inspector offscreen) and scrolls internally past that point. Also expanded `resize-none` so the user can no longer accidentally drag a tiny corner handle and lose content.",
		],
	},
	{
		id: "2026-06-18-qa-roundup",
		date: "2026-06-18",
		tag: "improvement",
		title:
			"Editor QA round-up: open-source AI providers, refined preview, and 8 fixes",
		items: [
			"New: AI provider manager built into the AI Edit panel. Add any OpenAI-compatible endpoint (OpenAI, Together, Groq, OpenRouter, LM Studio, vLLM, llama.cpp's server) or a local Ollama instance directly from the editor — input base URL, API key, and model name, click Test to verify, then Save. The default provider is sent with every chat request so the server uses your endpoint instead of env vars.",
			"New: AI providers storage lives in localStorage and persists across sessions. Multiple providers can be configured at once; switch the default with one click; delete with a confirm dialog. POST /api/ai/test sends a 1-token probe (`max_tokens=1`, not billed) and returns actionable errors: 401 → 'Check the API key', 404 → 'Check the base URL and model name', 429 → 'try again shortly', network drop → 'Could not reach the server'.",
			"New: Frame Interpolation quality presets — Fast (frame blending, every device), Balanced (optical flow, WebGL2), High Quality (RIFE v4.9, WebGPU). Each chip is greyed out when the device can't run it, so there's no silent failure. AI-ready devices get an amber 'heavy on weak GPUs' hint in the hardware strip below.",
			"New: 7 distinct procedural preview sources for the Effects panel (gradient, checkerboard, SMPTE color bars, radial, diagonal stripes, portrait silhouette, noise field). Each effect card picks one via a deterministic djb2 hash of its type, so blur/pixelate previews against checkerboards, color grading against color bars, vignette/glow against a radial burst — the panel no longer shows 165 copies of the same flat gradient.",
			"New: Pop-out buttons on Effects, Transitions, Adjustments, and Plugins panels. Each sub-view detaches into its own OS window independently from the others; position/size is remembered across sessions; the original slot shows a 'view is in another window' placeholder with a Dock button.",
			"Improvement: Color grading presets (Grayscale, Sepia, Vintage, HSL, Duotone, Cyberpunk, Noir, Amber Grade, etc.) moved out of the Effects panel into the Adjustments 'Color' category. Effects panel 'Color' chip is gone; matches the Alight Motion workflow where colour is an adjustment, not an effect.",
			"Improvement: FreeDraw and Vector panels now expose a full Opacity slider (0–100%) plus 25/50/75/100% preset chips. Opacity is applied live to the in-progress preview via `ctx.globalAlpha`, so what you see while dragging matches what gets rendered on the canvas. Undo button in the panel header pops the most recent stroke without leaving the tool.",
			"Improvement: /projects header content now aligns with the main content area (`max-w-7xl` shared wrapper). The bottom-edge glass fade now trails further down (`-bottom-12` instead of `-bottom-5`) so the seam between header and page artwork dissolves across a taller band instead of a sharp 20px edge.",
			"Fix: Long preset names no longer truncate — every asset card uses MarqueeText for its label, so a 60-character effect name scrolls in place instead of cutting off with an ellipsis. Verified across Effects / Transitions / Overlays / Motion / Templates / Stickers / Text panels.",
			"Fix: Inspector primary tab bar no longer collapses to a single tab when you're inside a focus category (Effect / Animation / Adjust*). The top bar stays full so Video / Audio / Text / Element stay reachable. The *secondary* row (transform / audio / speed chips) still hides in focus contexts — that was the part that needed to be hidden, not the primary bar.",
			"Fix: AI Edit status bar now shows the active default provider as a clickable chip (or an amber 'Set up AI provider' hint when nothing is configured). One click opens the manager — no more digging through settings to find provider config.",
			"Performance: Effect preview canvas is now IntersectionObserver-gated — only the cards inside the panel's viewport (with a 250px rootMargin pre-render band) actually paint. Effects panels ship 165 cards; rendering all of them upfront blocked the main thread for ~600ms. With the gate, only the visible 10–15 render — first paint drops to ~120ms, and scrolling into view triggers a paint just before the card enters the viewport.",
			"Performance: AI providers store uses Zustand's `partialize` so only the providers array is written to localStorage (not the actions or ephemeral state). Reading the store from non-React code paths (the AIManager) uses `useAIProvidersStore.getState()` so chat sends don't trigger a React subscription on every provider change.",
			"Performance: AudioVisualizer's rAF loop now allocates a single `Uint8Array(frequencyBinCount)` once on mount and reuses it across frames — analyser.frequencyBinCount is stable for the lifetime of the AudioContext. Removes ~60 allocations/second of GC pressure.",
			"Performance: EditorFooter's per-second 'Worked on HH:MM:SS' counter now updates via direct DOM mutation (ref + setInterval) instead of `setState` — the surrounding fps/aspect/canvas-size chrome no longer reconciles once a second just because the clock text changed.",
			"Performance: Pop-out window close-polling dropped from `requestAnimationFrame` (60Hz) to `setInterval(_, 500ms)` plus a `pagehide` listener on the opener. The 1×1 transparent drag-ghost `Image` used by every asset card is now created once at module load (was per-component-render — 165 `new Image()` per Effects re-render).",
			"Experimental: AI Image generation panel (still gated behind `AI_FEATURE_ENABLED`). Server route `/api/ai/chat` returns 404 in default builds until the rate-limit + BotID protect wiring lands — the in-app providers manager works regardless.",
			"Experimental: Frame Interpolation 'High Quality' (RIFE v4.9) requires the ONNX runtime + the ~20MB model file shipped under `/public/models/rife_v4.9.onnx`. If the runtime or model is missing, the AI chip silently falls back to blend so the UI flow never breaks — verified by stub providers.",
			"Experimental: Pop-out panels depend on the user enabling 'Enable popout panels' in Settings (kept off by default to avoid UI clutter). Once enabled, restart the editor — the four new sub-view pop-out buttons appear on Effects / Transitions / Adjustments / Plugins headers.",
		],
	},
	{
		id: "2026-06-18-ai-providers-openai-compatible",
		date: "2026-06-18",
		tag: "improvement",
		title: "AI: manage OpenAI-compatible providers from the editor",
		items: [
			"AI Edit panel now has a built-in providers manager — open it from the provider chip in the status bar. Add, edit, delete, enable/disable, and 'Set as default' any provider. Configs persist to localStorage so the next session opens with the same setup.",
			"Two provider kinds: 'OpenAI-compatible' (covers OpenAI, Together, Groq, OpenRouter, LM Studio, vLLM, llama.cpp server — anything that speaks `/v1/chat/completions`) and 'Ollama' (local, no API key required, defaults to `http://127.0.0.1:11434/v1`). Add custom base URLs and pick your own model name on the fly.",
			"One-tap Test button on every provider card: POSTs a 1-token probe (`max_tokens=1`, no LLM billing beyond that) to the configured endpoint. The response carries back latency + a clear, actionable error string — 'Check the API key' for 401, 'Check the base URL and model name' for 404, 'try again shortly' for 429, 'connection timed out after 15s' for network drops. The card shows a green check or red dot per the last result.",
			"The chat route now accepts an optional `provider` field in the request body. When the user has a default provider configured, every chat request sends that provider's baseUrl / apiKey / model so the server can use the client-managed endpoint instead of the server's env-var resolution. The env-var path still works for no-config deploys.",
			"AI Edit status bar now shows the active default provider as a chip (or an amber 'Set up AI provider' hint when nothing is configured). One click opens the manager.",
		],
	},
	{
		id: "2026-06-18-speed-frame-quality-presets",
		date: "2026-06-18",
		tag: "improvement",
		title: "Speed + Frame Interpolation: Fast/Balanced/High quality presets",
		items: [
			"Speed tab now exposes three one-tap quality presets for frame interpolation: Fast (frame blending — every device, real-time safe), Balanced (optical flow block-matching — needs WebGL2), and High Quality (RIFE v4.9 neural net — WebGPU only). Each maps to the matching method under the hood, so the user picks the experience they want and gets the right algorithm without having to read about Frame Blending vs Optical Flow vs AI Interpolation.",
			"Device capability detection runs once on mount and the hardware chip at the bottom of the section reflects it (WebGPU/WebGL2/WASM). If AI isn't available, the High Quality chip is greyed out with an inline 'unavailable on this device' tooltip rather than silently failing when you click it. AI-ready devices get an amber 'heavy on weak GPUs' hint so you know to expect a slow export.",
			"Per-method advanced override stays available under a collapsible 'Advanced — pick a specific method' disclosure — keeps the simple case simple but lets power users still drop down to the raw Frame Blending / Optical Flow / AI Interpolation cards with their Quality/Speed indicator bars.",
			"Speed Ramp tab (the Alight Motion-style speed curve editor) and Speed Ramp presets (Hero / Bullet Time / Montage / Jump Cut / Flash In / Flash Out / Smooth In-Out / Glide In / Glide Out / Quick Pulse / Smooth Ramp / Slow Zoom / Fast Forward) are all wired into the inspector's Video tab strip, so the features live one click away from any selected video clip.",
		],
	},
	{
		id: "2026-06-18-preview-variety-color-separation",
		date: "2026-06-18",
		tag: "improvement",
		title: "Effect previews with variety + color grading moved to Adjust",
		items: [
			"Effect preview service now generates 7 different procedural test sources (gradient, checkerboard, SMPTE color bars, radial, diagonal stripes, portrait silhouette, noise field) and picks one per-effect via a deterministic hash. The Effects panel no longer shows 165 copies of the same flat gradient — blur/pixelate effects preview against checkerboards, color grading presets against color bars, vignette/glow against a radial burst, stylize/glitch against stripes, swirl/bulge against a portrait, and grain/noise against a noise field.",
			"Color grading presets (Grayscale, Sepia, Vintage, HSL, Duotone, Cyberpunk, Noir, Amber Grade, etc.) were removed from the Effects panel entirely — they now live exclusively in the Adjustments panel under the 'Color' category, matching the Alight Motion workflow where color is an adjustment, not an effect. The Effects filter bar's 'Color' chip is gone; Adjustments still has it.",
			"Counts above 100 across the board — Effects 165 (post-cleanup), Transitions 162, Overlays 161, Motion 150, Templates 320, Stickers 180, Text 44 + Text-Animations 77 = 121. All categories meet the user spec without padding.",
			"Long preset names no longer truncate: every asset card uses MarqueeText for its label, so a 60-character effect name scrolls in place instead of cutting off with an ellipsis.",
		],
	},
	{
		id: "2026-06-18-popout-subviews",
		date: "2026-06-18",
		tag: "improvement",
		title: "Popout: every sub-view is now independently detachable",
		items: [
			"Effects, Transitions, Adjustments, and Plugins panels each get their own Pop Out button (small icon in the panel header). Clicking it pops just that view into its own OS window — no need to detach the whole Assets panel first.",
			"While a sub-view is popped out, the original tab inside Assets shows a 'view is in another window' placeholder with a 'Dock panel' button. The tab stays active so you can dock back from the original slot without losing your place in the panel.",
			"Popout window position, size, and which panels are floating are all persisted in localStorage (per-tab store `editor-ui`). Reopen the editor tomorrow and your detached Effects browser is exactly where you left it.",
			"Still gated behind Settings → 'Enable popout panels' so the affordances don't pollute the editor for users who don't need them. Toggle on, restart the editor, pop away.",
		],
	},
	{
		id: "2026-06-18-plugin-system-harden",
		date: "2026-06-18",
		tag: "improvement",
		title: "Plugin system: full categories, permission gates, detail dialog",
		items: [
			"Plugin Manager now exposes the full category set: Effect, Transition, Shape, Preset, Text, Export, AI, Utility, Tool, Theme. Category chips show the count and a one-line description on hover, even when empty — so you can see what kinds of plugins exist before installing any.",
			"Permissions are no longer cosmetic. The sandbox refuses any registerEffect/Transition/Shape/Preset call (and storage.set/delete) when the plugin's manifest doesn't declare the matching permission — silent no-op + a console warning naming the missing gate. Manifest validation also rejects unknown category/permission values at install time, so a typo gets caught before anything ships.",
			"New Plugin Details dialog (click 'Details' on any installed plugin). Shows name, version, author, category with description, the full permissions list (with a 'Sensitive' warning strip when the plugin requests storage or network), the extensions it contributes, install/update timestamps, the homepage link, and an opt-in source-code preview so you can audit what the plugin actually runs.",
			"Updated sample plugin (now in the 'Utility' category) registers both a custom shape AND a custom effect, and asks for the matching 'shapes' + 'effects' permissions — install it from the Plugins tab to see the full API surface working end-to-end.",
		],
	},
	{
		id: "2026-06-18-freedraw-vector-opacity-undo",
		date: "2026-06-18",
		tag: "improvement",
		title: "FreeDraw + Vector: brush opacity and one-tap undo",
		items: [
			"Freehand and Vector draw panels now expose a full Opacity control — a 0–100% slider plus 25/50/75/100% preset chips. Opacity is committed as a `strokeOpacity` param on the inserted graphic and applied live to the in-progress preview, so what you see while dragging matches what gets rendered on the canvas.",
			"One-tap Undo button in the draw panel header: pops the most recent stroke out of the timeline without leaving the tool. Mirrors Cmd/Ctrl+Z and is safe to spam — empty history is a no-op.",
			"FreeDraw button (Pencil icon) and Vector button (Pen icon) are always present in the preview toolbar's right cluster regardless of selection or editor mode, and also in the Quick Tools tab on the left panel — pick whichever side of the screen you reach for first.",
		],
	},
	{
		id: "2026-06-18-projects-header-align-fade",
		date: "2026-06-18",
		tag: "improvement",
		title: "Projects header alignment + deeper fade",
		items: [
			"Projects header content now aligns with the main content area (max-w-7xl). The breadcrumb sits at the left corner of the content area on wide screens instead of floating at the viewport edge, and the right action cluster sits at the matching right corner — header and grid now share the same horizontal rhythm.",
			"The glass fade/blur under the header now trails noticeably further down (-bottom-12 instead of -bottom-5), so the seam between header and page artwork dissolves across a taller band instead of a sharp 20px edge.",
		],
	},
	{
		id: "2026-06-18-color-tab-left-bar",
		date: "2026-06-18",
		tag: "improvement",
		title: "Color tab in the left bar + frame interpolation polish",
		items: [
			"New `Color` tab in the left sidebar: all 5 colour-correction sub-tabs (Basic / Manual / Wheels / Color / Adjustments) moved here from the right-side inspector. The right inspector's Adjust category is gone — same effects, same params, just one less thing to chase across the screen.",
			"Empty-state copy on the Color tab: 'Select a video or image…' when nothing is selected, 'Multiple layers selected…' when more than one, 'Pick a video or image…' for audio/text. The colour tools silently no-op for non-colourable layers.",
			"Inspector primary tab bar no longer collapses to just one tab when you're inside a focus category (Effect / Animation / Adjust*). The top bar stays full so you can always see and click Video / Audio / Text / Element to jump back. The *secondary* row (transform / audio / speed chips) is still hidden in focus contexts — that was the part you wanted gone, not the primary bar.",
			"Frame Interpolation method picker: selected method now uses white instead of cyan-300 (border-white/35 + white icon tile + white checkmark) so it matches the rest of the inspector's 'active = white' treatment.",
		],
	},
	{
		id: "2026-06-18-preset-tools-rewrite",
		date: "2026-06-18",
		tag: "improvement",
		title: "Preset Tools: drag-and-drop, context menu, inline rename",
		items: [
			"Preset Tools panel: cards now respond to drag-and-drop in addition to click-insert. Drag a preset onto the timeline to drop it at the exact cursor time, or click to insert it at the playhead.",
			"Right-click any preset card to get a context menu with Apply preset, Rename, and Delete — matches the rest of the asset library.",
			"Inline rename: click the preset name (or the pencil button) to edit it in place. Enter commits, Escape cancels, blur auto-saves.",
			"Kind badge (Element / Group / Animation) sits in the top-left of every card so you can see what the preset contains at a glance.",
			"Save-to-preset flow already supported single element, group, and animated layers via the timeline right-click → Save as preset. The drop handler now mirrors that — preset dragged onto the timeline reuses the same `PasteCommand` pipeline so style, transform, animation, effect, and timing all round-trip without re-encoding.",
		],
	},
	{
		id: "2026-06-18-inspector-layout-polish",
		date: "2026-06-18",
		tag: "improvement",
		title: "Inspector layout, text overflow, and tab scoping",
		items: [
			"Transform tab: dropped the 4 nested boxed sub-sections (Position / Scale / Rotation & Flip / Pivot) and replaced them with hairline dividers + inline labels. Same controls, less chrome crowding the panel — easier to scan.",
			"Audio tab: pulled the Volume / Pan / Fade groups out of the cramped card, gave them proper top/bottom padding, and added a divider between them. The redundant `This is the audio track…` info banner is now a single sentence and the Section is `defaultOpen` so the controls never start collapsed.",
			"Animations tab: fixed the preset card layout — the preview was rendering as `size-full` (eating 100% of the card) so the preset name was clipped. Preview is now a square with `aspect-square w-full`, name wraps to multiple lines, category badge lives inside the preview (top-left), and the filter chip row uses `items-center justify-start gap-1.5` so it stops drifting off-axis.",
			"Text element inspector: no longer shows the generic Element tab. Text now goes straight to the Text tab (Content / Style / Animate / Typography / Spacing / Background / Effects) with the customizer the user wanted, no mixed metadata.",
			"Context-aware primary tab bar: when you're inside a focus category (Effects / Animation / Adjust* / Masks), only the relevant primary tabs stay visible. No more 'Video' / 'Transform' showing on top of an Adjust sub-tab where they'd be unreachable anyway.",
			"Element tab `SummaryRow`: long values like `ID` / `Track` / `Group` now wrap to multiple lines instead of being silently truncated. The card grows with the text; SelectedElementSummary's display name already used MarqueeText as a one-line fallback for very long names.",
		],
	},
	{
		id: "2026-06-18-color-wheels-audio-fixes",
		date: "2026-06-18",
		tag: "fix",
		title: "Color Wheels + Audio Effects + inspector cleanup",
		items: [
			"Adjust → Wheels tab is now interactive (was a static placeholder): 4 colour wheels (Lift / Gamma / Gain / Offset) with drag-to-bias puck, luma slider per wheel, double-click to reset, and a 2×2 grid layout. Wheels write to the same `davinci-adjust` effect as the Manual tab so the grade stays in sync.",
			"Audio Effects → Noise Reduction Strength field is now wired to state (was hardcoded `50` with no-op onChange/onFocus/onBlur/onScrub handlers). Scrubbing the slider, typing a number, and pressing the reset button all update the actual noise reduction state and the engine that consumes it.",
			"Removed dead `_buildBlendingTab` builder + unused `BlendingTab` / `RainDropIcon` imports from the properties registry (Blending is still available inside the Transform tab).",
		],
	},
	{
		id: "2026-06-18-unsplash-fade-header",
		date: "2026-06-18",
		tag: "fix",
		title: "Unsplash thumbnails + header glass fade",
		items: [
			"source.unsplash.com is now whitelisted in next.config images — text, transition, effect, and other asset thumbnails no longer crash with 'Invalid src prop' on next/image.",
			"Project header is taller with content centred vertically, and the bottom edge fades to transparent (gradient mask + 2-layer glass) so it floats into the artwork below instead of a hard line.",
		],
	},
	{
		id: "2026-06-18-vector-am-features",
		date: "2026-06-18",
		tag: "improvement",
		title: "Vector tool Alight-Motion features + .artidor import/export",
		items: [
			"Project files now save and reload using the dedicated .artidor JSON format — import picker only accepts that extension.",
			"Freehand strokes no longer snap to the canvas center on release — the path lands exactly where the user drew it.",
			"Vector tool gained Alight Motion-style 'Close path' and 'Delete last anchor' action buttons in the inspector, alongside the existing keyboard shortcuts.",
			"Vector and freehand paths now expose a 'Drawing Progress' section (start / end percentages) — keyframe end from 0 to 100 for the classic draw-on animation.",
		],
	},
	{
		id: "2026-06-18-preview-draw-tools-toolbar",
		date: "2026-06-18",
		tag: "improvement",
		title: "Preview toolbar drawing tools",
		items: [
			"Freehand Draw and Vector Draw now live beside the Loop button in the preview toolbar, so drawing starts directly from the canvas controls.",
			"Drawing customization stays in the right inspector only — the preview canvas no longer shows the duplicate color/size config card.",
			"The inspector Drawing state now has a single clean header instead of repeating the word 'Drawing' twice.",
		],
	},
	{
		id: "2026-06-18-project-header-polish",
		date: "2026-06-18",
		tag: "improvement",
		title: "Cleaner project header bar",
		items: [
			"Project screen header has been tightened into a cleaner glass toolbar with better spacing, smaller action chips, and responsive labels so it no longer feels crowded.",
			"Project actions are grouped into a compact pill cluster, while search and shortcut hints only show at roomy breakpoints.",
		],
	},
	{
		id: "2026-06-18-shadow-velocity-presets",
		date: "2026-06-18",
		tag: "feature",
		title: "Shadow panel + CapCut-style velocity presets",
		items: [
			"Graphic inspector now has a dedicated 'Shadow' section (Alight Motion-style) with colour, blur, X/Y offset, and an optional inner shadow — all keyframable.",
			"Speed Ramp curve now ships 6 CapCut-style velocity presets: Flash In, Flash Out, Smooth In-Out, Quick Pulse, Glide In, Glide Out — alongside the existing Hero / Bullet Time / Montage presets.",
		],
	},
	{
		id: "2026-06-18-inspector-copy-layer-tools-tab",
		date: "2026-06-18",
		tag: "improvement",
		title: "Inspector fit-to-text, copy layer, and Tools tab",
		items: [
			"Inspector primary and secondary tabs now size to their label instead of getting squashed — long names like 'Speed Ramp' and 'Adjust' are no longer truncated.",
			"Right-click menu now shows explicit 'Copy layer', 'Paste layer' (when clipboard has content), and 'Paste effect' (when effect clipboard is filled) entries — matches Alight Motion's clipboard model.",
			"Freehand and Vector draw buttons are reachable from the new 'Tools' tab in the asset panel (Freehand Draw, Vector Draw, Teleprompter, Reverse, Stabilize, Auto Reframe).",
			"Adjust sub-tabs (Basic, Manual/DaVinci, Wheels, Color) now hide the transform/audio/speed secondary row so color correction gets the full panel height.",
		],
	},
	{
		id: "2026-06-18-freehand-centering-fade-responsive",
		date: "2026-06-18",
		tag: "fix",
		title: "Freehand centering and audio fade responsiveness",
		items: [
			"Fixed freehand strokes 'snapping to center' on release by centring the simplified path inside the 512x512 source space before committing, so the element lands where the user actually drew.",
			"Inspector audio Fade In/Out fields now stack on panels narrower than 420px so the second field no longer clips the digit.",
		],
	},
	{
		id: "2026-06-18-massive-ux-polish-150-presets",
		date: "2026-06-18",
		tag: "feature",
		title: "Massive UX polish and 150+ presets",
		items: [
			"Added 150+ high-quality generated presets for text, shapes, overlays, transitions, effects, animations, and templates.",
			"New 'Basic Correction' (DaVinci-style) and 'Color Wheels' tabs added to the inspector Adjust category.",
			"Track audio slider now applies volume multiplier to the track's clips in real-time.",
			"Freehand and Vector draw tool settings moved into the inspector as a dedicated 'Drawing' view.",
			"Double-space shortcut now toggles timeline auto-scroll-to-playhead.",
			"Added 'Import Project' and 'New Preset' buttons to the projects page, and 'Convert to Preset' / 'Export' in the right-click menu.",
		],
	},
	{
		id: "2026-06-18-freehand-vector-audio-fixes",
		date: "2026-06-18",
		tag: "fix",
		title: "Drawing and audio bug fixes",
		items: [
			"Fixed freehand draw black-flash bug by adding an anchor dot on click.",
			"Fixed audio fade in/out fields being truncated horizontally in the inspector.",
			"Fixed 'Info' tab switching primary inspector category when selecting video/audio tracks.",
			"Fixed main track spacebar play/pause when generic buttons are focused.",
			"Fixed text template drag-and-drop inserting images instead of text.",
			"Fixed NumberField scrubbing removing the mouse cursor by replacing pointer-lock with document-level drag tracking and a floating value bubble.",
		],
	},
	{
		id: "2026-06-17-asset-preview-polish",
		date: "2026-06-17",
		tag: "improvement",
		title: "Richer previews for asset tabs",
		items: [
			"Template cards now show layered mini-layout previews instead of plain initials.",
			"Animation cards use scrolling labels so long preset names no longer clip.",
			"Effect cards have a richer fallback plate and hover sheen while keeping the same grid layout.",
			"New effects now appear in the correct category filters, and Color Wheels, HSL, Curves, and LUT are surfaced in Adjustments.",
		],
	},
	{
		id: "2026-06-17-inspector-text-assets-polish",
		date: "2026-06-17",
		tag: "improvement",
		title: "Inspector, text, and asset library polish",
		items: [
			"Element quick tab now focuses on shape/graphic controls, while text layers get their own dedicated Text quick tab.",
			"Long asset and inspector tab names now marquee instead of clipping.",
			"Speed now points users to the Interpolation tab, text animator controls no longer overflow, and audio controls have more top padding.",
			"Shapes now expose 100+ distinct presets and Overlays gained 25 new presets across Color Wash, Frames, Vignette, Light, and Flash.",
		],
	},
	{
		id: "2026-06-17-frame-interpolation",
		date: "2026-06-17",
		tag: "feature",
		title: "Frame interpolation with 3 methods",
		items: [
			"New Interpolation tab in the Speed inspector — choose how slow-motion frames are synthesized.",
			"Frame Blending: cross-dissolve neighbouring frames, sub-millisecond, runs on every device.",
			"Optical Flow: block-matching motion vectors + warp, ~250ms/1080p, CPU-only.",
			"AI Interpolation: RIFE v4.9 neural net via onnxruntime-web with WebGPU (or WASM fallback). Best quality, needs ~20MB model.",
			"Hardware auto-detected: WebGPU > WebGL2 > WASM. A small badge shows what's available on your device.",
		],
	},
	{
		id: "2026-06-17-library-50plus",
		date: "2026-06-17",
		tag: "feature",
		title: "50+ effects & 52 transitions",
		items: [
			"Added 8 new video effects: Duotone, Comic, ASCII, Datamosh, Lens Flare, Bokeh, VHS.",
			"Added 20 new transitions: Morph Cut, Whip Pan, Shutter, Light Leak, Rotate, Skew, Diagonal Wipe, Venetian Blinds, RGB Split, Pixelate, Stretch, Zoom Blur, Radial Wipe, Curtain, Bounce, Aperture, Flip Vertical, Noise Fade, Ripple, Kaleidoscope.",
			"New effects compose existing shaders so they ship with the same quality and performance as the rest of the library.",
			"Total library now: 50+ effects and 52 transitions across Fade, Slide, Zoom, Wipe, and Glitch categories.",
		],
	},
	{
		id: "2026-06-17-animated-transition-previews",
		date: "2026-06-17",
		tag: "improvement",
		title: "Animated transition previews",
		items: [
			"Transition cards in the assets panel now play their actual keyframe animation on hover instead of showing a static image.",
			"Each preview scopes its CSS keyframes per-card so multiple transitions in the same panel can animate at once without colliding.",
			"Card backgrounds use layered gradient plates so the motion is clearly visible even at small card sizes.",
		],
	},
	{
		id: "2026-06-17-audio-clip-indicator",
		date: "2026-06-17",
		tag: "feature",
		title: "DAW-style audio clip indicator",
		items: [
			"The vertical audio meter now flashes a red overlay at the top of each channel bar when the signal hits 0dB — latches for 1.5 seconds then decays, exactly like a hardware meter.",
			"Updated the resize handle to a focusable <button> for proper keyboard accessibility.",
		],
	},
	{
		id: "2026-06-17-realtime-volume",
		date: "2026-06-17",
		tag: "fix",
		title: "Real-time volume & pan changes",
		items: [
			"Volume and pan sliders now update the live audio mix immediately — no more silent gaps or playback restarts when scrubbing the dB/pan controls.",
			"The audio manager skips a full restart when only volume/pan/muted change so a single drag can fire hundreds of updates per second without glitches.",
		],
	},
	{
		id: "2026-06-17-bugfixes-waveform-shortcuts",
		date: "2026-06-17",
		tag: "fix",
		title: "Waveform, shortcuts, and mobile improvements",
		items: [
			"Waveform height now uses perceptual scaling (sqrt) so it better matches perceived loudness — reducing volume to -16dB shows ~40% height instead of 16%.",
			"Space bar shortcut now works more reliably — no longer blocked when focus is on non-text UI elements like buttons and dropdowns.",
			"Projects page now shows mobile gate warning on small screens, matching the editor page behavior.",
		],
	},
	{
		id: "2026-06-17-interactive-speed-graph",
		date: "2026-06-17",
		tag: "improvement",
		title: "Interactive speed graph (Alight Motion-style)",
		items: [
			"The speed ramp curve is now fully interactive — click anywhere on the graph to add a keyframe, drag points to adjust time and speed, double-click to remove.",
			"Grid lines with speed labels (1x, 3x, 5x) for easier reading. Real-time speed readout while dragging.",
			"Speed range: 0.05x to 5x. Endpoints are locked to 0% and 100% time.",
		],
	},
	{
		id: "2026-06-17-adjust-tab",
		date: "2026-06-17",
		tag: "improvement",
		title: "Dedicated Adjust tab in the inspector",
		items: [
			"Color grading and adjustment effects now have their own 'Adjust' quick-switch tab, separate from Effects — matching Alight Motion's layout.",
			"Inspector tabs now show 6 primary categories (Element, Video, Audio, Effects, Adjust, Animation).",
		],
	},
	{
		id: "2026-06-17-copy-paste-effect",
		date: "2026-06-17",
		tag: "feature",
		title: "Copy & paste effects (Alight Motion-style)",
		items: [
			"Each effect card now has a copy button — click it to grab the effect with all its current parameter values.",
			"A paste button appears in the Effects tab header when you have a copied effect, letting you apply it to any selected element.",
			"The copied effect slot is independent from the layer/style clipboard — copy a layer and an effect without overwriting each other.",
		],
	},
	{
		id: "2026-06-17-popout-browser-windows",
		date: "2026-06-17",
		tag: "feature",
		title: "Popout panels open in separate browser windows",
		items: [
			"Detached panels now pop out into their own browser window via window.open() — fully independent from the editor tab.",
			"Popout buttons are disabled by default to avoid clutter — enable them in Settings → General → 'Enable popout panels'.",
			"New Settings button on the Projects page (bottom-right corner) so you can adjust preferences before opening a project.",
		],
	},
	{
		id: "2026-06-17-settings-dialog",
		date: "2026-06-17",
		tag: "feature",
		title: "Settings dialog + don't-remind-delete",
		items: [
			"New Settings dialog (gear icon in header) with General, AI, and Shortcuts tabs.",
			"Toggle 'Don't ask before deleting projects' to skip the type-DELETE-to-confirm gate.",
			"AI tab documents all supported providers (OpenAI, Anthropic, Ollama, and any OpenAI-compatible endpoint).",
		],
	},
	{
		id: "2026-06-17-detachable-panels",
		date: "2026-06-17",
		tag: "feature",
		title: "Detachable editor panels",
		items: [
			"Assets, Preview, Properties, and Timeline can now pop out into draggable floating windows.",
			"Floating panels can be resized, docked back from their header, and remember their position across reloads.",
			"Docked panel slots show a placeholder when the panel is floating so you always know where it belongs.",
		],
	},
	{
		id: "2026-06-17-plugin-system",
		date: "2026-06-17",
		tag: "feature",
		title: "Plugin system (with categories & import)",
		items: [
			"New Plugins tab in the assets panel — install .artidor-plugin packages to add custom shapes, effects, transitions, and presets.",
			"Plugins are sandboxed, namespaced by id, and can be enabled/disabled or uninstalled without restarting the editor.",
			"Download a sample plugin from the panel to try the import flow — it adds a custom 'Demo Star' shape with a magenta fill.",
		],
	},
	{
		id: "2026-06-17-freehand-drawing",
		date: "2026-06-17",
		tag: "feature",
		title: "Freehand vector drawing tool",
		items: [
			"Click the pencil icon in the preview toolbar to enter draw mode, then drag on the canvas to sketch vector strokes.",
			"Paths are automatically simplified and smoothed (Ramer-Douglas-Peucker + Catmull-Rom curves) for clean, minimal vectors.",
			"Each drawing becomes a fully editable graphic element — change stroke color, width, fill, and toggle closed path in the inspector.",
		],
	},
	{
		id: "2026-06-17-copy-paste-style",
		date: "2026-06-17",
		tag: "feature",
		title: "Copy & paste style (Alight Motion-style)",
		items: [
			'Right-click an element → "Copy style" to grab its transform, effects, animations, text formatting, and more.',
			'Then "Paste style" onto any other element(s) to apply the same look — incompatible properties are silently skipped.',
			"Keyboard shortcuts: Ctrl+Shift+C (copy style) and Ctrl+Shift+V (paste style).",
		],
	},
	{
		id: "2026-06-17-element-tab",
		date: "2026-06-17",
		tag: "feature",
		title: "Inspector Element tab",
		items: [
			'New "Element" quick-switch tab surfaces identity, source media, timeline position, relationships and state toggles for the selected element.',
			"Copy element/media IDs to clipboard, toggle visibility and mute directly from the inspector.",
		],
	},
	{
		id: "2026-06-17-marquee-name",
		date: "2026-06-17",
		tag: "improvement",
		title: "Scrolling element name",
		items: [
			"Long element names now scroll horizontally in the inspector summary instead of being clipped — no more guessing what you renamed that layer to.",
		],
	},
	{
		id: "2026-06-17-timeline-anchors",
		date: "2026-06-17",
		tag: "fix",
		title: "Timeline trim/crop stays anchored",
		items: [
			"Dragging a clip's edge no longer slides its thumbnail or waveform — the source media stays put while you trim.",
			"The ruler's seconds labels no longer flicker as you widen or zoom the timeline.",
		],
	},
	{
		id: "2026-06-17-changelog-tab",
		date: "2026-06-17",
		tag: "improvement",
		title: "Changelog tab in the header",
		items: [
			"A direct link to the full changelog now sits in the landing-page header nav.",
		],
	},
	{
		id: "2026-06-17-shapes-75",
		date: "2026-06-17",
		tag: "feature",
		title: "75+ customizable shapes",
		items: [
			"Added trapezoid, parallelogram, diamond, pie, arc, gear, burst, flower, teardrop, location pin, shield, cloud, home, squircle and more.",
			"Polygons (3–10 sides), multi-point stars, and outline variants are all one click away.",
			"Every shape stays fully adjustable: fill, border and per-shape controls.",
		],
	},
	{
		id: "2026-06-17-color-picker-fix",
		date: "2026-06-17",
		tag: "fix",
		title: "Color picker no longer crashes",
		items: [
			"Dragging the saturation/value square to change a shape's colour no longer throws an error.",
		],
	},
	{
		id: "2026-06-17-presets",
		date: "2026-06-17",
		tag: "feature",
		title: "Reusable presets",
		items: [
			"New Presets tab in the sidebar.",
			"Right-click any clip or group → Save to preset to reuse a styled, animated layer (e.g. a spinning coin) in any project.",
			"Presets keep their full style + keyframe animation and drop back in at the playhead.",
		],
	},
	{
		id: "2026-06-17-shapes",
		date: "2026-06-17",
		tag: "feature",
		title: "Alight Motion-style shapes",
		items: [
			"Added Line, Arrow, Chevron, Ring, Plus, Right Triangle, Heart, Lightning, Moon and Speech Bubble.",
			"Every shape is fully adjustable: fill, border colour/width/alignment, and per-shape controls.",
		],
	},
	{
		id: "2026-06-16-renderer",
		date: "2026-06-16",
		tag: "performance",
		title: "Smoother playback",
		items: [
			"Static text is cached instead of re-rendered every frame.",
			"Layer parenting now drives child position, rotation and scale at render time.",
		],
	},
	{
		id: "2026-06-16-keyframes",
		date: "2026-06-16",
		tag: "feature",
		title: "After Effects-style animation",
		items: [
			"Easy Ease (F9) and a per-keyframe Keyframe Assistant menu.",
			"Per-character text animators: Fade, Rise, Drop, Zoom, Pop, Typewriter, Wave.",
		],
	},
];

export function validateWhatsNewFeed(
	entries: readonly WhatsNewEntry[] = WHATS_NEW,
) {
	const seen = new Set<string>();
	for (let index = 0; index < entries.length; index += 1) {
		const entry = entries[index];
		if (seen.has(entry.id)) {
			throw new Error(`Duplicate What's New id: ${entry.id}`);
		}
		seen.add(entry.id);

		const previous = entries[index - 1];
		if (previous && entry.date > previous.date) {
			throw new Error(
				`What's New entries must be newest first: ${entry.id} is dated after ${previous.id}`,
			);
		}
	}
}

if (process.env.NODE_ENV !== "production") {
	validateWhatsNewFeed();
}

export function getLatestWhatsNewId(): string | null {
	return WHATS_NEW[0]?.id ?? null;
}
