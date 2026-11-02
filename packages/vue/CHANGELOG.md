# keystone-dashboard-layout-vue

## 1.2.0

### Minor Changes

- 22c97cd: Add asynchronous layout persistence, alongside (not replacing) the existing synchronous storage helpers. Core exports the `IAsyncLayoutStorage` interface, ready-made `createHttpStorage`, `createIndexedDbStorage` and `createMemoryAsyncStorage` stores, and `createAsyncLayoutPersistence`, which queues writes so a slow earlier save can never overwrite a later one and never rejects (failures go to a callback and the method resolves `false`/`null`). Each framework gets a thin wrapper: `useAsyncLayoutStorage` for Vue (ref-bound, with `autoLoad`/`autoSave`) and React (plain values in and out, with `autoSave`), both exposing `isLoading`, `isSaving` and `error`, and `GridLayoutAsyncStorageService` for Angular, which reports failures on `errors$`.
- a357fa3: Add `verticalFastCompactor` (and `compactLayoutFast`): a drop-in alternative to `verticalCompactor` that gives the same result in roughly O(n log n) instead of O(n²), for very large layouts. Opt in through the `compactor` prop; `compactType` is unchanged. The Vue package re-exports it; React and Angular import it from `keystone-dashboard-layout-core`.
- d416937: `GridLayout` now accepts grid-wide `autoScroll` and `preserveAspectRatio` defaults (as the React package already did). Items inherit them unless they set their own, and an item's own `autoScroll`/`preserveAspectRatio` now defaults to `null` instead of `false`. Angular items now also auto-scroll while resizing, as Vue and React do.
- 8a20d14: Add maximize/restore. One item can be expanded to fill the whole grid and restored exactly, without ever changing `layout`. The grid holds the maximized item's id (Vue `v-model:maximized-item`, React `maximizedItem` with `onMaximizedItemChange`, Angular `[(maximizedItem)]`), and `maximize(id)`, `restore()` and `toggleMaximize(id)` are available on the component instance (Vue, Angular) or the imperative handle (React). `showMaximizeButton`, grid-wide with a per-item override, renders a built-in maximize/restore button labelled by the new `maximizeButton` and `restoreButton` ARIA strings. The other items are hidden but stay mounted, compaction is suspended while an item is maximized and runs once on restore, the maximized item cannot be dragged, resized or moved by keyboard (its header and close button keep working), and Escape restores. Core exports `resolveMaximizedItem`, `calcMaximizedPosition`, `IMaximizedPositionInput` and `IMaximizedState`, and `ILayoutItem` gains an optional `showMaximizeButton`.
- 0ed73ed: Add pluggable CSS positioning. `GridLayout` accepts a new `positionStrategy` (`IPositionStrategy`) that replaces the `useCssTransforms` on/off toggle. `transformStrategy` and `topLeftStrategy` are exported as built-ins; a strategy set here takes precedence over `useCssTransforms`. Default behavior is unchanged.
- 0ed73ed: Add `collisionMode: 'push' | 'swap'` to the grid. With `'swap'`, dropping a dragged item onto exactly one other non-static item that fits into its starting cell trades the two places; anything else (several items, a static item, or the other item not fitting the starting cell) falls back to the usual push. Only affects dragging, and is ignored while `preventCollision` is on. Core exports `swapElement`, `createSwapDragState`, `TCollisionMode` and `ISwapDragState`.
- d416937: Add `exportLayoutAsSvg(options?)` to the `GridLayout` instance. It renders the current layout as an SVG string using the grid's own `layout`, `colNum`, `rowHeight`, `margin` and measured width, with every option still overridable. React's imperative handle and Angular's component already had it; Vue only had the standalone function.

### Patch Changes

- 0ed73ed: Fix published declarations (#2). Core adds a types-only `./types/*` subpath export (with `typesVersions`); the Vue and React builds rewrite `core/src` paths in emitted `.d.ts` files to `keystone-dashboard-layout-core/types/*`, so consumers no longer get unresolved types. The pack-install smoke tests now validate the installed `.d.ts` files, and the stale `@keystone-dashboard-layout/core` alias is removed from the Vue tsconfig.
- 641ec9f: The built-in maximize button now takes focus when it is clicked. Safari does not focus a button on click, so after maximizing an item with the mouse the Escape key never reached the grid and did not restore it. Maximizing through `maximize()` or the `maximizedItem` prop still leaves focus where it was.
- e215ff5: Stop a server-rendered grid flashing and animating into place when it hydrates. The server markup has no item size or position, so the items showed as full-width blocks until the container was measured, and the first measured layout then ran their transition from a provisional 100px-container size to the real one. The grid root is now `visibility: hidden` until its first width measurement, and its `--grid-transition-duration` stays `0ms` until it has been painted once at that width (two animation frames), after which the configured duration applies as before.
- Updated dependencies [22c97cd]
- Updated dependencies [a357fa3]
- Updated dependencies [0ed73ed]
- Updated dependencies [d416937]
- Updated dependencies [8a20d14]
- Updated dependencies [0ed73ed]
- Updated dependencies [0ed73ed]
  - keystone-dashboard-layout-core@1.2.0

## 1.0.1

### Patch Changes

- e82c175: Minor bug fixing
- e82c175: Minor bug fixing
- Updated dependencies [e82c175]
  - keystone-dashboard-layout-core@1.0.2

## 1.0.0 (2026-09-08)

### Features

* First release under the current package name
  (`keystone-dashboard-layout-vue`), continuing this project's
  multi-year history under its earlier npm name(s) — see this
  package's own [Changelog](https://kdl.winnem.tech/vue/guide/changelog/)
  for the full pre-rename release history. Full feature set: drag/
  resize from all 8 edges/corners, 5 built-in compaction strategies
  plus a pluggable custom compactor, responsive breakpoints, cross-grid
  and outside-the-grid drag-and-drop, multi-select with group move/
  resize and align/distribute, undo/redo, keyboard accessibility,
  magnetic snap-to-grid, alignment guides, named layout presets, SVG
  export, and localizable ARIA strings — see
  [Features](https://kdl.winnem.tech/vue/features/) for the complete,
  linked list.
