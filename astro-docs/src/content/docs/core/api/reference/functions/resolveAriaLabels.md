---
editUrl: false
title: "resolveAriaLabels"
description: "Merges three layers, each only overriding the keys it actually sets: built-in English defaults <- `GridLayout`'s own `ariaLabels` (a grid-wide override)…"
---

> **resolveAriaLabels**(`layoutLabels`, `itemLabels`): `Required`\<[`IGridAriaLabels`](/core/api/reference/interfaces/igridarialabels/)\>

Merges three layers, each only overriding the keys it actually sets:
built-in English defaults <- `GridLayout`'s own `ariaLabels` (a
grid-wide override) <- this specific `GridItem`'s own `ariaLabels` (a
per-item override). Lets a consumer override just one string
grid-wide, or just one string on one specific item, without needing
to re-supply every other key each time.

## Parameters

### layoutLabels

[`IGridAriaLabels`](/core/api/reference/interfaces/igridarialabels/) \| `undefined`

### itemLabels

[`IGridAriaLabels`](/core/api/reference/interfaces/igridarialabels/) \| `undefined`

## Returns

`Required`\<[`IGridAriaLabels`](/core/api/reference/interfaces/igridarialabels/)\>
