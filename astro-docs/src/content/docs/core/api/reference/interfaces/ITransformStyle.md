---
editUrl: false
title: "ITransformStyle"
description: "Inline style object produced by `setTransform`/`setTransformRtl` (`core/helpers/utils.ts`) for positioning a `GridItem` via CSS transforms — the default,…"
---

Inline style object produced by `setTransform`/`setTransformRtl`
(`core/helpers/utils.ts`) for positioning a `GridItem` via CSS
transforms — the default, GPU-accelerated positioning mode
(`useCssTransforms: true`, the `GridLayout` default). Vendor-prefixed
variants are included because this predates near-universal unprefixed
`transform` support in the project's original target browsers.

## Properties

### height

> **height**: `string`

***

### MozTransform

> **MozTransform**: `string`

***

### msTransform

> **msTransform**: `string`

***

### OTransform

> **OTransform**: `string`

***

### position

> **position**: `"absolute"` \| `"relative"`

***

### transform

> **transform**: `string`

***

### WebkitTransform

> **WebkitTransform**: `string`

***

### width

> **width**: `string`
