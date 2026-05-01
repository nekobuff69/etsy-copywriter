import {createOpenAICompatible} from "@ai-sdk/openai-compatible";
import type {LlmConfig} from "./settings";

export function createProvider(config: LlmConfig) {
	const apiKey = config.apiKey || process.env.OPENROUTER_API_KEY;
	if (!apiKey) {
		throw new Error(
			"No API key provided. Set it in settings or as OPENROUTER_API_KEY environment variable.",
		);
	}
	return createOpenAICompatible({
		name: "custom-provider",
		baseURL: config.baseURL,
		apiKey,
	});
}
