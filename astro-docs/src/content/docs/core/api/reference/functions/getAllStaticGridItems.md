---
editUrl: false
title: "getAllStaticGridItems"
description: "Get all static elements."
---

> **getAllStaticGridItems**(`layout`): [`ILayoutItem`](/core/api/reference/interfaces/ilayoutitem/)\<`unknown`\>[]

Get all static elements.

## Parameters

### layout

[`TLayout`](/core/api/reference/types/tlayout/)

Array of layout objects.

## Returns

[`ILayoutItem`](/core/api/reference/interfaces/ilayoutitem/)\<`unknown`\>[]

Array of static layout items — `[]` for an empty layout (see docs/REFACTORING.md #9/#33: an empty layout is a normal state, not an error).
