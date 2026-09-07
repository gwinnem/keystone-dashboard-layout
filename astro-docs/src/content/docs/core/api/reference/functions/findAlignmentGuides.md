---
editUrl: false
title: "findAlignmentGuides"
description: "Finds edge alignments between `activeItem` (the item currently being dragged or resized — its *live*, not-yet-committed position/size, since this runs…"
---

> **findAlignmentGuides**(`layout`, `activeItem`): [`IAlignmentGuide`](/core/api/reference/interfaces/ialignmentguide/)[]

Finds edge alignments between `activeItem` (the item currently being
dragged or resized — its *live*, not-yet-committed position/size, since
this runs during `dragmove`/`resizemove`, not after) and every other
item in `layout`. An "alignment" is either item's left/right edge
(for a vertical guide) or top/bottom edge (for a horizontal guide)
landing on the exact same grid-unit coordinate as one of the other
item's edges — not collision/overlap (`collision-helper.ts` already
covers that separately), and not restricted to same-side matches
(the dragged item's left edge lining up with another item's *right*
edge is just as valid an alignment as left-to-left).

Deliberately grid-unit-based, not pixel-based: two items whose edges
share a grid coordinate are aligned regardless of the current
`colWidth`/`rowHeight`/`margin` — those only affect where the guide
*renders*, not whether an alignment exists. Pixel conversion is the
caller's job (`GridLayout.vue`, which already has `calcColWidth`, etc.
available for it).

## Parameters

### layout

[`TLayout`](/core/api/reference/types/tlayout/)

The entire grid layout, including `activeItem` itself (filtered out by `i`, not assumed absent).

### activeItem

[`ILayoutItem`](/core/api/reference/interfaces/ilayoutitem/)

The item currently being dragged/resized, with its live (in-progress) `x`/`y`/`w`/`h`.

## Returns

[`IAlignmentGuide`](/core/api/reference/interfaces/ialignmentguide/)[]

Every distinct alignment found, deduplicated by axis+position — if three other items all happen to share the same edge, that's one guide line, not three.
