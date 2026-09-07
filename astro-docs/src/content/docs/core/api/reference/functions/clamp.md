---
editUrl: false
title: "clamp"
description: "Clamp `num` to the `[lowerBound, upperBound]` range. Equivalent to lodash's `_.clamp`, inlined here to avoid the dependency."
---

> **clamp**(`num`, `lowerBound`, `upperBound`): `number`

Clamp `num` to the `[lowerBound, upperBound]` range. Equivalent to
lodash's `_.clamp`, inlined here to avoid the dependency.

## Parameters

### num

`number`

The value to clamp.

### lowerBound

`number`

Minimum allowed value.

### upperBound

`number`

Maximum allowed value.

## Returns

`number`

`num`, or the nearest bound if it's outside the range.
