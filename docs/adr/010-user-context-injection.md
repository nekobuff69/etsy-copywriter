# ADR 010: User Context Injection and Slim Analysis Schema

**Status:** Accepted

**Context:**
The pipeline had a single point of failure: the Vision Model was the sole source of context for Copy generation. When the Vision Model misidentified a product (e.g., a bookmark with Monet pattern → "Monet painting"), the downstream Copy Model had no way to recover — it only saw the flawed Analysis, never the image or the actual product context.

Additionally, the Analysis schema was overweight: 15 fields across 4 nested sections (Core Attributes, Technical Specs, Visual Identity, Marketing Hooks). Many fields (textures, visible_tools, lighting_vibe, symbolism, suggested_placement) were noise for Etsy copy generation.

**Decision:**
1. Add a free-text **User Context** input in the Upload Zone. The text is injected into both the Vision Model prompt (as authoritative ground truth: "User says this is: [text]") and the Copy Model prompt (verbatim: "User context: [text]").
2. Slim the Analysis schema from 4 nested sections (15 fields) to a flat 6-field schema: `subject`, `product_type`, `medium`, `artistic_style`, `primary_colors`, `vibe_keywords`.
3. Add `migrateAnalysis()` for transparent upgrade of old localStorage sessions on read.
4. Persist `userText` in History sessions for review and restore.

**Rationale:**
- User text acts as ground truth, fixing the Vision Model misidentification failure mode without requiring the Copy Model to also see the image.
- Injecting user text into both stages gives the Copy Model selling context (materials, audience, shop vibe) that the Analysis schema cannot capture.
- Slimming the schema reduces prompt complexity and makes the Vision Model less likely to hallucinate irrelevant fields.
- Migration is transparent — old sessions are upgraded on read without data loss.
- User text is optional: empty string = pipeline behaves identically to pre-refactor (backward compatible, zero-friction default).

**Consequences:**
- UploadZone gains a textarea with placeholder hints and a 500-char soft cap (amber at 400, red at 500).
- `useUpload` hook gains `userText` state that persists across image changes; cleared on New Session.
- `usePipeline` passes `userText` through both API calls: FormData field for analyze-image, JSON body field for generate-copy.
- API routes are backward compatible: missing `userText` defaults to empty string.
- `updateAnalysisField` interface changes from `(section, field, value)` to `(field, value)` — flat key access.
- AnalysisZone rendered as 6 flat labeled fields instead of 4 collapsible sections.
- HistorySession gains optional `userText` field.
- Session restore and switchToSession pre-fill the textarea.
- No new API endpoints. No Settings page changes. No Copy Model image access.
