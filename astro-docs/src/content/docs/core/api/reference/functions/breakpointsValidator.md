---
editUrl: false
title: "breakpointsValidator"
description: "Validates a `breakpoints`/`cols`-shaped object: it must have exactly the seven standard breakpoint keys (`xxl`...`xxs`), each with a numeric value."
---

> **breakpointsValidator**(`cols`): `boolean`

Validates a `breakpoints`/`cols`-shaped object: it must have exactly the
seven standard breakpoint keys (`xxl`...`xxs`), each with a numeric
value.

## Parameters

### cols

[`TBreakpoints`](/core/api/reference/types/tbreakpoints/)

The breakpoints or columns object to validate.

## Returns

`boolean`

`true` if every required key is present with a numeric value.
