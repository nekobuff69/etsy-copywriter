# Etsy Copywriter

AI-powered Etsy listing assistant for artwork sellers. Upload an image, review the AI's structured analysis, and generate SEO-optimized titles, tags, and descriptions — all in a single-page workspace with streaming results, session history, and dark mode.

## Features

- **Image-to-analysis pipeline** — Vision model extracts subject, product type, medium, artistic style, colors, and vibe keywords from a product photo.
- **User context** — Optional free-text field describing the product. Injected as authoritative ground truth for the vision model and as selling context for the copy model.
- **Streaming results** — Structured JSON streams token-by-token via `useObject`; partial output is visible before generation finishes.
- **Editable analysis** — All 6 analysis fields are editable after generation, so you can correct the AI before generating copy.
- **Copy generation** — LLM produces 3 title options, 5–8 ranked SEO tags, and a product description from the analysis.
- **Run All** — One-click sequential pipeline orchestrated client-side: analyze → generate copy → auto-save session.
- **Per-session model settings** — Configure model ID, base URL, and API key for vision and copy pipelines independently. Config encoded as a base64 header on every API request.
- **Session history** — localStorage-backed (max 20, LRU eviction). Sessions grouped by image hash. Group titles editable via double-click. Past sessions open read-only with prev/next navigation.
- **Adaptable schema and prompts** — The 6-field analysis schema and 3-key copy schema (in `lib/schemas.ts`) plus the system prompts (in `lib/getImageAnalysis.ts` and `lib/getCopyWritings.ts`) are plain code, not hardcoded to Etsy. Replace the Zod schemas and prompt text to repurpose the app for any structured extraction → structured generation workflow: product reviews, real estate listings, medical reports, or anything else. The streaming pipeline and UI adapt automatically to whatever schema you define.
- **Dark mode** — Warm-dark palette, preference persisted to localStorage.
- **Kami design system** — Warm parchment background, ivory cards, sage accent (`#4A5D3F`), Charter/Georgia serif stack.

## Architecture

```
UploadZone ──userText──▶ useWorkspace ──▶ usePipeline
                    │                      ├── startAnalysis()  → POST /api/analyze-image
                    │                      ├── startCopy()      → POST /api/generate-copy
                    │                      └── runAll()         → both sequentially
                    │
                    ▼
            ┌────────────── API ──────────────────┐
            │  parseSettingsFromRequest()          │
            │    → decode X-LLM-Config header      │
            │    → createProvider()                │
            │    → streamObject() + toTextStreamResponse()
            └──────────────────────────────────────┘
                    │
            ┌───────┴────────┐
            ▼                ▼
 lib/getImageAnalysis.ts   lib/getCopyWritings.ts
   Vision model (Qwen)       LLM (Qwen)
   6-field schema            3-key schema
   userText as ground truth  userText as context
```

**Key design:**

- **Streaming via `streamObject` + `toTextStreamResponse()`** — The deprecated `streamObject` is retained because Qwen via OpenRouter ignores `response_format: json_schema`. The Zod schema is enforced by embedding it verbatim in the system prompt, and `toTextStreamResponse()` streams raw JSON that the client parses progressively with `useObject`.
- **No server-side `.object` await** — `streamObject().object` never resolves with Qwen/OpenRouter, so Run All is orchestrated client-side (two sequential fetches) rather than via a server-side `/api/run-all` endpoint.
- **LLM config is per-request** — Settings (model, baseURL, API key) are serialized into an `X-LLM-Config` header on every request. The server decodes and validates it with Zod. Empty API key falls back to `OPENROUTER_API_KEY` env var.
- **History is client-side** — Sessions stored in localStorage with compressed 200×200 JPEG thumbnails. LRU eviction at 20 sessions.

## Stack

- **Framework:** Next.js 16 (App Router)
- **AI SDK:** `ai` v6 + `@ai-sdk/react` + `@ai-sdk/openai-compatible`
- **Styling:** Tailwind CSS 4 + shadcn/ui + Kami design system
- **Provider:** Any OpenAI-compatible endpoint (default: OpenRouter)
- **Validation:** Zod
- **Test:** Vitest

## Getting Started

```bash
pnpm install
cp .env.example .env    # add your OPENROUTER_API_KEY
pnpm dev                # → http://localhost:3000
```

```env
# .env
OPENROUTER_API_KEY=sk-or-...
```

The settings page UI can override the API key per session.

```bash
pnpm test    # Vitest
pnpm lint    # ESLint
pnpm build   # Production build
```


## Additional Notes

- **Supported images:** `jpg`, `png`, `webp`, `gif` — validated via `fileTypeFromBuffer`.
- **Default models:** Vision — `openrouter/quasar-alpha` (or `qwen/qwen3-vl-8b-instruct`), Copy — `openrouter/quasar-alpha` (or `qwen/qwen3-vl-30b-a3b-instruct`). Swap in Settings.
- **Debug:** Console logs tagged `[PIPELINE]`. Collapsible `<DebugPanel>` at the bottom of the workspace shows stage, errors, and raw JSON.
- **Type errors:** If the model returns invalid JSON, `useObject.onFinish` surfaces a `TypeValidationError` banner instead of silently showing empty fields.
- **Architecture Decision Records** live in [`docs/adr/`](docs/adr/) — covers the reasoning behind API routes over server actions, client-side Run All, the config header, and the Kami design system.
