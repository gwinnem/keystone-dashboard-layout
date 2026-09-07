---
editUrl: false
title: "marginValidator"
description: "Validates a `margin` prop tuple: exactly two numbers, both strictly positive (a `[0, 0]` margin fails this check). Not currently called anywhere in `src/`…"
---

> **marginValidator**(`value`): `boolean`

Validates a `margin` prop tuple: exactly two numbers, both strictly
positive (a `[0, 0]` margin fails this check). Not currently called
anywhere in `src/` outside its own test — `GridLayout`'s `margin` prop
isn't run through this validator, so a `[0, 0]` margin is accepted by
the component today despite what this function would say. See
`docs/REFACTORING.md` for this discrepancy.

## Parameters

### value

\[`number`, `number`\]

The `[horizontal, vertical]` margin tuple to validate.

## Returns

`boolean`

`true` if both values are positive numbers.
