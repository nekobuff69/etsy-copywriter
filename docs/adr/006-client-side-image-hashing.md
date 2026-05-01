# ADR 006: Client-Side Image Hashing for History Grouping

**Status:** Accepted

**Context:**
The original history stored sessions as a flat chronological list. Each session had a thumbnail, analysis, copy, and timestamp, but no way to know which sessions came from the same uploaded image. The new History page groups sessions by image, so users can see all runs for a specific artwork in one place.

We needed a stable identity for each image. We evaluated:
1. Server-side hashing — the API routes already receive the file bytes, so they could hash and return the hash. This requires threading the hash through streaming responses (`useObject` `onFinish` or NDJSON).
2. Client-side hashing — compute a SHA-256 of the raw `File` bytes immediately on drop/upload using the Web Crypto API. Store the hash in React state and pass it to `saveSession` when the pipeline completes.
3. Perceptual hashing — more tolerant of image variations (resizing, minor edits) but requires a library dependency and is probabilistic.
4. Analysis-based grouping — group by LLM-extracted metadata like title or subject. Two different dog photos might group together incorrectly.

**Decision:**
Compute a SHA-256 hash of the raw file bytes client-side on upload. Store the hash in `HistorySession.imageHash` and group history sessions by this hash.

**Rationale:**
- Client-side hashing is deterministic, fast (async but non-blocking), and requires no server changes or response threading.
- SHA-256 is built into all modern browsers via `crypto.subtle.digest` — no extra dependencies.
- Exact-file hashing correctly distinguishes different images; two different photos of the same subject get different hashes.
- The hash is kept in React state alongside the file. It is only persisted to history when the pipeline completes. If the user drops a new image without processing the previous one, the old hash is discarded.

**Consequences:**
- `HistorySession` gains an `imageHash` field. Existing localStorage entries without the field are treated as solo groups (acceptable since the app is pre-release).
- The client must read the file into an `ArrayBuffer` to hash it. For large images this is a small upfront cost (images are already read for preview anyway).
- Re-uploading the exact same file produces the same hash and groups with prior sessions. Slightly editing the file (even a single pixel change) produces a different hash and a new group.
- The server is completely unaware of image grouping; it is a pure client-side data organization concern.
