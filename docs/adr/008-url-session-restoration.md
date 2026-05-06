# ADR 008: URL-Based Session Restoration (`?session=<id>`)

**Status:** Accepted (updated 2026-05-06)

**Context:**
The History page (`app/history/`) groups past sessions by image hash and lets users browse them. Clicking a session should open it in the Workspace in read-only mode so the user can review the analysis and copy.

We needed a way to navigate from the History page to the Workspace while telling the Workspace which session to load.

We evaluated:
1. **React context / global state** — pass the session ID through a shared store. Requires coupling History → Workspace via a state layer, and doesn't survive page navigation (Next.js App Router pages are separate route segments).
2. **URL query parameter** — the Workspace reads `?session=<id>` from the URL on mount. The History page navigates with `router.push(\`/workspace?session=${session.id}\`)`. This works naturally with Next.js client-side navigation and survives refresh.
3. **localStorage + event** — History writes a "pending session" to localStorage and dispatches a custom event. Workspace listens on mount. More complex, race-prone on hard navigation.
4. **Server-side session store** — overkill for a single-user localStorage app.

**Decision:**
Use a URL query parameter `?session=<id>` to pass the session ID from History to Workspace. The Workspace reads it on mount via `useSessionRestoration()`, loads the session from localStorage, and **preserves** the query param in the URL so page refresh restores the same session.

The param is only cleared when the user starts a new session or drops a new file.

**Rationale (original):**
- The URL is the simplest contract between two Next.js route segments (`/history` and `/workspace`).
- `router.push(\`/workspace?session=${session.id}\`)` is a standard Next.js client navigation — fast, no page reload.
- Works with no changes to localStorage schema, no global state, no event bus.
- Degrades gracefully: if the session ID is missing, stale, or malformed, the Workspace simply shows an empty state (no error thrown).

**Rationale (param preservation over removal, per PRD #19 US 10):**
- Users expect to regain their place when refreshing the browser. Removing the param after restoration broke this expectation.
- A `useRef<boolean>` one-shot guard (`hasRestoredRef`) prevents the restoration effect from re-triggering on React re-renders — even though the param persists in the URL, it only fires once per session lifecycle.
- The same ref is reset when the user starts a new session or drops a new file, allowing future navigations to restore again.

**Consequences:**
- `useSessionRestoration` is a local `useEffect` inside `useWorkspace.ts`, not a shared hook. It reads `getSessions()` (localStorage) to find the session.
- The `hasRestoredRef` guard ensures the effect runs exactly once after mount. Subsequent re-renders that change the `onRestore` callback identity do NOT re-trigger restoration.
- The History page navigates with `router.push(\`/workspace?session=${session.id}\`)` — this triggers a client-side navigation to `/workspace`, which re-mounts the Workspace page and runs the restoration effect.
- If the Workspace is already mounted when navigating from History (Next.js App Router may keep it alive), the `useEffect` still fires because the URL changed — `location.search` is a dependency (implicit, via `URLSearchParams(window.location.search)`). But `hasRestoredRef` prevents double-execution.
- prev/next navigation (`switchToSession`) calls `router.replace` with the new session ID, keeping the URL in sync.
- Restoration also resets the workspace main content scroll position to `scrollTop=0`.
- Session is restored in read-only mode (`sessionView = viewHistory(id)`).
- "Back to Group" navigates to `/history#group-<key>/session-<id>` hash fragment, which the History page parses to expand the group card and scroll the specific session row into view.
