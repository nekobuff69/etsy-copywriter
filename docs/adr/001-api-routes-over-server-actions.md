# ADR 001: API Routes over Server Actions for Pipeline Endpoints

**Status:** Accepted

**Context:**
The Etsy Copywriter MVP needed backend endpoints for:
- `/api/analyze-image` — vision model analysis from uploaded image
- `/api/generate-copy` — copy generation from analysis JSON

(A `/api/run-all` endpoint was initially created but later removed — see ADR 007.)

We evaluated Server Actions (Next.js App Router native) vs API Route Handlers.

**Decision:**
Use API Route Handlers (not Server Actions).

**Rationale:**
- Streaming structured JSON via `streamObject().toTextStreamResponse()` is simpler in route handlers — no special streaming serialization for Server Actions.
- `useObject` from `@ai-sdk/react` expects a standard HTTP endpoint; Server Actions require `useAction` which has different semantics.
- Sequential pipeline orchestration (previously server-side in `/api/run-all`) is now done client-side via `usePipeline.runAll()` — see ADR 007. This avoids the `streamObject().object` hang with Qwen/OpenRouter.
- FormData multipart upload is first-class in route handlers (`req.formData()`).

**Consequences:**
- Slightly more boilerplate (separate route files vs colocated Server Actions).
- Client must call `fetch` or `useObject` explicitly.
- Benefits: standard HTTP semantics, works with `useObject` hook natively, easy to test independently.
