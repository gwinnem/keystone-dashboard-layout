---
editUrl: false
title: "computeAlignAdjustments"
description: "Computes the x/y adjustment every selected item *other than the anchor* needs to align with the anchor's own edge/center. The anchor — the first id in…"
---

> **computeAlignAdjustments**(`layout`, `itemIds`, `edge`): `Map`\<`string` \| `number`, \{ `x?`: `number`; `y?`: `number`; \}\>

Computes the x/y adjustment every selected item *other than the
anchor* needs to align with the anchor's own edge/center. The anchor
— the first id in `itemIds`, by convention (a `multiSelect` selection
is a `Set`, which iterates in insertion order, so "first id" means
"first item the user actually selected," not an arbitrary one) —
never moves and is never included in the returned map at all: this
computes "align everything else to it," not "average everyone
together."

Only the axis `edge` actually affects is included per item (`x` for
`left`/`right`/`center-x`, `y` for `top`/`bottom`/`center-y`) — a
left-alignment command has no opinion about anything's `y` at all.
Center alignment is rounded to the nearest whole grid unit, since a
grid layout has no way to represent a fractional coordinate.

## Parameters

### layout

[`TLayout`](/core/api/reference/types/tlayout/)

The entire grid layout — only entries matching `itemIds` are read; nothing outside the selection is considered or returned.

### itemIds

(`string` \| `number`)[]

The selected item ids, anchor first.

### edge

[`TAlignEdge`](/core/api/reference/types/talignedge/)

Which edge/center to align to.

## Returns

`Map`\<`string` \| `number`, \{ `x?`: `number`; `y?`: `number`; \}\>

A map from item id to its adjustment — only entries that actually need to move are present; an item already exactly aligned isn't included, and neither is the anchor itself or any id in `itemIds` that doesn't match a real layout entry.
