---
editUrl: false
title: "EErrorMessage"
description: "Error messages thrown by the validators and grid-math helpers in `src/core/**`. Grouped in one enum so every thrown error in the library has a single,…"
---

Error messages thrown by the validators and grid-math helpers in
`src/core/**`. Grouped in one enum so every thrown error in the library
has a single, greppable source of truth for its wording, and so
`expect(() => fn()).toThrowError(EErrorMessage.X)` in tests doesn't rely on
copy-pasted string literals matching by coincidence.

## Enumeration Members

### INVALID\_BOUNDS

> **INVALID\_BOUNDS**: `"Invalid parameter bounds passed"`

***

### INVALID\_BREAKPOINT

> **INVALID\_BREAKPOINT**: `"Invalid parameter breakpoint"`

***

### INVALID\_BREAKPOINT\_NOT\_FOUND

> **INVALID\_BREAKPOINT\_NOT\_FOUND**: `"Breakpoint not found"`

***

### INVALID\_COL\_OR\_ROW\_SIZE

> **INVALID\_COL\_OR\_ROW\_SIZE**: `"Invalid colOrRowSize parameter passed"`

***

### INVALID\_COLUMNS

> **INVALID\_COLUMNS**: `"Invalid parameter cols passed"`

***

### INVALID\_EMPTY\_LAYOUT

> **INVALID\_EMPTY\_LAYOUT**: `"Layout can not be empty"`

***

### INVALID\_GRID\_UNITS

> **INVALID\_GRID\_UNITS**: `"Invalid gridUnits parameter passed"`

***

### INVALID\_LAYOUT

> **INVALID\_LAYOUT**: `"Invalid parameter layout passed"`

***

### INVALID\_LAYOUT\_ITEM

> **INVALID\_LAYOUT\_ITEM**: `"Invalid parameter layoutItem passed"`

***

### INVALID\_LAYOUT\_ITEM\_ID

> **INVALID\_LAYOUT\_ITEM\_ID**: `"Invalid parameter layoutItem id passed"`

***

### INVALID\_LAYOUT\_VALIDATED

> **INVALID\_LAYOUT\_VALIDATED**: `"Layout is not valid"`

***

### INVALID\_MARGIN

> **INVALID\_MARGIN**: `"Invalid marginPx parameter passed"`

***

### INVALID\_MARGIN\_LEFT\_RIGHT

> **INVALID\_MARGIN\_LEFT\_RIGHT**: `"Invalid parameter marginLeftRight passed"`

***

### INVALID\_PARAM\_COLS

> **INVALID\_PARAM\_COLS**: `"Parameter cols must be greater than 0"`

***

### INVALID\_PARAM\_CONTAINER\_WIDTH

> **INVALID\_PARAM\_CONTAINER\_WIDTH**: `"Invalid parameter containerWidth passed"`

***

### INVALID\_PARAM\_INNER\_H

> **INVALID\_PARAM\_INNER\_H**: `"Parameter innerH must be greater than 0"`

***

### INVALID\_PARAM\_INNER\_W

> **INVALID\_PARAM\_INNER\_W**: `"Parameter innerW must be greater than 0"`

***

### INVALID\_PARAM\_MARGIN

> **INVALID\_PARAM\_MARGIN**: `"Parameter margin must be greater than 0"`

***

### INVALID\_PARAM\_MAX\_ROWS

> **INVALID\_PARAM\_MAX\_ROWS**: `"Parameter maxRows must be greater than 0"`

***

### INVALID\_PARAM\_ROW\_HEIGHT

> **INVALID\_PARAM\_ROW\_HEIGHT**: `"Parameter rowHeight must be greater than 0"`

***

### INVALID\_PARAMS

> **INVALID\_PARAMS**: `"Invalid parameter values passed"`

***

### INVALID\_WIDTH

> **INVALID\_WIDTH**: `"Width must be greater that 0"`
