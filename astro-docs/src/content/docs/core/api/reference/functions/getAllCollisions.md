---
editUrl: false
title: "getAllCollisions"
description: "Returns all the items which collides in the layout It doesn't appear to matter which order we approach this from, although perhaps that is the wrong thing…"
---

> **getAllCollisions**(`layout`, `layoutItem`): [`ILayoutItem`](/core/api/reference/interfaces/ilayoutitem/)\<`unknown`\>[]

Returns all the items which collides in the layout
It doesn't appear to matter which order we approach this from, although
perhaps that is the wrong thing to do.

## Parameters

### layout

[`TLayout`](/core/api/reference/types/tlayout/)

The entire grid layout.

### layoutItem

[`ILayoutItem`](/core/api/reference/interfaces/ilayoutitem/)

Layout item.

## Returns

[`ILayoutItem`](/core/api/reference/interfaces/ilayoutitem/)\<`unknown`\>[]

A colliding layout item, or undefined — `[]` for an empty layout (see docs/REFACTORING.md #9/#33: nothing to collide with isn't an error, and this now matches `getFirstCollision`'s existing behavior for the same case, which was already `undefined` rather than a throw).

## Throws

`EErrorMessage.INVALID_PARAMS` if `layout` or `layoutItem` is `undefined` — still genuinely invalid, distinct from an empty (but defined) layout array.
