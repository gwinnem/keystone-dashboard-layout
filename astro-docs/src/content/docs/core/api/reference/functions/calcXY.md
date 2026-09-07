---
editUrl: false
title: "calcXY"
description: "Translate x and y coordinates from pixels to grid units, with full parameter validation via validateXYParams. **Not currently used anywhere in `src/`.**…"
---

> **calcXY**(`top`, `left`, `margin`, `rowHeight`, `cols`, `innerH`, `innerW`, `maxRows`, `containerWidth`): [`ICalcXy`](/core/api/reference/interfaces/icalcxy/)

Translate x and y coordinates from pixels to grid units, with full
parameter validation via validateXYParams.

**Not currently used anywhere in `src/`.** `useGridItemDrag.ts`'s own
`calcXY` duplicates this logic inline (without the validation step)
rather than calling this one — the two have quietly diverged into
separate implementations of the same calculation. This file is
exercised only by its own test (`tests/calculate-utils.spec.ts`); nothing
in the actual component tree imports it. Worth a deliberate decision —
either wire `useGridItemDrag` to call this validated version, or remove
this file — rather than leaving two implementations to maintain in sync
by accident.

## Parameters

### top

`number`

Top position (relative to parent) in pixels.

### left

`number`

Left position (relative to parent) in pixels.

### margin

\[`number`, `number`\]

Left Right margin.

### rowHeight

`number`

Height of each row in the layout.

### cols

`number`

Number of GridItem columns specified in the GridLayout (colNum property in the GridLayout component).

### innerH

`number`

GridItem height in GridLayout units.

### innerW

`number`

GridItem width in GridLayout units.

### maxRows

`number`

Number of rows (maxRows property in GridLayout) in the GridLayout.

### containerWidth

`number`

Width of the GridLayout container.

## Returns

[`ICalcXy`](/core/api/reference/interfaces/icalcxy/)

x and y in grid units.
