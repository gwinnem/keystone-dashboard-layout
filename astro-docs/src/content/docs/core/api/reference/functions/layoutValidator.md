---
editUrl: false
title: "layoutValidator"
description: "Validates an entire layout array: every item must have the required position keys (`i`, `h`, `w`, `x`, `y`), and any *optional* key present…"
---

> **layoutValidator**(`layout`): `boolean`

Validates an entire layout array: every item must have the required
position keys (`i`, `h`, `w`, `x`, `y`), and any *optional* key present
(`isDraggable`, `minH`, etc.) must be the right JavaScript type — values
aren't range-checked here (that's `validateLayoutItemRequiredKeys` in
`keys-validator.ts`, used elsewhere). Called once, from `GridLayout`'s
`onMounted`, before the layout is used for anything.

## Parameters

### layout

[`TLayout`](/core/api/reference/types/tlayout/)

The layout array to validate.

## Returns

`boolean`

`true` for an empty array (nothing to violate — see docs/REFACTORING.md #9/#33: a grid mounting with no items yet, e.g. an empty cross-grid-drop target, is a normal state, not an error) or if every item has the required keys and correctly-typed optional keys.
