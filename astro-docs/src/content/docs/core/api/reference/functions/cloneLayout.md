---
editUrl: false
title: "cloneLayout"
description: "Deep-clone an entire layout array (see cloneLayoutItem) — used whenever a layout needs to be mutated without affecting the caller's original array/objects…"
---

> **cloneLayout**(`layout`): [`TLayout`](/core/api/reference/types/tlayout/)

Deep-clone an entire layout array (see [cloneLayoutItem](/core/api/reference/functions/clonelayoutitem/)) — used whenever a layout needs to be mutated without affecting the caller's original array/objects (e.g. per-breakpoint layout caching in `useResponsiveLayout`).

## Parameters

### layout

[`TLayout`](/core/api/reference/types/tlayout/)

## Returns

[`TLayout`](/core/api/reference/types/tlayout/)
