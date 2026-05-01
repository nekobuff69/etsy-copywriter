import {describe, it, expect, vi} from "vitest";
import {createProvider} from "../lib/llm-provider";

vi.mock("@ai-sdk/openai-compatible", () => ({
	createOpenAICompatible: vi.fn(() => (modelId: string) => ({modelId})),
}));

describe("createProvider", () => {
	it("creates a provider with given config", () => {
		const config = {
			baseURL: "https://api.example.com/v1",
			apiKey: "test-key",
			model: "test-model",
		};
		const provider = createProvider(config);
		expect(provider).toBeDefined();
		expect(typeof provider).toBe("function");
		const model = provider("test-model");
		expect(model).toEqual({modelId: "test-model"});
	});

	it("falls back to OPENROUTER_API_KEY when apiKey is empty", () => {
		process.env.OPENROUTER_API_KEY = "fallback-key";
		const config = {
			baseURL: "https://openrouter.ai/api/v1",
			apiKey: "",
			model: "test-model",
		};
		const provider = createProvider(config);
		expect(provider).toBeDefined();
		delete process.env.OPENROUTER_API_KEY;
	});

	it("throws when no api key is available", () => {
		delete process.env.OPENROUTER_API_KEY;
		const config = {
			baseURL: "https://api.example.com/v1",
			apiKey: "",
			model: "test-model",
		};
		expect(() => createProvider(config)).toThrow("No API key provided");
	});
});
