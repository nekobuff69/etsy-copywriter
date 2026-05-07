# ADR 009: Kami Design System Integration

**Status:** Accepted

**Context:**
The Etsy Copywriter MVP launched with default shadcn/ui New York styling (greyscale, Geist sans-serif, zinc tokens). The app serves solo artists selling artwork on Etsy — an audience that values warmth, craft, and editorial personality over utilitarian SaaS chrome. The default greyscale felt cold and corporate for an art-tool context.

We evaluated three paths:
1. **Keep shadcn defaults** — fast, but generic and mismatched to the art-selling audience.
2. **Build a custom palette from scratch** — flexible, but high variance and easy to drift into AI-slop tropes (gradients, purple accents, rounded emoji cards).
3. **Adopt the Kami (紙 / 纸) design system** — an editorial print-first system with warm parchment surfaces, serif typography, a single restrained accent, and clear "don't" rules that prevent ornament creep.

**Decision:**
Adopt Kami as the canonical design system, mapped onto shadcn/ui CSS variables so shadcn components render Kami tokens automatically.

**Rationale:**
- Kami's warm parchment (`#f5f4ed`) and ivory (`#faf9f5`) surfaces match the "art studio desk" mood better than zinc greys.
- A single serif family (Charter/Georgia) at weight 500 carries hierarchy without needing bold/italic — appropriate for an editorial tool.
- One accent only: **sage green** (`#4A5D3F`), chosen because the user's art-seller context needs something "artsy, calm, but not rigid like corporate blue." The terracotta from the canonical Kami palette was explicitly rejected.
- Kami's "ten invariants" (no `#ffffff`, no cool greys, no second accent, no italic, no hard shadows) act as guardrails that prevent incremental UI drift.
- Mapping Kami tokens to shadcn CSS variables (`--background`, `--primary`, `--card`, etc.) means shadcn components like `<Button>`, `<Card>`, `<Input>` automatically inherit the palette without per-component overrides.

**Token mapping:**

| Kami token | shadcn variable | Light | Dark |
|---|---|---|---|
| Parchment | `--background` | `#f5f4ed` | `#141413` |
| Ivory | `--card` | `#faf9f5` | `#1e1e1c` |
| Sage | `--primary` | `#4A5D3F` | `#8BA87A` |
| Warm Sand | `--secondary` / `--muted` | `#e8e6dc` | `#2a2a28` |
| Near Black | `--foreground` | `#141413` | `#f0efe8` |
| Olive | `--muted-foreground` | `#504e49` | `#a8a59a` |
| Terracotta | `--destructive` | `#8B5A3C` | `#c4906e` |

**Dark mode:**
Kami ships a warm-dark variant (deep olive-black backgrounds, muted sage accents) rather than a cold slate dark mode. The `next-themes` provider drives the `.dark` class; the toggle is a custom sun/moon slider (`ThemeToggle.tsx`) with no text label.

**Custom components:**
- **`ThemeToggle.tsx`** — 64×32px slider with sun (left) and moon (right) icons, sliding ivory knob. Uses `next-themes` `useTheme` hook.
- **`KamiToaster.tsx`** — Wraps `sonner`'s `<Toaster>` with `toastOptions={{ className: "kami-toast" }}`. Actual styling lives in `globals.css` as `[data-sonner-toast]` overrides.
- **`.kami-tag`** — A CSS utility class in `globals.css` for model-name pills and run-count badges. Sage text on `#E4ECF5` (light) or `#2A3A24` (dark). Used instead of shadcn `<Badge>` for these specific pills.

**Consequences:**
- shadcn components render Kami tokens automatically via CSS variables — no per-component color props needed.
- The app cannot use shadcn's default `zinc`, `neutral`, or `slate` color families without breaking Kami's "no cool greys" rule.
- Body font is forced to Charter/Georgia in `globals.css` — the Geist font files were removed from `layout.tsx`.
- Weight 500 is the ceiling for serif; bold emphasis is achieved via color (ink-blue/sage) or size, not `font-weight: 700`.
- No italic anywhere — emphasis uses color shift or tags.
