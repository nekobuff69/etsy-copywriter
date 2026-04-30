# Etsy Copywriter MVP

AI-powered Etsy listing copywriter for artwork sellers. Upload an image, review/edit the AI's structured analysis, and generate SEO-optimized titles, tags, and descriptions — all in a single-page workspace with streaming results, history, and dark mode.

## What it does

1. **Upload** — Drag & drop or click to upload an artwork image (jpg, png, webp, gif).
2. **Image Analysis** — Vision model (Qwen3-VL via OpenRouter) extracts structured metadata:
   - Core attributes (subject, orientation, composition)
   - Technical specs (medium, surface, textures, visible tools)
   - Visual identity (colors, lighting, style)
   - Marketing hooks (emotional keywords, symbolism, placement suggestions)
3. **Copy Generation** — LLM produces Etsy-ready listing copy:
   - 3 title options
   - 5–8 SEO tags (ranked by relevance)
   - Compelling product description
4. **History** — Sessions auto-saved to localStorage (max 20, LRU eviction) with thumbnails and timestamps.

## Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **AI SDK:** `ai` v6 + `@ai-sdk/react` v3 + `@openrouter/ai-sdk-provider`
- **Validation:** Zod v4
- **Testing:** Vitest
- **State:** `useObject` hook for streaming structured JSON

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

## Project Structure

```
app/
  page.tsx                     # Redirects to /workspace
  layout.tsx                   # Root layout with ThemeProvider + Toaster
  globals.css                  # Tailwind 4 + CSS variables
  workspace/page.tsx           # Main 3-zone workspace UI
  api/
    analyze-image/route.ts     # POST FormData → streamObject
    generate-copy/route.ts     # POST analysis JSON → streamObject
    run-all/route.ts           # Sequential chain with NDJSON progress
components/
  ui/                          # shadcn components (button, card, textarea, etc.)
  theme-provider.tsx           # next-themes wrapper
lib/
  getImageAnalysis.ts          # Vision pipeline (Uint8Array → streamObject)
  getCopyWritings.ts           # Copy pipeline (analysis → streamObject)
  schemas.ts                   # Zod schemas
  definitions.ts               # TypeScript types
  history.ts                   # localStorage session manager (LRU @ 20)
docs/
  adr/                         # Architecture Decision Records
  agents/                      # Agent skills docs
  copywriting-knowledge/       # Reference docs (not consumed programmatically)
tests/
  getImageAnalysis.test.ts     # Pipeline tests
  history.test.ts              # History manager tests
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
- **ADR 002:** `streamObject` + `experimental_useObject` — deprecated but stable; the only path for progressive structured-object streaming with the current AI SDK React hooks.
- **ADR 003:** FormData multipart for images — avoids base64 bloat, native browser support, aligns with `Uint8Array`-accepting pipelines.

## Pipeline Refactoring

Both pipeline modules were refactored from their original state:

- **Removed self-executing top-level calls** — importing no longer triggers real API calls.
- **Switched to `streamObject`** — replaces `streamText` + `Output.object()`.
- **Accept `Uint8Array`** — replaces file-path-based `fs.readFile`.
- **Removed unused providers** — `lmstudio` and `dotenv` noise cleaned up.

## Default Models

- **Vision:** `qwen/qwen3-vl-8b-instruct` (OpenRouter)
- **Copy:** `qwen/qwen3-vl-30b-a3b-instruct` (OpenRouter)

## Notes

- Supported image formats: `jpg`, `png`, `webp`, `gif`
- File type validation via `file-type` (`fileTypeFromBuffer`) before processing.
- Both pipelines use `streamObject` with Zod schemas for typed structured output.
- Client streaming via `experimental_useObject` with per-zone stop buttons + global kill switch.
