---
editUrl: false
title: "getBottomYCoordinate"
description: "Return the bottom-most occupied row (`y + h`, maximized across every item) of a layout — used by `GridLayout`'s `containerHeight()` to size the container…"
---

> **getBottomYCoordinate**(`layout`): `number`

Return the bottom-most occupied row (`y + h`, maximized across every
item) of a layout — used by `GridLayout`'s `containerHeight()` to size
the container when `autoSize` is enabled.

## Parameters

### layout

[`TLayout`](/core/api/reference/types/tlayout/)

Layout array.

## Returns

`number`

Bottom coordinate, in grid row units — `0` for an empty layout (see docs/REFACTORING.md #9/#33: no items means nothing occupies any row, not an error).

## Throws

`EErrorMessage.INVALID_LAYOUT` if `layout` is `undefined` (still genuinely invalid — an empty array and a missing one aren't the same thing).
