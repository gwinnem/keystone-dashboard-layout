---
editUrl: false
title: "moveElementAwayFromCollision"
description: "This is where the magic needs to happen - given a collision, move an element away from the collision. We attempt to move it up if there's room, otherwise…"
---

> **moveElementAwayFromCollision**(`layout`, `collidesWith`, `itemToMove`, `isUserAction?`, `movingDirection?`, `horizontalShift?`): [`TLayout`](/core/api/reference/types/tlayout/)

This is where the magic needs to happen - given a collision, move an element away from the collision.
We attempt to move it up if there's room, otherwise it goes below.

## Parameters

### layout

[`TLayout`](/core/api/reference/types/tlayout/)

Full layout to modify.

### collidesWith

[`ILayoutItem`](/core/api/reference/interfaces/ilayoutitem/)

Layout item we're colliding with.

### itemToMove

[`ILayoutItem`](/core/api/reference/interfaces/ilayoutitem/)

Layout item we're moving.

### isUserAction?

`boolean`

If true, designates that the item we're moving is being dragged/resized by the user.

### movingDirection?

`"DOWN"` \| `"LEFT"` \| `"RIGHT"` \| `"UP"`

### horizontalShift?

`boolean`

## Returns

[`TLayout`](/core/api/reference/types/tlayout/)

The modified layout.
