---
editUrl: false
title: "swapElement"
description: "Tries to resolve one drag tick as a swap. Call it instead of `moveElement` while `collisionMode` is `'swap'`. It first puts back whatever the previous…"
---

> **swapElement**(`layout`, `l`, `x`, `y`, `cols`, `state`): `boolean`

Tries to resolve one drag tick as a swap. Call it instead of `moveElement` while `collisionMode` is `'swap'`.

It first puts back whatever the previous tick swapped away, so dragging across several items never leaves a trail of
displaced ones. Then it places `l` at `(x, y)`; if that lands on exactly one non-static item, and that item fits in `l`'s
starting cell without touching anything else, the two trade places and this returns `true` (the layout is already
updated — nothing more to do).

Otherwise it returns `false` with `l` left where it was, and the caller falls back to the normal push via
`moveElement`. That covers: no collision at all (a plain move), several collisions, a static item, an item too wide for
the starting cell, and a swap that would leave the two overlapping (a drag that has not yet cleared the other item).

## Parameters

### layout

[`TLayout`](/core/api/reference/types/tlayout/)

Full layout (mutated in place, like `moveElement`).

### l

[`ILayoutItem`](/core/api/reference/interfaces/ilayoutitem/)

The item being dragged.

### x

`number`

Target X in grid units.

### y

`number`

Target Y in grid units.

### cols

`number`

Column count — a swapped-in item must still fit within it.

### state

[`ISwapDragState`](/core/api/reference/interfaces/iswapdragstate/)

From `createSwapDragState`, kept for the whole drag.

## Returns

`boolean`
