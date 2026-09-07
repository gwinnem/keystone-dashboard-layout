---
editUrl: false
title: "moveElement"
description: "Move an element. Responsible for doing cascading movements of other elements."
---

> **moveElement**(`layout`, `l`, `x?`, `y?`, `isUserAction?`, `horizontalShift?`, `preventCollision?`): [`TLayout`](/core/api/reference/types/tlayout/)

Move an element. Responsible for doing cascading movements of other elements.

## Parameters

### layout

[`TLayout`](/core/api/reference/types/tlayout/)

Full layout to modify.

### l

[`ILayoutItem`](/core/api/reference/interfaces/ilayoutitem/)

element to move.

### x?

`number`

X position in grid units.

### y?

`number`

Y position in grid units.

### isUserAction?

`boolean`

If true, designates that the item we're moving is being dragged/resized by the user.

### horizontalShift?

`boolean`

If true, the GridItems will move left or right when the moving element is passing over a GridItem.

### preventCollision?

`boolean`

If true, the moving element will not be moving other elements to make space for a possible drop.

## Returns

[`TLayout`](/core/api/reference/types/tlayout/)

The updated layout.
