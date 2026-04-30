# Etsy Copywriter MVP

AI-powered Etsy listing copywriter for artwork sellers. Upload an image, get structured analysis, and generate SEO-optimized titles, tags, and descriptions.

## What it does

1. **Image Analysis** — Sends artwork to a vision model (Qwen3-VL via OpenRouter) and extracts structured metadata:
   - Core attributes (subject, orientation, composition)
   - Technical specs (medium, surface, textures)
   - Visual identity (colors, lighting, style)
   - Marketing hooks (emotional keywords, symbolism, placement suggestions)

2. **Copy Generation** — Feeds the analysis into an LLM to produce:
   - 3 title options
   - 5–8 SEO tags (ranked by relevance)
   - A compelling product description

## Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS 4
- **AI SDK:** `ai` + `@ai-sdk/openai-compatible` + `@openrouter/ai-sdk-provider`
- **Validation:** Zod
- **Testing:** Vitest

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create a `.env` file:

```env
OPENROUTER_API_KEY=your_key_here
```

Optional: set `lmstudio` base URL if running local models (defaults to `http://localhost:1234/v1`).

## Project Structure

```
app/
  page.tsx            # Landing page (currently empty)
  workspace/page.tsx  # Main workspace UI
lib/
  getImageAnalysis.ts # Vision pipeline (image → structured analysis)
  getCopyWritings.ts  # Copy pipeline (analysis → titles/tags/description)
  schemas.ts          # Zod schemas for structured outputs
  definitions.ts      # TypeScript types
public/
  test.png            # Sample image for local testing
```

## Running Tests

```bash
pnpm test
```

## Notes

- Supported image formats: `jpg`, `png`, `webp`, `gif`
- The vision pipeline validates file type via `file-type` before encoding to base64.
- Both pipelines use `streamText` with `Output.object()` for typed, streaming structured outputs.
- Default models:
  - Vision: `qwen/qwen3-vl-8b-instruct`
  - Copy: `qwen/qwen3-vl-30b-a3b-instruct`
