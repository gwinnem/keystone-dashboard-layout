---
editUrl: false
title: "correctBounds"
description: "Given a layout, make sure all elements fit within its bounds."
---

> **correctBounds**(`layout`, `bounds`, `distributeEvenly`): [`TLayout`](/core/api/reference/types/tlayout/)

Given a layout, make sure all elements fit within its bounds.

## Parameters

### layout

[`TLayout`](/core/api/reference/types/tlayout/)

Layout array.

### bounds

Number of columns.

#### cols

`number`

### distributeEvenly

`boolean`

Enforces that a grid item is moved all the way to left/right when there is available space for it

## Returns

[`TLayout`](/core/api/reference/types/tlayout/)

The new adjusted layout.
