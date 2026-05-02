# ADR 007: Client-Side Run All Orchestration (Remove /api/run-all)

**Status:** Accepted

**Context:**
The "Run All" feature chains image analysis → copy generation into a single user action. The original implementation used a server-side `/api/run-all` endpoint that:

1. Accepted a `FormData` image upload
2. Called `analyzeImage()` → awaited `streamObject().object` for the full analysis result
3. Passed the analysis to `generateCopy()` → awaited `streamObject().object` for the full copy result
4. Streamed progress as NDJSON lines (`{stage: "analyzing"}`, `{stage: "generating"}`, `{stage: "done", analysis, copy}`)

This endpoint **hung indefinitely** because `streamObject().object` (the server-side `.object` promise) never resolves with Qwen models via OpenRouter. The provider silently ignores the `response_format: json_schema` parameter that the AI SDK sends. The model does output valid JSON (because the schema is embedded in the system prompt), but the SDK's internal parser waits forever for structured output metadata that never arrives.

The individual `/api/analyze-image` and `/api/generate-copy` endpoints work correctly because they return `toTextStreamResponse()` — the raw text stream is consumed client-side by `useObject`, which progressively parses the partial JSON. No `.object` await is involved.

**Decision:**
Remove the `/api/run-all` endpoint entirely. Orchestrate the Run All flow client-side in `usePipeline.runAll()` by calling the two existing, working endpoints sequentially through the `useObject` hooks.

**Rationale:**
- The `useObject` hooks for analysis and copy are already set up and working. `runAll` just needs to call `submitAnalysis`, wait for `onFinish`, then call `submitCopy`, wait for `onFinish`, then save the session.
- This avoids `.object` entirely — the only code path that hangs with Qwen/OpenRouter.
- Fewer moving parts: no server-side chaining, no NDJSON streaming protocol, no timeout wrapper.
- The client already has `onStateChange` callbacks that update the UI stage badge ("analyzing" → "generating").
- Promise orchestration is done via `useRef` resolver/rejector pairs (`analysisResolveRef`, `copyResolveRef`) that the `onFinish`/`onError` callbacks invoke. This avoids React stale-closure issues with async state.

**Consequences:**
- `/api/run-all` route and its test file are deleted.
- `usePipeline.runAll()` is slightly more complex (promise-based orchestration of two `useObject` hooks) but the logic is straightforward and testable.
- The `stop()` action now rejects pending runAll promises in addition to calling `stopAnalysis()` / `stopCopy()`.
- Session save happens in `onCopyFinish` (as before) and also as a guarantee at the end of `runAll` — the duplicate `saveSession` call is idempotent (same localStorage key).
- No NDJSON progress streaming — the UI updates stage via `onStateChange` callbacks, which is sufficient for the two-stage pipeline.