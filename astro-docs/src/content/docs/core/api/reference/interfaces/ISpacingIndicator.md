---
editUrl: false
title: "ISpacingIndicator"
description: "A single distance-labeled spacing indicator between `activeItem` and its nearest neighbor on one side — alongside `findAlignmentGuides`'s edge-alignment…"
---

A single distance-labeled spacing indicator between `activeItem` and
its nearest neighbor on one side — alongside `findAlignmentGuides`'s
edge-alignment lines, but a distinct concept: a gap size (e.g. "2
cols"/"1 row"), not an edge lining up with another edge. `gapStart`/
`gapEnd` are grid-unit coordinates on the relevant axis; `distance`
(`gapEnd - gapStart`) is the number a rendered label actually shows.

## Properties

### axis

> **axis**: `"x"` \| `"y"`

***

### distance

> **distance**: `number`

***

### gapEnd

> **gapEnd**: `number`

***

### gapStart

> **gapStart**: `number`
