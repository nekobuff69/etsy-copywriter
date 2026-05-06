# Progress

## Status
In Progress

## Tasks
- [x] Issue #16: Center navigation buttons in workspace header — implemented
- [x] Issue #15: Session index numbers in History — implemented
- [x] Issue #17: Editable image group titles in History — implemented
- [x] Issue #14: Workspace model badge consistency — implemented
- [x] Issue #18: Session state persistence across refresh — implemented

## Files Changed

### Issue #16
- `app/workspace/components/Header.tsx` — centered nav buttons with 3-column flex layout

### Issue #15
- `app/history/components/HistoryGroupCard.tsx` — sort sessions newest-first, pass `sessionIndex` prop
- `app/history/components/HistorySessionRow.tsx` — display `#N` index in session row header

### Issue #17
- `lib/group-titles.ts` — new module for editable group title storage (localStorage)
- `lib/history.ts` — call `cleanupOrphanedGroupTitles` on delete/clear operations
- `app/history/hooks/useHistory.ts` — group title state management
- `app/history/components/HistoryGroupCard.tsx` — double-click editable title, "Artwork" default, 18-char truncation
- `app/history/page.tsx` — pass `groupTitle` and `onUpdateGroupTitle` props

### Issue #14
- `app/workspace/hooks/useWorkspace.ts` — add `activeModels` state, set/clear on session switch/restore/new
- `app/workspace/page.tsx` — pass `visionModel` and `copyModel` props to zones
- `app/workspace/components/AnalysisZone.tsx` — show `👁️ <short-name>` badge without prefix
- `app/workspace/components/CopyZone.tsx` — show `✍️ <short-name>` badge without prefix

### Issue #18
- `app/workspace/hooks/useWorkspace.ts` — keep `?session=` param on restore, clear on new session and file drop

## Notes
- Issue #15: Sessions sorted newest-first (`b.createdAt - a.createdAt`), index computed as `sortedSessions.length - i` so #1 = oldest (bottom), #N = latest (top).
- Issue #17: Group titles stored in separate localStorage key `etsy-copywriter-group-titles`. Orphaned titles cleaned up on session deletion. Default title is "Artwork" for all groups including solo sessions. Display truncates at 18 chars with "…". Double-click enters edit mode; Enter saves, Escape cancels, blur saves.
- Issue #14: AnalysisZone badge shows `👁️ <short-model-name>`, CopyZone badge shows `✍️ <short-model-name>`. In history mode, badges display the session's stored `visionModel`/`copyModel`. Badge text is left-aligned with `text-left justify-start`.
- Issue #18: `?session=` URL param is no longer stripped on restoration. `startNewSession()` and dropping a new file while in history mode both clear the URL param via `window.history.replaceState({}, "", "/workspace")`.
