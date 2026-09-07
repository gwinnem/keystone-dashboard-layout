---
editUrl: false
title: "sortLayoutItemsByRowCol"
description: "Get layout items sorted from top left to right and down — used before compaction so items are processed in visual reading order, and each item only…"
---

> **sortLayoutItemsByRowCol**(`layout`): [`TLayout`](/core/api/reference/types/tlayout/)

Get layout items sorted from top left to right and down — used before
compaction so items are processed in visual reading order, and each
item only collides with items already placed above/to-the-left of it.

## Parameters

### layout

[`TLayout`](/core/api/reference/types/tlayout/)

Array of layout objects.

## Returns

[`TLayout`](/core/api/reference/types/tlayout/)

A new, sorted array (does not mutate `layout`).
