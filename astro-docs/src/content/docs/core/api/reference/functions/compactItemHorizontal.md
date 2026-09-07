---
editUrl: false
title: "compactItemHorizontal"
description: "The horizontal-compaction counterpart to compactItem above — moves a single item leftward as far as it can go without colliding, then (mirroring…"
---

> **compactItemHorizontal**(`compareWith`, `layoutItem`, `horizontalCompact`, `minPositions?`): [`ILayoutItem`](/core/api/reference/interfaces/ilayoutitem/)

The horizontal-compaction counterpart to [compactItem](/core/api/reference/functions/compactitem/) above —
moves a single item leftward as far as it can go without colliding,
then (mirroring `compactItem`'s own "push down if still colliding"
step, transposed to the x axis) pushes it rightward past anything it
still overlaps at its starting position. `minPositions` here holds
the pre-drag minimum *x* (not `y`) each item shouldn't compact
tighter than — the `restoreOnDrag` case, transposed the same way.

## Parameters

### compareWith

[`TLayout`](/core/api/reference/types/tlayout/)

### layoutItem

[`ILayoutItem`](/core/api/reference/interfaces/ilayoutitem/)

### horizontalCompact

`boolean`

### minPositions?

`Record`\<`string` \| `number`, \{ `x`: `number`; \}\>

## Returns

[`ILayoutItem`](/core/api/reference/interfaces/ilayoutitem/)
