---
editUrl: false
title: "IMaximizedState"
description: "What the grid exposes to its items about maximize/restore: which item is maximized, and how tall the grid container currently is — the maximized item…"
---

What the grid exposes to its items about maximize/restore: which item is maximized, and how tall the grid container
currently is — the maximized item fills that height. `id` is `null` when nothing is maximized.

## Properties

### height

> **height**: `number`

The grid container's current height in pixels; only read while `id` is set.

***

### id

> **id**: `string` \| `number` \| `null`

The maximized item's id, or `null`.
