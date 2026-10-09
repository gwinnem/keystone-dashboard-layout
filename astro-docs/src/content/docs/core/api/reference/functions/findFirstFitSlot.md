---
editUrl: false
title: "findFirstFitSlot"
description: "Finds the first available `(x, y)` slot for an item of the given `w`×`h`, via a real first-fit bin-pack: scans row by row from the top (`y: 0` upward),…"
---

> **findFirstFitSlot**(`layout`, `colNum`, `w`, `h`): `object`

Finds the first available `(x, y)` slot for an item of the given
`w`×`h`, via a real first-fit bin-pack: scans row by row from the
top (`y: 0` upward), and within each row column by column from the
left (`x: 0` upward), returning the first position where the
candidate rect fits — both within `colNum` and without colliding
with any existing item in `layout`.

Exists because the common "just place a new item at `x: 0, y:
Infinity` and let compaction settle it" pattern doesn't actually
bin-pack: plain vertical compaction only ever moves an item straight
up within its own x range, it never searches other columns for a
better fit. A new item hardcoded to `x: 0` never reuses a gap opened
up at some other column by a previously-removed item — it always
lands in a fresh row at the bottom instead, even when there's
visibly room for it much higher up. Row-major scan order (not
column-major) matches how a person visually scans a grid for open
space, and matches this library's own default top-to-bottom,
left-to-right compaction order, so a newly-placed item settles where
a human would expect it to, not merely *some* valid gap.

Doesn't itself mutate `layout` or push anything into it — callers
combine the returned position with whatever item shape/id scheme
they're using (see the `Add or remove items` example and demo view
for a full `addItem` built on this).

## Parameters

### layout

[`TLayout`](/core/api/reference/types/tlayout/)

The entire grid layout to search for a gap in.

### colNum

`number`

The grid's own column count — a candidate slot whose
               `x + w` would exceed this is never considered, the
               same bound `GridLayout`'s own `colNum` prop enforces.

### w

`number`

Width, in grid units, of the item being placed.

### h

`number`

Height, in grid units, of the item being placed.

## Returns

`object`

The first `(x, y)` slot the item fits in. Row `maxY` (one past
               everything occupied) is always empty, so an item no wider than
               `colNum` always finds a slot there at the latest. The
               `{ x: 0, y: maxY }` fallback is therefore only reached for an
               item WIDER than the grid (`w > colNum`), which can fit in no
               column at all: it is placed on a fresh row at the left edge.

### x

> **x**: `number`

### y

> **y**: `number`
