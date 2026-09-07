---
editUrl: false
title: "createCoreData"
description: "Compute the position delta between the previous tick (`lastX`/`lastY`) and the current one (`x`/`y`) during a drag or resize. On the very first tick,…"
---

> **createCoreData**(`lastX`, `lastY`, `x`, `y`): [`IDraggableCoreData`](/core/api/reference/interfaces/idraggablecoredata/)

Compute the position delta between the previous tick (`lastX`/`lastY`)
and the current one (`x`/`y`) during a drag or resize. On the very first
tick, `lastX` is `NaN` (see `useGridItemDrag`/`useGridItemResize`'s
initial `ref(NaN)`), which this function treats as "no previous
position yet" and returns a zero delta instead of `NaN - x`.

## Parameters

### lastX

`number`

Previous tick's x position (`NaN` if this is the first tick).

### lastY

`number`

Previous tick's y position (`NaN` if this is the first tick).

### x

`number`

Current tick's x position.

### y

`number`

Current tick's y position.

## Returns

[`IDraggableCoreData`](/core/api/reference/interfaces/idraggablecoredata/)
