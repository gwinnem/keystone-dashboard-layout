---
editUrl: false
title: "verticalCompactor"
description: "The built-in strategy behind `ECompactType.VERTICAL` (the default, and this project's former `verticalCompact: true`) — items float up as far as they can…"
---

> `const` **verticalCompactor**: [`ICompactor`](/core/api/reference/interfaces/icompactor/)

The built-in strategy behind `ECompactType.VERTICAL` (the default,
and this project's former `verticalCompact: true`) — items float up
as far as they can without colliding. Exported separately so a
custom `compactor` can delegate back to this for part of a layout
(e.g. compact everything except one pinned row) rather than
reimplementing it.
