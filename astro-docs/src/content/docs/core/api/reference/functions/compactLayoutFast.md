---
editUrl: false
title: "compactLayoutFast"
description: "Vertical compaction with the same result as `compactLayout(layout, true, minPositions)`, in roughly `O(n log n)` instead of `O(n²)`. The reference walks…"
---

> **compactLayoutFast**(`layout`, `minPositions?`): [`TLayout`](/core/api/reference/types/tlayout/)

Vertical compaction with the same result as `compactLayout(layout, true,
minPositions)`, in roughly `O(n log n)` instead of `O(n²)`.

The reference walks every item upward one row at a time, testing
each step against every item already placed. This version keeps, per
grid column, the sorted rows that are occupied (statics up front,
placed items as they land) and answers the same two questions with
binary searches:

1. How far does the item rise? Up to the first row where it would
   touch something, or to its `minPositions` floor, whichever is
   lower on the page.
2. Where does it settle if it overlaps something there? At the first
   free row at or below that point.

Like the reference, it processes items in row-then-column order,
works on the items it is given (mutating `y` and clearing `moved`),
and returns them in their original order.

Input outside the ordinary integer-grid contract (see
isFastCompactible) is delegated to the reference
implementation, so the result never differs — only the speed does.

## Parameters

### layout

[`TLayout`](/core/api/reference/types/tlayout/)

### minPositions?

`Record`\<`string` \| `number`, \{ `y?`: `number`; \}\>

## Returns

[`TLayout`](/core/api/reference/types/tlayout/)
