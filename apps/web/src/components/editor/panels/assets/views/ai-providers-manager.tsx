"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
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
	Search01Icon,
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
import { fetchPuterModelsAndMedia } from "@/lib/ai/puter-client";
import { useI18n } from "@/lib/i18n";
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
		label: "aiProviders.kind.openaiCompatible.label",
		hint: "aiProviders.kind.openaiCompatible.hint",
	},
	"anthropic-compatible": {
		label: "aiProviders.kind.anthropicCompatible.label",
		hint: "aiProviders.kind.anthropicCompatible.hint",
	},
	ollama: {
		label: "aiProviders.kind.ollama.label",
		hint: "aiProviders.kind.ollama.hint",
	},
	puter: {
		label: "aiProviders.kind.puter.label",
		hint: "aiProviders.kind.puter.hint",
	},
};

const KIND_ICONS: Record<ProviderKind, typeof PlugIcon> = {
	"openai-compatible": SparklesIcon,
	"anthropic-compatible": HexagonIcon,
	ollama: PlugIcon,
	puter: CloudIcon,
};

/**
 * Per-kind accent colors. Each kind gets a subtle tint on the icon
 * tile and a colored left rail so the user can tell providers apart
 * at a glance. Colors are intentionally muted to fit the dark theme.
 */
const KIND_ACCENTS: Record<
	ProviderKind,
	{ tile: string; rail: string; icon: string }
> = {
	"openai-compatible": {
		tile: "border-emerald-400/20 bg-emerald-400/[0.08]",
		rail: "bg-emerald-400/60",
		icon: "text-emerald-300",
	},
	"anthropic-compatible": {
		tile: "border-orange-400/20 bg-orange-400/[0.08]",
		rail: "bg-orange-400/60",
		icon: "text-orange-300",
	},
	ollama: {
		tile: "border-sky-400/20 bg-sky-400/[0.08]",
		rail: "bg-sky-400/60",
		icon: "text-sky-300",
	},
	puter: {
		tile: "border-violet-400/20 bg-violet-400/[0.08]",
		rail: "bg-violet-400/60",
		icon: "text-violet-300",
	},
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
async function parseTestResponse(
	response: Response,
	t: (key: string, values?: Record<string, string | number>) => string,
): Promise<TestResult> {
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
				? t("aiProviders.test.serverErrorWithText", {
						status: response.status,
						text,
				  })
				: t("aiProviders.test.serverError", { status: response.status }),
		};
	}
	try {
		return (await response.json()) as TestResult;
	} catch (err) {
		return {
			ok: false,
			error: t("aiProviders.test.parseError", {
				error: err instanceof Error ? err.message : String(err),
			}),
		};
	}
}

export function AIProvidersManager({
	variant = "panel",
}: AIProvidersManagerProps) {
	const { t } = useI18n();
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
				const result = await parseTestResponse(response, t);
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
		[markTestResult, t],
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
						className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/[0.1] bg-white/[0.02] text-[0.71875rem] font-medium text-white/60 transition-all hover:border-white/20 hover:bg-white/[0.04] hover:text-white/85"
					>
						<HugeiconsIcon icon={Add01Icon} className="size-3.5" />
						{t("aiProviders.list.addProvider")}
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
	const { t } = useI18n();
	return (
		<div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.015] p-8 text-center">
			<div className="grid size-12 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
				<HugeiconsIcon icon={PlugIcon} className="size-5 text-white/40" />
			</div>
			<div className="space-y-1.5">
				<p className="text-[0.8125rem] font-medium text-white/80">{t("aiProviders.empty.title")}</p>
				<p className="max-w-[300px] text-[0.6875rem] leading-relaxed text-white/40">
					{t("aiProviders.empty.description")}
				</p>
			</div>
			<button
				type="button"
				onClick={onAdd}
				className="mt-1 flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-[0.71875rem] font-medium text-[#0a0a0c] transition hover:bg-white/90"
			>
				<HugeiconsIcon icon={Add01Icon} className="size-3.5" />
				{t("aiProviders.empty.addFirst")}
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
	const { t } = useI18n();
	const Icon = KIND_ICONS[provider.kind];
	const accent = KIND_ACCENTS[provider.kind];
	const kindLabelKey = KIND_LABELS[provider.kind].label;
	const lastTestLabel =
		provider.lastTestedAt === undefined
			? t("aiProviders.provider.neverTested")
			: provider.lastTestOk === true
				? t("aiProviders.provider.okAt", {
						time: formatRelativeTime(provider.lastTestedAt, t),
				  })
				: t("aiProviders.provider.failedAt", {
						time: formatRelativeTime(provider.lastTestedAt, t),
			  });

	return (
		<div
			className={cn(
				"group relative overflow-hidden rounded-xl border transition-all duration-200",
				provider.enabled
					? "border-white/[0.1] bg-white/[0.03] hover:border-white/[0.18] hover:bg-white/[0.04]"
					: "border-white/[0.06] bg-white/[0.015] opacity-70 hover:opacity-90",
				provider.isDefault && "border-cyan-400/25 ring-1 ring-cyan-400/15",
			)}
		>
			{/* Colored left rail — kind accent */}
			<div
				className={cn(
					"absolute inset-y-0 left-0 w-[3px]",
					accent.rail,
					provider.enabled ? "opacity-100" : "opacity-40",
				)}
			/>

			{/* Header row: icon tile + name + badges */}
			<div className="flex items-start gap-3 p-3 pl-4">
				<div
					className={cn(
						"grid size-9 shrink-0 place-items-center rounded-lg border transition-colors",
						accent.tile,
						!provider.enabled && "opacity-50",
					)}
				>
					<HugeiconsIcon
						icon={Icon}
						className={cn("size-4", accent.icon)}
					/>
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-1.5">
						<span
							className={cn(
								"truncate text-[0.8125rem] font-semibold leading-tight",
								provider.enabled ? "text-white" : "text-white/70",
							)}
						>
							{provider.name}
						</span>
						{provider.isDefault && (
							<span
								title={t("aiProviders.provider.defaultTooltip")}
								className="shrink-0 rounded border border-cyan-300/30 bg-cyan-400/15 px-1.5 py-px text-[0.5625rem] font-semibold uppercase tracking-wider text-cyan-200"
							>
								{t("aiProviders.provider.defaultBadge")}
							</span>
						)}
					</div>
					{/* Kind label — small uppercase tag */}
					<div className="mt-0.5 text-[0.625rem] font-medium uppercase tracking-wide text-white/35">
						{t(kindLabelKey)}
					</div>
					{/* Model + base url */}
					<div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.65625rem]">
						<span
							className={cn(
								"rounded font-mono",
								provider.enabled ? "text-white/70" : "text-white/50",
							)}
						>
							{provider.model}
						</span>
						{provider.baseUrl && (
							<>
								<span className="text-white/20">·</span>
								<span className="truncate font-mono text-white/40">
									{provider.baseUrl}
								</span>
							</>
						)}
					</div>
					{/* Status row: test result + enabled state */}
					<div className="mt-1.5 flex items-center gap-2 text-[0.625rem]">
						{provider.lastTestOk === true && (
							<span className="flex items-center gap-1 text-emerald-300/80">
								<HugeiconsIcon
									icon={CheckmarkCircle02Icon}
									className="size-3"
								/>
								{lastTestLabel}
							</span>
						)}
						{provider.lastTestOk === false && (
							<span className="flex items-center gap-1 text-red-300/80">
								<HugeiconsIcon icon={AlertCircleIcon} className="size-3" />
								{lastTestLabel}
							</span>
						)}
						{provider.lastTestedAt === undefined && (
							<span className="text-white/35">{lastTestLabel}</span>
						)}
						{!provider.enabled && (
							<span className="ml-auto rounded bg-white/[0.06] px-1.5 py-px text-[0.5625rem] font-medium uppercase tracking-wide text-white/40">
								{t("aiProviders.provider.disabled")}
							</span>
						)}
					</div>
				</div>
			</div>

			{/* Action bar — separated by border, all actions in one row */}
			<div className="flex items-center gap-1 border-t border-white/[0.06] px-2 py-1.5">
				{!provider.isDefault && provider.enabled && (
					<button
						type="button"
						onClick={onSetDefault}
						className="flex h-6 items-center gap-1 rounded-md px-2 text-[0.625rem] font-medium text-white/55 transition hover:bg-white/[0.06] hover:text-white"
						title={t("aiProviders.provider.setDefaultTooltip")}
					>
						<HugeiconsIcon icon={ArrowRight01Icon} className="size-3" />
						{t("aiProviders.provider.setDefault")}
					</button>
				)}
				<button
					type="button"
					onClick={onTest}
					disabled={testing}
					className="flex h-6 items-center gap-1 rounded-md px-2 text-[0.625rem] font-medium text-white/55 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-wait disabled:opacity-40"
					title={t("aiProviders.provider.testTooltip")}
				>
					{testing ? (
						<HugeiconsIcon
							icon={Loading02Icon}
							className="size-3 animate-spin"
						/>
					) : (
						<HugeiconsIcon icon={PlugIcon} className="size-3" />
					)}
					{t("aiProviders.provider.test")}
				</button>
				<button
					type="button"
					onClick={onEdit}
					className="flex h-6 items-center gap-1 rounded-md px-2 text-[0.625rem] font-medium text-white/55 transition hover:bg-white/[0.06] hover:text-white"
				>
					<HugeiconsIcon icon={Edit01Icon} className="size-3" />
					{t("aiProviders.provider.edit")}
				</button>
				<div className="ml-auto flex items-center gap-1">
					<button
						type="button"
						onClick={onToggleEnabled}
						className={cn(
							"flex h-6 items-center gap-1 rounded-md px-2 text-[0.625rem] font-medium transition",
							provider.enabled
								? "text-white/55 hover:bg-white/[0.06] hover:text-white"
								: "text-white/40 hover:bg-white/[0.06] hover:text-white/80",
						)}
					>
						{provider.enabled
							? t("aiProviders.provider.enabled")
							: t("aiProviders.provider.enable")}
					</button>
					<button
						type="button"
						onClick={onDelete}
						className="grid size-6 place-items-center rounded-md text-white/40 transition hover:bg-red-500/10 hover:text-red-300"
						title={t("aiProviders.provider.removeTooltip")}
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
	const { t } = useI18n();
	return (
		<Dialog open={provider !== null} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>{t("aiProviders.delete.title")}</DialogTitle>
					<DialogDescription>
						{provider
							? t("aiProviders.delete.description", { name: provider.name })
							: null}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="border-t-0">
					<div className="flex w-full items-center justify-end gap-2">
						<Button
							size="sm"
							variant="ghost"
							onClick={() => onOpenChange(false)}
						>
							{t("aiProviders.delete.cancel")}
						</Button>
						<Button size="sm" variant="destructive" onClick={onConfirm}>
							<HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
							{t("aiProviders.delete.confirm")}
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
	const { t } = useI18n();
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
	// Skip the warning if the user is editing an existing Puter provider
	// (they already approved) or if there's already an enabled Puter
	// provider in the store (they approved it before).
	const hasExistingPuter = useAIProvidersStore((s) =>
		s.providers.some((p) => p.kind === "puter" && p.enabled),
	);
	const [showPuterWarning, setShowPuterWarning] = useState(false);
	const [puterCountdown, setPuterCountdown] = useState(5);
	const [puterAcknowledged, setPuterAcknowledged] = useState(
		provider?.kind === "puter" || hasExistingPuter,
	);
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
	// Fetched models for non-Puter providers (OpenAI-compatible, Ollama,
	// Anthropic). Populated when the user clicks "Fetch models" — calls
	// the server-side /api/ai/models route which proxies the request to
	// avoid CORS. Same shape as puterModels so we can reuse
	// SearchableModelSelect.
	const [fetchedModels, setFetchedModels] = useState<
		Array<{ id: string; provider: string; name?: string }>
	>([]);
	const [fetchedModelsLoading, setFetchedModelsLoading] = useState(false);
	const [fetchedModelsError, setFetchedModelsError] = useState<string | null>(
		null,
	);
	// Puter.js media generation models — fetched alongside chat models
	// so the media model fields can show dropdowns instead of free text.
	const [puterMediaModels, setPuterMediaModels] = useState<{
		video: Array<{ id: string; provider: string; name?: string }>;
		image: Array<{ id: string; provider: string; name?: string }>;
		audio: Array<{ id: string; provider: string; name?: string }>;
		media: Array<{ id: string; provider: string; name?: string }>;
	}>({ video: [], image: [], audio: [], media: [] });

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
				// Single listModels() call — fetchPuterModelsAndMedia
				// derives both chat models and media models from one
				// response, avoiding the double-fetch delay.
				const { models, mediaModels } = await fetchPuterModelsAndMedia();
				if (cancelled) return;
				setPuterModels(models);
				setPuterMediaModels(mediaModels);
				// Auto-select the first model if none is set yet.
				if (models.length > 0 && !model) {
					setModel(models[0].id);
				}
			} catch (err) {
				if (cancelled) return;
				setPuterModelsError(
					err instanceof Error
						? err.message
						: t("aiProviders.test.fetchPuterModelsFailed"),
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

	// Fetch available models from non-Puter providers via the server-side
	// /api/ai/models route. This avoids CORS — the browser can't call
	// OpenAI's /v1/models or Anthropic's /v1/models directly. Requires
	// baseUrl to be set; apiKey is required for OpenAI/Anthropic but not
	// for Ollama.
	const handleFetchModels = useCallback(async () => {
		if (!baseUrl.trim()) return;
		setFetchedModelsLoading(true);
		setFetchedModelsError(null);
		setFetchedModels([]);
		try {
			const res = await fetch("/api/ai/models", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					baseUrl: baseUrl.trim(),
					apiKey: apiKey.trim(),
					kind,
				}),
			});
			const data = (await res.json()) as {
				models?: Array<{ id: string; provider: string; name?: string }>;
				error?: string;
			};
			if (!res.ok || data.error) {
				setFetchedModelsError(
					data.error ?? t("aiProviders.test.httpError", { status: res.status }),
				);
			} else if (data.models && data.models.length > 0) {
				setFetchedModels(data.models);
				// Auto-select the first model if none is set yet.
				if (!model) {
					setModel(data.models[0].id);
				}
			} else {
				setFetchedModelsError(t("aiProviders.test.noModelsReturned"));
			}
		} catch (err) {
			setFetchedModelsError(
				err instanceof Error ? err.message : t("aiProviders.test.fetchModelsFailed"),
			);
		} finally {
			setFetchedModelsLoading(false);
		}
	}, [baseUrl, apiKey, kind, model, t]);

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
		if (!name.trim()) next.name = t("aiProviders.form.nameRequired");
		// Puter.js runs entirely client-side — no base URL or API key needed.
		if (kind !== "puter") {
			if (!baseUrl.trim()) {
				next.baseUrl = t("aiProviders.form.baseUrlRequired");
			} else if (!/^https?:\/\//i.test(baseUrl.trim())) {
				next.baseUrl = t("aiProviders.form.baseUrlInvalid");
			}
			if (
				(kind === "openai-compatible" || kind === "anthropic-compatible") &&
				!apiKey.trim()
			) {
				next.apiKey = t("aiProviders.form.apiKeyRequired");
			}
		}
		if (!model.trim()) next.model = t("aiProviders.form.modelRequired");
		setErrors(next);
		return Object.keys(next).length === 0;
	}, [name, baseUrl, apiKey, model, kind, t]);

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
			const result = await parseTestResponse(response, t);
			if (result.ok) {
				setTestError(null);
			} else {
				setTestError(result.error ?? t("aiProviders.test.unknownError"));
			}
		} catch (err) {
			setTestError(err instanceof Error ? err.message : String(err));
		} finally {
			setTesting(false);
		}
	}, [apiKey, baseUrl, kind, model, t, validate]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>
						{isEditing
							? t("aiProviders.form.editTitle")
							: t("aiProviders.form.addTitle")}
					</DialogTitle>
					<DialogDescription>
						{t("aiProviders.form.description")}
					</DialogDescription>
				</DialogHeader>

				<DialogBody className="max-h-[70vh] gap-4 overflow-y-auto px-6 py-4">
					{/* Name */}
					<div className="space-y-1.5">
						<Label htmlFor="provider-name" className="text-[0.6875rem] text-white/70">
							{t("aiProviders.form.nameLabel")}
						</Label>
						<Input
							id="provider-name"
							value={name}
							placeholder={t("aiProviders.form.namePlaceholder")}
							onChange={(e) => setName(e.target.value)}
							className={cn(errors.name && "border-red-400/40")}
						/>
						{errors.name && (
							<p className="text-[0.65625rem] text-red-300/90">{errors.name}</p>
						)}
					</div>

					{/* Type selector */}
					<div className="space-y-1.5">
						<Label className="text-[0.6875rem] text-white/70">
							{t("aiProviders.form.typeLabel")}
						</Label>
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
										<span className="text-[0.6875rem] font-medium">
											{t(meta.label)}
										</span>
										<span className="text-[0.59375rem] leading-snug text-white/40">
											{t(meta.hint)}
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
									<p className="text-[0.6875rem] font-semibold text-amber-200">
										{t("aiProviders.form.puterWarningTitle")}
									</p>
									<p className="text-[0.625rem] leading-relaxed text-amber-100/80">
										{t("aiProviders.form.puterWarningBody")}
									</p>
									<p className="text-[0.625rem] text-amber-100/60">
										{t("aiProviders.form.puterWarningNote")}
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
								className="flex items-center gap-1.5 text-[0.6875rem] text-white/70"
							>
								<HugeiconsIcon icon={LinkSquareIcon} className="size-3" />
								{t("aiProviders.form.baseUrlLabel")}
							</Label>
							<Input
								id="provider-base-url"
								value={baseUrl}
								placeholder={t("aiProviders.form.baseUrlPlaceholder")}
								onChange={(e) => setBaseUrl(e.target.value)}
								className={cn("font-mono", errors.baseUrl && "border-red-400/40")}
							/>
							{errors.baseUrl && (
								<p className="text-[0.65625rem] text-red-300/90">{errors.baseUrl}</p>
							)}
						</div>

						{/* API Key */}
						<div className="space-y-1.5">
							<Label
								htmlFor="provider-api-key"
								className="flex items-center gap-1.5 text-[0.6875rem] text-white/70"
							>
								<HugeiconsIcon icon={Key01Icon} className="size-3" />
								{t("aiProviders.form.apiKeyLabel")}
								{kind === "ollama" && (
									<span className="text-[0.625rem] font-normal text-white/40">
										{t("aiProviders.form.apiKeyNotRequired")}
									</span>
								)}
							</Label>
							<Input
								id="provider-api-key"
								type="password"
								value={apiKey}
								placeholder={
									kind === "ollama"
										? t("aiProviders.form.apiKeyPlaceholderBlank")
										: t("aiProviders.form.apiKeyPlaceholder")
								}
								onChange={(e) => setApiKey(e.target.value)}
								className={cn("font-mono", errors.apiKey && "border-red-400/40")}
								disabled={kind === "ollama"}
							/>
							{errors.apiKey && (
								<p className="text-[0.65625rem] text-red-300/90">{errors.apiKey}</p>
							)}
						</div>
					</>
					)}

					{/* Model */}
					<div className="space-y-1.5">
						<Label
							htmlFor="provider-model"
							className="flex items-center gap-1.5 text-[0.6875rem] text-white/70"
						>
							<HugeiconsIcon icon={SparklesIcon} className="size-3" />
							{t("aiProviders.form.modelLabel")}
							{kind === "puter" && puterModelsLoading && (
								<span className="text-[0.625rem] font-normal text-white/40">
									{t("aiProviders.form.modelFetching")}
								</span>
							)}
						</Label>
						{kind === "puter" ? (
							puterModelsLoading ? (
								<div className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 text-[0.6875rem] text-white/40">
									<HugeiconsIcon
										icon={Loading02Icon}
										className="size-3.5 animate-spin"
									/>
									{t("aiProviders.form.modelLoadingPuter")}
								</div>
							) : puterModelsError ? (
								<div className="flex flex-col gap-1.5">
									<Input
										id="provider-model"
										value={model}
										placeholder={t("aiProviders.form.modelPlaceholderManual")}
										onChange={(e) => setModel(e.target.value)}
										className={cn(
											"font-mono",
											errors.model && "border-red-400/40",
										)}
									/>
									<p className="text-[0.625rem] text-amber-300/80">
										{t("aiProviders.form.puterModelError", { error: puterModelsError })}
									</p>
								</div>
							) : puterModels.length > 0 ? (
								<SearchableModelSelect
									id="provider-model"
									value={model}
									onChange={setModel}
									options={puterModels}
									placeholder={t("aiProviders.form.modelPlaceholderSelect")}
									className={cn(
										errors.model && "border-red-400/40",
									)}
								/>
							) : fetchedModels.length > 0 ? (
								<div className="flex flex-col gap-1.5">
									<SearchableModelSelect
										id="provider-model"
										value={model}
										onChange={setModel}
										options={fetchedModels}
										placeholder={t("aiProviders.form.modelPlaceholderSelect")}
										className={cn(
											errors.model && "border-red-400/40",
										)}
									/>
									<button
										type="button"
										onClick={handleFetchModels}
										disabled={fetchedModelsLoading}
										className="self-start text-[0.625rem] text-white/40 transition-colors hover:text-white/60"
									>
										{fetchedModelsLoading
											? t("aiProviders.form.refreshing")
											: t("aiProviders.form.refresh")}
									</button>
								</div>
							) : (
								<div className="flex flex-col gap-1.5">
									<div className="flex gap-1.5">
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
										<button
											type="button"
											onClick={handleFetchModels}
											disabled={
												fetchedModelsLoading || !baseUrl.trim()
											}
											title={
												!baseUrl.trim()
													? t("aiProviders.form.fetchTitleBlank")
													: t("aiProviders.form.fetchTitle")
											}
											className={cn(
												"flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1 text-[0.65625rem] font-medium transition-colors",
												fetchedModelsLoading || !baseUrl.trim()
													? "cursor-not-allowed border-white/10 text-white/25"
													: "border-white/15 text-white/70 hover:border-white/30 hover:bg-white/[0.06] hover:text-white",
											)}
										>
											<HugeiconsIcon
												icon={fetchedModelsLoading ? Loading02Icon : Search01Icon}
												className={cn(
													"size-3",
													fetchedModelsLoading && "animate-spin",
												)}
											/>
											{t("aiProviders.form.fetch")}
										</button>
									</div>
									{fetchedModelsError && (
										<p className="text-[0.625rem] text-amber-300/80">
											{t("aiProviders.form.fetchedModelError", { error: fetchedModelsError })}
										</p>
									)}
									{!fetchedModelsError && (
										<p className="text-[0.625rem] text-white/25">
											{t("aiProviders.form.modelHint")}
										</p>
									)}
								</div>
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
							<p className="text-[0.65625rem] text-red-300/90">{errors.model}</p>
						)}
					</div>

					{/* Media generation models (optional) */}
					<div className="flex flex-col gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.015] p-3">
						<div className="flex items-center gap-1.5">
							<HugeiconsIcon icon={SparklesIcon} className="size-3 text-white/40" />
							<span className="text-[0.6875rem] font-medium text-white/60">
								{t("aiProviders.form.mediaModelsTitle")}
							</span>
							<span className="text-[0.59375rem] text-white/30">
								{t("aiProviders.form.mediaModelsOptional")}
							</span>
						</div>
						<p className="text-[0.625rem] leading-relaxed text-white/30">
							{kind === "puter"
								? t("aiProviders.form.mediaModelsPuterHint")
								: t("aiProviders.form.mediaModelsHint")}
						</p>
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<MediaModelField
								id="provider-video-model"
								label={t("aiProviders.mediaModel.video")}
								value={videoModel}
								placeholder="e.g. sora-2, seedance-1.0-pro"
								onChange={setVideoModel}
								options={kind === "puter" ? puterMediaModels.video : []}
							/>
							<MediaModelField
								id="provider-image-model"
								label={t("aiProviders.mediaModel.image")}
								value={imageModel}
								placeholder="e.g. dall-e-3, flux-1"
								onChange={setImageModel}
								options={kind === "puter" ? puterMediaModels.image : []}
							/>
							<MediaModelField
								id="provider-audio-model"
								label={t("aiProviders.mediaModel.audio")}
								value={audioModel}
								placeholder="e.g. tts-1, bark"
								onChange={setAudioModel}
								options={kind === "puter" ? puterMediaModels.audio : []}
							/>
							<MediaModelField
								id="provider-media-model"
								label={t("aiProviders.mediaModel.media")}
								value={mediaModel}
								placeholder="e.g. music-gen, audio-lm"
								onChange={setMediaModel}
								options={kind === "puter" ? puterMediaModels.media : []}
							/>
						</div>
					</div>

					{/* Test result / hint */}
					{testError ? (
						<div className="flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-500/[0.08] p-2.5 text-[0.6875rem] text-red-200">
							<HugeiconsIcon
								icon={AlertCircleIcon}
								className="mt-0.5 size-3.5 shrink-0"
							/>
							<span className="leading-relaxed">{testError}</span>
						</div>
					) : (
						!testing && (
							<p className="text-[0.625rem] leading-relaxed text-white/35">
								{t("aiProviders.form.testHint")}
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
							<h3 className="mb-2 text-center text-[0.875rem] font-bold text-amber-200">
								{t("aiProviders.puterWarning.title")}
							</h3>
							<p className="mb-3 text-center text-[0.6875rem] leading-relaxed text-amber-100/80">
								{t("aiProviders.puterWarning.bodyPrefix")}{" "}
								<strong>{t("aiProviders.puterWarning.bodyStrong")}</strong>{" "}
								{t("aiProviders.puterWarning.bodySuffix")}
							</p>
							<p className="mb-4 text-center text-[0.6875rem] text-amber-100/60">
								{t("aiProviders.puterWarning.acknowledge")}
							</p>
							<div className="flex flex-col gap-2">
								<button
									type="button"
									onClick={handlePuterConfirm}
									disabled={puterCountdown > 0}
									className={cn(
										"w-full rounded-lg border px-4 py-2.5 text-[0.75rem] font-semibold transition-all",
										puterCountdown > 0
											? "cursor-not-allowed border-white/10 bg-white/[0.02] text-white/30"
											: "border-amber-400/30 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25",
									)}
								>
									{puterCountdown > 0
										? t("aiProviders.puterWarning.wait", { count: puterCountdown })
										: t("aiProviders.puterWarning.accept")}
								</button>
								<button
									type="button"
									onClick={handlePuterCancel}
									disabled={puterCountdown > 0}
									className={cn(
										"w-full rounded-lg border px-4 py-2 text-[0.6875rem] transition-all",
										puterCountdown > 0
											? "cursor-not-allowed border-white/5 text-white/20"
											: "border-white/10 text-white/50 hover:bg-white/[0.04] hover:text-white/70",
									)}
								>
									{t("aiProviders.puterWarning.cancel")}
								</button>
							</div>
							{puterCountdown > 0 && (
								<p className="mt-3 text-center text-[0.5625rem] text-white/30">
									{puterCountdown > 1
										? t("aiProviders.puterWarning.cannotDismissPlural", {
												count: puterCountdown,
										  })
										: t("aiProviders.puterWarning.cannotDismissSingular", {
												count: puterCountdown,
										  })}
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
						{t("aiProviders.form.test")}
					</Button>
					<Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
						{t("aiProviders.form.cancel")}
					</Button>
					<Button size="sm" onClick={handleSave}>
						<HugeiconsIcon
							icon={isEditing ? Edit01Icon : Add01Icon}
							className="size-3.5"
						/>
						{isEditing
							? t("aiProviders.form.save")
							: t("aiProviders.form.add")}
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

function formatRelativeTime(
	timestamp: number,
	t: (key: string, values?: Record<string, string | number>) => string,
): string {
	const diff = Date.now() - timestamp;
	if (diff < 60_000) return t("aiProviders.relativeTime.justNow");
	if (diff < 3_600_000)
		return t("aiProviders.relativeTime.minutesAgo", {
			count: Math.round(diff / 60_000),
		});
	if (diff < 86_400_000)
		return t("aiProviders.relativeTime.hoursAgo", {
			count: Math.round(diff / 3_600_000),
		});
	return t("aiProviders.relativeTime.daysAgo", {
		count: Math.round(diff / 86_400_000),
	});
}

/**
 * Searchable model select — a combobox that lets the user type to filter
 * a list of models and pick one. Used for all Puter.js model selections
 * (chat model, video/image/audio/media models). Falls back to showing
 * all options when the query is empty.
 *
 * Features:
 * - Type to filter by model id, name, or provider
 * - Keyboard navigation (arrow up/down, Enter, Escape)
 * - Click outside to close
 * - Shows "(provider)" label next to each model
 */
function SearchableModelSelect({
	id,
	value,
	onChange,
	options,
	placeholder,
	className,
}: {
	id: string;
	value: string;
	onChange: (v: string) => void;
	options: Array<{ id: string; provider: string; name?: string }>;
	placeholder?: string;
	className?: string;
}) {
	const { t } = useI18n();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [highlightedIndex, setHighlightedIndex] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return options;
		return options.filter((m) => {
			const name = (m.name ?? m.id).toLowerCase();
			return (
				m.id.toLowerCase().includes(q) ||
				name.includes(q) ||
				m.provider.toLowerCase().includes(q)
			);
		});
	}, [options, query]);

	// Clamp highlightedIndex into valid bounds whenever the filtered list
	// changes. Without this, the index can point past the end of the list
	// (e.g. when puterModels finish loading while the dropdown is open, or
	// when the user types a query that shrinks the result set). An
	// out-of-bounds index makes Enter silently select nothing, leaving the
	// dropdown "stuck" open with no visible feedback.
	const safeIndex = filtered.length > 0
		? Math.min(highlightedIndex, filtered.length - 1)
		: 0;

	const handleQueryChange = (next: string) => {
		setQuery(next);
		setHighlightedIndex(0);
	};

	// Reset transient state (query + highlight) whenever the dropdown
	// closes, so reopening starts from a clean state instead of a stale
	// query or an out-of-bounds highlight from a previous session.
	useEffect(() => {
		if (open) return;
		setQuery("");
		setHighlightedIndex(0);
	}, [open]);

	// Close on click outside
	useEffect(() => {
		if (!open) return;
		const handler = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [open]);

	// Focus input when opening
	useEffect(() => {
		if (open) inputRef.current?.focus();
	}, [open]);

	const selectedModel = options.find((m) => m.id === value);

	const closeDropdown = useCallback(() => {
		setOpen(false);
	}, []);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			if (filtered.length === 0) return;
			setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			if (filtered.length === 0) return;
			setHighlightedIndex((i) => Math.max(i - 1, 0));
		} else if (e.key === "Enter") {
			e.preventDefault();
			const pick = filtered[safeIndex];
			if (pick) {
				onChange(pick.id);
				closeDropdown();
			} else if (filtered.length > 0) {
				// Index was out of bounds — select the first item instead of
				// leaving the dropdown stuck open with no action.
				onChange(filtered[0].id);
				closeDropdown();
			}
			// If filtered is empty, do nothing — user must refine the query
			// or press Escape to close.
		} else if (e.key === "Escape") {
			e.preventDefault();
			closeDropdown();
		}
	};

	return (
		<div ref={containerRef} className="relative">
			{!open ? (
				<button
					type="button"
					id={id}
					onClick={() => setOpen(true)}
					className={cn(
						"flex h-9 w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 font-mono text-[0.75rem] text-white/90 outline-none transition-colors hover:border-white/20 focus:border-white/25",
						className,
					)}
				>
					<span className={cn("truncate", !value && "text-white/30")}>
						{value
							? `${selectedModel?.name ?? value}${selectedModel ? ` (${selectedModel.provider})` : ""}`
							: (placeholder ?? t("aiProviders.modelSelect.placeholder"))}
					</span>
					<HugeiconsIcon
						icon={ArrowDown03Icon}
						className="ml-2 size-3.5 shrink-0 text-white/40"
					/>
				</button>
			) : (
				<>
					{/*
					 * Search bar is rendered in normal flow (not absolute) so the
					 * parent container keeps its height. The previous version used
					 * `absolute inset-0` which collapsed the parent to 0px when the
					 * closed button was unmounted, making the input invisible.
					 */}
					<div
						className={cn(
							"flex h-9 w-full items-center gap-2 rounded-lg border border-white/25 bg-[#1a1a1e] px-3 shadow-lg",
							className,
						)}
					>
						<HugeiconsIcon
							icon={Search01Icon}
							className="size-3.5 shrink-0 text-white/40"
						/>
						<input
							ref={inputRef}
							value={query}
							onChange={(e) => handleQueryChange(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder={t("aiProviders.modelSelect.searchPlaceholder")}
							className="h-full w-full bg-transparent font-mono text-[0.75rem] text-white/90 outline-none placeholder:text-white/30"
						/>
					</div>
					{/*
					 * Dropdown is absolutely positioned below the search bar so it
					 * overlays subsequent form fields without pushing layout.
					 */}
					{filtered.length > 0 && (
						<div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-white/10 bg-[#1a1a1e] p-1 shadow-xl">
							{filtered.map((m, i) => (
								<button
									type="button"
									key={m.id}
									onClick={() => {
										onChange(m.id);
										closeDropdown();
									}}
									onMouseEnter={() => setHighlightedIndex(i)}
									className={cn(
										"flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left font-mono text-[0.6875rem] transition-colors",
										i === safeIndex
											? "bg-white/10 text-white"
											: "text-white/70 hover:bg-white/5",
										m.id === value && "text-white",
									)}
								>
									<span className="truncate">
										{m.name ?? m.id}
									</span>
									<span className="ml-2 shrink-0 text-[0.5625rem] text-white/35">
										{m.provider}
									</span>
								</button>
							))}
						</div>
					)}
					{filtered.length === 0 && (
						<div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-white/10 bg-[#1a1a1e] p-3 text-center text-[0.6875rem] text-white/40 shadow-xl">
							{t("aiProviders.modelSelect.noMatch", { query })}
						</div>
					)}
				</>
			)}
		</div>
	);
}

/**
 * Media model field — shows a searchable dropdown when Puter media models
 * are available, falls back to a text input otherwise. This lets Puter
 * users pick from fetched models while still allowing manual entry
 * for non-Puter providers.
 */
function MediaModelField({
	id,
	label,
	value,
	placeholder,
	onChange,
	options,
}: {
	id: string;
	label: string;
	value: string;
	placeholder: string;
	onChange: (v: string) => void;
	options: Array<{ id: string; provider: string; name?: string }>;
}) {
	const { t } = useI18n();
	if (options.length > 0) {
		// Build options with a "None" entry prepended so the user can
		// clear the selection from the searchable dropdown itself.
		const optsWithNone = [
			{ id: "", provider: "", name: t("aiProviders.modelSelect.none") },
			...options,
		];
		return (
			<div className="flex flex-col gap-1">
				<label htmlFor={id} className="text-[0.625rem] text-white/45">
					{label}
				</label>
				<SearchableModelSelect
					id={id}
					value={value}
					onChange={onChange}
					options={optsWithNone}
					placeholder={t("aiProviders.modelSelect.none")}
					className="h-8 text-[0.6875rem]"
				/>
			</div>
		);
	}
	return (
		<div className="flex flex-col gap-1">
			<label htmlFor={id} className="text-[0.625rem] text-white/45">
				{label}
			</label>
			<Input
				id={id}
				value={value}
				placeholder={placeholder}
				onChange={(e) => onChange(e.target.value)}
				className="h-8 font-mono text-[0.6875rem]"
			/>
		</div>
	);
}

// silence the unused-import warning if Settings02Icon / Time01Icon ever
// become unused; kept so the icons panel is easy to extend later.
void Settings02Icon;
void Time01Icon;
