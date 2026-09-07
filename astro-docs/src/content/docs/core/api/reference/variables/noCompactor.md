---
editUrl: false
title: "noCompactor"
description: "The built-in strategy behind `ECompactType.NONE` (this project's former `verticalCompact: false`) — items don't float up; collisions still resolve by…"
---

> `const` **noCompactor**: [`ICompactor`](/core/api/reference/interfaces/icompactor/)

The built-in strategy behind `ECompactType.NONE` (this project's
former `verticalCompact: false`) — items don't float up; collisions
still resolve by pushing down, and (during a `restoreOnDrag`-gated
compaction specifically) never rise above `context.minPositions`.
