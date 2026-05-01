# ADR 005: OpenAI-Compatible Provider Factory

**Status:** Accepted

**Context:**
The original pipelines used `@openrouter/ai-sdk-provider` with hardcoded model strings (`qwen/qwen3-vl-8b-instruct` for vision, `qwen/qwen3-vl-30b-a3b-instruct` for copy). The provider was created once at module level and baked into `analyzeImage` and `generateCopy`. This worked for a single provider but blocked user customization.

We needed to support arbitrary OpenAI-compatible endpoints: OpenRouter, Ollama, local proxies, or other providers. We evaluated:
1. Keep `@openrouter/ai-sdk-provider` and add a parallel "custom" codepath using `@ai-sdk/openai-compatible`.
2. Switch entirely to `@ai-sdk/openai-compatible` and use it for all endpoints including OpenRouter.
3. Use the generic `createOpenAICompatible` from `ai` core without the `@ai-sdk/openai-compatible` package.

**Decision:**
Replace `@openrouter/ai-sdk-provider` with `@ai-sdk/openai-compatible` as the sole provider SDK. Introduce a shared factory function `createProvider(config)` that builds the provider instance from user settings.

**Rationale:**
- OpenRouter itself is OpenAI-compatible; `@ai-sdk/openai-compatible` with `baseURL: "https://openrouter.ai/api/v1"` covers the existing default behavior exactly.
- A single provider SDK eliminates conditional codepaths and reduces bundle size (the OpenRouter-specific package can be removed).
- The factory encapsulates provider instantiation in one place: `apiKey`, `baseURL`, and any future options (e.g., custom headers) are set consistently.
- Pipeline functions (`analyzeImage`, `generateCopy`) become pure: they receive a provider instance and a model string, with no knowledge of how the provider was constructed. This makes them testable with mock providers.

**Consequences:**
- `@openrouter/ai-sdk-provider` can be removed from `package.json` once migration is complete.
- All API routes must import and call `createProvider` before invoking pipeline functions.
- Provider instantiation happens per-request (not cached), since settings may change between requests.
- The `ai` SDK version must stay compatible with `@ai-sdk/openai-compatible`.
