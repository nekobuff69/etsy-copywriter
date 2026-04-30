# ADR 001: API Routes over Server Actions for Pipeline Endpoints

**Status:** Accepted

**Context:**
The Etsy Copywriter MVP needed three backend endpoints:
- `/api/analyze-image` — vision model analysis from uploaded image
- `/api/generate-copy` — copy generation from analysis JSON
- `/api/run-all` — server-side sequential chaining of both pipelines

We evaluated Server Actions (Next.js App Router native) vs API Route Handlers.

**Decision:**
Use API Route Handlers (not Server Actions).

**Rationale:**
- Streaming structured JSON via `streamObject().toTextStreamResponse()` is simpler in route handlers — no special streaming serialization for Server Actions.
- `useObject` from `@ai-sdk/react` expects a standard HTTP endpoint; Server Actions require `useAction` which has different semantics.
- The `/api/run-all` route needs to call `analyzeImage` then `generateCopy` sequentially on the server — trivial in a route handler, awkward in a Server Action because of streaming + chaining complexity.
- FormData multipart upload is first-class in route handlers (`req.formData()`).

**Consequences:**
- Slightly more boilerplate (separate route files vs colocated Server Actions).
- Client must call `fetch` or `useObject` explicitly.
- Benefits: standard HTTP semantics, works with `useObject` hook natively, easy to test independently.
