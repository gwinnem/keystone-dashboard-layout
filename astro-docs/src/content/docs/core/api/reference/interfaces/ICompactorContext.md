---
editUrl: false
title: "ICompactorContext"
description: "Context a `compact()` call receives alongside the layout and column count — everything the built-in compactors below need to replicate this project's own…"
---

Context a `compact()` call receives alongside the layout and column
count — everything the built-in compactors below need to replicate
this project's own existing `compactType`/`restoreOnDrag` behavior
exactly, available to a custom compactor too, without forcing it to
bake `compactType` into a fixed choice of *which* compactor object
to use the way `react-grid-layout` v2's own `Compactor` interface
does (a deliberate, small divergence — this project's `compactType`
(formerly `verticalCompact`) was already an existing, widely-used
prop before this interface existed, not something worth removing or
replacing to match another library's own design exactly).

## Properties

### compactType

> **compactType**: [`ECompactType`](/core/api/reference/enums/ecompacttype/)

Which built-in compaction strategy currently applies —
informational, read from `GridLayout`'s own `compactType` prop at
the moment compaction runs. A custom compactor decides for itself
whether/how to use this; nothing enforces it.

***

### minPositions?

> `optional` **minPositions?**: `Record`\<`string` \| `number`, \{ `x?`: `number`; `y?`: `number`; \}\>

Present only during a `restoreOnDrag`-gated compaction (drag end)
— the pre-drag position each item should not rise/shift any
*tighter* than it was before the drag started: `y` for
`ECompactType.VERTICAL`/`NONE`, `x` for `ECompactType.HORIZONTAL`.
Absent for every other trigger (resize end, add/remove item,
mount, breakpoint change, `compactNow()`/`rearrange()`), and for
the two `*_OVERLAP` types (which never consult `minPositions` at
all — every non-static item always moves straight to `0`).
