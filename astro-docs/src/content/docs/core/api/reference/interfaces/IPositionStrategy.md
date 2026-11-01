---
editUrl: false
title: "IPositionStrategy"
description: "Decides how an item is placed inside the grid: which inline style puts it at its pixel position, and which CSS class (if any) goes on the item alongside…"
---

Decides how an item is placed inside the grid: which inline style
puts it at its pixel position, and which CSS class (if any) goes on
the item alongside it. Pass one to `GridLayout`'s `positionStrategy`
prop to replace the built-in choice between CSS transforms and
`top`/`left`.

## Example

```ts
// Position with CSS `inset` instead of `top`/`left`.
const insetStrategy: IPositionStrategy = {
  type: 'inset',
  getStyle: ({ top, left, right, width, height, rtl }) => ({
    position: 'absolute',
    inset: rtl ? `${top}px ${right}px auto auto` : `${top}px auto auto ${left}px`,
    width: `${width}px`,
    height: `${height}px`,
  }),
};
```

## Properties

### className?

> `readonly` `optional` **className?**: `string`

A CSS class added to every item while this strategy is active.
The built-in transform strategy uses `css-transforms`, which the
stylesheet relies on to animate position changes.

***

### type

> `readonly` **type**: `string`

A short, descriptive name — informational only (e.g. for logging).

## Methods

### getStyle()

> **getStyle**(`position`): `Record`\<`string`, `string` \| `number`\>

Returns the inline style for an item at the given position. Keep
`width` and `height` as plain `NNpx` strings: the grid reads them
back from the style to report container resizes.

#### Parameters

##### position

[`IPositionStyleInput`](/core/api/reference/interfaces/ipositionstyleinput/)

#### Returns

`Record`\<`string`, `string` \| `number`\>
