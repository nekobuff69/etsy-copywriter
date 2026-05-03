# AGENTS.md

## Commands
- `pnpm install` — package manager is **pnpm** (not npm/yarn)
- `pnpm dev` — Next.js dev server on `http://localhost:3000`
- `pnpm build` — production build
- `pnpm lint` — ESLint (Next.js flat config)
- `pnpm test` — Vitest (`tests/getImageAnalysis.test.ts`, `tests/history.test.ts`, `tests/session.test.ts`, `tests/file-utils.test.ts`, `tests/getCopyWritings.test.ts`, `tests/file-hash.test.ts`, `tests/settings.test.ts`, `tests/api-settings.test.ts`, `tests/llm-provider.test.ts`, `tests/history-duplicate-ids.test.ts`)

## Environment
- Requires `OPENROUTER_API_KEY` in `.env`
- `.env` is loaded automatically by Next.js; pipeline modules do **not** import `dotenv` directly

## Architecture

### Entrypoints
- Next.js 16 App Router. Root page (`app/page.tsx`) redirects to `/workspace`.
- Real app page is `app/workspace/page.tsx` — thin layout shell wiring `useWorkspace` hook to 3 zone components: Upload, Analysis, Copy.
- Session history is managed via the `/history` page (grouped by image, expandable cards). Past sessions viewed in the workspace show a read-only banner.

### Workspace (`app/workspace/`)
- **`hooks/useWorkspace.ts`** — single custom hook encapsulating all client state, `useObject` instances, file/thumbnail lifecycle, history CRUD, and action dispatch. Returns grouped interface `{upload, analysis, copy, history, global}` so `page.tsx` stays declarative.
- **`components/UploadZone.tsx`** — file drop + preview, Analyze/Run All/Stop buttons.
- **`components/AnalysisZone.tsx`** — editable analysis form (Core Attributes, Technical Specs, Visual Identity, Marketing Hooks) + Generate Copy / Regenerate / Stop.
- **`components/CopyZone.tsx`** — titles, tags, description with per-field copy buttons + Copy All / Regenerate / Stop.
- **`components/Header.tsx`** — title, history toggle, New Session, theme switcher.
- **`components/HistorySidebar.tsx`** — session list with thumbnail, restore, delete, clear.

### API Routes (`app/api/`)
- **`/api/analyze-image`** — POST FormData with `image` file → `streamObject` → `toTextStreamResponse()`
- **`/api/generate-copy`** — POST analysis JSON → `streamObject` → `toTextStreamResponse()`
- **No `/api/run-all` endpoint** — the "Run All" feature is orchestrated client-side by `usePipeline.runAll()`, which calls the two working endpoints sequentially (see ADR 007)

### Pipelines (`lib/`)
- **Image Analysis** (`lib/getImageAnalysis.ts`): `validateFormat(Uint8Array)` → `fileTypeFromBuffer` → base64 encode → `streamObject` with vision model → returns `StreamObjectResult`
- **Copy Generation** (`lib/getCopyWritings.ts`): Zod validate analysis → `streamObject` with LLM → returns `StreamObjectResult`
- Default models: vision `qwen/qwen3-vl-8b-instruct`, copy `qwen/qwen3-vl-30b-a3b-instruct` (both OpenRouter)
- Both functions are pure — **no self-executing calls**. Safe to import.
- Both `streamObject` calls include `schemaName`, `schemaDescription`, and explicit schema structure in the system prompt — required because Qwen through OpenRouter ignores the schema unless it's spelled out in the prompt

### Client Streaming
- Uses `experimental_useObject` (aliased as `useObject`) from `@ai-sdk/react`
- Two hook instances: one for `/api/analyze-image`, one for `/api/generate-copy`
- Both `onFinish` callbacks check the `error` property (TypeValidationError) — if the model returns JSON that doesn't match the schema, the error is surfaced to the user
- **Run All** (`usePipeline.runAll()`) orchestrates the two endpoints sequentially on the client: `submitAnalysis` → await `onFinish` promise → `submitCopy` → await `onFinish` promise → save session
- Promise-based orchestration uses `useRef` resolver/rejector pairs (`analysisResolveRef`, `copyResolveRef`) that the `onFinish`/`onError` callbacks invoke

### Session Manager (`lib/session.ts`)
- Session mode state machine: `newSessionView()`, `viewHistory(id)`, `isHistoryMode()`
- Two modes: `"current"` (editable, can generate) and `"history"` (read-only view)

### File Utilities (`lib/file-utils.ts`)
- `fileToDataUrl(file)` — converts File to base64 data URL
- `createThumbnail(file, options?)` — resizes image to max 200×200px JPEG at 70% quality
  - Used for history thumbnails to stay well under localStorage quota

### History Manager (`lib/history.ts`)
- localStorage-based session storage with LRU eviction at max 20 sessions
- Interface: `getSessions`, `getSession`, `saveSession`, `deleteSession`, `clearHistory`
- Each session stores: `id` (`crypto.randomUUID()`, fallback `${Date.now()}-${Math.random()}`), `thumbnail` (JPEG data URL), `analysis`, `copy`, `createdAt`
- Sessions are grouped by `imageHash` on the History page (`app/history/`) into expandable `ImageGroup` cards
- Thumbnails are compressed via `createThumbnail` before storage to avoid `QuotaExceededError`

## Critical Gotchas

### Self-executing top-level calls — FIXED
Original `lib/getImageAnalysis.ts` and `lib/getCopyWritings.ts` had top-level invocations that triggered real API calls on import. These were removed during refactoring. Importing either module is now safe.

### AI SDK deprecation note
`streamObject` is deprecated in `ai` v6 in favor of `streamText` + `output`. We attempted migration but `streamText` + `Output.object()` with `toUIMessageStreamResponse()` produces only text-delta SSE chunks for Qwen via OpenRouter — the model outputs prose instead of structured JSON, and the SDK can't enforce the schema without provider-side structured output support.

**Resolution**: Keep `streamObject` (deprecated but functional) with `toTextStreamResponse()`. To force schema-compliant JSON, we embed the full schema structure in the system prompt and pass `schemaName`/`schemaDescription`. This makes Qwen output the correct nested JSON shape.

**Critical**: `streamObject().object` (the server-side promise) never resolves with Qwen/OpenRouter because the provider ignores `response_format: json_schema`. The `toTextStreamResponse()` path works fine — it streams the raw JSON text and `useObject` parses it client-side. This is why `/api/run-all` was removed (see ADR 007) and Run All is now orchestrated client-side.

`useObject` `onFinish` callbacks check `{ object, error }` — if `error` is a `TypeValidationError`, it's surfaced to the user via the error alert.

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

### Debug mechanics
- Console logs tagged `[PIPELINE]` in `usePipeline.ts` (startAnalysis, startCopy) and `useWorkspace.ts` (stage transitions)
- Collapsible `<DebugPanel>` component at the bottom of the workspace page — shows stage badge, loading states, error messages, and raw JSON of analysis/copy objects
- `grep '\[PIPELINE\]'` to find all debug output

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
