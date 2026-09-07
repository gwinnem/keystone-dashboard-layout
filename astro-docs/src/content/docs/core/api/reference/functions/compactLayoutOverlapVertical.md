---
editUrl: false
title: "compactLayoutOverlapVertical"
description: "The \"allow overlap\" compaction variant `ECompactType.VERTICAL_OVERLAP` uses — every non-static item moves straight to `y: 0` unconditionally, with no…"
---

> **compactLayoutOverlapVertical**(`layout`): [`TLayout`](/core/api/reference/types/tlayout/)

The "allow overlap" compaction variant `ECompactType.VERTICAL_OVERLAP`
uses — every non-static item moves straight to `y: 0`
unconditionally, with no collision checking at all (unlike
[compactItem](/core/api/reference/functions/compactitem/), which stops as soon as it would collide).
Matches `react-grid-layout`'s own `allowOverlap` semantics applied to
compaction specifically: items are genuinely allowed to end up
overlapping one another as a result — nothing here resolves that,
by design.

## Parameters

### layout

[`TLayout`](/core/api/reference/types/tlayout/)

## Returns

[`TLayout`](/core/api/reference/types/tlayout/)
