"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Settings01Icon,
	Shield01Icon,
	KeyboardIcon,
	SparklesIcon,
} from "@hugeicons/core-free-icons";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useSettingsStore } from "@/stores/settings-store";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/utils/ui";
import { ShortcutsEditor } from "./shortcuts-editor";

type SettingsTab = "general" | "ai" | "shortcuts";

const TABS: { id: SettingsTab; label: string; icon: typeof Settings01Icon }[] =
	[
		{ id: "general", label: "General", icon: Settings01Icon },
		{ id: "ai", label: "AI", icon: SparklesIcon },
		{ id: "shortcuts", label: "Shortcuts", icon: KeyboardIcon },
	];

export function SettingsDialog({
	isOpen,
	onOpenChange,
}: {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [activeTab, setActiveTab] = useState<SettingsTab>("general");

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[85vh] max-w-3xl flex-col">
				<DialogHeader>
					<DialogTitle>Settings</DialogTitle>
				</DialogHeader>
				<DialogBody className="grid min-h-0 flex-1 grid-cols-[10rem_1fr] gap-4 overflow-hidden p-4">
					<nav className="flex flex-col gap-1">
						{TABS.map((tab) => (
							<button
								type="button"
								key={tab.id}
								className={cn(
									"flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-white/55 transition hover:bg-white/[0.06] hover:text-white",
									activeTab === tab.id &&
										"bg-white/[0.08] text-white shadow-inner",
								)}
								onClick={() => setActiveTab(tab.id)}
							>
								<HugeiconsIcon icon={tab.icon} className="size-4" />
								{tab.label}
							</button>
						))}
					</nav>
					<div className="min-h-0 overflow-y-auto rounded-lg border border-white/[0.06] bg-white/[0.015] p-4">
						{activeTab === "general" && <GeneralSettings />}
						{activeTab === "ai" && <AISettings />}
						{activeTab === "shortcuts" && <ShortcutsSettings />}
					</div>
				</DialogBody>
			</DialogContent>
		</Dialog>
	);
}

function GeneralSettings() {
	const skipDeleteConfirm = useSettingsStore((s) => s.skipDeleteConfirm);
	const setSkipDeleteConfirm = useSettingsStore((s) => s.setSkipDeleteConfirm);
	const defaultFps = useSettingsStore((s) => s.defaultFps);
	const setDefaultFps = useSettingsStore((s) => s.setDefaultFps);
	const enablePopoutPanels = useSettingsStore((s) => s.enablePopoutPanels);
	const setEnablePopoutPanels = useSettingsStore(
		(s) => s.setEnablePopoutPanels,
	);
	const showFpsMonitor = useSettingsStore((s) => s.showFpsMonitor);
	const setShowFpsMonitor = useSettingsStore((s) => s.setShowFpsMonitor);

	return (
		<div className="flex flex-col gap-5">
			<header>
				<h2 className="text-sm font-semibold text-white/85">General</h2>
				<p className="mt-0.5 text-[12px] text-white/50">
					Common editor preferences.
				</p>
			</header>

			<SettingRow
				title="Don't ask before deleting projects"
				description="Skip the 'type DELETE to confirm' step when removing a project from the home screen."
			>
				<Switch
					checked={skipDeleteConfirm}
					onCheckedChange={setSkipDeleteConfirm}
				/>
			</SettingRow>

			<SettingRow
				title="Enable popout panels"
				description="Show hover-revealed popout buttons on editor panels (assets, preview, properties, timeline) to pop them out into separate browser windows. Disabled by default."
			>
				<Switch
					checked={enablePopoutPanels}
					onCheckedChange={setEnablePopoutPanels}
				/>
			</SettingRow>

			<SettingRow
				title="Show FPS monitor"
				description="Display a realtime editor FPS badge in the bottom-left while editing. Measures UI smoothness, not video frame rate. Turning it off stops all measurement."
			>
				<Switch
					checked={showFpsMonitor}
					onCheckedChange={setShowFpsMonitor}
				/>
			</SettingRow>

			<SettingRow
				title="Default frame rate for new projects"
				description="New projects will be created with this frame rate. Existing projects keep their own settings."
			>
				<select
					className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-sm text-white/85"
					value={defaultFps}
					onChange={(e) => setDefaultFps(Number(e.target.value))}
				>
					{[24, 25, 30, 50, 60].map((fps) => (
						<option key={fps} value={fps} className="bg-[#0b0b0d]">
							{fps} fps
						</option>
					))}
				</select>
			</SettingRow>

			<SettingRow
				title="Privacy & data"
				description="Your projects are stored locally in your browser. We don't upload media to any server."
			>
				<div className="flex items-center gap-1.5 text-[12px] text-emerald-300">
					<HugeiconsIcon icon={Shield01Icon} className="size-3.5" />
					<span>100% on-device</span>
				</div>
			</SettingRow>
		</div>
	);
}

function AISettings() {
	return (
		<div className="flex flex-col gap-5">
			<header>
				<h2 className="text-sm font-semibold text-white/85">AI Co-Pilot</h2>
				<p className="mt-0.5 text-[12px] text-white/50">
					Configure the AI provider used by the assistant.
				</p>
			</header>

			<SettingRow
				title="Supported providers"
				description="OpenAI, Anthropic, and any OpenAI-compatible endpoint (Ollama, LM Studio, vLLM, Groq, Together, OpenRouter, etc.)."
			>
				<span className="text-[12px] text-emerald-300">Built-in</span>
			</SettingRow>

			<SettingRow
				title="OpenAI / OpenAI-compatible"
				description={
					<>
						Set these environment variables before starting the app:
						<br />
						<code className="text-[10.5px] text-white/70">OPENAI_API_KEY</code>,{" "}
						<br />
						<code className="text-[10.5px] text-white/70">OPENAI_BASE_URL</code>{" "}
						(optional, for self-hosted endpoints)
						<br />
						<code className="text-[10.5px] text-white/70">OPENAI_MODEL</code>{" "}
						(optional, default: gpt-4o-mini)
					</>
				}
			>
				<HugeiconsIcon icon={SparklesIcon} className="size-4 text-white/40" />
			</SettingRow>

			<SettingRow
				title="Ollama (local)"
				description={
					<>
						Set{" "}
						<code className="text-[10.5px] text-white/70">
							AI_PROVIDER=ollama
						</code>{" "}
						to use a local Ollama instance. Optionally set{" "}
						<code className="text-[10.5px] text-white/70">OLLAMA_BASE_URL</code>{" "}
						(default: http://127.0.0.1:11434) and{" "}
						<code className="text-[10.5px] text-white/70">OLLAMA_MODEL</code>.
					</>
				}
			>
				<HugeiconsIcon icon={SparklesIcon} className="size-4 text-white/40" />
			</SettingRow>

			<SettingRow
				title="Anthropic"
				description={
					<>
						Set{" "}
						<code className="text-[10.5px] text-white/70">
							ANTHROPIC_API_KEY
						</code>{" "}
						to use Claude models. The provider auto-activates when the key is
						present.
					</>
				}
			>
				<HugeiconsIcon icon={SparklesIcon} className="size-4 text-white/40" />
			</SettingRow>

			<div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3 text-[11.5px] leading-relaxed text-white/45">
				<p className="font-medium text-white/65">Force a specific provider</p>
				<p className="mt-1">
					Set{" "}
					<code className="text-[10.5px] text-white/70">
						AI_PROVIDER=openai
					</code>
					, <code className="text-[10.5px] text-white/70">anthropic</code>, or{" "}
					<code className="text-[10.5px] text-white/70">ollama</code> to bypass
					auto-detection.
				</p>
			</div>
		</div>
	);
}

function ShortcutsSettings() {
	return (
		<div className="flex h-full min-h-0 flex-col gap-4">
			<header>
				<h2 className="text-sm font-semibold text-white/85">
					Keyboard shortcuts
				</h2>
				<p className="mt-0.5 text-[12px] text-white/50">
					Click <span className="text-white/70">Edit</span> on any action and
					press a new key combo to rebind it. Press <Kbd>Ctrl</Kbd>+<Kbd>K</Kbd>{" "}
					to open the command palette and search every action.
				</p>
			</header>
			<div className="min-h-0 flex-1">
				<ShortcutsEditor />
			</div>
		</div>
	);
}

function SettingRow({
	title,
	description,
	children,
}: {
	title: string;
	description?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-start justify-between gap-3 rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
			<div className="min-w-0">
				<Label className="text-[13px] font-medium text-white/85">{title}</Label>
				{description && (
					<p className="mt-0.5 text-[11.5px] leading-snug text-white/50">
						{description}
					</p>
				)}
			</div>
			<div className="shrink-0">{children}</div>
		</div>
	);
}

function Kbd({ children }: { children: React.ReactNode }) {
	return (
		<kbd className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10.5px] font-mono text-white/70">
			{children}
		</kbd>
	);
}
