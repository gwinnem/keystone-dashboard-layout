---
editUrl: false
title: "exportLayoutAsSvg"
description: "Renders a `TLayout` as a standalone SVG string — each item drawn as a rectangle at its actual pixel position/size (given the same…"
---

> **exportLayoutAsSvg**(`layout`, `options?`): `string`

Renders a `TLayout` as a standalone SVG string — each item drawn as a
rectangle at its actual pixel position/size (given the same
`colNum`/`rowHeight`/`margin`/`containerWidth` your real grid uses),
labeled with its own `i`. Never throws: an empty layout produces a
valid, empty SVG rather than an error, matching the
`serializeLayout`/`deserializeLayout` convention of not needing a
try/catch for the common cases.

The returned string is a complete `<svg>...</svg>` document — usable
directly (e.g. `innerHTML`'d into a container), downloaded as a
`.svg` file (`new Blob([svg], { type: 'image/svg+xml' })`), or
converted to a raster image via a `data:` URL drawn onto a `<canvas>`
if a PNG/JPEG is specifically needed instead.

## Parameters

### layout

[`TLayout`](/core/api/reference/types/tlayout/)

The layout to render.

### options?

[`IExportLayoutAsSvgOptions`](/core/api/reference/interfaces/iexportlayoutassvgoptions/) = `{}`

See `IExportLayoutAsSvgOptions`; every field optional, with defaults matching `GridLayout`'s own prop defaults.

## Returns

`string`

A complete SVG document as a string.
