---
editUrl: false
title: "getAllNonStaticGridItems"
description: "Get all non-static elements. Not currently called anywhere in `src/` outside its own test — kept as the natural counterpart to getAllStaticGridItems for…"
---

> **getAllNonStaticGridItems**(`layout`): [`ILayoutItem`](/core/api/reference/interfaces/ilayoutitem/)\<`unknown`\>[]

Get all non-static elements. Not currently called anywhere in `src/`
outside its own test — kept as the natural counterpart to
[getAllStaticGridItems](/core/api/reference/functions/getallstaticgriditems/) for consumers who need it.

## Parameters

### layout

[`TLayout`](/core/api/reference/types/tlayout/)

Array of layout objects.

## Returns

[`ILayoutItem`](/core/api/reference/interfaces/ilayoutitem/)\<`unknown`\>[]

Array of non-static layout items — `[]` for an empty layout.
