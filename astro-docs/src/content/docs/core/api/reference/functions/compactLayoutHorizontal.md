---
editUrl: false
title: "compactLayoutHorizontal"
description: "The horizontal-compaction counterpart to compactLayout above — same algorithm, transposed to the x axis: items are processed leftmost-first (via…"
---

> **compactLayoutHorizontal**(`layout`, `horizontalCompact`, `minPositions?`): [`TLayout`](/core/api/reference/types/tlayout/)

The horizontal-compaction counterpart to [compactLayout](/core/api/reference/functions/compactlayout/) above
— same algorithm, transposed to the x axis: items are processed
leftmost-first (via [sortLayoutItemsByColRow](/core/api/reference/functions/sortlayoutitemsbycolrow/), the column-major
counterpart to `sortLayoutItemsByRowCol`) and settle toward `x: 0`
instead of `y: 0`.

## Parameters

### layout

[`TLayout`](/core/api/reference/types/tlayout/)

### horizontalCompact

`boolean`

### minPositions?

`Record`\<`string` \| `number`, \{ `x`: `number`; \}\>

## Returns

[`TLayout`](/core/api/reference/types/tlayout/)
