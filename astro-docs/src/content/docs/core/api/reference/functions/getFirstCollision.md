---
editUrl: false
title: "getFirstCollision"
description: "Returns the first item this layout collides with. It doesn't appear to matter which order we approach this from, although perhaps that is the wrong thing…"
---

> **getFirstCollision**(`layout`, `layoutItem`): [`ILayoutItem`](/core/api/reference/interfaces/ilayoutitem/)\<`unknown`\> \| `undefined`

Returns the first item this layout collides with.
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

[`ILayoutItem`](/core/api/reference/interfaces/ilayoutitem/)\<`unknown`\> \| `undefined`

A colliding layout item, or undefined.

## Throws

Empty layout.
