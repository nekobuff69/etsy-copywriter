# Etsy Copywriter MVP — Implementation Handoff

## Context

This is a Next.js 16 App Router app that helps Etsy artists generate SEO-optimized listing copy (titles, tags, descriptions) from artwork images. It has two backend pipelines: **Image Analysis** (vision model extracts structured details from images) and **Copy Generation** (LLM turns analysis into Etsy copy). Both pipelines exist but have no UI and self-execute on module import.

**PRD (Issue #1):** https://github.com/nekobuff69/etsy-copywriter/issues/1

## Project State

| Category | Detail |
|----------|--------|
| **Package manager** | `pnpm` |
| **Framework** | Next.js 16 App Router, React 19 |
| **AI SDK** | `ai` v6 + `@ai-sdk/react` v3 + `@openrouter/ai-sdk-provider` |
| **Models** | Vision: `qwen/qwen3-vl-8b-instruct`, Copy: `qwen/qwen3-vl-30b-a3b-instruct` (OpenRouter) |
| **Styling** | Tailwind 4 (`@tailwindcss/postcss`), shadcn/ui configured but **no components installed** |
| **Validation** | Zod v4.3.5 (current v3-style schemas are compatible) |
| **Env** | `OPENROUTER_API_KEY` required in `.env` |

## 14 Resolved Design Decisions

1. **API route handlers** (not Server Actions) for pipeline endpoints
2. **Three routes**: `/api/analyze-image`, `/api/generate-copy`, `/api/run-all` (server-side chaining)
3. **UI layout**: 3 zones — Upload (drag & drop + preview), Analysis (editable), Copy output (editable)
4. **Streaming**: `streamObject` (server) + `useObject` from `@ai-sdk/react` (client) — replace current `streamText` + `Output.object()`
5. **File upload**: `FormData` multipart (not base64 in JSON body)
6. **Run-all orchestration**: Server-side sequential with progress status streamed to client
7. **Pipeline refactoring**: In-place — remove self-executing calls, accept `Uint8Array` instead of file paths
8. **Zod schemas**: No changes needed (v4 backward-compatible)
9. **Copy output**: Fully editable (like analysis)
10. **shadcn components**: button, textarea, input, card, label, badge, progress, alert, separator, sonner
11. **Toasts**: `sonner` package
12. **Dark mode**: `next-themes` + toggle (CSS vars already defined in globals.css)
13. **Clipboard**: Native `navigator.clipboard.writeText()`, per-field + "Copy All" buttons
14. **History**: Collapsible sidebar, localStorage, max 20 sessions (LRU), timestamp as ID, thumbnail-based storage

## Module Breakdown

| Module | Action | Test? |
|--------|--------|-------|
| `lib/getImageAnalysis.ts` | Refactor: remove self-exec call, accept `Uint8Array`, use `streamObject`, remove `lmstudio` provider | ✅ |
| `lib/getCopyWritings.ts` | Refactor: remove self-exec call, use `streamObject`, remove `mockArtworkAnalysis` | ✅ |
| `lib/history.ts` | New: localStorage session manager, LRU eviction @ 20, thumbnail compression | ✅ |
| `app/api/analyze-image/route.ts` | New: POST FormData → `streamObject` → streamed response | ✅ |
| `app/api/generate-copy/route.ts` | New: POST analysis JSON → `streamObject` → streamed response | ✅ |
| `app/api/run-all/route.ts` | New: sequential chain (analysis → copy), stream progress + final result | ✅ |
| `app/workspace/page.tsx` | Rewrite: full 3-zone UI with controls, history sidebar, dark mode toggle | No (UI) |

## Critical Gotchas (from AGENTS.md)

- **Self-executing top-level calls**: Both `lib/getImageAnalysis.ts:111` and `lib/getCopyWritings.ts:129` call their exported functions at module level. **Importing either triggers real API calls.** Must be removed before anything else.
- **Test file bugs**: `tests/getImageAnalysis.test.ts` imports from `"../getImageAnalysis"` (should be `"../lib/getImageAnalysis"`). Commented-out test block references undefined `mockReadFile`.
- **Tailwind 4**: Uses `@tailwindcss/postcss` plugin. VS Code CSS validation disabled (uses `@import "tailwindcss"`).
- **AI SDK warnings**: `globalThis.AI_SDK_LOG_WARNINGS = false` suppresses SDK warnings.

## Suggested Build Order

1. **Install dependencies**: `pnpm add next-themes` + install shadcn components (`npx shadcn@latest add button textarea input card label badge progress alert separator sonner`)
2. **Refactor pipelines**: Remove self-executing calls, switch to `streamObject`, accept `Uint8Array`
3. **Build History manager**: `lib/history.ts` with tests
4. **Build API routes**: Three endpoints with proper FormData/JSON handling and streaming
5. **Build Workspace UI**: Three-zone layout, controls, history sidebar, dark mode, clipboard
6. **Fix test file**: Correct import path, uncomment/fix `getImageAnalysis` tests with proper mocks

## What to do first

Start by reading the PRD issue, then follow the build order. The most impactful first step is removing the self-executing calls and refactoring the pipelines — everything else depends on that.
