---
editUrl: false
title: "ICompactor"
description: "Implement this interface to replace `GridLayout`'s own compaction algorithm entirely, via the `compactor` prop. `null`/`undefined` (the default) means…"
---

Implement this interface to replace `GridLayout`'s own compaction
algorithm entirely, via the `compactor` prop. `null`/`undefined`
(the default) means "use the built-in logic exactly as before this
prop existed" — this is a purely additive override, not a
replacement for `compactType`, which keeps working unchanged whether
or not `compactor` is set.

Called after every drag end, resize end, item add/remove, on mount,
on a breakpoint/column-count change, and by `compactNow()`/
`rearrange()` on demand — the same trigger points the built-in
compaction already ran at.

## Example

```ts
const shelfCompactor: ICompactor = {
  type: 'shelf',
  compact(layout, cols) {
    // Custom placement logic — must return a new array, never
    // mutate `layout` or its items in place.
    return shelfPack(layout, cols);
  },
};
```

## Properties

### type

> `readonly` **type**: `string`

A short, descriptive name for this strategy — informational only (e.g. for logging); never read by `GridLayout` itself.

## Methods

### compact()

> **compact**(`layout`, `cols`, `context`): [`TLayout`](/core/api/reference/types/tlayout/)

Compacts a layout, returning a new array. Must not mutate the
input `layout` or any of its items in place — `GridLayout` reads
the return value as the new layout state, not side effects on the
argument.

#### Parameters

##### layout

[`TLayout`](/core/api/reference/types/tlayout/)

##### cols

`number`

##### context

[`ICompactorContext`](/core/api/reference/interfaces/icompactorcontext/)

#### Returns

[`TLayout`](/core/api/reference/types/tlayout/)
