/**
 * User-managed AI provider store.
 *
 * Persists a list of AI provider configurations (base URL, API key,
 * model name, etc.) to localStorage so the user can configure their
 * own OpenAI-compatible endpoint without editing server env vars. The
 * chat route (`/api/ai/chat`) accepts a client-side provider config
 * per request; if none is supplied it falls back to the server's
 * env-var resolution.
 *
 * Provider kinds supported:
 *  - "openai-compatible" — any endpoint that speaks the OpenAI Chat
 *    Completions schema. Covers OpenAI itself, Together, Groq,
 *    OpenRouter, LM Studio, llama.cpp's server, vLLM, etc.
 *  - "anthropic-compatible" — Anthropic Messages API (Claude models).
 *    Uses the server-side Anthropic provider code path.
 *  - "ollama" — local Ollama instance. Reuses the openai-compatible
 *    code path because Ollama exposes the same schema on
 *    `/v1/chat/completions` from v0.1.32 onward.
 *  - "puter" — Puter.js, a free browser-based provider. Runs entirely
 *    client-side via the Puter.js SDK.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ProviderKind =
	| "openai-compatible"
	| "anthropic-compatible"
	| "ollama"
	| "puter";

/**
 * A user-configured AI provider. The id is a client-side uuid used as
 * the React key + the storage key. `isDefault` means "the one the AI
 * Edit panel should use" — at most one provider can be default.
 */
export interface AIProvider {
	id: string;
	/** User-facing label shown in the picker + cards. */
	name: string;
	kind: ProviderKind;
	/**
	 * Base URL of the API root. For OpenAI-compatible this is the
	 * `/v1` root (e.g. `https://api.openai.com/v1` or
	 * `http://localhost:1234/v1`). The chat code path appends
	 * `/chat/completions` automatically if the URL ends in `/v1`.
	 */
	baseUrl: string;
	/** API key sent as `Authorization: Bearer …`. Empty for local Ollama. */
	apiKey: string;
	/** Model name sent in the request body (e.g. `gpt-4o-mini`, `llama3.1`). */
	model: string;
	/**
	 * Optional model for video generation (e.g. `sora-2`, `seedance-1.0-pro`).
	 * When empty, the AI cannot call video generation tools.
	 */
	videoModel?: string;
	/**
	 * Optional model for image generation (e.g. `dall-e-3`, `flux-1`).
	 * When empty, the AI cannot call image generation tools.
	 */
	imageModel?: string;
	/**
	 * Optional model for audio generation (e.g. `tts-1`, `bark`).
	 * When empty, the AI cannot call audio generation tools.
	 */
	audioModel?: string;
	/**
	 * Optional model for general media generation (e.g. music, SFX).
	 * When empty, the AI cannot call media generation tools.
	 */
	mediaModel?: string;
	/** Disabled providers stay in the list but are skipped by the picker. */
	enabled: boolean;
	/** True for at most one provider — the one used by AI Edit. */
	isDefault: boolean;
	/** ISO timestamp of when the connection last succeeded. Useful for the UI. */
	lastTestedAt?: number;
	/** Cached test result — keeps the UI from showing stale red dots. */
	lastTestOk?: boolean;
}

interface AIProvidersState {
	providers: AIProvider[];
	addProvider: (input: Omit<AIProvider, "id" | "isDefault">) => string;
	updateProvider: (id: string, patch: Partial<AIProvider>) => void;
	deleteProvider: (id: string) => void;
	setDefault: (id: string) => void;
	markTestResult: (id: string, ok: boolean) => void;
	getDefault: () => AIProvider | undefined;
}

/**
 * Default values for new providers. Everything except `enabled` and
 * `isDefault` has to be supplied by the user — `enabled` defaults to
 * true so a freshly-added provider is immediately usable.
 */
function generateId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `provider-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useAIProvidersStore = create<AIProvidersState>()(
	persist(
		(set, get) => ({
			providers: [],

			addProvider: (input) => {
				const id = generateId();
				const isFirst = get().providers.length === 0;
				set((state) => ({
					providers: [
						...state.providers,
						{
							...input,
							id,
							enabled: input.enabled ?? true,
							// First provider added is automatically default so
							// the AI Edit panel never opens with no provider
							// selected.
							isDefault: isFirst,
						},
					],
				}));
				return id;
			},

			updateProvider: (id, patch) => {
				set((state) => ({
					providers: state.providers.map((p) =>
						p.id === id ? { ...p, ...patch } : p,
					),
				}));
			},

			deleteProvider: (id) => {
				set((state) => {
					const removed = state.providers.find((p) => p.id === id);
					const remaining = state.providers.filter((p) => p.id !== id);
					// If we deleted the default, promote the first enabled
					// remaining provider so the user never ends up with an
					// empty default.
					let defaultId = removed?.isDefault
						? null
						: (state.providers.find((p) => p.isDefault)?.id ?? null);
					if (defaultId === null && remaining.length > 0) {
						defaultId =
							remaining.find((p) => p.enabled)?.id ?? remaining[0]?.id ?? null;
					}
					return {
						providers: remaining.map((p) =>
							p.id === defaultId ? { ...p, isDefault: true } : p,
						),
					};
				});
			},

			setDefault: (id) => {
				set((state) => ({
					providers: state.providers.map((p) => ({
						...p,
						isDefault: p.id === id,
					})),
				}));
			},

			markTestResult: (id, ok) => {
				set((state) => ({
					providers: state.providers.map((p) =>
						p.id === id
							? {
									...p,
									lastTestedAt: Date.now(),
									lastTestOk: ok,
								}
							: p,
					),
				}));
			},

			getDefault: () => {
				const { providers } = get();
				return (
					providers.find((p) => p.isDefault && p.enabled) ??
					providers.find((p) => p.enabled) ??
					providers[0]
				);
			},
		}),
		{
			name: "artidor-ai-providers",
			partialize: (state) => ({ providers: state.providers }),
		},
	),
);
