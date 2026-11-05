---
editUrl: false
title: "calcMaximizedPosition"
description: "Where the maximized item sits: the whole container minus one margin on each side, so it lines up with where ordinary items start. Never smaller than 1×1…"
---

> **calcMaximizedPosition**(`input`): [`IPositionStyleInput`](/core/api/reference/interfaces/ipositionstyleinput/)

Where the maximized item sits: the whole container minus one margin on each side, so it lines up with where ordinary
items start. Never smaller than 1×1 px, so a not-yet-measured container cannot produce a zero or negative size.
Returns the same shape a position strategy takes, so it goes straight into `IPositionStrategy.getStyle`.

## Parameters

### input

[`IMaximizedPositionInput`](/core/api/reference/interfaces/imaximizedpositioninput/)

Container size, margin and direction.

## Returns

[`IPositionStyleInput`](/core/api/reference/interfaces/ipositionstyleinput/)

Pixel position and size of the maximized item.
