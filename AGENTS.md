# AGENTS.md

## Commands
- `pnpm install` — package manager is **pnpm** (not npm/yarn)
- `pnpm dev` — Next.js dev server on `http://localhost:3000`
- `pnpm build` — production build
- `pnpm lint` — ESLint (Next.js flat config)
- `pnpm test` — Vitest (`tests/getImageAnalysis.test.ts`, `tests/history.test.ts`)

## Environment
- Requires `OPENROUTER_API_KEY` in `.env`
- `.env` is loaded automatically by Next.js; pipeline modules do **not** import `dotenv` directly

## Architecture

### Entrypoints
- Next.js 16 App Router. Root page (`app/page.tsx`) redirects to `/workspace`.
- Real app page is `app/workspace/page.tsx` — 3-zone layout: Upload, Analysis, Copy.

### API Routes (`app/api/`)
- **`/api/analyze-image`** — POST FormData with `image` file → `streamObject` → `toTextStreamResponse()`
- **`/api/generate-copy`** — POST analysis JSON → `streamObject` → `toTextStreamResponse()`
- **`/api/run-all`** — POST FormData with `image` file → sequential chain (analysis → copy) → NDJSON progress stream

### Pipelines (`lib/`)
- **Image Analysis** (`lib/getImageAnalysis.ts`): `validateFormat(Uint8Array)` → `fileTypeFromBuffer` → base64 encode → `streamObject` with vision model → returns `StreamObjectResult`
- **Copy Generation** (`lib/getCopyWritings.ts`): Zod validate analysis → `streamObject` with LLM → returns `StreamObjectResult`
- Default models: vision `qwen/qwen3-vl-8b-instruct`, copy `qwen/qwen3-vl-30b-a3b-instruct` (both OpenRouter)
- Both functions are pure — **no self-executing calls**. Safe to import.

### Client Streaming
- Uses `experimental_useObject` (aliased as `useObject`) from `@ai-sdk/react`
- Two hook instances: one for `/api/analyze-image`, one for `/api/generate-copy`
- `run-all` uses manual `fetch` + `ReadableStream` reader with NDJSON lines

### History Manager (`lib/history.ts`)
- localStorage-based session storage with LRU eviction at max 20 sessions
- Interface: `getSessions`, `getSession`, `saveSession`, `deleteSession`, `clearHistory`
- Each session stores: `id` (timestamp), `thumbnail` (data URL), `analysis`, `copy`, `createdAt`

## Critical Gotchas

### Self-executing top-level calls — FIXED
Original `lib/getImageAnalysis.ts` and `lib/getCopyWritings.ts` had top-level invocations that triggered real API calls on import. These were removed during refactoring. Importing either module is now safe.

### AI SDK deprecation note
`streamObject` is deprecated in `ai` v6 in favor of `streamText` + `output`, but there is no matching client hook for the replacement yet. We use `streamObject` server-side + `experimental_useObject` client-side. Migration path: swap `streamObject` → `streamText` + `output` on server only when the hook catches up.

### FormData + useObject
`useObject` does not natively support FormData. The analyze-image hook provides a custom `fetch` function that reads `formDataRef.current` and sends it via `fetch(url, {method: "POST", body: formDataRef.current})`.

### Tailwind 4 quirks
- Uses `@tailwindcss/postcss` plugin (not the legacy `tailwindcss` plugin).
- VS Code CSS validation is disabled (`.vscode/settings.json`) because Tailwind 4 uses `@import "tailwindcss"` in CSS.

### shadcn/ui
- Installed components: `button`, `textarea`, `input`, `card`, `label`, `badge`, `progress`, `alert`, `separator`, `sonner`
- Configured (New York style, RSC, CSS variables) in `components.json`
- Aliases: `@/components`, `@/lib`, `@/hooks`
- `components.json` utils alias updated to `@/lib/utils` (was `@/app/lib/utils`)

### `globalThis.AI_SDK_LOG_WARNINGS = false`
Suppresses SDK warnings in both pipeline modules.

## File Conventions
- Path alias `@/*` maps to project root
- `.mjs` for ESLint and PostCSS config; `.mts` allowed for TypeScript modules

## Agent skills

### Issue tracker
GitHub Issues (via `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels
Five canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs
Single-context — one `AGENTS.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
