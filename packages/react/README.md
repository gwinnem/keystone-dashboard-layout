<p align="center">
  <img src="https://raw.githubusercontent.com/gwinnem/keystone-dashboard-layout/main/packages/vue/docs/Data%20Grid.svg" height="200" alt="logo">
</p>

<h1 align="center">@keystone-dashboard-layout/react</h1>

<p align="center">
  A draggable, resizable, responsive dashboard grid for React —
  built on the same shared, framework-agnostic engine as this
  family's Vue and Angular packages.
</p>

## What this actually is

A React, TypeScript-native library for building **draggable, resizable,
responsive dashboard layouts** — the kind of thing you'd use to let a
user rearrange widgets, charts, or panels on a screen, with drag,
resize, responsive breakpoints, multi-select, undo/redo, and collision
handling built in.

It is **not** a data table/grid. If you're after sorting, filtering,
paging, or spreadsheet-style rows and columns, this isn't that — it's
closer in spirit to `react-grid-layout`, sharing its `layout`/
`onLayoutChange` controlled-component contract, but built from the
ground up on a native, Pointer-Events-based drag/resize engine shared
with the Vue and Angular packages in this family rather than each
maintaining its own copy of the hard, easy-to-get-subtly-wrong parts
(collision, compaction, responsive breakpoint math).

## Quick start

```sh
npm install @keystone-dashboard-layout/react
```

```tsx
import { useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';

function Dashboard() {
  const [layout, setLayout] = useState<TLayout>([
    { i: 'a', x: 0, y: 0, w: 2, h: 2 },
    { i: 'b', x: 2, y: 0, w: 2, h: 2 },
  ]);

  return (
    <GridLayout layout={layout} onLayoutChange={setLayout}>
      <GridItem i="a">A</GridItem>
      <GridItem i="b">B</GridItem>
    </GridLayout>
  );
}
```

That's a fully draggable, resizable, auto-compacting grid — no other
setup required. `react`/`react-dom` (`^18.0.0 || ^19.0.0`) are peer
dependencies.

`GridLayout` is a **fully controlled** component — it never mutates
the `layout` array (or any item in it) you pass in; every drag/resize
tick (and the compaction that follows it) is reported via
`onLayoutChange` with a brand-new array. `GridItem` only needs an `i`
matching one of `layout`'s own entries — position, size, and
`isDraggable`/`isResizable`/`isStatic`/`minW`/`maxW`/`minH`/`maxH` all
live directly on that layout-item entry (see `ILayoutItem` in
`@keystone-dashboard-layout/core`) rather than as separate props on
this component.

**Using just the grid math, without React?**
`@keystone-dashboard-layout/core` exports the same collision detection,
compaction, movement, and alignment functions this package is built
on — zero React dependency, no live DOM required, plain data in and
out:

```ts
import { collides, compactLayout, moveElement } from '@keystone-dashboard-layout/core';
```

## Features

- **Core layout** — grid-unit positioning with automatic pixel
  conversion, a fully controlled `layout`/`onLayoutChange` contract,
  auto-sizing container (`autoSize`/`heightMode`, including
  `'scroll'`/`'fit'` modes) and per-item `autoHeight`, visible grid
  lines, visual alignment guides *and* magnetic `snapToGrid` (a real
  distinction — one shows where edges line up, the other actually
  moves the item), CSS transform positioning.
- **Drag and resize** — drag from anywhere on an item by default, or
  restrict it to a handle (`dragAllowFrom`/`dragIgnoreFrom`); resize
  from all eight edges/corners with cursor affordance and optional
  visible handles (`showResizeHandles`/`resizeHandleColor`); bounded
  dragging (`isBounded`); aspect-ratio locking (`preserveAspectRatio`);
  per-item size constraints (`minW`/`maxW`/`minH`/`maxH`); keyboard
  move/resize (arrow keys / Shift+arrow); `dragActivationDistance`
  (per-pointer-type drag-start threshold); a `moveBlockedByCollision`
  event for shake/flash/toast feedback without reimplementing
  collision detection yourself.
- **Collision and compaction** — vertical/horizontal/none compaction
  plus overlap variants (`compactType`), `preventCollision`,
  `horizontalShift`, static items excluded from cascades, on-demand
  `compactNow()`/`rearrange()`, collision-safe `duplicateItem(id)`, a
  pluggable `compactor` prop for replacing the algorithm entirely.
- **Responsive layouts** — breakpoint-driven column counts
  (`responsive`/`breakpoints`/`cols`), predefined layouts per
  breakpoint (`responsiveLayouts`) with auto-generation for any
  breakpoint without one, `distributeEvenly` for spreading
  out-of-bounds items instead of clamping them.
- **Multi-select and group operations** — click/Shift-click/Ctrl-click
  selection, group move/resize (drag or resize one selected item and
  the rest of the selection follows), align/distribute commands
  (`alignSelected`/`distributeSelected`).
- **Multi-grid and drag-and-drop** — drag items between independent
  `GridLayout` instances (`allowCrossGridDrag`) via a real first-fit
  bin-pack, and from outside the grid system entirely via native HTML5
  drag-and-drop (`allowOutsideDrop`, `outsideDropAccept` to reject
  incompatible drags).
- **Editing and lifecycle** — a close button, an edit-mode toggle
  (`enableEditMode`), add/remove items without manual position math,
  opt-in undo/redo (`enableUndoRedo`/`undoHistoryLimit`) at
  committed-change granularity.
- **Styling and customization** — configurable border radius, transition
  duration/easing, a `renderPlaceholder` render prop for custom
  drag-placeholder content, a `header` render prop, automatic RTL
  mirroring (`isMirrored`).
- **Persistence** — `useLayoutStorage` for a single saved layout, plus
  `useLayoutPresets` for saving and switching between several named
  arrangements.
- **Export** — `exportLayoutAsSvg()` on the imperative handle, a
  dependency-free grid-to-image export for a report, thumbnail, or
  "share my dashboard" feature.
- **Accessibility** — keyboard move/resize, `aria-roledescription`/
  `role="group"` on interactive items, localizable UI/ARIA strings
  (`ariaLabels`).

See `IGridLayoutProps`/`IGridItemProps`/`IGridLayoutHandle` (all
exported from this package) for the complete, current prop and
imperative-API surface.

## Imperative API

Reach `GridLayout`'s own imperative methods via `ref`:

```tsx
const gridRef = useRef<IGridLayoutHandle>(null);

<GridLayout ref={gridRef} layout={layout} onLayoutChange={setLayout}>
  {/* ... */}
</GridLayout>;

gridRef.current?.compactNow();
```

`compactNow()`/`rearrange()`, `duplicateItem(id)`, `undo()`/`redo()`/
`canUndo`/`canRedo`, `selectItem()`/`deselectItem()`/
`toggleItemSelection()`/`clearSelection()`/`selectedItems`,
`alignSelected(edge)`/`distributeSelected(axis)`,
`exportLayoutAsSvg(options?)`, `scrollToItem(id)`/`focusItem(id)`.

> `canUndo`/`canRedo` are a snapshot read off the handle, not reactive
> state — reading `gridRef.current?.canUndo` directly in JSX won't
> automatically re-render when it changes. Mirror the value into your
> own state (e.g. via `onLayoutChange`) if you need a disabled-button
> binding that stays current.

## Shared engine, three frameworks

This package, [`@keystone-dashboard-layout/vue`](https://www.npmjs.com/package/@keystone-dashboard-layout/vue),
and [`@keystone-dashboard-layout/angular`](https://www.npmjs.com/package/@keystone-dashboard-layout/angular)
all build on [`@keystone-dashboard-layout/core`](https://www.npmjs.com/package/@keystone-dashboard-layout/core)
for collision detection, compaction, responsive breakpoint math, and
the native Pointer-Events-based drag/resize engine — one implementation
of the hard parts, not three independently-maintained copies that
could drift out of sync.

## License

MIT
