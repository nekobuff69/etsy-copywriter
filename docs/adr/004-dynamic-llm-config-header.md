# ADR 004: Dynamic LLM Configuration via Custom HTTP Header

**Status:** Accepted

**Context:**
The app originally used hardcoded OpenRouter models with the API key stored only in a server-side environment variable (`process.env.OPENROUTER_API_KEY`). The new Settings page allows users to configure arbitrary OpenAI-compatible endpoints — custom base URLs, API keys, and model IDs for both the vision and copy pipelines. This means the server must receive per-request LLM configuration from the client, since each user (or each session) may use different providers.

We evaluated:
1. Query parameters — visible in URLs and server logs, leaks API keys.
2. Request body — works for JSON endpoints but not supported by `useObject` for FormData multipart uploads.
3. Custom HTTP header — uniform across JSON and FormData requests, not logged by default, easily parsed server-side.
4. Server-side session store — stateful, requires session management infrastructure, overkill for a single-user local app.

**Decision:**
Pass LLM configuration via a custom HTTP header `X-LLM-Config` on every API request.

**Rationale:**
- The header works uniformly across all request types: JSON bodies (`/api/generate-copy`, `/api/health-check`) and FormData multipart (`/api/analyze-image`). The "Run All" feature calls both endpoints sequentially from the client, so both header types are used in one user flow.
- Base64-encoded JSON in a header avoids CORS preflight complications (custom headers are already sent with `fetch`).
- A shared server-side helper (`parseSettingsFromRequest`) centralizes parsing and validation, preventing duplication across route handlers.
- The client uses a synchronous `getStoredSettings()` utility that reads `localStorage` at request time, avoiding React stale-closure issues.
- If the client sends an empty `apiKey`, the server falls back to `process.env.OPENROUTER_API_KEY`, preserving the zero-config out-of-box experience.

**Consequences:**
- Every API route must call the settings parser at the top of its handler.
- The `@ai-sdk/openai-compatible` provider must be instantiated per-request (no caching across requests).
- Malformed headers return 400 before any LLM call is attempted.
- `useObject`'s `headers` prop and manual `fetch` calls must both inject the header.
