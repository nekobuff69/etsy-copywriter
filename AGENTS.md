# AGENTS.md

## Commands
- `pnpm install` — package manager is **pnpm** (not npm/yarn)
- `pnpm dev` — Next.js dev server on `http://localhost:3000`
- `pnpm build` — production build
- `pnpm lint` — ESLint (Next.js flat config)
- `pnpm test` — Vitest (single test file: `tests/getImageAnalysis.test.ts`)

## Environment
- Requires `OPENROUTER_API_KEY` in `.env` (loaded via `dotenv` with `{quiet: true}`)
- Optional: LM Studio base URL defaults to `http://localhost:1234/v1` (provider defined but unused)

## Architecture

### Entrypoints
- Next.js 16 App Router. Real app page is `/workspace` (`app/workspace/page.tsx`). Root page is a stub.

### Pipelines (lib/)
- **Image Analysis** (`lib/getImageAnalysis.ts`): file validation → base64 encode → `streamText` with vision model → structured output via `Output.object()`
- **Copy Generation** (`lib/getCopyWritings.ts`): Zod validate analysis → `streamText` with LLM → structured output
- Default models: vision `qwen/qwen3-vl-8b-instruct`, copy `qwen/qwen3-vl-30b-a3b-instruct` (both OpenRouter)

## Critical Gotchas

### Self-executing top-level calls
Both `lib/getImageAnalysis.ts:111` and `lib/getCopyWritings.ts:129` call their exported functions at module level. **Importing either module triggers real API calls.** Tests must mock `@openrouter/ai-sdk-provider` and `ai` before importing these modules.

### Test file bugs
- `tests/getImageAnalysis.test.ts` imports from `"../getImageAnalysis"` — should be `"../lib/getImageAnalysis"` (resolves to nonexistent file at root).
- Tests for `getImageAnalysis` are commented out (lines 75-117). Only `validateFormat` is actively tested.
- The commented-out block references a `mockReadFile` that was never defined.

### Tailwind 4 quirks
- Uses `@tailwindcss/postcss` plugin (not the legacy `tailwindcss` plugin).
- VS Code CSS validation is disabled (`.vscode/settings.json`) because Tailwind 4 uses `@import "tailwindcss"` in CSS.

### shadcn/ui
- Configured (New York style, RSC, CSS variables) in `components.json`, but no components installed yet. Aliases: `@/components`, `@/lib`, `@/hooks`.

### AI SDK
- Both pipelines use `streamText` (not `generateText`) with `Output.object()` for streaming structured output.
- `globalThis.AI_SDK_LOG_WARNINGS = false` suppresses SDK warnings.
- `lmstudio` provider (`@ai-sdk/openai-compatible`) is defined in `getCopyWritings.ts` but never actually used.

## File Conventions
- Path alias `@/*` maps to project root
- `.mjs` for ESLint and PostCSS config; `.mts` allowed for TypeScript modules

## Agent skills

### Issue tracker

GitHub Issues (via `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
