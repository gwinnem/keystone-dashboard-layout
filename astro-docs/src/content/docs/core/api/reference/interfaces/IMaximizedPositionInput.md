---
editUrl: false
title: "IMaximizedPositionInput"
description: "What the maximized item is measured against: the grid's content box, and the gap kept around the item."
---

What the maximized item is measured against: the grid's content box, and the gap kept around the item.

## Properties

### containerHeight

> **containerHeight**: `number`

Height of the grid container in pixels — the grid's own height, not the viewport's.

***

### containerWidth

> **containerWidth**: `number`

Width of the grid container in pixels.

***

### margin

> **margin**: readonly `number`[]

`[horizontal, vertical]` margin in pixels, kept free on every side like the gap between ordinary items.

***

### rtl

> **rtl**: `boolean`

Whether the grid renders right-to-left (`isMirrored`).
