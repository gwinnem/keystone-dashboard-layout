---
editUrl: false
title: "sortLayoutItemsByColRow"
description: "Get layout items sorted from top left to bottom and right — the column-first counterpart to sortLayoutItemsByRowCol above, used before *horizontal*…"
---

> **sortLayoutItemsByColRow**(`layout`): [`TLayout`](/core/api/reference/types/tlayout/)

Get layout items sorted from top left to bottom and right — the
column-first counterpart to [sortLayoutItemsByRowCol](/core/api/reference/functions/sortlayoutitemsbyrowcol/) above,
used before *horizontal* compaction specifically. Processing items
leftmost-first (not topmost-first) means each item only collides
with items already placed to its left/above, mirroring
`sortLayoutItemsByRowCol`'s own row-major order but transposed —
the correct visual "reading order" for a layout that's settling
left-to-right instead of top-to-bottom.

## Parameters

### layout

[`TLayout`](/core/api/reference/types/tlayout/)

Array of layout objects.

## Returns

[`TLayout`](/core/api/reference/types/tlayout/)

A new, sorted array (does not mutate `layout`).
