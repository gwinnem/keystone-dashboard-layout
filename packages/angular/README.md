<div style="text-align: center">

[![CI](https://github.com/gwinnem/keystone-dashboard-layout/actions/workflows/ci.yml/badge.svg)](https://github.com/gwinnem/keystone-dashboard-layout/actions/workflows/ci.yml)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat)](https://github.com/prettier/prettier)
[![npm](https://img.shields.io/npm/v/%40keystone-dashboard-layout%2Fvue)](https://www.npmjs.com/package/@keystone-dashboard-layout/vue)
[![NPM](https://img.shields.io/npm/l/%40keystone-dashboard-layout%2Fvue)](https://github.com/gwinnem/keystone-dashboard-layout/blob/main/packages/vue/LICENSE)

</div>

<p align="center">
  <img src="https://raw.githubusercontent.com/gwinnem/keystone-dashboard-layout/main/packages/vue/docs/dashboard-preview.svg" width="500" alt="Keystone Dashboard Layout — a draggable, resizable dashboard grid preview">
</p>

<h1 align="center">@keystone-dashboard-layout/angular</h1>

<p align="center">
  A draggable, resizable, responsive dashboard grid for Angular —
  built on the same shared, framework-agnostic engine as this
  family's Vue and React packages.
</p>

## What this actually is

An Angular, TypeScript-native library for building **draggable,
resizable, responsive dashboard layouts** — the kind of thing you'd
use to let a user rearrange widgets, charts, or panels on a screen,
with drag, resize, responsive breakpoints, multi-select, undo/redo,
and collision handling built in.

It is **not** a data table/grid. If you're after sorting, filtering,
paging, or spreadsheet-style rows and columns, this isn't that. Built
as standalone components (no `NgModule` required) on the same native,
Pointer-Events-based drag/resize engine shared with the Vue and React
packages in this family, rather than a separate implementation of the
hard, easy-to-get-subtly-wrong parts (collision, compaction,
responsive breakpoint math).

## Quick start

```sh
npm install @keystone-dashboard-layout/angular
```

```ts
import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from '@keystone-dashboard-layout/angular';
import type { TLayout } from '@keystone-dashboard-layout/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent],
  template: `
    <kdl-grid-layout [layout]="layout" (layoutChange)="layout = $event">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
          Item {{ item.i }}
        </kdl-grid-item>
      }
    </kdl-grid-layout>
  `,
})
export class DashboardComponent {
  layout: TLayout = [
    { i: 'a', x: 0, y: 0, w: 2, h: 2 },
    { i: 'b', x: 2, y: 0, w: 2, h: 2 },
  ];
}
```

Don't forget the stylesheet, imported once wherever it'll load
application-wide:

```ts
import '@keystone-dashboard-layout/angular/style.css';
```

`@angular/common`/`@angular/core` (`^17.0.0 || ^18.0.0 || ^19.0.0`)
and `rxjs` (`^7.8.0`) are peer dependencies.

`GridLayoutComponent` is a **fully controlled** component — it never
mutates the `layout` array (or any item in it) you pass in; every
drag/resize tick (and the compaction that follows it) is reported via
a `layoutChange` `@Output()` with a brand-new array. `GridItemComponent`
takes `i`/`x`/`y`/`w`/`h` as its own required `@Input()`s — bind each
one explicitly per item in your own template's `@for` loop.

**Using just the grid math, without Angular?**
`@keystone-dashboard-layout/core` exports the same collision detection,
compaction, movement, and alignment functions this package is built
on — zero Angular dependency, no live DOM required, plain data in and
out:

```ts
import { collides, compactLayout, moveElement } from '@keystone-dashboard-layout/core';
```

## Features

- **Core layout** — grid-unit positioning with automatic pixel
  conversion, a fully controlled `layout`/`layoutChange` contract,
  auto-sizing container (`autoSize`/`heightMode`, including
  `'scroll'`/`'fit'` modes) and per-item `autoHeight`, visible grid
  lines, visual alignment guides *and* magnetic `snapToGrid` (a real
  distinction — one shows where edges line up, the other actually
  moves the item), CSS transform positioning.
- **A grid-wide behavioral cascade** — `isDraggable`/`isResizable`/
  `isBounded`/`isMirrored`/`maxRows`/`showCloseButton`/`enableEditMode`/
  `useBorderRadius`/`borderRadiusPx`/`ariaLabels` can each be set once
  on `GridLayoutComponent` and inherited by every `GridItemComponent`,
  or overridden per-item when needed.
- **Drag and resize** — drag from anywhere on an item by default, or
  restrict it to a handle (`dragAllowFrom`/`dragIgnoreFrom`); resize
  from all eight edges/corners with cursor affordance and optional
  visible handles (`showResizeHandles`/`resizeHandleColor`); bounded
  dragging (`isBounded`); aspect-ratio locking (`preserveAspectRatio`);
  per-item size constraints (`minW`/`maxW`/`minH`/`maxH`); keyboard
  move/resize (arrow keys / Shift+arrow, RTL-aware); a
  `moveBlockedByCollision` `@Output()` for shake/flash/toast feedback.
- **Collision and compaction** — vertical/horizontal/none compaction
  plus overlap variants (`compactType`), `preventCollision`,
  `horizontalShift`, static items excluded from cascades, on-demand
  `compactNow()`/`rearrange()`, collision-safe `duplicateItem(id)`, a
  pluggable `compactor` input for replacing the algorithm entirely.
- **Responsive layouts** — breakpoint-driven column counts
  (`responsive`/`breakpoints`/`cols`), predefined layouts per
  breakpoint (`responsiveLayouts`) with auto-generation for any
  breakpoint without one, `distributeEvenly` for spreading
  out-of-bounds items instead of clamping them.
- **Multi-select and group operations** — click/Shift-click/Ctrl-click
  selection, group move/resize, align/distribute commands
  (`alignSelected`/`distributeSelected`).
- **Multi-grid and drag-and-drop** — drag items between independent
  `GridLayoutComponent` instances (`allowCrossGridDrag`) via a real
  first-fit bin-pack, and from outside the grid system entirely via
  native HTML5 drag-and-drop (`allowOutsideDrop`, `outsideDropAccept`
  to reject incompatible drags).
- **Editing and lifecycle** — a built-in close button (`showCloseButton`
  + a `removeItem` `@Output()`), an edit-mode toggle (`enableEditMode`),
  add/remove items without manual position math, opt-in undo/redo
  (`enableUndoRedo`/`undoHistoryLimit`) at committed-change granularity
  — including externally-driven `layout` changes, not just drag/resize.
- **Styling and customization** — configurable border radius,
  transition duration/easing, a `[kdlGridItemHeader]` marker directive
  for a dedicated header region, standalone `GridItemCloseButtonComponent`/
  `GridItemDragHandleComponent` utility components, automatic RTL
  mirroring (`isMirrored`, grid-wide or per-item).
- **Persistence** — `GridLayoutStorageService` for a single saved
  layout, plus `GridLayoutPresetsService` for saving and switching
  between several named arrangements — both `providedIn: 'root'`,
  taking/returning a plain layout value directly.
- **Export** — `exportLayoutAsSvg()`, a dependency-free grid-to-image
  export for a report, thumbnail, or "share my dashboard" feature.
- **Accessibility** — keyboard move/resize, `aria-roledescription`/
  `role="group"` on interactive items, localizable UI/ARIA strings
  (`ariaLabels`, grid-wide default + per-item override).

## Imperative API

Reach `GridLayoutComponent`'s own public methods via a template
reference variable:

```ts
import { Component, ViewChild } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from '@keystone-dashboard-layout/angular';

@Component({
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent],
  template: `
    <button (click)="grid.compactNow()">Tidy up</button>
    <kdl-grid-layout #grid [layout]="layout" (layoutChange)="layout = $event">
      <!-- ... -->
    </kdl-grid-layout>
  `,
})
export class DashboardComponent {
  @ViewChild('grid') gridRef!: GridLayoutComponent;
}
```

`compactNow()`/`rearrange()`, `duplicateItem(id)`, `undo()`/`redo()`/
`canUndo`/`canRedo`, `selectItem()`/`deselectItem()`/
`toggleItemSelection()`/`clearSelection()`/`selectedItemIds`,
`alignSelected(edge)`/`distributeSelected(axis)`,
`exportLayoutAsSvg(options?)`, `scrollToItem(id)`/`focusItem(id)`.

## What this package exports

```ts
import {
  GridLayoutComponent,
  GridItemComponent,
  GridItemHeaderDirective,
  GridLayoutStorageService,
  GridLayoutPresetsService,
  GridItemDragHandleComponent,
  GridItemCloseButtonComponent,
} from '@keystone-dashboard-layout/angular';
```

Layout-level types (`TLayout`, `ILayoutItem`, `ECompactType`, and so
on) come from `@keystone-dashboard-layout/core` instead — an Angular
`@Component`'s own class already **is** its prop contract, so there's
no separate props-interface convention to import here the way React's
`IGridLayoutProps`/`IGridItemProps` work.

## Idiomatic Angular, not a transliteration

Standalone components throughout (no `NgModule` required), a DI-scoped
`GridEventBusService` instead of Vue's `provide`/`inject` or React's
Context, `providedIn: 'root'` services instead of ref-bound composables/
hooks, and a marker directive (`GridItemHeaderDirective`) queried via
`@ContentChild` instead of a named slot or render prop — the same
underlying behavior, expressed the way Angular actually works.

## Shared engine, three frameworks

This package, [`@keystone-dashboard-layout/vue`](https://www.npmjs.com/package/@keystone-dashboard-layout/vue),
and [`@keystone-dashboard-layout/react`](https://www.npmjs.com/package/@keystone-dashboard-layout/react)
all build on [`@keystone-dashboard-layout/core`](https://www.npmjs.com/package/@keystone-dashboard-layout/core)
for collision detection, compaction, responsive breakpoint math, and
the native Pointer-Events-based drag/resize engine — one implementation
of the hard parts, not three independently-maintained copies that
could drift out of sync.

## Testing

A real, extensive unit/component test suite (Jest + `jest-preset-angular`)
backs every feature, with Stryker mutation testing configured. This
package doesn't yet have a real end-to-end browser test layer the way
the Vue and React packages do (Karma is present but reserved for a
possible future one, not currently used for anything) — a genuine,
open gap rather than an oversight.

## License

MIT
