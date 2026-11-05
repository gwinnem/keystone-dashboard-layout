---
editUrl: false
title: "verticalFastCompactor"
description: "A drop-in alternative to `verticalCompactor` that produces the same layout in roughly `O(n log n)` instead of `O(n²)` — worth choosing from a few hundred…"
---

> `const` **verticalFastCompactor**: [`ICompactor`](/core/api/reference/interfaces/icompactor/)

A drop-in alternative to `verticalCompactor` that produces the same
layout in roughly `O(n log n)` instead of `O(n²)` — worth choosing
from a few hundred items upwards (pass it as `GridLayout`'s
`compactor` prop). Not a built-in `ECompactType` value: `compactType`
keeps selecting `verticalCompactor`, so existing grids are unchanged
unless they opt in. Honors `context.minPositions` like the original,
and quietly uses the original algorithm for non-integer or otherwise
unusual input, so the result is never different — only faster.
