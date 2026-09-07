---
editUrl: false
title: "findOrGenerateResponsiveLayout"
description: "Given existing layouts and a new breakpoint, find or generate a new layout. This finds the layout above the new one and generates from it, if it exists.…"
---

> **findOrGenerateResponsiveLayout**(`orgLayout`, `layouts`, `breakpoints`, `breakpoint`, `lastBreakpoint`, `cols`, `compactType`, `distributeEvenly`): [`TLayout`](/core/api/reference/types/tlayout/)

Given existing layouts and a new breakpoint, find or generate a new layout.

This finds the layout above the new one and generates from it, if it exists.

Despite a stale `// TODO obsolete code..` comment that used to sit on
this function's own parameter list (removed — see docs/REFACTORING.md
#54), this is not obsolete: it's the one function `useResponsiveLayout.ts`
calls on every breakpoint change, and has its own passing test suite
(`tests/responsive-helper.spec.ts`) exercising clone/bounds-correct/
compact behavior, immutability of the input, and the undefined-layout
edge case. Confirmed both directly before removing that comment,
rather than assuming it was safe to delete.

## Parameters

### orgLayout

[`TLayout`](/core/api/reference/types/tlayout/)

Original layout.

### layouts

[`TResponsiveLayout`](/core/api/reference/types/tresponsivelayout/)

Existing layouts.

### breakpoints

[`TBreakpoints`](/core/api/reference/types/tbreakpoints/)

All breakpoints.

### breakpoint

`string`

New breakpoint.

### lastBreakpoint

`string`

Last breakpoint (for fallback).

### cols

`number`

Column count at new breakpoint.

### compactType

[`ECompactType`](/core/api/reference/enums/ecompacttype/)

Which built-in compaction strategy to apply.

### distributeEvenly

`boolean`

## Returns

[`TLayout`](/core/api/reference/types/tlayout/)

New layout.
