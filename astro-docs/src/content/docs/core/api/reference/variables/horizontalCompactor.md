---
editUrl: false
title: "horizontalCompactor"
description: "The built-in strategy behind `ECompactType.HORIZONTAL` — items float left as far as they can without colliding, the same algorithm as `verticalCompactor`…"
---

> `const` **horizontalCompactor**: [`ICompactor`](/core/api/reference/interfaces/icompactor/)

The built-in strategy behind `ECompactType.HORIZONTAL` — items float
left as far as they can without colliding, the same algorithm as
`verticalCompactor` transposed to the x axis. New: this project had
no horizontal compaction at all before this — only `horizontalShift`
(an unrelated, separate prop controlling which direction a
*colliding* item gets shifted during an active drag, not how the
resting layout settles).
