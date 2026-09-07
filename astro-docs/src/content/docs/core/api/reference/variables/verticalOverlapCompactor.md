---
editUrl: false
title: "verticalOverlapCompactor"
description: "The built-in strategy behind `ECompactType.VERTICAL_OVERLAP` — every non-static item moves straight to `y: 0`, ignoring collisions entirely. Matches…"
---

> `const` **verticalOverlapCompactor**: [`ICompactor`](/core/api/reference/interfaces/icompactor/)

The built-in strategy behind `ECompactType.VERTICAL_OVERLAP` — every
non-static item moves straight to `y: 0`, ignoring collisions
entirely. Matches `react-grid-layout`'s own `allowOverlap` semantics
applied to compaction specifically; items may genuinely end up
overlapping one another as a result.
