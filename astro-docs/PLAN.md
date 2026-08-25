# Implementation Plan — Multi-Framework Grid Layout Docs (Astro)

**Brand:** KeystoneGrid. **Scope of this round:** full plan for the overall site (landing page + Vue/React/Angular routing), with Vue as the only section actually built out now. React and Angular get placeholder routes and a content model ready to receive their own docs later — no invented content for either.

**Status note (this revision):** Vue documentation is fully complete — Guide, Features, Components, API, and all 45 Examples. Phase 5 (polish/parity) is in progress; see its own section below for what's been checked and fixed so far.

---

## 1. What exists today (source of truth)

Audited directly from `https://vue-ts-responsive-grid-layout.winnem.tech/` (VitePress 1.6.3) and the local `vitepress-docs/` source in this repo.

### 1.1 Site structure

| Section | Path | Contents |
|---|---|---|
| Landing | `/` | Hero, tagline, "Get Started" + "View 45 Examples" + GitHub CTAs, a 16-card feature grid (icon + title + 1–2 sentence description each) |
| Guide | `/guide/introduction`, `/guide/installation`, `/guide/changelog`, `/guide/coverage` | Prose/narrative docs |
| Features | `/features/` | Single long page, categorized: Drag & resize · Layout & collision · Multi-select & group operations · Responsive · Internationalization · Accessibility · Cross-grid & external drag-and-drop · Styling & customization · Developer experience. Every bullet links to a live numbered example. |
| Components | `/components/` index + per-component subpages | Two components documented in full (`GridLayout`, `GridItem`), each with **Props / Vue Events / Eventbus Events / Slots** as separate subpages. Plus a **Styling** subsection: `css-variables`, `css-grid-layout`, `css-grid-item`. Two more components (`CustomCloseButton`, `CustomDragElement`) are mentioned on the index but not yet broken into their own subpages. |
| API | `/api/` | Sidebar scaffolded (Interfaces: Eventbus/Mitt, Layout · Types: Layout · Enums: `EGridLayoutEvent`, `EGridItemEvent`) but the index page itself says **"Work in progress"** — content is thin/incomplete today. |
| Examples | `/examples/01-example` … `/examples/45-example` | 45 individually-numbered live examples — real titles now confirmed, see §4.4. |
| Changelog | `/guide/changelog` | Standard keep-a-changelog-style history |

### 1.2 Content that lives in the repo but isn't (fully) on the doc site yet

- `FEATURES.md` — likely the direct source for the `/features/` page.
- `docs/ACCESSIBILITY.md` — explicit scope of keyboard/ARIA support, including what's *not* covered.
- `docs/ARCHITECTURE.md` — GridLayout/GridItem communication, composable split.
- `docs/TESTING.md`, `docs/STRYKER.md`, `docs/VISUAL_REGRESSION.md` — testing methodology.
- `COMPARISON_ALTERNATIVES.md`, `COMPARISON_COMMERCIAL.md`, `COMPETITIVE_ROADMAP.md` — positioning docs.
- `MIGRATION.md`, `INSTALL.md`, `SUPPORT.md`, `PRODUCTION_READINESS.md`, `MANUAL_TEST_CHECKLIST.md`, `ROADMAP.md`.
- `docs/REFACTORING.md` — a running log of specific bugs found/fixed with root cause, distinct from the changelog.

**Recommendation:** import these into the new site as real pages (Guide → "Project" sub-nav, see §3), not just deep-links to GitHub.

### 1.3 What "45 examples" actually means for implementation

Every example is a **live, interactive rendering of the real Vue component**, paired with a short markdown doc explaining it — confirmed directly from `vitepress-docs/examples/*.md` + `vitepress-docs/examples/components/*.vue`. Each `.md` file is short (a title, 1–3 short paragraphs of explanation, a real code snippet, occasionally a `::: tip` / `::: warning` callout), and renders its live demo via `<CustomComponent/>` wired to the matching `.vue` file in `components/`. This is the exact pattern `astro-docs/src/components/examples/*.vue` + `astro-docs/src/content/docs/vue/examples/*.mdx` already replicates for the 3 ported so far.

---

## 2. Target architecture

### 2.1 Framework: Astro + Starlight

Already scaffolded at `astro-docs/` (standalone, not part of the pnpm workspace — see its own `package.json` description). Confirmed in place: `@astrojs/starlight`, `@astrojs/vue`, `astro`, `vue` as dependencies; a full Vue sidebar in `astro.config.mjs` with placeholder React/Angular sections; a content-collection setup (`src/content/config.ts`); an example harness (`src/components/harness/{ExampleDemo,ExampleNumberField,ExampleToggle,LayoutJsonViewer}.vue`); and a custom landing page (`src/pages/index.astro`) already reusing the approved mockup almost verbatim, wired to real routes.

### 2.2 Package/routing layout

```
/                          → custom landing page (framework picker + marketing content) — DONE
/vue/                      → Starlight-powered docs, Vue section
/vue/guide/introduction
/vue/guide/installation
/vue/guide/changelog
/vue/guide/coverage
/vue/guide/project/*       → absorbed repo docs (architecture, testing, comparisons, accessibility, roadmap)
/vue/features/
/vue/components/
/vue/components/grid-layout/{props,vue-events,eventbus-events,slots}
/vue/components/grid-item/{props,vue-events,eventbus-events,slots}
/vue/components/styling/{css-variables,css-grid-layout,css-grid-item}
/vue/api/
/vue/api/interfaces/{eventbus,layout}
/vue/api/types/layout
/vue/api/enums/{grid-layout-events,grid-item-events}
/vue/examples/                → gallery/index of all 45, filterable by category
/vue/examples/{slug}          → one example per page, slugged (see §4.4 for the full, real list)

/react/                    → placeholder route: "React docs coming soon" + link back to landing — DONE
/angular/                  → placeholder route: same — DONE
```

**Single Astro project, not a monorepo of separate sites** — already how it's set up.

---

## 3. Information architecture (Vue section)

Mirrors the source site's own proven structure, with two deliberate improvements: real, readable example slugs (not `01-example`…`45-example`), and a `Guide → Project` sub-section absorbing the repo-only docs from §1.2.

```
Guide
  Introduction
  Installation
  Project
    Architecture
    Testing philosophy
    Accessibility scope
    Comparison: alternatives
    Comparison: commercial
    Roadmap
    Production readiness
  Changelog
  Test coverage

Features                    (single page, same 9 categories as source)

Components
  Overview
  GridLayout
    Props
    Vue Events
    Eventbus Events
    Slots
  GridItem
    Props
    Vue Events
    Eventbus Events
    Slots
  CustomCloseButton
  CustomDragElement
  Styling
    CSS Variables
    GridLayout CSS
    GridItem CSS

API
  Interfaces
    Eventbus (Mitt)
    Layout
  Types
    Layout
  Enums
    EGridLayoutEvent
    EGridItemEvent

Examples
  Index/gallery (grouped by the same 9 Features categories, each card links to its live example)
  {45 individual example pages}
```

---

## 4. Key design decisions

### 4.1 Landing page — DONE

Custom Astro page (`src/pages/index.astro`), not a Starlight page. Hero, framework picker (Vue live / React & Angular "coming soon"), 16-card feature grid, both CTAs — all wired to real routes with correct **KeystoneGrid** branding. Approved design reference copied to `astro-docs/_design/mockup-landing.html`.

### 4.2 Framework switcher (once >1 section exists)

A persistent header control (Vue / React / Angular dropdown) inside the Starlight shell, visible on every docs page. Implement as a Starlight `Header` component override — cheaper to build once alongside the Vue section than retrofit later. Design reference: `astro-docs/_design/mockup-vue-docs-home.html`'s own utility-bar switcher.

### 4.3 Content collections (structured, not just prose-in-Markdown)

Already scaffolded (`src/content/config.ts`). Define real schemas (via `astro:content` + Zod) for props/events/slots tables and for examples, so the Features page's "→ see example N" links, the Examples gallery, and each Props table can all be generated from one source of truth instead of hand-maintained in three places.

### 4.4 Example slugs — confirmed against real source, all 45

Every title below is the literal `# heading` read directly from `vitepress-docs/examples/{NN}-example.md`. Slugs are derived once, at content-authoring time, for stability. **Ported** = has a real `.mdx` + `.vue` pair in `astro-docs/src/` today; everything else is planned.

| # | Real title | Slug | Ported? |
|---|---|---|---|
| 01 | Basic drag & resize | `basic-drag-resize` | ✅ |
| 02 | Bounded drag to container | `bounded-drag` | ✅ |
| 03 | Events | `events` | ✅ |
| 04 | Multiple grids | `multiple-grids` | ✅ |
| 05 | Drag allow / ignore elements | `drag-allow-ignore-elements` | ✅ |
| 06 | Mirrored (RTL) | `mirrored-rtl` | ✅ |
| 07 | Responsive breakpoints | `responsive-breakpoints` | ✅ |
| 08 | Prevent collision | `prevent-collision` | ✅ |
| 09 | Responsive predefined layouts | `responsive-predefined-layouts` | ✅ |
| 10 | Add or remove items | `add-remove-items` | ✅ |
| 11 | Drag, drop from outside | `outside-drag-drop` | ✅ |
| 12 | Drag, drop from grid to grid | `cross-grid-drag-drop` | ✅ |
| 13 | Show close button | `close-button` | ✅ |
| 14 | Border radius | `border-radius` | ✅ |
| 15 | Horizontal shift | `horizontal-shift` | ✅ |
| 16 | Show grid lines | `grid-lines` | ✅ |
| 17 | Static items | `static-items` | ✅ |
| 18 | Custom drag handle & close button | `custom-drag-handle-close-button` | ✅ |
| 19 | v-model & save / load layout | `save-load-layout` | ✅ |
| 20 | Auto-size grid on content | `auto-size-grid` | ✅ |
| 21 | Edit mode toggle (view-only dashboard) | `edit-mode-toggle` | ✅ |
| 22 | Cross-grid drop restrictions | `cross-grid-drop-restrictions` | ✅ |
| 23 | Drag, drop from outside into multiple grids | `outside-drag-drop-multiple-grids` | ✅ |
| 24 | Configurable transition duration & easing | `transition-duration-easing` | ✅ |
| 25 | Custom drag-placeholder content | `custom-drag-placeholder` | ✅ |
| 26 | Alignment guides while dragging | `alignment-guides` | ✅ |
| 27 | scrollToItem & focusItem | `scroll-to-item-focus-item` | ✅ |
| 28 | Export layout as SVG | `svg-export` | ✅ |
| 29 | compactNow, rearrange & duplicateItem | `compact-now-rearrange-duplicate-item` | ✅ |
| 30 | Blocked-move feedback | `blocked-move-feedback` | ✅ |
| 31 | Per-item autoHeight | `per-item-auto-height` | ✅ |
| 32 | Snap to grid | `snap-to-grid` | ✅ |
| 33 | Configurable resize-hint appearance | `resize-hint-appearance` | ✅ |
| 34 | outsideDropAccept & readOutsideDropPayload | `outside-drop-accept-payload` | ✅ |
| 35 | Named layout presets | `named-presets` | ✅ |
| 36 | Localizable ARIA strings | `aria-labels` | ✅ |
| 37 | Multi-select & group move/resize | `multi-select-group-move-resize` | ✅ |
| 38 | Size constraints & aspect ratio | `size-constraints-aspect-ratio` | ✅ |
| 39 | autoScroll | `auto-scroll` | ✅ |
| 40 | Layout lifecycle events | `layout-lifecycle-events` | ✅ |
| 41 | Layout bounds & rendering options | `layout-bounds-rendering-options` | ✅ |
| 42 | Pluggable compaction (compactType & compactor) | `pluggable-compaction` | ✅ |
| 43 | Undo/redo (enableUndoRedo) | `undo-redo` | ✅ |
| 44 | Grid dimensions (rowHeight, colNum, margin) | `grid-dimensions` | ✅ |
| 45 | Switching layouts & forcing a remount | `switching-layouts-remount` | ✅ |

**Porting pattern**, confirmed from the 3 already done: each `vitepress-docs/examples/{NN}-example.md` becomes one `astro-docs/src/content/docs/vue/examples/{slug}.mdx` (adapt the prose, code block, and any `::: tip`/`::: warning` callout to Starlight's own admonition syntax), and each `vitepress-docs/examples/components/{NN}-example.vue` becomes one `astro-docs/src/components/examples/{slug}.vue` (or, where it duplicates existing harness behavior — `ExampleDemo`, `ExampleNumberField`, `ExampleToggle`, `LayoutJsonViewer` — reuse the harness rather than re-implementing the same interactive controls per example). Only add an entry to `astro.config.mjs`'s own sidebar array once a given example is actually ported — the existing config comment states this convention explicitly, and it's a good one: the sidebar should always reflect what's actually live, not a placeholder for all 45 up front.

---

## 5. Interactive examples — the hard technical problem

### The problem

Astro is islands-architecture: everything is static HTML by default, and a framework component only becomes interactive client-side with an explicit hydration directive. 45 examples means 45 separate live, interactive `GridLayout`/`GridItem` instances embedded across the docs.

### Approach (already established in the existing harness)

1. `@astrojs/vue` integration — installed.
2. Each example is a real `.vue` single-file component in `src/components/examples/{slug}.vue`, importing the actual published component library — not a re-implementation. Confirmed pattern from the 3 done so far.
3. Rendered via a thin wrapper with `client:visible` (not `client:load`), so a page with several examples doesn't eagerly hydrate all of them at once.
4. **Source display**: read the `.vue` file's raw source at build time (`?raw` import) and render through Starlight's own Shiki syntax highlighting — "view source" is always the literal file that's actually running.
5. Shared harness components (`ExampleDemo.vue`, `ExampleNumberField.vue`, `ExampleToggle.vue`, `LayoutJsonViewer.vue`) provide the consistent chrome — the mockup's own "Preview / Source" tab pattern (`_design/mockup-vue-docs-home.html`'s `.example-frame`) is the design reference this harness should visually match.

### React/Angular implication

`@astrojs/react` exists as an official integration — a React examples section is close to a mechanical repeat of this pattern with a `.tsx` file. **Angular has no official Astro integration** — when Angular docs are actually built, this needs Angular Elements (compiling to native custom elements, hydratable by Astro without a framework-specific integration), a community Astro–Angular integration if mature enough by then, or hand-rolled Angular SSR + hydration script.

---

## 6. Phased delivery plan

### Phase 0 — Foundations — DONE
Astro + Starlight scaffolded; `@astrojs/vue` integration; example harness built against 3 real examples; content collections scaffolded.

### Phase 1 — Landing page — DONE
Custom landing page built and wired to real routes.

### Phase 2 — Vue: Guide + Features — DONE (Features + 10/11 Guide pages, 1 removed by request)
Features page migrated in full: all 9 categories, every bullet linking to its example's real, final slug (per §4.4) — correct destinations even for the 37 examples not yet ported, so this page won't need touching again as more land.

All 11 Guide pages were done, adapted from real source (all repo-root docs referenced in §1.2 were found to have moved to `packages/vue/` and `packages/vue/docs/` in this monorepo, not the repo root as originally assumed): Introduction, Installation, Changelog, Test coverage, and `Guide → Project → {Accessibility scope, Architecture, Testing philosophy, Comparison: alternatives, Comparison: commercial, Roadmap, Production readiness}`. Two real findings along the way, not silently smoothed over: Testing philosophy's own source (`TESTING.md`) still described drag/resize testing in terms of mocking `interactjs`, contradicted by the Changelog/Architecture pages (both confirm `interact.js` was replaced by a native Pointer Events engine) — the ported page reflects the current, accurate architecture instead, with an explicit note. `PRODUCTION_READINESS.md` had an unresolved git merge conflict between two genuinely different snapshots — resolved on the user's own end, then ported from the resolved ("Updated upstream"/monorepo-split-aware) version once conflict markers were confirmed gone.

**Test coverage page removed by explicit request** (Phase 5), after the two-conflicting-snapshots issue it surfaced. Removed from the sidebar, from `llms.txt`, and from every page that linked to it (`Features.mdx`, `Testing philosophy`, and `Production readiness`'s own self-reference) — all four redirected to `Production readiness` instead, the closest remaining page with real coverage numbers. The underlying `.mdx` file was already gone from disk by the time this was requested (deleted directly by the user, outside this conversation) — this work was purely the sidebar/cross-link cleanup, not a file deletion.

### Phase 3 — Vue: Components + API — DONE (13/13 Components, 13/13 API pages, corrected)
All 13 Components pages written from real source: Overview, `GridLayout → {Props, Vue events, Eventbus events, Slots}`, `GridItem → {Props, Vue events, Eventbus events, Slots}`, `CustomCloseButton`, `CustomDragElement` (both written directly from the real `CustomCloseButton.vue`/`CustomDragElement.vue` source, not inferred from cross-references, once their missing sidebar entries were confirmed to be crashing every Starlight-rendered page — the same class of error as the earlier `production-readiness` one), `Styling → {CSS variables, GridLayout CSS, GridItem CSS}`. Every slug matches what `astro.config.mjs`'s sidebar already anticipated.

**API section significantly corrected** after the original 6 pages were found to cover only a fraction of the real export surface — the original build never checked the actual public entry point (`packages/vue/src/components/index.ts`), only the handful of source files reachable from what was already documented. A fresh read of that real barrel file surfaced ~25 undocumented exports: `ECompactType`, `serializeLayout`/`deserializeLayout`, `useLayoutStorage`/`useLayoutPresets`, `readOutsideDropPayload`, `exportLayoutAsSvg`, `ICompactor`/`ICompactorContext` plus the five built-in compactor constants, `IGridAriaLabels`/`DEFAULT_ARIA_LABELS`, three event-payload interfaces (`IOutsideItemDropped`/`ICrossGridItemDropped`/`ICrossGridDropRejected`), and four `defineExpose`-related types (`IPlaceholder`/`IAlignmentGuide`/`ISpacingIndicator`/`IGridItemPosition`). Six new pages added (ARIA labels, Pluggable compaction, Layout persistence, SVG export & outside-drop payload, Cross-grid & outside-drop event payloads, Exposed instance state, plus the `ECompactType` enum), the Layout interface page updated to also cover `ILayoutItemRequired`, and the Overview page rewritten from scratch against the real export list rather than the original partial one.

API section originally written from the real TypeScript source at `packages/core/src/` (not the unfinished source-site API section, which was genuine new-authoring work as flagged earlier): Overview, `Interfaces → {Eventbus (IEventsData), Layout (ILayoutItem/TLayoutItem)}`, `Types → Layout (TLayout/TResponsiveLayout/TBreakpoint/TBreakpoints)`, `Enums → {EGridLayoutEvent, EGridItemEvent}` — read directly from `layout-definition.ts`, `event-bus.interfaces.ts`, `EGridLayoutEvents.ts`, `EGridItemEvents.ts` rather than guessed at.

### Phase 4 — Vue: Examples — 52/45 DONE (7 new, beyond the original enumeration), redesigned to the "Try it" shell
All 45 examples ported, matching the real title/slug enumeration in §4.4. Every `.vue` component uses `show-grid-lines` by default (per the standing convention established mid-porting). Several examples required verifying real API signatures directly against `packages/core/src/` and `packages/vue/src/` rather than trusting inference from cross-references — `exportLayoutAsSvg`, `readOutsideDropPayload`, `useLayoutPresets`, `ICompactor`, and the `GridLayout` instance's real `defineExpose` list (confirming `undo`/`redo`/`canUndo`/`canRedo`/`compactNow`/`duplicateItem`/etc. are genuinely exposed). One real, confirmed documentation bug was found and fixed in the process: the earlier `GridLayout` events page (Phase 3) had fabricated `layout-created`/`layout-before-mount`/`layout-mounted` events that don't exist in the real `defineEmits` list — corrected there and not repeated in example 40's own content.

The Examples gallery page is done too — `vue/examples.mdx` now groups all 45 by the same 9 categories [Features](/vue/features/) uses, so a bullet there and an example here always mean the same thing.

**Seven new examples added (46–52), beyond the original enumeration**, directly requested after the full documentation audit (§5's own multiple audit passes) surfaced real, shipped features with zero example coverage — confirmed genuinely missing, not just under-documented, since none of the 45 real titles from the source site cover them (these features were added to the library after that 45-example set was authored): `alignSelected`/`distributeSelected` (a real feature with a full working implementation and zero prior example at all — the single most significant gap found), `showSpacingGuides`, the `#header` slot, per-item `zIndex`, `heightMode`'s `'scroll'`/`'fit'` modes, `dragActivationDistance`, and restricting `resizeHandles` to specific edges/corners.

**All 52 examples redesigned to a new "Try it" shell**, replacing the original `ExampleDemo.vue`-based chrome entirely, per an explicit reference-image request. New pattern:
- **`ExampleTryIt.astro`** (`src/components/harness/ExampleTryIt.astro`) — a plain Astro component, not Vue: a filename/Preview-Source toolbar, a preview panel (the live, hydrated Vue demo), a source panel using Astro's own built-in `<Code>` component (`astro:components`, a real Shiki wrapper) fed by a `?raw` import of the actual `.vue` file, and a minimal "Live, hydrated component" footer. The Preview/Source tab toggle is plain vanilla JS in an inline `<script>` — deliberately not a Vue-reactive toggle, since simple show/hide didn't need a framework island.
- Each example's own `.vue` component had `ExampleDemo`'s wrapper (title/description/footer slots) stripped entirely — the title/description now come from the `.mdx` page's own prose above the card, which was already duplicating them. Any example-specific interactive controls (toggles, buttons, number fields) moved into a plain `<div class="demo-controls">` at the top of the component's own template, unchanged in behavior. All legacy "Ported from vitepress-docs/..." comment headers were also stripped from every `.vue` file per explicit request — these were meta-commentary about authoring history, not something a real visitor viewing the Source tab needs to see.
- Each `.mdx` page updated to import both the component and its `?raw` source, and wrap the demo in `<ExampleTryIt code={...Source} filename="...">` — replacing the old hand-copied "## Code" markdown fence entirely, since the Source tab now shows the real, live file directly (can't drift out of sync the way a hand-copied snippet could).
- Two examples needed real restructuring beyond a mechanical unwrap: **28 (SVG export)** had its output-preview area moved from `ExampleDemo`'s old footer slot into the main template body, since the new shell has no arbitrary footer slot. **01 (Basic drag & resize)** was also used as the visual pilot for the whole redesign — its panel content was restyled to labeled "panel a/b/c" cards with a gray placeholder bar (matching the reference image) and an orange "active" highlight tracked via `GridLayout`'s own real `dragstart`/`dragend` events, before generalizing the shell to the other 51.
- `ExampleDemo.vue`, `LayoutJsonViewer.vue` are now unused by any example (superseded by the new shell) but left in place rather than deleted, since no file-delete tool is available in this session.

**Verified throughout, not assumed**: console-error checks across ~20 spot-checked pages, plus direct visual/screenshot confirmation on several (including one real self-caught mistake — misreading `svg-export`'s screenshot as "flat gray bars" before direct computed-style measurement proved the cards were correctly sized/styled all along, and a genuine iteration on `ExampleTryIt`'s own footer/eyebrow copy based on live feedback against the rendered page, not just the initial build).

**Full documentation-accuracy audit performed** (requested directly, prompted by the API section gap found the same session): every Components/API claim re-verified against a fresh, direct read of the real source — `grid-layout-props.interface.ts`, `grid-item-props.interface.ts`, `GridItem.vue` (the full component, not previously read start-to-finish), and the real public entry point — rather than trusting earlier passes. Real, confirmed gaps found and fixed:
- `GridLayout` Props page was missing three real props entirely: `heightMode`, `showSpacingGuides`, `resizeHandles` (the grid-wide default array).
- `GridItem` Props page was missing three real props: `dragActivationDistance`, `resizeHandles` (per-item override), `zIndex`.
- `GridItem` Slots page was missing an entire real slot: `#header`, with its own `vue-grid-item-has-header`/`vue-grid-item-header`/`vue-grid-item-body` CSS split.
- Styling → GridItem CSS page was missing two real classes: `vue-grid-item-has-header`, `vue-grid-item-selected`.
- **A genuine bug in the library's own source was found and flagged (not silently worked around)**: the component applies a `disable-userselect` class during drag, but the stylesheet's own rule is named `.disable-user-select` (with a hyphen) — the two never match, so that specific rule is dead code and text selection isn't actually prevented during drag the way the class name implies. Documented honestly as a known quirk rather than described as if it works.

Not yet re-audited with this same rigor: the Guide/Features prose pages' own specific factual claims beyond what Phase 2/4's own corrections already caught (many prop names are already mentioned correctly there, but the newly-discovered `heightMode`/`showSpacingGuides`/`zIndex`/`#header` slot aren't yet reflected in Features.mdx's own bullet list — a completeness gap, not a wrong-fact one).

**Second audit pass, continued to completion**: `GridLayout.vue`'s full template/style (already read in full during the API rebuild) cross-checked against every remaining Components page. Real gaps found and fixed:
- Styling → GridLayout CSS was missing three real classes/rules: `.vue-grid-layout--active-drag` (a real cross-grid-drag z-index fix, with its own documented rationale), `.vue-grid-alignment-guide`, `.vue-grid-spacing-indicator`. Its own "Sizing" section was also stale, still describing only `autoSize` after `heightMode` was added to the Props page.
- GridLayout's Eventbus events page was missing 5 real cascade messages (`setEnableEditMode`, `setUseBorderRadius`, `setBorderRadiusPx`, `setResizeHandles`, `setUseCssTransforms`) and the `itemClicked` GridItem→GridLayout message — the same 5 gaps mirrored on GridItem's own Eventbus events page.
- GridLayout's Vue events page and Slots page were both re-checked and confirmed already accurate — no changes needed.
- `CustomCloseButton` was re-checked and confirmed accurate. `CustomDragElement` had a real, meaningful gap: the actual drag-allow target (`.vue-draggable-handle`) is a small decorative circle *separate* from the visible labeled button, confirmed directly from the component's own template — clicking the visible text doesn't start a drag at all. Added an explicit caution rather than leaving the implication that the whole widget is grabbable.
- **A second real bug in the library's own source found**: the Styling → Variables page claimed a `$grid-line-color` SCSS variable controls grid-line guide color, at `#000` default — confirmed via the real `variables.scss` file that this SCSS variable **does not exist at all**. The actual mechanism is a genuine CSS custom property, `--grid-line-color`, with an inline fallback of `rgb(128 128 128 / 30%)` (not `#000`) — and unlike every other entry on that page, it's genuinely runtime-overridable, the opposite of the page's own blanket "not runtime-overridable" framing. Corrected on both the Variables page and its cross-reference on the GridLayout CSS page. Also added the one real, previously-undocumented SCSS variable found in the same file: `$grid-alignment-guide-color`.

**Third audit pass — Features.mdx and the Guide's own prose pages.** Features.mdx had a genuine completeness gap (not a wrong fact): the newly-discovered `heightMode`, `showSpacingGuides`, `zIndex`, and `#header` slot weren't mentioned anywhere in its bullet list — added four new bullets across the Drag & resize and Layout & collision categories. Architecture.mdx, Comparison: commercial, and Roadmap were all re-checked line-by-line against verified source/behavior and found already accurate — no changes needed.

**Comparison: alternatives had a real, significant, now-corrected error**, found by cross-checking it against the (already-accurate) Roadmap page: its "Where this project is genuinely behind" section claimed a competing fork (`@marsio/vue-grid-layout`) had align/distribute commands, a configurable resize-handle set, and spacing guides with distance labels that "none of which this project has yet" — directly contradicted by Roadmap's own "Recently completed" list (and independently confirmed via `GridLayout.vue`'s real `defineExpose` list including `alignSelected`/`distributeSelected`, and the real `resizeHandles`/`showSpacingGuides` props already verified this session). Corrected to accurately state this project already has all three, narrowing the fork's genuine remaining edge to just multiple persistence backends and a worker-based layout engine — both already tracked, accurately, on the Roadmap.

**Audit considered complete for this round.** Every Components/API/Styling page, both Comparison pages, Architecture, and Roadmap have been checked directly against real source or cross-referenced against each other for internal consistency, with multiple real, confirmed errors found and fixed (not just cosmetic staleness). Not re-verified with this same line-by-line rigor: Introduction, Installation, Changelog, and Accessibility scope — lower-risk, more narrative/setup-oriented pages that were written carefully from real source originally and haven't since been contradicted by anything found in this audit, but a future pass could still re-check them the same way if warranted.

**Fourth audit pass — full coverage of the four remaining pages, completed.** Introduction and Installation both checked line-by-line against the real `package.json`/barrel file and confirmed already accurate. Changelog and Accessibility scope each had the exact same broken link: both still pointed at `/vue/guide/coverage/` (the page removed by explicit request earlier this session) — missed by the original cross-link pass since that pass only checked pages known to reference it at the time, not every page site-wide. Both corrected to point at Production readiness instead, the same fix already applied elsewhere.

**One significant, unresolved finding surfaced during this pass, flagged directly to the user rather than silently acted on**: `packages/vue/package.json` lists `@keystone-dashboard-layout/core` as a real `dependencies` entry (`"workspace:*"`), but `vite.config.js` bundles `core`'s source directly into the published output (no `external` entry for it) — meaning the actual JS is genuinely self-contained at runtime, matching every "zero runtime dependencies" claim across the site. However, `scripts/generate-package.js` (the release pipeline) uses plain `npm pack`/`npm publish`, not `pnpm publish` — meaning the `workspace:*` protocol reference may never get rewritten to a real semver range before publishing, which could make the published package.json invalid for real npm consumers even though the bundled code itself works. Not verifiable against the live npm registry from here, and not something to silently "fix" in either direction (the docs' zero-runtime-dependency claims remain true about the bundled code either way) — left as an explicit, open engineering question for the user to verify against the actual published package.

**Fifth audit pass — mitt, prompted by a direct question.** Confirmed via `packages/vue/package.json` and `packages/core/package.json` (neither lists `mitt` as a dependency) and `packages/core/src/helpers/event-emitter.ts` (whose own doc comment states directly: "A minimal typed event emitter, replacing `mitt`... removing the dependency entirely") that `mitt` was deliberately removed from this codebase, replaced by an in-house `createEventEmitter()` with a matching `on`/`off`/`emit` surface. Found genuinely stale "mitt" references in four places, all now fixed: the API sidebar's own label (`'Eventbus (Mitt)'` → `'Eventbus (IEventsData)'`), and both `GridLayout`'s and `GridItem`'s Eventbus events pages, whose frontmatter `description` and (for `GridLayout`'s) opening paragraph both explicitly named "mitt" and linked to its GitHub repo. Checked and confirmed clean (no mitt reference to begin with): the Eventbus API page's own content, Architecture.mdx, the API Overview page, and `llms.txt`. Separately re-verified both `GridLayout`'s and `GridItem`'s Vue events pages (as opposed to Eventbus events) against the real `defineEmits` lists in this same pass — both already fully accurate, no changes needed.

**Grid-pane background color changed from white to light grey, per direct request.** Introduced a new `--kg-panel: #e9e9ea` token in `tokens.css`, distinct from `--kg-paper-2` (which stayed white) — checked first and confirmed `--kg-paper-2` is also used by the "Try It" shell's own card background, active Preview/Source tab, and footer, so reusing that same token for the fix would have changed those too, which wasn't asked for. All 52 example `.vue` files' `.example-item`/`.panel`/`.item-body` rules updated from `background: var(--kg-paper-2)` to `background: var(--kg-panel)`. Two files (03, 40) had a second, unrelated element also using `--kg-paper-2` (an event-log panel) — deliberately left white, not a grid pane. One file (28) similarly had an SVG-output preview box left white for the same reason. Verified directly via computed style (`rgb(233, 233, 234)` on the panel vs. `rgb(255, 255, 255)` on the surrounding card) and two screenshots, including one confirming a special-case colored variant (49's "pinned" amber item) still renders correctly, unaffected by the change.

**Copy-to-clipboard added to every example's Source tab**, since all 52 share the one `ExampleTryIt.astro` component — one change, applies everywhere. Reads the already-rendered Shiki output's own `textContent` rather than duplicating the full raw source a second time into a `data-*` attribute (confirmed directly that Shiki's line-by-line `<span>` structure still yields real newlines through `.textContent`, ruling out the correctness concern that would have justified the duplication). A real bug was caught and fixed before it ever reached the user: an early version called `.querySelector('pre')` on the button's own next sibling, but that sibling **is** the `<pre>` itself, not a wrapper containing one — a `<pre>` is never its own descendant, so that query always returned `null` and would have made the button silently do nothing on every click. Confirmed this specific failure mode directly (button did nothing on click), fixed it, and confirmed the fix (button correctly reached the clipboard-write call afterward) — not just written and assumed correct.

Redesigned per follow-up request into an icon-only button (SVG copy icon) with a custom CSS tooltip ("Copy code", shown on hover, styled to match the site rather than relying on the native browser tooltip), a hover effect (icon background/color shifts on hover, confirmed visually), and a toast notification ("Copied to clipboard", fixed-position bottom-right, auto-dismissing) replacing the earlier button-text-swap approach, which no longer made sense once the button became icon-only.

One real, honestly-reported limitation encountered during verification: automated coordinate-based clicks through this session's own browser-automation tooling did not reliably trigger a visible state change, while a script-dispatched `.click()` on the same button reliably did, and a bare console-issued `navigator.clipboard.writeText()` call also succeeded outright (confirmed: correct, complete content reached the clipboard, differing only by expected OS-level `\n`→`\r\n` normalization on Windows, not a content bug). This points to a known category of browser friction — clipboard-write often requires a genuinely trusted, non-automated user gesture — rather than a defect in the button itself, but true end-to-end confirmation of a real mouse click still ultimately rests on the user's own manual check.

**Follow-up repositioning, per direct request**: the toast moved from `position: fixed` (bottom-right of the viewport) to `position: absolute` inside `.try-it__panel--source` itself (the code panel, which already had `position: relative` from the copy button's own placement) — centered horizontally (`left: 50%` + a `translateX(-50%)` in the show/hide transform) and pinned near the panel's own top edge, rather than floating at the page level. The copy button also shifted 5px further left (`right: 12px` → `17px`). Both changes verified directly via computed style (button `right` resolves to `17px`; toast confirmed a genuine child of the source panel, `position: absolute`, and its transform correctly resolving the `-50%` centering offset while visible — not just assumed from the CSS alone).

**Landing page hero mockup expanded, per direct request**: the `.stage` dashboard-card mockup (`src/pages/index.astro`, the custom landing page — a separate surface from every `.vue/` docs page touched throughout the rest of this session) grew from 4 cards to 6, adding variety in card content rather than just more of the same plain-bar placeholders: a bar chart ("revenue"), a line chart ("active users"), a small data table ("top regions", three region/percentage rows), alongside the original plain-bar style ("signups", "conversion"), and the dragged "churn rate" card itself now shows its own small bar chart (amber-toned, distinct from the dark cards' blueprint/amber palette, matching its own light paper background). `.stage`'s own height grew from 420px to 460px and every card's absolute pixel position was recomputed by hand to avoid overlap across the new 6-card arrangement. Verified directly via screenshot after loading the real page — confirmed no overlapping/cut-off cards, no console errors.

**Landing page nav: framework-select dropdowns for "Docs" and "Examples"**, per direct, iterated request. First attempt added a separate new dropdown element next to GitHub — corrected once clarified that "Docs" and "Examples" themselves should become the triggers. Both now open a Vue/React/Angular list (real brand icons, LIVE/SOON status) with a genuine CSS opacity/transform fade-in — confirmed directly via computed style (`transition: opacity 0.18s, transform 0.18s`), not the `hidden` attribute, which cannot be animated. The JS was generalized from a single hardcoded element id to handle every `.fw-select` on the page, since there are now two; opening one closes the other, confirmed directly via computed class state on both menus at once.

**Real, confirmed bug found and fixed: the docs site's own left sidebar and top nav were not actually framework-aware, despite three framework sections existing.** Before this: `astro.config.mjs`'s own `sidebar` array had React's and Angular's top-level groups commented out entirely, and `Header.astro`'s `navLinks` were hardcoded to Vue-only routes shown unconditionally on every page. Confirmed directly (not assumed) that this meant visiting `/react/` or `/angular/` — both real, existing placeholder pages — fell through the Sidebar override's own Vue-specific prefix matching and landed on its full, unfiltered fallback, showing **Vue's entire Guide/Components/API/Examples tree** in the left sidebar while browsing a page that has none of that content, and the Header still showed Vue's own Guide/Features/Components/API/Examples/Changelog links regardless.

Fixed in three places: (1) uncommented React's and Angular's sidebar groups in `astro.config.mjs`, each with the one real "Coming soon" page they actually have — no invented sub-sections; (2) `Sidebar.astro` now isolates to the current top-level *framework* group first (Vue vs. React vs. Angular, detected from the URL) before the existing Guide/Components/API/Examples sub-section narrowing runs, so a framework with no sub-groups of its own still correctly shows just its own single entry instead of falling through to Vue's tree; (3) `Header.astro`'s `navLinks` is now a per-framework array — Vue keeps its real six links, React and Angular deliberately get an empty array rather than links to sections that don't exist. Verified directly on all three: Vue's Guide sidebar isolation and full nav link row still work unchanged; both `/react/` and `/angular/` now show only their own single sidebar entry and no framework-specific nav links at all, confirmed via screenshot on each, not just reasoned about from the code.

### Phase 5 — Polish & parity check — IN PROGRESS
`llms.txt` generated at `public/llms.txt` (served at the site root), covering every real page across Guide/Features/Components/API/Examples — built directly from `astro.config.mjs`'s own sidebar list, not a separate hand-maintained enumeration that could drift out of sync with it.

Cross-link pass found and fixed two real issues, not just stale-count touch-ups: (1) `Features.mdx`'s own status note and `vue/index.mdx`'s own status note both still said "8 of 45" from partway through Phase 4 — both corrected now that all 45 are live. (2) A genuine broken link: the landing page's framework-picker cards link to `/react/` and `/angular/`, but no content existed at either path at all (`src/content/docs/` had only a `vue/` folder) — both sidebar entries have been commented out since Phase 0, which apparently masked this from ever being noticed. Fixed with two minimal, honest placeholder pages (`react.mdx`/`angular.mdx`) explaining these aren't published yet, rather than leaving the cards pointing at a 404 or writing speculative React/Angular content that would violate the "no invented content" scope rule from this document's own opening line.

Every example link on `Features.mdx` was individually checked against the real `astro.config.mjs` slug list — confirmed zero broken links there.

Still open: visual/responsive QA, and a perf pass on the multi-island pages (both genuinely not started yet).

A third real inconsistency found and fixed: the dedicated `Test coverage` page (`vue/guide/coverage`) still carried the same old, pre-monorepo-split numbers `Production readiness` also used to have before its own git-conflict resolution — the two disagreed (99.49%/95.94%/99.5%/99.52%/620 tests vs. 99.65%/95.05%/99.64%/99.64%/353 tests). No shell access to the actual repo means neither could be re-verified directly, so rather than pick one arbitrarily or fabricate a third number, the page now surfaces both snapshots side-by-side with an explicit caution, and tells the reader to regenerate a real number themselves with `pnpm test:coverage`.

### Phase 6 (out of scope this round)
React section, Angular section (including resolving the integration question from §5).

---

## 7. Open items

1. ~~Full 45-example enumeration~~ — **RESOLVED this revision.** All 45 real titles confirmed directly against `vitepress-docs/examples/*.md`.
2. **Is `FEATURES.md` (repo) ahead of or behind the deployed `/features/` page?** Still worth a diff before treating one as canonical.
3. **React/Angular content source.** Does an equivalent React or Angular grid-layout library/doc-set already exist to port from, or is this site being built ahead of those libraries existing? Still unresolved, still affects Phase 6 scoping.
4. **Full `CHANGELOG.md` history vs. recent entries only** — still unconfirmed which is wanted.
5. **API section authoring** — confirmed new-authoring-work, not migration, per §3 Phase 3 note.
6. ~~42 remaining examples~~ — **RESOLVED.** All 45 examples ported (Phase 4 complete).
7. **Landing page framework-picker links** — **RESOLVED this revision.** `/react/` and `/angular/` had no content at all despite being linked from the landing page; fixed with minimal placeholder pages (see Phase 5).
