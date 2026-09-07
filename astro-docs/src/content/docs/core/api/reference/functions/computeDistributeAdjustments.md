---
editUrl: false
title: "computeDistributeAdjustments"
description: "Computes new x/y for every selected item *except the first and last* (sorted by position along `axis`), spacing the gaps between them evenly across the…"
---

> **computeDistributeAdjustments**(`layout`, `itemIds`, `axis`): `Map`\<`string` \| `number`, \{ `x?`: `number`; `y?`: `number`; \}\>

Computes new x/y for every selected item *except the first and last*
(sorted by position along `axis`), spacing the gaps between them
evenly across the exact span those first and last items already
define — the standard design-tool "distribute" behavior (Figma,
Sketch, etc.): the two outermost items are the fixed reference frame,
not moved themselves; only what's "in between" gets redistributed.
Needs at least 3 selected items to mean anything at all — with only
2, there's nothing in between to redistribute, and this returns an
empty map rather than a no-op adjustment for either of them.

## Parameters

### layout

[`TLayout`](/core/api/reference/types/tlayout/)

The entire grid layout — only entries matching `itemIds` are read.

### itemIds

(`string` \| `number`)[]

The selected item ids — order doesn't matter here (unlike `computeAlignAdjustments`), since this sorts by actual position itself.

### axis

[`TDistributeAxis`](/core/api/reference/types/tdistributeaxis/)

Which axis to distribute along — `horizontal` spaces `x`, `vertical` spaces `y`.

## Returns

`Map`\<`string` \| `number`, \{ `x?`: `number`; `y?`: `number`; \}\>

A map from item id to its adjustment, for every item strictly between the first and last once sorted — never includes the first/last items themselves, or the anchor concept at all (there isn't one here).
