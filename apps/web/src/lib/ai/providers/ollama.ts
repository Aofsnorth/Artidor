/**
 * Ollama provider — talks to the local Ollama HTTP server.
 *
 * Ollama exposes an OpenAI-compatible `/v1/chat/completions` endpoint on
 * recent versions, so we delegate to the same request shape as the
 * OpenAI provider. The only differences are the default `baseUrl` and
 * the missing `Authorization` header.
 */

import { OpenAIProvider } from "./openai";
import type { ProviderConfig, ProviderName } from "../provider";

export class OllamaProvider extends OpenAIProvider {
	constructor(config: ProviderConfig) {
		// Re-shape the config to look like an OpenAI one with a dummy
		// apiKey (the parent would otherwise reject the request). The
		// HTTP layer never sends the auth header for Ollama, so this
		// is harmless.
		super({ ...config, apiKey: config.apiKey ?? "ollama" });
	}

	override get name(): ProviderName {
		return "ollama";
	}
}
