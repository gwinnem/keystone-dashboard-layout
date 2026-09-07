---
editUrl: false
title: "findSpacingIndicators"
description: "Finds the nearest neighbor above/below/left/right of `activeItem` (the item currently being dragged/resized, live position) and returns the grid-unit gap…"
---

> **findSpacingIndicators**(`layout`, `activeItem`): [`ISpacingIndicator`](/core/api/reference/interfaces/ispacingindicator/)[]

Finds the nearest neighbor above/below/left/right of `activeItem` (the
item currently being dragged/resized, live position) and returns the
grid-unit gap to each one found — a labeled distance alongside the
existing edge/center alignment guides `findAlignmentGuides` already
provides. Deliberately nearest-neighbor only per side, not every item
on that side: `findAlignmentGuides`'s own all-matches approach
doesn't apply here — a distance label to every item on a side, not
just the closest one, would be visual noise, not useful feedback.

Only considers a candidate whose own perpendicular-axis range
actually overlaps `activeItem`'s (e.g. for a left/right gap, the
candidate's own y-range must overlap `activeItem`'s y-range) —
otherwise an item that merely happens to sit further along the same
row/column, but isn't actually adjacent to `activeItem`, would get
reported as a "gap" when nothing about their relative layout suggests
they're related. A gap of exactly `0` (items already touching) is
excluded — there's no meaningful distance left to label at that
point.

## Parameters

### layout

[`TLayout`](/core/api/reference/types/tlayout/)

The entire grid layout, including `activeItem` itself (filtered out by `i`, not assumed absent).

### activeItem

[`ILayoutItem`](/core/api/reference/interfaces/ilayoutitem/)

The item currently being dragged/resized, with its live (in-progress) `x`/`y`/`w`/`h`.

## Returns

[`ISpacingIndicator`](/core/api/reference/interfaces/ispacingindicator/)[]

Up to 4 indicators (one per side that actually has a qualifying neighbor) — empty if nothing qualifies on any side.
