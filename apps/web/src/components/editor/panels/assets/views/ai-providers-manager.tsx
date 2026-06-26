"use client";

import { useState, useCallback, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Add01Icon,
	AlertCircleIcon,
	ArrowDown03Icon,
	ArrowRight01Icon,
	CheckmarkCircle02Icon,
	CloudIcon,
	Delete02Icon,
	Edit01Icon,
	HexagonIcon,
	Key01Icon,
	LinkSquareIcon,
	Loading02Icon,
	PlugIcon,
	Settings02Icon,
	SparklesIcon,
	Time01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	useAIProvidersStore,
	type AIProvider,
	type ProviderKind,
} from "@/stores/ai-providers-store";
import { fetchPuterModels } from "@/lib/ai/puter-client";
import { cn } from "@/utils/ui";

interface AIProvidersManagerProps {
	/**
	 * Render as a self-contained panel (true) or as an inline list that
	 * the caller wraps in their own chrome (false). The AI Edit panel
	 * uses inline mode with its own toggle.
	 */
	variant?: "panel" | "inline";
}

const KIND_LABELS: Record<ProviderKind, { label: string; hint: string }> = {
	"openai-compatible": {
		label: "OpenAI-compatible",
		hint: "OpenAI, Together, Groq, OpenRouter, LM Studio, vLLM, llama.cpp server, etc.",
	},
	"anthropic-compatible": {
		label: "Anthropic (Claude)",
		hint: "Anthropic Messages API — Claude models. Uses a different schema than OpenAI.",
	},
	ollama: {
		label: "Ollama (local)",
		hint: "Local Ollama HTTP server. Same /v1/chat/completions schema, no API key.",
	},
	puter: {
		label: "Puter.js (free, browser-based)",
		hint: "Uses Puter.js — runs in the browser via your Puter account. No API key needed. WARNING: Puter may use your data for training.",
	},
};

const KIND_ICONS: Record<ProviderKind, typeof PlugIcon> = {
	"openai-compatible": SparklesIcon,
	"anthropic-compatible": HexagonIcon,
	ollama: PlugIcon,
	puter: CloudIcon,
};

interface TestResult {
	ok: boolean;
	error?: string;
	latencyMs?: number;
}

/**
 * Parse the response from /api/ai/test safely. The route always returns
 * JSON, but proxies, middleware, or transient failures can produce an
 * empty or HTML body. If JSON parsing fails, we read the body as text and
 * surface a human-readable message instead of the raw "Unexpected end of
 * JSON input" exception.
 */
async function parseTestResponse(response: Response): Promise<TestResult> {
	const contentType = response.headers.get("content-type") ?? "";
	const isJson = contentType.includes("application/json");
	if (!response.ok || !isJson) {
		let text = "";
		try {
			text = (await response.text()).slice(0, 300);
		} catch {
			// ignore — we'll fall back to status
		}
		return {
			ok: false,
			error: text
				? `Server returned HTTP ${response.status}: ${text}`
				: `Server returned HTTP ${response.status}. Please try again.`,
		};
	}
	try {
		return (await response.json()) as TestResult;
	} catch (err) {
		return {
			ok: false,
			error: `Could not read server response: ${err instanceof Error ? err.message : String(err)}`,
		};
	}
}

export function AIProvidersManager({
	variant = "panel",
}: AIProvidersManagerProps) {
	const providers = useAIProvidersStore((s) => s.providers);
	const addProvider = useAIProvidersStore((s) => s.addProvider);
	const updateProvider = useAIProvidersStore((s) => s.updateProvider);
	const deleteProvider = useAIProvidersStore((s) => s.deleteProvider);
	const setDefault = useAIProvidersStore((s) => s.setDefault);
	const markTestResult = useAIProvidersStore((s) => s.markTestResult);

	const [editing, setEditing] = useState<{
		provider: AIProvider | null;
		open: boolean;
	}>({ provider: null, open: false });
	const [confirmDelete, setConfirmDelete] = useState<AIProvider | null>(null);
	const [testingId, setTestingId] = useState<string | null>(null);

	const handleAdd = useCallback(() => {
		setEditing({ provider: null, open: true });
	}, []);

	const handleEdit = useCallback((provider: AIProvider) => {
		setEditing({ provider, open: true });
	}, []);

	const handleSaved = useCallback((provider: AIProvider) => {
		setEditing({ provider: null, open: false });
		void provider;
	}, []);

	const handleTest = useCallback(
		async (provider: AIProvider) => {
			setTestingId(provider.id);
			try {
				const response = await fetch("/api/ai/test", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						baseUrl: provider.baseUrl,
						apiKey: provider.apiKey,
						model: provider.model,
						kind: provider.kind,
					}),
				});
				const result = await parseTestResponse(response);
				markTestResult(provider.id, result.ok);
				if (!result.ok) {
					// Surface the failure to the user too — markTestResult
					// only updates the dot, this updates the inline notice
					// via the provider card re-render.
					console.warn(
						"[AI Provider] test failed for provider:",
						provider.name,
						result.error,
					);
				}
			} catch (err) {
				markTestResult(provider.id, false);
				console.warn("[AI Provider] test errored for provider:", provider.name, err);
			} finally {
				setTestingId(null);
			}
		},
		[markTestResult],
	);

	const containerClass =
		variant === "panel"
			? "flex h-full flex-col gap-2"
			: "flex flex-col gap-2";

	return (
		<div className={containerClass}>
			{providers.length === 0 ? (
				<EmptyState onAdd={handleAdd} />
			) : (
				<>
					<div className="scrollbar-hidden flex-1 space-y-2 overflow-y-auto">
						{providers.map((provider) => (
							<ProviderCard
								key={provider.id}
								provider={provider}
								testing={testingId === provider.id}
								onEdit={() => handleEdit(provider)}
								onDelete={() => setConfirmDelete(provider)}
								onTest={() => void handleTest(provider)}
								onSetDefault={() => setDefault(provider.id)}
								onToggleEnabled={() =>
									updateProvider(provider.id, {
										enabled: !provider.enabled,
									})
								}
							/>
						))}
					</div>
					<button
						type="button"
						onClick={handleAdd}
						className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/[0.1] bg-white/[0.02] text-[11.5px] font-medium text-white/60 transition-all hover:border-white/20 hover:bg-white/[0.04] hover:text-white/85"
					>
						<HugeiconsIcon icon={Add01Icon} className="size-3.5" />
						Add Provider
					</button>
				</>
			)}

			<ProviderFormDialog
				key={editing.provider?.id ?? "new"}
				open={editing.open}
				provider={editing.provider}
				onOpenChange={(open) => setEditing((prev) => ({ ...prev, open }))}
				onSaved={handleSaved}
				addProvider={addProvider}
				updateProvider={updateProvider}
			/>

			<ConfirmDeleteDialog
				provider={confirmDelete}
				onOpenChange={(open) => {
					if (!open) setConfirmDelete(null);
				}}
				onConfirm={() => {
					if (confirmDelete) deleteProvider(confirmDelete.id);
					setConfirmDelete(null);
				}}
			/>
		</div>
	);
}

/* -------------------------------------------------------------------------- */

function EmptyState({ onAdd }: { onAdd: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.015] p-8 text-center">
			<div className="grid size-12 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
				<HugeiconsIcon icon={PlugIcon} className="size-5 text-white/40" />
			</div>
			<div className="space-y-1.5">
				<p className="text-[13px] font-medium text-white/80">No AI providers yet</p>
				<p className="max-w-[300px] text-[11px] leading-relaxed text-white/40">
					Add a provider to use AI features. OpenAI, Together, Groq, OpenRouter,
					LM Studio, Ollama, and any other OpenAI-compatible endpoint work.
				</p>
			</div>
			<button
				type="button"
				onClick={onAdd}
				className="mt-1 flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-[11.5px] font-medium text-[#0a0a0c] transition hover:bg-white/90"
			>
				<HugeiconsIcon icon={Add01Icon} className="size-3.5" />
				Add your first provider
			</button>
		</div>
	);
}

function ProviderCard({
	provider,
	testing,
	onEdit,
	onDelete,
	onTest,
	onSetDefault,
	onToggleEnabled,
}: {
	provider: AIProvider;
	testing: boolean;
	onEdit: () => void;
	onDelete: () => void;
	onTest: () => void;
	onSetDefault: () => void;
	onToggleEnabled: () => void;
}) {
	const Icon = KIND_ICONS[provider.kind];
	const lastTestLabel =
		provider.lastTestedAt === undefined
			? "Never tested"
			: provider.lastTestOk === true
				? `OK ${formatRelativeTime(provider.lastTestedAt)}`
				: `Failed ${formatRelativeTime(provider.lastTestedAt)}`;

	return (
		<div
			className={cn(
				"rounded-xl border transition",
				provider.enabled
					? "border-white/[0.1] bg-white/[0.03]"
					: "border-white/[0.06] bg-white/[0.015] opacity-60",
			)}
		>
			{/* Header row: icon + name + badges */}
			<div className="flex items-start gap-2.5 p-3">
				<div
					className={cn(
						"grid size-8 shrink-0 place-items-center rounded-lg border",
						provider.enabled
							? "border-white/[0.1] bg-white/[0.05] text-white/80"
							: "border-white/[0.06] bg-white/[0.02] text-white/40",
					)}
				>
					<HugeiconsIcon icon={Icon} className="size-4" />
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-1.5">
						<span
							className={cn(
								"truncate text-[12.5px] font-semibold",
								provider.enabled ? "text-white" : "text-white/70",
							)}
						>
							{provider.name}
						</span>
						{provider.isDefault && (
							<span
								title="Default provider — used by Arth"
								className="shrink-0 rounded border border-cyan-300/25 bg-cyan-400/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-cyan-200"
							>
								Default
							</span>
						)}
						{provider.lastTestOk === true && (
							<span
								title="Last test passed"
								className="grid size-3.5 shrink-0 place-items-center"
							>
								<HugeiconsIcon
									icon={CheckmarkCircle02Icon}
									className="size-3.5 text-emerald-400"
								/>
							</span>
						)}
						{provider.lastTestOk === false && (
							<span
								title="Last test failed — click Edit to fix"
								className="grid size-3.5 shrink-0 place-items-center"
							>
								<HugeiconsIcon
									icon={AlertCircleIcon}
									className="size-3.5 text-red-400"
								/>
							</span>
						)}
					</div>
					<div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-white/45">
						<span className="font-mono text-white/60">{provider.model}</span>
						<span className="text-white/25">·</span>
						<span className="truncate font-mono">{provider.baseUrl}</span>
					</div>
					<div className="mt-0.5 text-[9.5px] text-white/35">
						{lastTestLabel}
					</div>
				</div>
			</div>

			{/* Action bar — separated by border, all actions in one row */}
			<div className="flex items-center gap-1 border-t border-white/[0.06] px-2 py-1.5">
				{!provider.isDefault && provider.enabled && (
					<button
						type="button"
						onClick={onSetDefault}
						className="flex h-6 items-center gap-1 rounded-md px-2 text-[10px] font-medium text-white/55 transition hover:bg-white/[0.06] hover:text-white"
						title="Use this provider for Arth"
					>
						<HugeiconsIcon icon={ArrowRight01Icon} className="size-3" />
						Set default
					</button>
				)}
				<button
					type="button"
					onClick={onTest}
					disabled={testing}
					className="flex h-6 items-center gap-1 rounded-md px-2 text-[10px] font-medium text-white/55 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-wait disabled:opacity-40"
					title="Send a tiny test request to verify the connection"
				>
					{testing ? (
						<HugeiconsIcon
							icon={Loading02Icon}
							className="size-3 animate-spin"
						/>
					) : (
						<HugeiconsIcon icon={PlugIcon} className="size-3" />
					)}
					Test
				</button>
				<button
					type="button"
					onClick={onEdit}
					className="flex h-6 items-center gap-1 rounded-md px-2 text-[10px] font-medium text-white/55 transition hover:bg-white/[0.06] hover:text-white"
				>
					<HugeiconsIcon icon={Edit01Icon} className="size-3" />
					Edit
				</button>
				<div className="ml-auto flex items-center gap-1">
					<button
						type="button"
						onClick={onToggleEnabled}
						className={cn(
							"flex h-6 items-center gap-1 rounded-md px-2 text-[10px] font-medium transition",
							provider.enabled
								? "text-white/55 hover:bg-white/[0.06] hover:text-white"
								: "text-white/40 hover:bg-white/[0.06] hover:text-white/80",
						)}
					>
						{provider.enabled ? "Enabled" : "Disabled"}
					</button>
					<button
						type="button"
						onClick={onDelete}
						className="grid size-6 place-items-center rounded-md text-white/40 transition hover:bg-red-500/10 hover:text-red-300"
						title="Remove this provider"
					>
						<HugeiconsIcon icon={Delete02Icon} className="size-3" />
					</button>
				</div>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------------- */

function ConfirmDeleteDialog({
	provider,
	onOpenChange,
	onConfirm,
}: {
	provider: AIProvider | null;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}) {
	return (
		<Dialog open={provider !== null} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>Remove provider?</DialogTitle>
					<DialogDescription>
						{provider
							? `"${provider.name}" will be removed from Arth. This only removes it from this device — your API key and account on the provider are untouched.`
							: null}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="border-t-0 p-0">
					<div className="flex w-full items-center justify-end gap-2">
						<Button
							size="sm"
							variant="ghost"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button size="sm" variant="destructive" onClick={onConfirm}>
							<HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
							Remove
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/* -------------------------------------------------------------------------- */

function ProviderFormDialog({
	open,
	provider,
	onOpenChange,
	onSaved,
	addProvider,
	updateProvider,
}: {
	open: boolean;
	provider: AIProvider | null;
	onOpenChange: (open: boolean) => void;
	onSaved: (saved: AIProvider) => void;
	addProvider: AIProvidersStore["addProvider"];
	updateProvider: AIProvidersStore["updateProvider"];
}) {
	// Form state — local because it lives across invalidations.
	const isEditing = provider !== null;
	const [name, setName] = useState(provider?.name ?? "");
	const [kind, setKind] = useState<ProviderKind>(
		provider?.kind ?? "openai-compatible",
	);
	const [baseUrl, setBaseUrl] = useState(
		provider?.baseUrl ?? defaultBaseUrlForKind("openai-compatible"),
	);
	const [apiKey, setApiKey] = useState(provider?.apiKey ?? "");
	const [model, setModel] = useState(
		provider?.model ?? defaultModelForKind("openai-compatible"),
	);
	// Optional media generation models. When empty, the corresponding
	// generation tools are hidden from the LLM.
	const [videoModel, setVideoModel] = useState(provider?.videoModel ?? "");
	const [imageModel, setImageModel] = useState(provider?.imageModel ?? "");
	const [audioModel, setAudioModel] = useState(provider?.audioModel ?? "");
	const [mediaModel, setMediaModel] = useState(provider?.mediaModel ?? "");
	const [errors, setErrors] = useState<{
		baseUrl?: string;
		apiKey?: string;
		model?: string;
		name?: string;
	}>({});

	// Reset the form whenever the dialog re-opens or the target provider
	// changes (so Edit loads the right values, Add starts blank).
	const key = provider?.id ?? "new";
	const [testing, setTesting] = useState(false);
	const [testError, setTestError] = useState<string | null>(null);
	// Puter.js mandatory data-usage warning popup — uncloseable for 5s.
	const [showPuterWarning, setShowPuterWarning] = useState(false);
	const [puterCountdown, setPuterCountdown] = useState(5);
	const [puterAcknowledged, setPuterAcknowledged] = useState(false);
	// Puter.js model list — fetched from puter.ai.listModels() when the
	// user selects the Puter provider kind. Each entry has { id, provider,
	// name, ... } per the Puter.js API.
	const [puterModels, setPuterModels] = useState<
		Array<{ id: string; provider: string; name?: string }>
	>([]);
	const [puterModelsLoading, setPuterModelsLoading] = useState(false);
	const [puterModelsError, setPuterModelsError] = useState<string | null>(
		null,
	);

	// Countdown timer for the Puter warning popup. The popup cannot be
	// dismissed until the countdown reaches 0.
	useEffect(() => {
		if (!showPuterWarning) return;
		if (puterCountdown <= 0) return;
		const timer = setTimeout(() => {
			setPuterCountdown((c) => c - 1);
		}, 1000);
		return () => clearTimeout(timer);
	}, [showPuterWarning, puterCountdown]);

	// Load the Puter.js SDK and fetch available models when the user
	// selects the Puter provider kind. The SDK is loaded once and cached
	// on window.puter. Models are fetched via puter.ai.listModels().
	// biome-ignore lint/correctness/useExhaustiveDependencies: we intentionally only re-run on kind change, not on model change
	useEffect(() => {
		if (kind !== "puter") return;
		let cancelled = false;

		async function loadPuterModels() {
			setPuterModelsLoading(true);
			setPuterModelsError(null);
			try {
				const models = await fetchPuterModels();
				if (cancelled) return;
				setPuterModels(models);
				// Auto-select the first model if none is set yet.
				if (models.length > 0 && !model) {
					setModel(models[0].id);
				}
			} catch (err) {
				if (cancelled) return;
				setPuterModelsError(
					err instanceof Error ? err.message : "Failed to fetch Puter models",
				);
			} finally {
				if (!cancelled) setPuterModelsLoading(false);
			}
		}

		void loadPuterModels();
		return () => {
			cancelled = true;
		};
	}, [kind]);

	const handleKindChange = useCallback(
		(next: ProviderKind) => {
			setKind(next);
			// Only overwrite baseUrl/model when the user hasn't typed
			// anything custom yet — avoids blowing away a URL the user
			// already entered for the previous kind.
			if (!provider) {
				setBaseUrl(defaultBaseUrlForKind(next));
				setModel(defaultModelForKind(next));
			}
		},
		[provider],
	);

	const validate = useCallback((): boolean => {
		const next: typeof errors = {};
		if (!name.trim()) next.name = "Give the provider a name.";
		// Puter.js runs entirely client-side — no base URL or API key needed.
		if (kind !== "puter") {
			if (!baseUrl.trim()) {
				next.baseUrl = "Base URL is required.";
			} else if (!/^https?:\/\//i.test(baseUrl.trim())) {
				next.baseUrl = "Base URL must start with http:// or https://";
			}
			if (
				(kind === "openai-compatible" || kind === "anthropic-compatible") &&
				!apiKey.trim()
			) {
				next.apiKey = "API key is required for this provider.";
			}
		}
		if (!model.trim()) next.model = "Model name is required.";
		setErrors(next);
		return Object.keys(next).length === 0;
	}, [name, baseUrl, apiKey, model, kind]);

	const handleSave = useCallback(() => {
		if (!validate()) return;
		// Puter.js requires a mandatory data-usage warning. Show the
		// popup first; the actual save happens in handlePuterConfirm.
		if (kind === "puter" && !puterAcknowledged) {
			setShowPuterWarning(true);
			setPuterCountdown(5);
			return;
		}
		const trimmed = {
			name: name.trim(),
			kind,
			baseUrl:
				kind === "puter"
					? ""
					: baseUrl.trim().replace(/\/+$/, ""),
			apiKey: kind === "puter" ? "" : apiKey.trim(),
			model: model.trim(),
			videoModel: videoModel.trim() || undefined,
			imageModel: imageModel.trim() || undefined,
			audioModel: audioModel.trim() || undefined,
			mediaModel: mediaModel.trim() || undefined,
			enabled: true,
		};
		if (provider) {
			updateProvider(provider.id, trimmed);
			onSaved({ ...provider, ...trimmed });
		} else {
			const id = addProvider(trimmed);
			onSaved({
				id,
				...trimmed,
				isDefault: false,
			});
		}
	}, [
		apiKey,
		addProvider,
		audioModel,
		baseUrl,
		imageModel,
		kind,
		mediaModel,
		model,
		name,
		onSaved,
		provider,
		puterAcknowledged,
		updateProvider,
		validate,
		videoModel,
	]);

	const handlePuterConfirm = useCallback(() => {
		setPuterAcknowledged(true);
		setShowPuterWarning(false);
		// Save the Puter provider directly — puterAcknowledged is now true.
		const trimmed = {
			name: name.trim(),
			kind: "puter" as const,
			baseUrl: "",
			apiKey: "",
			model: model.trim(),
			videoModel: videoModel.trim() || undefined,
			imageModel: imageModel.trim() || undefined,
			audioModel: audioModel.trim() || undefined,
			mediaModel: mediaModel.trim() || undefined,
			enabled: true,
		};
		if (provider) {
			updateProvider(provider.id, trimmed);
			onSaved({ ...provider, ...trimmed });
		} else {
			const id = addProvider(trimmed);
			onSaved({ id, ...trimmed, isDefault: false });
		}
		onOpenChange(false);
	}, [name, model, videoModel, imageModel, audioModel, mediaModel, provider, addProvider, updateProvider, onSaved, onOpenChange]);

	const handlePuterCancel = useCallback(() => {
		setShowPuterWarning(false);
		setPuterAcknowledged(false);
	}, []);

	const handleTestFromDialog = useCallback(async () => {
		if (!validate()) return;
		setTesting(true);
		setTestError(null);
		try {
			const response = await fetch("/api/ai/test", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					baseUrl: baseUrl.trim(),
					apiKey: apiKey.trim(),
					model: model.trim(),
					kind,
				}),
			});
			const result = await parseTestResponse(response);
			if (result.ok) {
				setTestError(null);
			} else {
				setTestError(result.error ?? "Unknown error");
			}
		} catch (err) {
			setTestError(err instanceof Error ? err.message : String(err));
		} finally {
			setTesting(false);
		}
	}, [apiKey, baseUrl, kind, model, validate]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? "Edit provider" : "Add AI provider"}
					</DialogTitle>
					<DialogDescription>
						Works with OpenAI, Together, Groq, OpenRouter, LM Studio, vLLM,
						llama.cpp, or local Ollama.
					</DialogDescription>
				</DialogHeader>

				<DialogBody className="gap-4">
					{/* Name */}
					<div className="space-y-1.5">
						<Label htmlFor="provider-name" className="text-[11px] text-white/70">
							Name
						</Label>
						<Input
							id="provider-name"
							value={name}
							placeholder="My OpenAI account"
							onChange={(e) => setName(e.target.value)}
							className={cn(errors.name && "border-red-400/40")}
						/>
						{errors.name && (
							<p className="text-[10.5px] text-red-300/90">{errors.name}</p>
						)}
					</div>

					{/* Type selector */}
					<div className="space-y-1.5">
						<Label className="text-[11px] text-white/70">Type</Label>
						<div className="grid grid-cols-2 gap-2">
							{(Object.keys(KIND_LABELS) as ProviderKind[]).map((k) => {
								const meta = KIND_LABELS[k];
								const isActive = kind === k;
								return (
									<button
										key={k}
										type="button"
										onClick={() => handleKindChange(k)}
										className={cn(
											"flex flex-col gap-0.5 rounded-lg border px-3 py-2 text-left transition-all",
											isActive
												? "border-white/25 bg-white/[0.06] text-white"
												: "border-white/[0.08] bg-white/[0.02] text-white/60 hover:border-white/15 hover:bg-white/[0.04] hover:text-white/85",
										)}
									>
										<span className="text-[11px] font-medium">
											{meta.label}
										</span>
										<span className="text-[9.5px] leading-snug text-white/40">
											{meta.hint}
										</span>
									</button>
								);
							})}
						</div>
					</div>

					{kind === "puter" ? (
						<div className="rounded-lg border border-amber-400/25 bg-amber-400/[0.06] p-3">
							<div className="flex items-start gap-2">
								<HugeiconsIcon
									icon={AlertCircleIcon}
									className="mt-0.5 size-4 shrink-0 text-amber-300"
								/>
								<div className="flex flex-col gap-1">
									<p className="text-[11px] font-semibold text-amber-200">
										Puter.js — Data Usage Warning
									</p>
									<p className="text-[10px] leading-relaxed text-amber-100/80">
										Puter.js is a free, browser-based AI provider. It runs
										entirely in your browser using your Puter account — no API
										key needed. However, Puter may use your conversation data
										for model training. Do not use Puter.js with sensitive or
										private content.
									</p>
									<p className="text-[10px] text-amber-100/60">
										You will see a mandatory confirmation dialog before Puter.js
										is activated.
									</p>
								</div>
							</div>
						</div>
					) : (
					<>
						{/* Base URL */}
						<div className="space-y-1.5">
							<Label
								htmlFor="provider-base-url"
								className="flex items-center gap-1.5 text-[11px] text-white/70"
							>
								<HugeiconsIcon icon={LinkSquareIcon} className="size-3" />
								Base URL
							</Label>
							<Input
								id="provider-base-url"
								value={baseUrl}
								placeholder="https://api.openai.com/v1"
								onChange={(e) => setBaseUrl(e.target.value)}
								className={cn("font-mono", errors.baseUrl && "border-red-400/40")}
							/>
							{errors.baseUrl && (
								<p className="text-[10.5px] text-red-300/90">{errors.baseUrl}</p>
							)}
						</div>

						{/* API Key */}
						<div className="space-y-1.5">
							<Label
								htmlFor="provider-api-key"
								className="flex items-center gap-1.5 text-[11px] text-white/70"
							>
								<HugeiconsIcon icon={Key01Icon} className="size-3" />
								API Key
								{kind === "ollama" && (
									<span className="text-[10px] font-normal text-white/40">
										— not required for Ollama
									</span>
								)}
							</Label>
							<Input
								id="provider-api-key"
								type="password"
								value={apiKey}
								placeholder={kind === "ollama" ? "(leave blank)" : "sk-..."}
								onChange={(e) => setApiKey(e.target.value)}
								className={cn("font-mono", errors.apiKey && "border-red-400/40")}
								disabled={kind === "ollama"}
							/>
							{errors.apiKey && (
								<p className="text-[10.5px] text-red-300/90">{errors.apiKey}</p>
							)}
						</div>
					</>
					)}

					{/* Model */}
					<div className="space-y-1.5">
						<Label
							htmlFor="provider-model"
							className="flex items-center gap-1.5 text-[11px] text-white/70"
						>
							<HugeiconsIcon icon={SparklesIcon} className="size-3" />
							Model
							{kind === "puter" && puterModelsLoading && (
								<span className="text-[10px] font-normal text-white/40">
									— fetching available models…
								</span>
							)}
						</Label>
						{kind === "puter" ? (
							puterModelsLoading ? (
								<div className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 text-[11px] text-white/40">
									<HugeiconsIcon
										icon={Loading02Icon}
										className="size-3.5 animate-spin"
									/>
									Loading models from Puter…
								</div>
							) : puterModelsError ? (
								<div className="flex flex-col gap-1.5">
									<Input
										id="provider-model"
										value={model}
										placeholder="Enter model id manually"
										onChange={(e) => setModel(e.target.value)}
										className={cn(
											"font-mono",
											errors.model && "border-red-400/40",
										)}
									/>
									<p className="text-[10px] text-amber-300/80">
										{puterModelsError} — enter model id manually.
									</p>
								</div>
							) : puterModels.length > 0 ? (
								<div className="relative">
									<select
										id="provider-model"
										value={model}
										onChange={(e) => setModel(e.target.value)}
										className={cn(
											"h-9 w-full appearance-none rounded-lg border border-white/10 bg-white/[0.02] px-3 pr-9 font-mono text-[12px] text-white/90 outline-none transition-colors focus:border-white/25",
											errors.model && "border-red-400/40",
										)}
									>
										{puterModels.map((m) => (
											<option key={m.id} value={m.id} className="bg-[#1a1a1e]">
												{m.name ?? m.id} ({m.provider})
											</option>
										))}
									</select>
									<HugeiconsIcon
										icon={ArrowDown03Icon}
										className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-white/40"
									/>
								</div>
							) : (
								<Input
									id="provider-model"
									value={model}
									placeholder="gpt-4o-mini"
									onChange={(e) => setModel(e.target.value)}
									className={cn(
										"font-mono",
										errors.model && "border-red-400/40",
									)}
								/>
							)
						) : (
							<Input
								id="provider-model"
								value={model}
								placeholder="gpt-4o-mini"
								onChange={(e) => setModel(e.target.value)}
								className={cn("font-mono", errors.model && "border-red-400/40")}
							/>
						)}
						{errors.model && (
							<p className="text-[10.5px] text-red-300/90">{errors.model}</p>
						)}
					</div>

					{/* Media generation models (optional) */}
					<div className="flex flex-col gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.015] p-3">
						<div className="flex items-center gap-1.5">
							<HugeiconsIcon icon={SparklesIcon} className="size-3 text-white/40" />
							<span className="text-[11px] font-medium text-white/60">
								Media generation models
							</span>
							<span className="text-[9.5px] text-white/30">(optional)</span>
						</div>
						<p className="text-[10px] leading-relaxed text-white/30">
							Fill in only the models your provider supports. When a field is
							empty, the AI cannot call that type of generation tool.
						</p>
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<div className="flex flex-col gap-1">
								<label
									htmlFor="provider-video-model"
									className="text-[10px] text-white/45"
								>
									Video model
								</label>
								<Input
									id="provider-video-model"
									value={videoModel}
									placeholder="e.g. sora-2, seedance-1.0-pro"
									onChange={(e) => setVideoModel(e.target.value)}
									className="h-8 font-mono text-[11px]"
								/>
							</div>
							<div className="flex flex-col gap-1">
								<label
									htmlFor="provider-image-model"
									className="text-[10px] text-white/45"
								>
									Image model
								</label>
								<Input
									id="provider-image-model"
									value={imageModel}
									placeholder="e.g. dall-e-3, flux-1"
									onChange={(e) => setImageModel(e.target.value)}
									className="h-8 font-mono text-[11px]"
								/>
							</div>
							<div className="flex flex-col gap-1">
								<label
									htmlFor="provider-audio-model"
									className="text-[10px] text-white/45"
								>
									Audio model
								</label>
								<Input
									id="provider-audio-model"
									value={audioModel}
									placeholder="e.g. tts-1, bark"
									onChange={(e) => setAudioModel(e.target.value)}
									className="h-8 font-mono text-[11px]"
								/>
							</div>
							<div className="flex flex-col gap-1">
								<label
									htmlFor="provider-media-model"
									className="text-[10px] text-white/45"
								>
									Media model
								</label>
								<Input
									id="provider-media-model"
									value={mediaModel}
									placeholder="e.g. music-gen, audio-lm"
									onChange={(e) => setMediaModel(e.target.value)}
									className="h-8 font-mono text-[11px]"
								/>
							</div>
						</div>
					</div>

					{/* Test result / hint */}
					{testError ? (
						<div className="flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-500/[0.08] p-2.5 text-[11px] text-red-200">
							<HugeiconsIcon
								icon={AlertCircleIcon}
								className="mt-0.5 size-3.5 shrink-0"
							/>
							<span className="leading-relaxed">{testError}</span>
						</div>
					) : (
						!testing && (
							<p className="text-[10px] leading-relaxed text-white/35">
								Click <span className="text-white/55">Test</span> to verify the
								connection before saving — one tiny prompt, max_tokens=1.
							</p>
						)
					)}
					<FormKeyBridge key={key} />
				{showPuterWarning && (
					<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
						<div className="mx-4 w-full max-w-md rounded-2xl border-2 border-amber-400/40 bg-[#1a1510] p-6 shadow-2xl">
							<div className="mb-4 flex items-center justify-center">
								<div className="grid size-12 place-items-center rounded-full border-2 border-amber-400/30 bg-amber-400/10">
									<HugeiconsIcon
										icon={AlertCircleIcon}
										className="size-6 text-amber-300"
									/>
								</div>
							</div>
							<h3 className="mb-2 text-center text-[14px] font-bold text-amber-200">
								Puter.js Data Usage Warning
							</h3>
							<p className="mb-3 text-center text-[11px] leading-relaxed text-amber-100/80">
								Puter.js is a free, browser-based AI provider that uses your
								Puter account. <strong>Puter may use your conversation data
								for model training.</strong> Do not use Puter.js with
								sensitive, private, or confidential content.
							</p>
							<p className="mb-4 text-center text-[11px] text-amber-100/60">
								By clicking "I Understand & Accept", you acknowledge that
								your data may be used for training purposes.
							</p>
							<div className="flex flex-col gap-2">
								<button
									type="button"
									onClick={handlePuterConfirm}
									disabled={puterCountdown > 0}
									className={cn(
										"w-full rounded-lg border px-4 py-2.5 text-[12px] font-semibold transition-all",
										puterCountdown > 0
											? "cursor-not-allowed border-white/10 bg-white/[0.02] text-white/30"
											: "border-amber-400/30 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25",
									)}
								>
									{puterCountdown > 0
										? `Please wait ${puterCountdown}s…`
										: "I Understand & Accept"}
								</button>
								<button
									type="button"
									onClick={handlePuterCancel}
									disabled={puterCountdown > 0}
									className={cn(
										"w-full rounded-lg border px-4 py-2 text-[11px] transition-all",
										puterCountdown > 0
											? "cursor-not-allowed border-white/5 text-white/20"
											: "border-white/10 text-white/50 hover:bg-white/[0.04] hover:text-white/70",
									)}
								>
									Cancel
								</button>
							</div>
							{puterCountdown > 0 && (
								<p className="mt-3 text-center text-[9px] text-white/30">
									This warning cannot be dismissed for {puterCountdown} more
									second{puterCountdown > 1 ? "s" : ""}.
								</p>
							)}
						</div>
					</div>
			)}
			</DialogBody>

				<DialogFooter>
					<Button
						size="sm"
						variant="ghost"
						onClick={() => void handleTestFromDialog()}
						disabled={testing}
					>
						{testing ? (
							<HugeiconsIcon
								icon={Loading02Icon}
								className="size-3.5 animate-spin"
							/>
						) : (
							<HugeiconsIcon icon={PlugIcon} className="size-3.5" />
						)}
						Test
					</Button>
					<Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button size="sm" onClick={handleSave}>
						<HugeiconsIcon
							icon={isEditing ? Edit01Icon : Add01Icon}
							className="size-3.5"
						/>
						{isEditing ? "Save changes" : "Add provider"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/**
 * Tiny helper — re-keys the parent so its local state resets when the
 * `key` prop changes. Avoids the user opening Edit on provider A,
 * closing, then opening Edit on provider B and seeing A's values
 * still in the form.
 */
function FormKeyBridge() {
	return null;
}

interface AIProvidersStore {
	providers: AIProvider[];
	addProvider: (input: Omit<AIProvider, "id" | "isDefault">) => string;
	updateProvider: (id: string, patch: Partial<AIProvider>) => void;
	deleteProvider: (id: string) => void;
	setDefault: (id: string) => void;
	markTestResult: (id: string, ok: boolean) => void;
	getDefault: () => AIProvider | undefined;
}

/* -------------------------------------------------------------------------- */

function defaultBaseUrlForKind(kind: ProviderKind): string {
	if (kind === "ollama") return "http://127.0.0.1:11434/v1";
	if (kind === "puter") return "";
	if (kind === "anthropic-compatible") return "https://api.anthropic.com";
	return "https://api.openai.com/v1";
}

function defaultModelForKind(kind: ProviderKind): string {
	if (kind === "ollama") return "llama3.1";
	if (kind === "puter") return "gpt-4o-mini";
	if (kind === "anthropic-compatible") return "claude-sonnet-4-20250514";
	return "gpt-4o-mini";
}

function formatRelativeTime(timestamp: number): string {
	const diff = Date.now() - timestamp;
	if (diff < 60_000) return "just now";
	if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
	if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
	return `${Math.round(diff / 86_400_000)}d ago`;
}

// silence the unused-import warning if Settings02Icon / Time01Icon ever
// become unused; kept so the icons panel is easy to extend later.
void Settings02Icon;
void Time01Icon;
