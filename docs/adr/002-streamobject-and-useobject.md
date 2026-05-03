# ADR 002: streamObject + useObject for Structured Streaming

**Status:** Accepted

**Context:**
The original pipelines used `streamText` with `Output.object()` for structured JSON streaming. The AI SDK v6 deprecated `streamObject` in favor of `streamText` + `output`, but `useObject` from `@ai-sdk/react` still relies on endpoints returning a text stream of partial JSON objects.

We evaluated:
1. `streamText` + `Output.object()` + custom client-side parser
2. `streamObject` (deprecated but functional) + `useObject` hook
3. `streamText` + `output` + `useChat`/`useCompletion` with manual parsing

**Decision:**
Use `streamObject` on the server and `experimental_useObject` on the client.

**Rationale:**
- `streamObject(...).toTextStreamResponse()` gives exactly the text/plain stream that `useObject` consumes.
- `useObject` provides progressive object hydration out of the box — no custom parser needed.
- The hook gives `isLoading`, `stop`, and `clear` for free — matching our UI requirements.
- Although `streamObject` is deprecated in `ai` v6, it is stable and the replacement (`streamText` + `output`) does not yet have a matching client hook for object streaming.
- When `ai` v7 unifies this, migration is mechanical: swap `streamObject` for `streamText` + `output` on server, keep `useObject` on client.

**Consequences:**
- Import name is `experimental_useObject` (aliased to `useObject` internally).
- Must suppress deprecation warnings via `globalThis.AI_SDK_LOG_WARNINGS = false` in both pipeline modules.
- Future upgrade path: swap `streamObject` → `streamText` + `output` on server only.
