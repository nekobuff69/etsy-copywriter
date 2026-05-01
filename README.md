# Etsy Copywriter MVP

AI-powered Etsy listing copywriter for artwork sellers. Upload an image, review/edit the AI's structured analysis, and generate SEO-optimized titles, tags, and descriptions — all in a single-page workspace with streaming results, session history, model settings, and dark mode.

## What it does

1. **Upload** — Drag & drop or click to upload an artwork image (jpg, png, webp, gif).
2. **Image Analysis** — Vision model extracts structured metadata:
   - Core attributes (subject, orientation, composition)
   - Technical specs (medium, surface, textures, visible tools)
   - Visual identity (colors, lighting, artistic style)
   - Marketing hooks (emotional keywords, symbolism, placement, handcrafted details)
3. **Copy Generation** — LLM produces Etsy-ready listing copy:
   - 3 title options
   - 5–8 SEO tags (ranked by relevance)
   - Compelling product description
4. **Run All** — One-click sequential pipeline (analyze → generate copy) with NDJSON progress streaming.
5. **History** — Sessions auto-saved to localStorage (max 20, LRU eviction) with compressed thumbnails and timestamps. History sessions are read-only.
6. **Settings** — Per-session model selection (model, base URL, API key) with localStorage persistence.

## Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS 4 + shadcn/ui (New York style, CSS variables)
- **AI SDK:** `ai` v6 + `@ai-sdk/react` v3 + `@ai-sdk/openai-compatible` v2
- **Provider:** OpenRouter (OpenAI-compatible endpoint)
- **Validation:** Zod v4
- **Testing:** Vitest
- **State:** Custom hooks (`useWorkspace`, `usePipeline`, `useUpload`) + `experimental_useObject` for streaming structured JSON

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Root redirects to `/workspace`.

## Environment Variables

Create a `.env` file:

```env
OPENROUTER_API_KEY=your_key_here
```

The `.env` is loaded automatically by Next.js. The settings page UI can override the API key per session; if left blank, the env variable is used as a fallback.

## Project Structure

```
app/
  page.tsx                             # Redirects to /workspace
  layout.tsx                           # Root layout with ThemeProvider + Toaster
  globals.css                          # Tailwind 4 + CSS variables
  components/TopNav.tsx                # Top-level navigation
  workspace/
    page.tsx                           # Layout shell wiring useWorkspace to zone components
    hooks/useWorkspace.ts              # Orchestrator: state, AI hooks, file lifecycle, history
    hooks/usePipeline.ts               # AI streaming: analyze, copy, runAll, stop, save
    hooks/useUpload.ts                 # File selection, preview, thumbnail generation
    components/UploadZone.tsx          # File drop, preview, Analyze / Run All / Stop buttons
    components/AnalysisZone.tsx        # Editable 4-section analysis form + Generate Copy / Stop
    components/CopyZone.tsx            # Titles, tags, description with per-field copy buttons
    components/Header.tsx              # Title, history toggle, New Session, theme switcher
    components/HistorySidebar.tsx      # Session list with thumbnail, restore, delete, clear
    components/DebugPanel.tsx          # Collapsible debug: stage, loading, errors, raw JSON
  history/
    page.tsx                           # Dedicated history page
    hooks/useHistory.ts                # History page data hook
    components/HistoryGroupCard.tsx    # History group card component
    components/HistorySessionRow.tsx   # Single history session row
  settings/
    page.tsx                           # Model settings page (baseURL, apiKey, model)
  api/
    analyze-image/route.ts             # POST FormData → streamObject → text stream
    generate-copy/route.ts             # POST analysis JSON → streamObject → text stream
    run-all/route.ts                   # Sequential chain with NDJSON progress
    health-check/route.ts              # Health check endpoint
components/
  ui/                                  # shadcn components (button, card, textarea, etc.)
  theme-provider.tsx                   # next-themes wrapper
  ThemeToggle.tsx                      # Dark/light mode toggle
lib/
  getImageAnalysis.ts                  # Vision pipeline: validate → base64 → streamObject
  getCopyWritings.ts                   # Copy pipeline: validate analysis → streamObject
  schemas.ts                           # Zod schemas (imageAnalysisSchema, copyWritingSchema)
  definitions.ts                       # TypeScript types inferred from schemas
  history.ts                           # localStorage session manager (LRU @ 20)
  session.ts                           # Session mode state machine (current vs history)
  file-utils.ts                        # File → base64 data URL + 200×200 JPEG thumbnail
  file-hash.ts                         # Image content hashing
  settings.ts                          # AppSettings model, encode/decode, localStorage
  useSettings.ts                       # Client settings hook
  llm-provider.ts                      # createProvider(OpenAI-compatible) factory
  api-settings.ts                      # Server-side settings parsing from request header
  utils.ts                             # cn() class merger (shadcn utility)
tests/
  getImageAnalysis.test.ts             # Pipeline unit tests
  history.test.ts                      # History manager tests
  session.test.ts                      # Session mode state machine tests
  file-utils.test.ts                   # File conversion + thumbnail tests
docs/
  adr/                                 # Architecture Decision Records
  agents/                              # Agent skills docs
  copywriting-knowledge/               # Reference docs
```

## Running Tests

```bash
pnpm test        # Vitest
pnpm lint        # ESLint
pnpm build       # Production build
```

## Key Design Decisions

See [`docs/adr/`](docs/adr/):

- **ADR 001:** API Routes over Server Actions — route handlers give standard HTTP streaming that `useObject` consumes natively.
- **ADR 002:** `streamObject` + `experimental_useObject` — deprecated in ai v6 but still the only path for progressive structured-object streaming with current React hooks.
- **ADR 003:** FormData multipart for images — avoids base64 bloat in requests, native browser support, aligns with `Uint8Array`-accepting pipelines.

## Important Notes

### `streamObject` schema enforcement
`streamObject` in ai v6 is deprecated and does not enforce the Zod schema on models that lack native structured output support (e.g., Qwen via OpenRouter). To force the correct JSON shape, both pipeline modules embed the full schema structure in the system prompt and pass `schemaName` / `schemaDescription`. Without this, the model returns flat JSON like `{"description":"..."}` instead of the required nested structure.

### Client-side error handling
Both `useObject` `onFinish` callbacks check the `error` property. If the model's output fails Zod validation (TypeValidationError), the error is surfaced to the user via a destructive alert banner instead of silently showing empty fields.

### Debug mechanics
- Console logs tagged `[PIPELINE]` in `usePipeline.ts` and `useWorkspace.ts` for stage transitions and action triggers.
- Collapsible `<DebugPanel>` at the bottom of the workspace page shows live pipeline state, error messages, and raw JSON of analysis/copy objects.
- `grep '\[PIPELINE\]'` to find all debug output.

### FormData + useObject
`useObject` does not natively support FormData. The analyze-image hook provides a custom `fetch` function that reads `formDataRef.current` and sends it via POST.

### `globalThis.AI_SDK_LOG_WARNINGS = false`
Suppresses SDK warnings in both pipeline modules.

## Default Models

- **Vision:** `qwen/qwen3-vl-8b-instruct` (OpenRouter)
- **Copy:** `qwen/qwen3-vl-30b-a3b-instruct` (OpenRouter)

## Supported Image Formats

`jpg`, `png`, `webp`, `gif` — validated via `file-type` (`fileTypeFromBuffer`) before processing.
