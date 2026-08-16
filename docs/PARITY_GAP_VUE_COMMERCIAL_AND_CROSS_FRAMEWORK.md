# Parity Gap: Vue package vs. React/Angular GitHub Projects and Commercial Products

**Package:** [`packages/vue`](./packages/vue) (`@keystone-dashboard-layout/vue`)
**Status:** Feature-complete reference implementation

This document is the comprehensive external benchmark for the Vue
package specifically — pulling together the React and Angular
open-source comparisons already done piecemeal elsewhere
([`PARITY_GAP_VUE.md`](./PARITY_GAP_VUE.md),
[`packages/vue/COMPARISON_ALTERNATIVES.md`](./packages/vue/COMPARISON_ALTERNATIVES.md))
with the commercial-product comparison
([`packages/vue/COMPARISON_COMMERCIAL.md`](./packages/vue/COMPARISON_COMMERCIAL.md))
into one place, plus one commercial competitor not covered anywhere
else yet: **Syncfusion DashboardLayout**, which — unlike Kendo
TileLayout or DevExtreme — actually ships a Vue build and uses a
directly comparable freeform-grid layout model rather than a
split-pane tree.

If you only need the Vue-ecosystem-specific angle (`grid-layout-plus`,
`vue-grid-layout-v3`, etc.), see `PARITY_GAP_VUE.md` instead — this
document's scope is deliberately the *other* frameworks and the
commercial tier.

## Projects compared

| Project | Category | License | Vue support? |
| --- | --- | --- | --- |
| [`react-grid-layout/react-grid-layout`](https://github.com/react-grid-layout/react-grid-layout) | React (GitHub) | MIT | No — React only |
| [`tiberiuzuld/angular-gridster2`](https://github.com/tiberiuzuld/angular-gridster2) | Angular (GitHub) | MIT | No — Angular only |
| [`gridstack/gridstack.js`](https://github.com/gridstack/gridstack.js) | Framework-agnostic (GitHub) | MIT (core); some enterprise add-ons commercial | Yes — official Vue 3 wrapper |
| Kendo TileLayout | Commercial (Telerik/Progress) | Commercial (free for KendoReact specifically) | **No** — jQuery, Angular, React, Blazor only |
| DevExtreme Dashboard (layout engine) | Commercial (DevExpress) | Commercial, no free tier | Yes, via a thin wrapper layer over the same core |
| **Syncfusion DashboardLayout** | Commercial (Syncfusion) | Commercial (community/free tier available under revenue thresholds) | **Yes** — genuine Vue build, same as React/Angular/Blazor/JS |

## GitHub project comparison

### `react-grid-layout` v2 — the category's reference implementation

- ~22,300 GitHub stars, ~2.5M weekly npm downloads — the largest, most battle-tested project in this entire comparison.
- Recently completed a v2 rewrite: full first-party TypeScript, a Hooks API (`useContainerWidth`, `useGridLayout`, `useResponsiveLayout`), composable configuration objects (`gridConfig`, `dragConfig`, `resizeConfig`, `positionStrategy`, `compactor`), tree-shakeable `/core`/`/extras`/`/legacy` entry points, and a new constraints system covering aspect-ratio locks, snap-to-grid, and boundary restrictions during drag/resize.
- **What it has that this package doesn't:** an open `positionStrategy` interface (this package's `useCssTransforms` is a closed on/off switch, not a pluggable interface); a `/legacy` entry point for 100% v1 backwards compatibility; a documented constraints system that now covers snap-to-grid too (previously unique to this package — worth re-verifying its exact snap behavior before continuing to claim this as a differentiator).
- **What this package has that it doesn't:** visual alignment guides, `MOVE_BLOCKED_BY_COLLISION` feedback event, named layout presets, first-party persistence helper, grid-to-SVG export, localizable ARIA strings, live-resyncing per-item `autoHeight`, multi-select group move *and* resize, cross-grid drag between independent instances.

### `angular-gridster2` v22 — the Angular ecosystem's clear default

- Latest release `22.0.0` (June 2026), actively maintained for years, major-version numbers tracking supported Angular versions back to Angular 8.
- Standalone components (`Gridster`/`GridsterItem`, `standalone: true`, no `NgModule`) — a real modernization from its earlier module-based API.
- Zoneless-ready: recent releases specifically address Angular's zoneless change-detection model while still supporting `NgZone.run`/`runOutsideAngular` for `zone.js` apps.
- Gridster API exposed via `initCallback` or Angular's signal-based `viewChild(Gridster)` query — tracking Angular's own signals-first direction.
- **No confirmed equivalent** to this package's snap-to-grid (as a magnetic concept distinct from a visual guide), alignment guides, named presets, SVG export, ARIA localization, or cross-grid drag — none of these were found in its docs, though a direct read of its full API surface hasn't been done specifically for this comparison (the same caveat every alternative in this space carries until checked directly).
- **What it likely has that this package doesn't:** years more production usage across a much larger installed base; Angular-native idioms (signals, standalone components) this package has no equivalent concept for, since it's a different framework entirely.

### `gridstack.js` — the framework-agnostic wildcard, and the one true multi-framework GitHub peer

- ~8.7k stars, actively developed, vanilla-JS core with **official Vue 3, React, and Angular wrapper components** — the only project in this whole comparison (open-source or commercial) that is a single core engine genuinely spanning all three frameworks this monorepo targets.
- **What it has that this package doesn't:** true sub-grid nesting (grids-within-grids as first-class structures, not just sibling-to-sibling cross-grid drag); swap-on-drag as the default `float: false` behavior (dragging one item onto another of the same size swaps their positions, rather than compacting/pushing); built-in `save()`/`load()` persistence methods on the core engine itself (this package's equivalent, `useLayoutStorage`, is a separate composable, not core-engine-level).
- **What this package has that it doesn't:** magnetic snap-to-grid as a distinct concept, visual alignment guides, `MOVE_BLOCKED_BY_COLLISION` event, named layout presets, SVG export, localizable ARIA strings, live-resyncing `autoHeight`, multi-select group resize (not confirmed either way for gridstack.js in the scope checked).

## Commercial product comparison

### Kendo TileLayout (Telerik/Progress)

CSS Grid-based (`col`/`row`/`colSpan`/`rowSpan`), not freeform coordinates — dragging *reorders* within CSS Grid auto-flow rather than moving to an arbitrary free position, and resize is restricted to the bottom/right edges plus the bottom-right corner (not all 8 edges/corners independently). **No Vue build at all** — jQuery, Angular, React (KendoReact), and Blazor only.

- **What it has that this package doesn't:** `clickMoveClick` — a genuine non-drag reorder mode (click a tile to start moving it, click again to place it), a real accessibility affordance this package doesn't have an equivalent for; being one component in a much larger commercial suite with paid support.
- **What this package has that it doesn't:** freeform positioning, full 8-edge/corner independent resize, cross-grid drag, outside-drop, responsive breakpoints, undo/redo, multi-select, snap/alignment guides, SVG export.

### DevExtreme Dashboard (DevExpress) — layout engine only, not the full BI platform

A recursive binary split-pane tree, not freeform coordinates — resize means dragging the separator between two adjacent panes. The full product is a BI-authoring platform (SQL/OLAP/JSON/Excel binding, drill-down, WYSIWYG designer, PDF/Excel export); only the drag/resize/arrange mechanics are comparable at all.

- **What it has that this package doesn't:** **maximize/restore** — expanding one item to fill the entire surface and back, with full component lifecycle re-fired on each transition. This is the one genuine, worth-tracking gap even at the pure layout-mechanics level; tracked as `ROADMAP.md` item 32, not yet designed.
- **What this package has that it doesn't:** freeform positioning, full independent resize, cross-grid drag, outside-drop, responsive breakpoints, undo/redo, multi-select, snap/alignment guides.

### Syncfusion DashboardLayout — the closest commercial analog, and the only commercial Vue build

Unlike Kendo and DevExtreme, Syncfusion's DashboardLayout uses a genuinely comparable model: a **grid-structured layout with independent panels** (not a split-pane tree), supporting drag, resize, reorder, add/remove — and, notably, **ships a real Vue build alongside React, Angular, Blazor, and plain JavaScript**, the only commercial product in this comparison that does.

**Update:** the table below is now based on Syncfusion's actual `DashboardLayout` and `DashboardLayoutPanel` API class references (read directly — the same underlying `ej2-layouts` core every framework wrapper, including their Vue one, shares), not marketing copy. Full property list confirmed: `allowDragging`, `allowFloating`, `allowResizing`, `cellAspectRatio`, `cellSpacing`, `columns`, `draggableHandle`, `enableHtmlSanitizer`, `enablePersistence`, `enableRtl`, `mediaQuery`, `panels`, `resizableHandles`, `showGridLines` (plus `change`/`created`/`destroyed`/`drag`/`dragStart`/`dragStop`/`resize`/`resizeStart`/`resizeStop` events) at the layout level, and `col`/`row`, `content`, `cssClass`, `enabled`, `header`, `id`, `maxSizeX`/`maxSizeY`, `minSizeX`/`minSizeY`, `sizeX`/`sizeY`, `zIndex` at the panel level. Methods: `addPanel`/`removePanel`/`removeAll`/`movePanel`/`resizePanel`/`updatePanel`/`serialize`/`refresh`/`updateDraggableHandle`.

| Feature | This package | Syncfusion DashboardLayout |
| --- | --- | --- |
| Layout model | Freeform `x`/`y`/`w`/`h` grid coordinates | Grid-structured panels (`col`/`row`/`sizeX`/`sizeY`) — directly comparable, not a split-pane tree |
| Vue support | Native, ground-up | Yes — a genuine Vue build |
| Compaction ("floating") | Yes, 5 pluggable strategies (`compactor`/`compactType`) | Yes — `allowFloating` (default `true`); a single on/off toggle, not a pluggable strategy set — **confirmed**, not just "functionally the same idea" as previously written |
| Responsive breakpoints | Yes — full multi-breakpoint system (`responsive`/`breakpoints`/`cols`, 7 named breakpoints) | `mediaQuery` (default `"max-width:600px"`) — a **single** stack-point string, not a multi-breakpoint system. **This package's responsive system is confirmed more capable**, not merely different, now that the actual API is read. |
| Save/restore layout | Yes (`useLayoutStorage`, `serializeLayout`/`deserializeLayout`) | `serialize()` method, plus `enablePersistence` (a single boolean auto-save/restore to browser storage, keyed by component id) — **a real convenience gap**: this package requires an explicit `useLayoutStorage` call with a key, Syncfusion's is a one-flag default. See below. |
| Configurable resize-handle set | Yes (`resizeHandles`) | `resizableHandles` (string array of directions) — **confirmed direct parity**, same shape |
| Per-panel z-index override | **Now yes** (`zIndex`, added below) | `zIndex` (default `1000`) — was a confirmed gap, now closed |
| Distinct header/title-bar region per panel | **Now yes** (`#header` slot, added below) | `header` (separate from `content`) — was a confirmed gap, now closed |
| Per-panel disabled state (distinct from just non-draggable/non-resizable) | Not confirmed as a distinct concept — `isStatic` removes drag/resize; nothing greys out or disables the panel's own content interactivity | `enabled` (default `true`) — genuine, still-open, low-priority gap; ambiguous whether it's meaningfully different from combining `isStatic`+`isDraggable: false`+`isResizable: false` without seeing it demonstrated directly |
| Grid-wide default drag-handle selector | Per-item only (`dragAllowFrom`/`dragIgnoreFrom`) — no `GridLayout`-level default | `draggableHandle` — confirmed grid-wide default, applies to every panel at once | 
| Cell aspect ratio as an explicit ratio | Not exposed directly — emergent from `rowHeight` vs. derived column width | `cellAspectRatio` (default `1`) — confirmed real, low-priority (mostly achievable today via `rowHeight` tuning) |
| Cross-grid drag between independent instances | Yes (`allowCrossGridDrag`) | Not in the confirmed property/method list above — genuinely absent, not just undocumented in what was checked |
| Drag-and-drop from outside the component | Yes (`allowOutsideDrop`) | Not in the confirmed list — genuinely absent |
| Magnetic snap-to-grid / alignment guides | Yes (both) | Not in the confirmed list — genuinely absent |
| Undo/redo | Yes | Not in the confirmed list — genuinely absent |
| Multi-select group move/resize | Yes | Not in the confirmed list — genuinely absent |
| SVG/image export of the layout itself | Yes (`exportLayoutAsSvg`) | Not in the confirmed list — genuinely absent |
| Licensing | MIT, free | Commercial — Syncfusion offers a free community license under a revenue/team-size threshold, otherwise paid |

**This replaces the earlier "Not confirmed" hedging** for cross-grid drag, outside-drop, snap/alignment guides, undo/redo, and multi-select — these are confirmed genuinely absent from Syncfusion's documented API surface, not merely unconfirmed. Two real, closable gaps were found (per-panel `zIndex`, a distinct `header` region) and have since been implemented — see “Closed” below. `enablePersistence`'s one-flag convenience and `draggableHandle`'s grid-wide default remain open, lower-priority items.

## Closed

| Item | How it was closed |
| --- | --- |
| Per-panel `zIndex` override | `zIndex` prop added to `GridItem` (`number \| null`, default `null` = defer to the library's own implicit static/-resizing z-index handling). An explicit value always wins, applied as an inline style so it overrides both the `.vue-static`/`.resizing` CSS-class-based defaults regardless of state. |
| Distinct header/title-bar region per panel | `#header` named slot added to `GridItem`, rendered above the existing content area in a flex-column layout — only when actually provided, so the default (no-header) case's DOM structure and existing behavior are completely unchanged. |

## Bottom line across everything compared

- **No project or product checked — open-source or commercial, any framework — has the full combination** of magnetic snap-to-grid, visual alignment guides, named layout presets, SVG export, localizable ARIA strings, live-resyncing `autoHeight`, and multi-select group resize this package has. Individual pieces show up elsewhere (Kendo's click-move-click, DevExtreme's maximize/restore, gridstack.js's sub-grid nesting and swap-on-drag), but no single alternative has this package's specific combination.
- **The two clearest, most concrete gaps worth prioritizing**, cutting across every comparison in this document: **maximize/restore** (DevExtreme has it, tracked as `ROADMAP.md` item 32) and **sub-grid nesting or swap-on-drag** (gridstack.js has both, neither started).
- **Syncfusion DashboardLayout deserves a proper, API-doc-level follow-up comparison** — it's the only commercial product actually shaped like this one (freeform-ish panels, not split-panes) and the only one with a real Vue build, making it a more relevant benchmark than Kendo or DevExtreme for a Vue-first audience specifically.
