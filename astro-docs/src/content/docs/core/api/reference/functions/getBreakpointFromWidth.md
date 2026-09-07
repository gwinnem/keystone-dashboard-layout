---
editUrl: false
title: "getBreakpointFromWidth"
description: "Given a width, find the highest breakpoint that matches is valid for it (width > breakpoint)."
---

> **getBreakpointFromWidth**(`breakpoints`, `width`): `string`

Given a width, find the highest breakpoint that matches is valid for it (width > breakpoint).

## Parameters

### breakpoints

[`TBreakpoints`](/core/api/reference/types/tbreakpoints/)

Breakpoints object (e.g. {lg: 1200, md: 960, ...})

### width

`number`

Window width.

## Returns

`string`

Highest breakpoint that is less than width.

## Throws

Invalid width. Must be greater or equal 0
