---
editUrl: false
title: "resolveMaximizedItem"
description: "The id that may be maximized: `id` when the layout has an item with that id, otherwise `null`. A grid uses this so a maximized id that no longer exists…"
---

> **resolveMaximizedItem**(`layout`, `id`): `string` \| `number` \| `null`

The id that may be maximized: `id` when the layout has an item with that id, otherwise `null`. A grid uses this so a
maximized id that no longer exists (the item was removed, a different layout was loaded) cannot hide every other item.

## Parameters

### layout

[`TLayout`](/core/api/reference/types/tlayout/)

The grid's layout.

### id

`string` \| `number` \| `null` \| `undefined`

The id asked to be maximized, or `null`/`undefined` for "none".

## Returns

`string` \| `number` \| `null`

`id` if it matches a layout entry, else `null`.
