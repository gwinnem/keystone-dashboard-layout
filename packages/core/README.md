<div style="text-align: center">

[![CI](https://github.com/gwinnem/keystone-dashboard-layout/actions/workflows/ci.yml/badge.svg)](https://github.com/gwinnem/keystone-dashboard-layout/actions/workflows/ci.yml)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat)](https://github.com/prettier/prettier)
[![npm](https://img.shields.io/npm/v/%40keystone-dashboard-layout%2Fvue)](https://www.npmjs.com/package/@keystone-dashboard-layout/vue)
[![NPM](https://img.shields.io/npm/l/%40keystone-dashboard-layout%2Fvue)](https://github.com/gwinnem/keystone-dashboard-layout/blob/main/packages/vue/LICENSE)

</div>

<p align="center">
  <img src="https://raw.githubusercontent.com/gwinnem/keystone-dashboard-layout/main/packages/vue/docs/dashboard-preview.svg" width="500" alt="Keystone Dashboard Layout — a draggable, resizable dashboard grid preview">
</p>

<h1 align="center">@keystone-dashboard-layout/core</h1>

Framework-agnostic grid-layout algorithms — bin-packing, collision
detection, compaction, responsive breakpoint resolution, alignment
guides, magnetic snapping, and a native Pointer-Events-based drag/
resize engine — shared by the
[Vue](https://www.npmjs.com/package/@keystone-dashboard-layout/vue),
[React](https://www.npmjs.com/package/@keystone-dashboard-layout/react),
and [Angular](https://www.npmjs.com/package/@keystone-dashboard-layout/angular)
packages in this family. Every function here takes plain data in and
returns plain data out — no framework dependency, no live DOM required
for the vast majority of it (drag/resize itself is the one exception;
see below).

**Most people building a dashboard should install the Vue, React, or
Angular package instead** — each already depends on this one and
re-exports the pieces you'll actually touch (layout types, `ECompactType`,
`ICompactor`, ARIA label types, and so on). Install this package
directly only if you're validating or manipulating a layout
server-side, running a batch job against layout data, or building a
UI layer for a framework not covered by the three above.

## Install

```sh
npm install @keystone-dashboard-layout/core
```

No peer dependencies — this package has zero runtime dependencies of
its own.

## Usage

```ts
import { collides, compactLayout, moveElement } from '@keystone-dashboard-layout/core';
import type { TLayout } from '@keystone-dashboard-layout/core';

const layout: TLayout = [
  { i: 'a', x: 0, y: 0, w: 2, h: 2 },
  { i: 'b', x: 2, y: 0, w: 2, h: 2 },
];

const compacted = compactLayout(layout, 12);
```

Everything operates on the same `TLayout`/`ILayoutItem` shape the Vue,
React, and Angular packages render directly — a plain, JSON-serializable
array of `{ i, x, y, w, h, ... }` objects, with no hidden framework
state attached.

## What's in here

- **Collision & movement** — `collides`, `getAllCollisions`,
  `getFirstCollision`, `findFirstFitSlot` (bin-packing), `moveElement`,
  `moveToCorrectPlace`, `moveElementAwayFromCollision`
- **Compaction** — `compactLayout` (and its horizontal/overlap
  variants), plus the pluggable `ICompactor` interface and
  `getCompactor()` factory the framework packages' own `compactor`
  prop/input accepts (`verticalCompactor`, `horizontalCompactor`,
  `noCompactor`, `verticalOverlapCompactor`,
  `horizontalOverlapCompactor`, matching every `ECompactType` value)
- **Responsive breakpoints** — `findOrGenerateResponsiveLayout`,
  `getBreakpointFromWidth`, `getColsFromBreakpoint`, `correctBounds`
- **Alignment & snapping** — `findAlignmentGuides`,
  `findSnapAdjustment`, `findSpacingIndicators`,
  `computeAlignAdjustments`/`computeDistributeAdjustments` (the
  multi-select align/distribute commands), `computeRangeSelection`
  (Shift-click range selection)
- **Grid-unit ↔ pixel math** — `calcXY`, `calcGridItemWH`,
  `calcColWidth`, `setTransform`/`setTransformRtl`/`setTopLeft`/
  `setTopRight`
- **Serialization & export** — `serializeLayout`/`deserializeLayout`,
  `exportLayoutAsSvg` (a dependency-free layout-to-SVG renderer),
  `readOutsideDropPayload`
- **Validators** — `layoutValidator`, `keysValidator`,
  `breakpointsValidator`, `marginValidator` — the same ones the
  framework packages run internally, reachable standalone (e.g.
  validating a layout that came from an API response before ever
  handing it to a grid component)
- **Localizable ARIA strings** — `resolveAriaLabels`/
  `DEFAULT_ARIA_LABELS`, the three-layer merge (built-in defaults ←
  grid-wide override ← per-item override) every framework package's
  own `ariaLabels` prop/input uses
- **The native drag/resize engine** — `createNativeDraggable`/
  `createNativeResizable`/`createNativeAutoScroll`, built on the plain
  Pointer Events API with zero framework-specific code. This is the
  one part of this package that needs a real browser DOM to do
  anything at all; every other export above works equally well in
  Node (validating layouts server-side, for instance).

See `src/index.ts` for the complete, current export list — every
public export is re-exported from that single entry point, so
anything importable from `@keystone-dashboard-layout/core` is
documented there directly.

## Why a separate package

Collision detection, compaction, and responsive breakpoint math are
the hard, easy-to-get-subtly-wrong parts of a drag/resize grid layout
— exactly the kind of logic that's expensive to get right once and
wasteful to re-derive per framework. Keeping it in one
framework-agnostic package means the Vue, React, and Angular packages
share one implementation and one test suite for that logic, rather
than three independently-maintained copies that could quietly drift
out of sync with each other.

## License

MIT
