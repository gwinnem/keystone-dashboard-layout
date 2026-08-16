# Internal Parity Gap: Vue (reference) vs. React vs. Angular

Unlike [`PARITY_GAP_VUE.md`](./PARITY_GAP_VUE.md), [`PARITY_GAP_REACT.md`](./PARITY_GAP_REACT.md), and [`PARITY_GAP_ANGULAR.md`](./PARITY_GAP_ANGULAR.md) — which each compare one package against **external** ecosystem alternatives — this document tracks feature parity **between this monorepo's own three framework packages**, using Vue as the reference implementation since it's the only one that's feature-complete.

**Purpose:** a concrete checklist for React/Angular implementation work, to be updated as those ports progress rather than written once and left stale. Every row below is currently accurate as of the Vue package's present feature set and the React/Angular packages' scaffold-only status.

## Status summary

| Package | Status |
| --- | --- |
| `packages/vue` | Reference implementation — 100% of the surface below |
| `packages/react` | Scaffolded only (`package.json`, `tsconfig.json`, build/test config, stub `src/index.ts`) — 0% |
| `packages/angular` | Scaffolded only, no real Angular CLI workspace yet — 0% |

## Layer 1: Core algorithms — already shared, not a gap

Everything below lives in [`packages/core`](./packages/core) (`@keystone-dashboard-layout/core`), framework-agnostic and already extracted — **React and Angular don't need to port or reimplement any of this**, only wire it into their own component layer.

| Capability | Available via `@keystone-dashboard-layout/core`? |
| --- | --- |
| Bin-packing (`findFirstFitSlot`) | Yes |
| Collision detection (`collides`, `getAllCollisions`, `getFirstCollision`) | Yes |
| Movement/collision-cascade resolution (`moveElement`, `moveElementAwayFromCollision`, `moveToCorrectPlace`) | Yes |
| Compaction — 5 strategies (`verticalCompactor`, `horizontalCompactor`, `noCompactor`, `verticalOverlapCompactor`, `horizontalOverlapCompactor`) + pluggable `ICompactor` interface | Yes |
| Responsive breakpoint resolution (`findOrGenerateResponsiveLayout`, `getBreakpointFromWidth`, `getColsFromBreakpoint`, `sortBreakpoints`) | Yes |
| Alignment guides / magnetic snap (`findAlignmentGuides`, `findSnapAdjustment`) | Yes |
| Layout validators (`layoutValidator`, `keysValidator`, `breakpointsValidator`, `marginValidator`) | Yes |
| Serialization (`serializeLayout`, `deserializeLayout`) | Yes |
| SVG export (`exportLayoutAsSvg`) | Yes |
| ARIA label resolution (`resolveAriaLabels`, `DEFAULT_ARIA_LABELS`) | Yes |
| Sort helpers, grid-unit↔pixel math, RTL transform helpers | Yes |

## Layer 2: Framework-specific components — the actual gap

Nothing below exists yet in React or Angular.

### Components

| Vue component | React equivalent | Angular equivalent |
| --- | --- | --- |
| `GridLayout.vue` | Not started | Not started |
| `GridItem.vue` | Not started | Not started |
| `CustomCloseButton.vue` | Not started | Not started |
| `CustomDragElement.vue` | Not started | Not started |

### Composables / hooks / directives

| Vue composable | Purpose | React hook | Angular directive/service |
| --- | --- | --- | --- |
| `useGridItemDrag` | Native pointer-driven drag wiring | Not started | Not started |
| `useGridItemResize` | Native pointer-driven resize wiring, 8-handle edge detection | Not started | Not started |
| `useGridItemKeyboard` | Arrow-key move/resize (accessibility) | Not started | Not started |
| `useMultiSelect` | Multi-select + group move/resize | Not started | Not started |
| `useOutsideDrop` | Native HTML5 drag-and-drop from outside the grid | Not started | Not started |
| `useCrossGridDrag` | Cross-grid drag/drop between independent `GridLayout` instances | Not started | Not started |
| `useResponsiveLayout` | Breakpoint switching + per-breakpoint layout cache | Not started | Not started |
| `useUndoRedo` | Undo/redo history over committed layout changes | Not started | Not started |
| `useLayoutPresets` | Named, saved layout presets (save/load/list/delete) | Not started | Not started |
| `useLayoutStorage` | Auto-load/auto-save to `Storage` (debounced) | Not started | Not started |

### `GridLayout`-level props (from `IGridLayoutProps`)

| Prop | Vue | React | Angular |
| --- | --- | --- | --- |
| `layout` (required) | Yes | Not started | Not started |
| `autoSize` | Yes | Not started | Not started |
| `allowCrossGridDrag` | Yes | Not started | Not started |
| `ariaLabels` | Yes | Not started | Not started |
| `enableEditMode` | Yes | Not started | Not started |
| `disableExternalDrop` | Yes | Not started | Not started |
| `layoutId` | Yes | Not started | Not started |
| `allowOutsideDrop` | Yes | Not started | Not started |
| `outsideDropWidth` / `outsideDropHeight` | Yes | Not started | Not started |
| `outsideDropAccept` | Yes | Not started | Not started |
| `borderRadiusPx` / `useBorderRadius` | Yes | Not started | Not started |
| `transitionDurationMs` / `transitionTimingFunction` | Yes | Not started | Not started |
| `showAlignmentGuides` | Yes | Not started | Not started |
| `snapToGrid` / `snapThreshold` | Yes | Not started | Not started |
| `breakpoints` / `cols` / `colNum` | Yes | Not started | Not started |
| `distributeEvenly` | Yes | Not started | Not started |
| `horizontalShift` | Yes | Not started | Not started |
| `isBounded` / `isDraggable` / `isResizable` (grid-wide defaults) | Yes | Not started | Not started |
| `isMirrored` (RTL) | Yes | Not started | Not started |
| `margin` | Yes | Not started | Not started |
| `maxRows` | Yes | Not started | Not started |
| `multiSelect` | Yes | Not started | Not started |
| `preventCollision` | Yes | Not started | Not started |
| `responsive` / `responsiveLayouts` | Yes | Not started | Not started |
| `restoreOnDrag` | Yes | Not started | Not started |
| `rowHeight` | Yes | Not started | Not started |
| `showCloseButton` (grid-wide default) | Yes | Not started | Not started |
| `showGridLines` | Yes | Not started | Not started |
| `showResizeHandles` / `resizeHandleColor` (grid-wide default) | Yes | Not started | Not started |
| `transformScale` | Yes | Not started | Not started |
| `useCssTransforms` | Yes | Not started | Not started |
| `compactor` (pluggable) | Yes | Not started | Not started |
| `compactType` | Yes | Not started | Not started |
| `enableUndoRedo` / `undoHistoryLimit` | Yes | Not started | Not started |

### `GridItem`-level props (from `IGridItemProps`)

| Prop | Vue | React | Angular |
| --- | --- | --- | --- |
| `i` / `h` / `w` / `x` / `y` (required) | Yes | Not started | Not started |
| `ariaLabels` (per-item override) | Yes | Not started | Not started |
| `autoScroll` | Yes | Not started | Not started |
| `autoHeight` (live `ResizeObserver`) | Yes | Not started | Not started |
| `borderRadiusPx` (per-item override) | Yes | Not started | Not started |
| `dragAllowFrom` / `dragIgnoreFrom` | Yes | Not started | Not started |
| `enableEditMode` (per-item override) | Yes | Not started | Not started |
| `isBounded` / `isDraggable` / `isResizable` (per-item override) | Yes | Not started | Not started |
| `isMirrored` | Yes | Not started | Not started |
| `isStatic` | Yes | Not started | Not started |
| `maxW` / `maxH` / `minW` / `minH` | Yes | Not started | Not started |
| `preserveAspectRatio` | Yes | Not started | Not started |
| `resizeIgnoreFrom` | Yes | Not started | Not started |
| `resizeHandleColor` (per-item override) | Yes | Not started | Not started |
| `showResizeHandles` (per-item override) | Yes | Not started | Not started |
| `showCloseButton` (per-item override) | Yes | Not started | Not started |
| `useBorderRadius` | Yes | Not started | Not started |

### Events

| Vue event (`EGridLayoutEvent` / `EGridItemEvent`) | React equivalent | Angular equivalent |
| --- | --- | --- |
| `breakpoint-changed`, `columns-changed` | Not started | Not started |
| `layout-before-mount`, `layout-created`, `layout-mounted`, `layout-ready` | Not started | Not started |
| `update:layout` (v-model), `layout-updated` | Not started (React: controlled/uncontrolled pattern, not v-model) | Not started |
| `dragstart` / `dragmove` / `dragend` (grid-level) | Not started | Not started |
| `cross-grid-drop-rejected`, `cross-grid-item-dropped` | Not started | Not started |
| `item-dropped-from-outside` | Not started | Not started |
| `move-blocked-by-collision` | Not started | Not started |
| `selection-changed` | Not started | Not started |
| `item-move` / `item-moved` (item-level) | Not started | Not started |
| `resize` / `resized` (item-level) | Not started | Not started |
| `container-resized` (item-level) | Not started | Not started |
| `remove-grid-item` | Not started | Not started |
| `item-clicked` | Not started | Not started |

## What this means in practice

- **Nothing here requires new algorithm work** — every checkbox in Layer 2 is about building a framework-specific *wrapper* around logic that already exists and is already tested (99%+ coverage) in `packages/core`.
- **The realistic order of operations**, per [`PARITY_GAP_REACT.md`](./PARITY_GAP_REACT.md) and [`PARITY_GAP_ANGULAR.md`](./PARITY_GAP_ANGULAR.md)'s own roadmaps: basic `GridLayout`/`GridItem` (drag/resize/responsive/compaction) first, then work down this matrix roughly in the order a real consumer would notice a missing feature — persistence helper → named presets → SVG export → ARIA localization → multi-select group resize → the rest.
- **Angular has an extra zeroth step** neither this doc nor the React one can skip past: there's no real `ng generate library` workspace yet, so nothing in the Angular columns above can start until that scaffolding exists.
- **Update this document as rows flip from "Not started"** to a real status (in progress / done / intentionally deferred) — a stale parity matrix is worse than none, since it actively misleads whoever's picking up the next piece of work.
