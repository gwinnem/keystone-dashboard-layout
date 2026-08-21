# Demo app — implementation plan

## Goal

A standalone showcase/manual-testing app for `@keystone-dashboard-layout/react`,
covering every `GridLayout`/`GridItem` prop and imperative-handle method —
mirroring `packages/vue/demo/`'s own established role and conventions
(same "exercise every prop" goal, same directory shape, same
`data-testid`-driven testability), adapted to this package's own,
narrower feature set (confirmed by reading `grid-layout-props.interface.ts`,
`grid-item-props.interface.ts`, `grid-layout-handle.interface.ts`,
`layout-definition.ts`, and `src/index.ts`'s own export list directly,
not assumed from Vue's own prop list).

**Revision note**: the first draft of this plan was built only from
`packages/vue/demo/`'s own 7-8 views, and under-scoped three real,
confirmed pieces of React's own API surface as a result — the
`header`/`renderResizeHandle` render props, the public `useLayoutStorage`
hook, and `compactNow`/`rearrange`/`duplicateItem` on the imperative
handle. These were caught by cross-checking against
`vitepress-docs/examples/` — 45 individually-documented, more granular
examples than `demo/`'s own broader groupings — which is a genuinely
more complete reference for "does every feature have a home somewhere"
than `demo/` alone. See "Coverage cross-check against the 45 VitePress
examples" near the end of this document for the full, corrected mapping,
including two features confirmed absent from React entirely (not
omitted from this plan — genuinely not built yet).

This is distinct from `e2e-fixture/`, which stays exactly as it is —
a deliberately minimal scenario switcher whose only job is feeding
Playwright's own automated suite. The demo app is a superset, built for
a human (or an agent driving Chrome) to actually explore, plus a second,
comprehensive substrate `data-testid`-driven browser automation can run
against.

## Reference: what's being mirrored from Vue's `demo/`

| Convention | Vue's `demo/` | This plan |
|---|---|---|
| Directory location | `packages/vue/demo/` | `packages/react/demo/` |
| Dev script | `npm run demo` → port 5174 | `npm run demo` → port **5176** (5174 is Vue's own demo, 5175 is this package's own `e2e-fixture`) |
| Build script | `npm run demo:build` → `dist-demo/` | Same |
| Library import | `../src` directly via `@` alias, no build step | `../src` directly (relative import, matching `e2e-fixture`'s own pattern — no alias needed since there's no `@/core`-style historical baggage on the React side) |
| Structure | `App.vue` + `views/*.vue`, one view per feature area | `App.tsx` + `views/*.tsx`, same shape |
| Testability | `data-testid` on every element a test might assert on | Same convention, extended (see "Testability" below) |
| Own README | `demo/README.md` documenting each view | Same, updated per view as built |

## Directory structure

```
packages/react/demo/
├── README.md
├── index.html
├── main.tsx
├── App.tsx                          # nav + view switcher, same shape as e2e-fixture/App.tsx
├── style.css
├── vite.config.ts                   # standalone, port 5176, imports ../src directly
└── views/
    ├── BasicGridView.tsx
    ├── DragResizeView.tsx
    ├── DynamicItemsView.tsx
    ├── ResponsiveView.tsx
    ├── SelectionAndHistoryView.tsx
    ├── CrossGridView.tsx
    ├── ExternalDropView.tsx
    ├── ItemOverridesView.tsx
    └── AdvancedFeaturesView.tsx
```

`package.json` gains two scripts, matching Vue's exact naming:

```json
"demo": "vite --config demo/vite.config.ts",
"demo:build": "vite build --config demo/vite.config.ts"
```

`demo/vite.config.ts` mirrors Vue's own (`root` pointed at `demo/`,
`server.port: 5176`, `server.strictPort: true`, `server.open:
!process.env.CI` — same "don't launch a browser window in CI" rationale,
since this dev server can also become a Playwright `webServer` target
later if a demo-app-specific e2e suite is ever added), `build.outDir`
pointed at `../dist-demo/`.

## The nine views

Every prop/handle-method/per-item-field below was confirmed present in
the actual interfaces (`grid-layout-props.interface.ts`,
`grid-layout-handle.interface.ts`, `layout-definition.ts`) before being
assigned to a view — nothing here is carried over from Vue's own prop
list without checking it actually exists on this package's side too.

### 1. `BasicGridView`
The smallest possible setup — a fixed `layout`, default drag/resize,
`onLayoutChange` wired to local state. No toggles. The "what does this
look like with zero configuration" reference point every other view
implicitly builds on.

### 2. `DragResizeView`
Every grid-wide toggle not covered by a more specific view, as live
controls, plus a live event log (`onDragStart`/`onDragMove`/`onDragEnd`/
`onItemClose`/`onMoveBlockedByCollision` — called out explicitly by
name in the log, not just lumped together, so `onMoveBlockedByCollision`
specifically has a visible, attributable moment when `preventCollision`
actually blocks something):

- **Interaction**: `isDraggable`, `isResizable`, `isBounded`,
  `preventCollision`, `enableEditMode`
- **Compaction**: `compactType` (all four strategies), `restoreOnDrag`,
  `distributeEvenly`, `horizontalShift`, plus `compactNow`/`rearrange`
  (via `ref`) as explicit "tidy up now" buttons — demonstrating the
  forced-compaction behavior distinctly from automatic per-tick
  compaction, including with `compactType={NONE}` set
- **Rendering**: `useCssTransforms`, `transformScale`,
  `transitionDurationMs`, `transitionTimingFunction`, `heightMode`
  (all four modes), `showGridLines`
- **Resize affordance**: `resizeHandles` (which of the 8), `showResizeHandles`,
  `resizeHandleColor`, and `renderResizeHandle` (a custom icon per edge/
  corner — the render-prop equivalent of Vue's own `#resize-handle`
  slot)
- **Snap & guides**: `snapToGrid`, `snapThreshold`, `showAlignmentGuides`,
  `showSpacingGuides`
- **Close button**: `showCloseButton` + `onItemClose` wired to actually
  remove the item from state (demonstrating the "library doesn't decide
  what removal means" contract)
- **Custom header content**: the `header` render prop (custom content
  above `children`, becoming a two-region flex layout) — including a
  worked example of using `dragAllowFrom`/`resizeIgnoreFrom` targeting a
  class on that header, matching Vue's own example 18 mechanism exactly
  (see the cross-check section near the end of this document — this
  turned out not to be a parity gap at all once Vue's own source was
  actually checked)

This is the single largest view by control count, matching Vue's own
`DragResizeView`'s role as the "big toggle playground."

### 3. `DynamicItemsView`
Adding/removing items without rebuilding the whole layout — a controlled
`layout` state array, an "add item" button placing a new one via a
real first-fit slot (not just `y: Infinity`), and a remove button per
item. Demonstrates the fully-controlled contract (`GridLayout` never
mutates `layout` in place) concretely, not just in prose. Also covers
two related, previously-missing pieces:

- **Persistence**: `useLayoutStorage` (a public export from
  `src/index.ts`) — `save()`/`load()`/`clear()` wired to buttons,
  round-tripping the current layout through `localStorage` and back.
- **Layout-switching techniques**: swapping between two or more
  in-memory layout presets (a plain array of named `TLayout` values,
  not a dedicated prop — React has no "named presets" feature, this is
  a demonstrated pattern built from existing state), and forcing a
  full remount on switch via a changed `key` prop where that's the
  simpler choice over reconciling in place.

### 4. `ResponsiveView`
`responsive`, `breakpoints`, `cols`, `responsiveLayouts`,
`onBreakpointChange` — plus a simulated-container-width slider (same
technique as Vue's own view) so breakpoint behavior is testable without
actually resizing the browser window itself.

### 5. `SelectionAndHistoryView`
Two closely-related, ref-driven feature groups that don't map to any
Vue prop at all — this package's own additions beyond Vue's current
feature set:

- **Selection**: `multiSelect`, `selectItem`/`deselectItem`/
  `toggleItemSelection`/`clearSelection` (via `ref`), `selectedItems`,
  `onSelectionChanged`, group move/resize (dragging/resizing one
  selected item while others are also selected), `alignSelected` (all
  edges), `distributeSelected` (both axes)
- **History**: `enableUndoRedo`, `undoHistoryLimit`, `undo`/`redo`/
  `canUndo`/`canRedo` (via `ref`) — including demonstrating that an
  align/distribute/group-move action is itself undo-tracked

### 6. `CrossGridView`
Two independently-toggleable `GridLayout` instances side by side —
`allowCrossGridDrag`, `disableExternalDrop`, `layoutId`,
`onCrossGridItemDropped`, `onCrossGridDropRejected` — dragging an item
from one grid into the other, and demonstrating a rejected drop when
the target has `disableExternalDrop` on.

### 7. `ExternalDropView`
`allowOutsideDrop`, `outsideDropWidth`, `outsideDropHeight`,
`outsideDropAccept`, `onOutsideDrop` — a plain `draggable="true"`
element outside any grid, dragged in via the browser's native HTML5
drag-and-drop (distinct from `CrossGridView`'s pointer-driven engine).
Both grids in this view also keep `allowCrossGridDrag` on, so an
already-added item can additionally move between them — same dual
coverage as Vue's own `ExternalDropView`.

### 8. `ItemOverridesView`
Every per-item (`ILayoutItem`) field not otherwise exercised by
default-generated items elsewhere, via a control panel bound to one
selected item:

`isStatic`, `isDraggable`/`isResizable`/`isBounded` (three-way
inherit/true/false, matching Vue's own selector convention),
`minW`/`maxW`/`minH`/`maxH`, `zIndex`, `showCloseButton` (per-item),
`autoScroll` (per-item), `preserveAspectRatio` (per-item), `ariaLabels`
(per-item merge), `dragAllowFrom`/`dragIgnoreFrom`, `resizeIgnoreFrom`,
`dragActivationDistance`, `resizeHandles` (per-item, including the
"empty array" case), `isMirrored` (per-item opt-out), `enableEditMode`
(per-item), `borderRadiusPx`/`useBorderRadius` (per-item),
`showResizeHandles`/`resizeHandleColor` (per-item), `autoHeight`.

### 9. `AdvancedFeaturesView`
Everything left: `exportLayoutAsSvg` (download/preview the generated
SVG), `scrollToItem`/`focusItem` (via `ref`), grid-wide `isMirrored`
(RTL) and `preserveAspectRatio`, a custom `compactor` example (`ICompactor`),
a keyboard-accessibility walkthrough (arrow-key move, Shift+arrow
resize, Tab focus order — narrated, not just left implicit), grid-wide
`ariaLabels`, and the remaining event callbacks (`onLayoutReady`,
`onColumnsChanged`) surfaced in a live log.

## Testability — how Chrome/Playwright drives this

Every interactive element (nav buttons, toggle inputs, sliders, item
roots, the event log itself) gets a `data-testid`, following
`e2e-fixture`'s own existing naming pattern
(`data-testid="nav-{view-name}"` for navigation, `data-grid-item-id`
already set automatically by `GridItem` itself for item roots — no
change needed there). This means:

- **Claude in Chrome** (or any MCP browser tool) can navigate the running
  dev server (`npm run demo`, port 5176), locate controls by testid, and
  drive every feature end to end without needing custom selectors
  invented per session.
- A **future demo-specific Playwright suite** (optional, not part of this
  plan's own scope) could point `playwright.config.ts`'s own
  `webServer` at `npm run demo` instead of (or alongside) `e2e-fixture`,
  the same way Vue's own `playwright.config.ts` already does — the
  groundwork (testids, a stable dev port) is what this plan delivers;
  writing that suite is a separate, later decision.

## Build phasing

Each phase is independently useful — the demo app is usable (if
incomplete) after every phase, not just at the end.

1. **Scaffolding**: `demo/` directory, `vite.config.ts`, `index.html`,
   `main.tsx`, `App.tsx` (nav shell only), `style.css`, `package.json`
   scripts, `demo/README.md` skeleton. `BasicGridView` as the first real
   view, to prove the whole pipeline (dev server, direct `src` import,
   testids) end to end before building the other eight.
2. **Core interaction**: `DragResizeView`, `DynamicItemsView` — the two
   views with the most day-to-day-relevant toggle surface.
3. **Layout-shape features**: `ResponsiveView`, `ItemOverridesView`.
4. **Selection/history**: `SelectionAndHistoryView`.
5. **Multi-grid features**: `CrossGridView`, `ExternalDropView`.
6. **Everything else**: `AdvancedFeaturesView`.
7. **Polish**: `demo/README.md` fully written (one row per view,
   matching Vue's own table format), a final pass confirming every
   prop/handle-method/per-item-field enumerated above actually has a
   reachable control somewhere in the app.

## Coverage cross-check against the 45 VitePress examples

`vitepress-docs/examples/` (`01-example.md` through `45-example.md`,
each with its own live `.vue` component) is Vue's more granular
feature-by-feature reference — a stronger completeness check than
`demo/`'s own 7-8 broader views alone, since a feature could in
principle hide inside one of those broader groupings without actually
having a reachable control. Every one of the 45 is cross-referenced
below against which React view (if any) demonstrates the equivalent,
confirmed against the actual interfaces rather than assumed from the
example's own title.

| # | Vue example | React view | Note |
|---|---|---|---|
| 1 | Basic drag & resize | `BasicGridView` | |
| 2 | Bounded drag to container | `DragResizeView` | `isBounded` |
| 3 | Events | `DragResizeView` (log) | Every grid-level callback fires into one visible log, not a separate view |
| 4 | Multiple grids | `BasicGridView` or `CrossGridView` | Two independent, non-interacting grids side by side — simplest form; `CrossGridView` covers the interacting form |
| 5 | Drag allow/ignore elements | `ItemOverridesView` | `dragAllowFrom`/`dragIgnoreFrom` |
| 6 | Mirrored (RTL) | `AdvancedFeaturesView` | grid-wide `isMirrored`; per-item opt-out also in `ItemOverridesView` |
| 7 | Responsive breakpoints | `ResponsiveView` | |
| 8 | Prevent collision | `DragResizeView` | |
| 9 | Responsive predefined layouts | `ResponsiveView` | `responsiveLayouts` |
| 10 | Add or remove items | `DynamicItemsView` | |
| 11 | Drag, drop from outside | `ExternalDropView` | |
| 12 | Drag, drop from grid to grid | `CrossGridView` | |
| 13 | Show close button | `DragResizeView` | |
| 14 | Border radius | `DragResizeView` | |
| 15 | Horizontal shift | `DragResizeView` | |
| 16 | Show grid lines | `DragResizeView` | |
| 17 | Static items | `ItemOverridesView` | `isStatic` |
| 18 | Custom drag handle & close button | `DragResizeView` (header) | Mechanism fully present in React (`dragAllowFrom` + `resizeIgnoreFrom` — confirmed identical to Vue's own approach here, not a gap); only difference is Vue additionally exports two ready-made components (`CustomDragElement`, `CustomCloseButton`) for this, which React doesn't have equivalents of yet — see note below |
| 19 | v-model & save/load layout | `DynamicItemsView` | `useLayoutStorage` |
| 20 | Auto-size grid on content | `DragResizeView` | grid-level `heightMode='auto'`/`autoSize` — distinct from per-item `autoHeight` (#31) |
| 21 | Edit mode toggle | `DragResizeView` | `enableEditMode` |
| 22 | Cross-grid drop restrictions | `CrossGridView` | `disableExternalDrop` |
| 23 | Drag, drop from outside into multiple grids | `ExternalDropView` | both grids also keep `allowCrossGridDrag` on |
| 24 | Configurable transition duration & easing | `DragResizeView` | |
| 25 | Custom drag-placeholder content | — | **Confirmed gap** — no `#placeholder`-equivalent in React's `IGridLayoutProps` at all; not demonstrable because it doesn't exist yet |
| 26 | Alignment guides while dragging | `DragResizeView` | `showAlignmentGuides` |
| 27 | scrollToItem & focusItem | `AdvancedFeaturesView` | |
| 28 | Export layout as SVG | `AdvancedFeaturesView` | |
| 29 | compactNow, rearrange & duplicateItem | `DragResizeView` (compactNow/rearrange), `SelectionAndHistoryView` or `AdvancedFeaturesView` (duplicateItem) | |
| 30 | Blocked-move feedback | `DragResizeView` (log) | `onMoveBlockedByCollision`, called out by name |
| 31 | Per-item autoHeight | `ItemOverridesView` | |
| 32 | Snap to grid | `DragResizeView` | |
| 33 | Configurable resize-hint appearance | `DragResizeView` | `renderResizeHandle` |
| 34 | outsideDropAccept & readOutsideDropPayload | `ExternalDropView` | demonstrates actually calling `core`'s own `readOutsideDropPayload`, not just receiving raw `dataTransfer` |
| 35 | Named layout presets | `DynamicItemsView` | usage pattern (plain array of named layouts), not a dedicated prop |
| 36 | Localizable ARIA strings | `AdvancedFeaturesView` (grid-wide), `ItemOverridesView` (per-item) | `ariaLabels` |
| 37 | Multi-select & group move/resize | `SelectionAndHistoryView` | |
| 38 | Size constraints & aspect ratio | `ItemOverridesView` | `minW`/`maxW`/`minH`/`maxH`, `preserveAspectRatio` |
| 39 | autoScroll | `DragResizeView` (grid-wide), `ItemOverridesView` (per-item) | |
| 40 | Layout lifecycle events | `AdvancedFeaturesView`, `ResponsiveView` | `onLayoutReady`/`onColumnsChanged` in the former, `onBreakpointChange` fits the latter better |
| 41 | Layout bounds & rendering options | `DragResizeView` | `maxRows`, `useCssTransforms`, `heightMode` |
| 42 | Pluggable compaction | `DragResizeView` | `compactType` + custom `compactor` — consolidated into one view rather than split, to avoid demonstrating compaction in two places |
| 43 | Undo/redo | `SelectionAndHistoryView` | |
| 44 | Grid dimensions | `BasicGridView`/`DragResizeView` | `rowHeight`, `colNum`, `margin` |
| 45 | Switching layouts & forcing a remount | `DynamicItemsView` | usage pattern (React `key` prop), not a dedicated feature |

### Confirmed parity gaps found during this cross-check

One genuine gap surfaced while building this table, plus one initial
misreading corrected after actually checking Vue's own example source
(worth recording both, so this doesn't need re-litigating later):

- **Example 18 turned out not to be a gap at all.** My first pass
  assumed Vue exposes a dedicated "drag handle" slot React lacks.
  Reading `18-example.md` directly showed otherwise: Vue's own version
  is built from `drag-allow-from` + `resize-ignore-from` — the exact
  same CSS-selector-restriction mechanism `ILayoutItem.dragAllowFrom`/
  `resizeIgnoreFrom` already provide in React, confirmed in
  `layout-definition.ts`. The only real difference: Vue additionally
  *exports* two small, pre-styled convenience components
  (`CustomDragElement`, `CustomCloseButton`) a consumer can drop in
  directly, rather than building the handle/button markup themselves.
  React exports no equivalent pre-built components (confirmed via
  `src/index.ts`'s own export list) — a real, but much narrower and
  more cosmetic gap than "no mechanism at all." Worth a lightweight
  follow-up (export two small components matching this package's own
  styling) if this comes up as a real consumer request, not urgent on
  its own.
- **No drag-placeholder customization at all** (#25). Read the entirety
  of `grid-layout-props.interface.ts` directly — there is no
  slot/render-prop equivalent to Vue's own `#placeholder` (which
  receives live `{ x, y, w, h }`/`isDragging` scoped props). This
  can't be demonstrated in the React demo app because the feature
  itself doesn't exist yet. Flagged here rather than in
  `PARITY_GAP_VUE.md`/`PARITY_GAP_IMPLEMENTATION_PLAN.md` only because
  it was found in the course of this specific cross-check — worth
  carrying over to those documents too if this plan is approved, so it
  isn't only recorded here.

## Non-goals

- No new Playwright suite as part of this plan — testability is set up
  (testids, stable port), but writing and wiring an actual e2e suite
  against the demo app is a separate, optional follow-up.
- No visual redesign beyond what's needed for usability — this borrows
  the library's own shipped styles (`kdl-*` classes), not a bespoke
  demo-app design system.
- No feature additions to the library itself — if building a view
  surfaces a real gap or bug (the way the Stryker/GridItem.tsx
  investigation earlier this session did), that gets flagged and
  handled as its own, separate fix — not silently worked around inside
  a view.
