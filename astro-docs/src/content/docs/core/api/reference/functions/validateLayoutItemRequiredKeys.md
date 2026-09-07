---
editUrl: false
title: "validateLayoutItemRequiredKeys"
description: "Validates that a single layout item object has the required keys (`i`, `h`, `w`, `x`, `y`) with acceptable values: `i` is a valid id (see isIValid), and…"
---

> **validateLayoutItemRequiredKeys**(`layoutItem`): `boolean`

Validates that a single layout item object has the required keys
(`i`, `h`, `w`, `x`, `y`) with acceptable values: `i` is a valid id (see
isIValid), and `h`/`w` are `>= 1` while `x`/`y` are `>= 0`.

## Parameters

### layoutItem

`Record`\<`string`, `unknown`\>

The candidate object to validate.

## Returns

`boolean`

`true` if the object satisfies every check.
