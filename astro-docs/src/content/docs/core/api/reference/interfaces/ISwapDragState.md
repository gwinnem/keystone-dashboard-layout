---
editUrl: false
title: "ISwapDragState"
description: "Where the item being dragged started, and the item it has swapped out of the way for the moment (if any)."
---

Where the item being dragged started, and the item it has swapped out of the way for the moment (if any).

## Properties

### displaced

> **displaced**: \{ `i`: `string` \| `number`; `moved`: `boolean` \| `undefined`; `x`: `number`; `y`: `number`; \} \| `null`

The item last swapped into the dragged item's starting cell, with where it came from — put back on the next tick. Held
by id, not by reference, since a framework that clones the layout on every drag tick hands each tick fresh objects.

***

### originX

> **originX**: `number`

***

### originY

> **originY**: `number`
