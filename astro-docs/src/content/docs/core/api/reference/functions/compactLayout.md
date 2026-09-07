---
editUrl: false
title: "compactLayout"
description: "Given a layout, compact it. This involves going down each y coordinate and removing gaps between items."
---

> **compactLayout**(`layout`, `verticalCompact`, `minPositions?`): [`TLayout`](/core/api/reference/types/tlayout/)

Given a layout, compact it. This involves going down each y coordinate and removing gaps
between items.

## Parameters

### layout

[`TLayout`](/core/api/reference/types/tlayout/)

Layout.

### verticalCompact

`boolean`

Whether or not to compact the layout vertically.

### minPositions?

`Record`\<`string` \| `number`, \{ `y`: `number`; \}\>

## Returns

[`TLayout`](/core/api/reference/types/tlayout/)

Compacted Layout.
