---
editUrl: false
title: "findSnapAdjustment"
description: "A magnetic counterpart to `findAlignmentGuides` — `showAlignmentGuides` is deliberately visual-only (shows where edges line up without changing where the…"
---

> **findSnapAdjustment**(`layout`, `activeItem`, `threshold`): `object`

A magnetic counterpart to `findAlignmentGuides` — `showAlignmentGuides`
is deliberately visual-only (shows where edges line up without
changing where the item actually lands); this is for `snapToGrid`,
which does change the landing position, once the pointer's dragged-to
position is within `threshold` grid units of an edge alignment with
another item.

Reuses the same left/right/top/bottom edge comparisons
`findAlignmentGuides` does, generalized from "equal" to "within
threshold, and pick the closest" — deliberately a separate function
rather than a shared one parameterized by threshold=0 for exact
matching, since the two have different return shapes for different
purposes (`IAlignmentGuide[]`, every alignment found, for rendering
guide lines vs. a single best x/y adjustment here, for actually moving
the item) that would otherwise need awkward overloads to express.

## Parameters

### layout

[`TLayout`](/core/api/reference/types/tlayout/)

The entire grid layout, including `activeItem` itself (filtered out by `i`, not assumed absent).

### activeItem

[`ILayoutItem`](/core/api/reference/interfaces/ilayoutitem/)

The item's live, dragged-to (not yet committed) position/size.

### threshold

`number`

How close (in grid units) an edge needs to be to another item's edge to snap to it. `0` disables snapping entirely (nothing is ever "close enough").

## Returns

`object`

`{ x, y }` — either key present only if that axis actually has a snap target within threshold; the axis's own value is the *item's* adjusted x/y (not the raw edge position), already accounting for which of the item's own edges (left vs right, top vs bottom) triggered the match. `{}` if nothing was within threshold on either axis.

### x?

> `optional` **x?**: `number`

### y?

> `optional` **y?**: `number`
