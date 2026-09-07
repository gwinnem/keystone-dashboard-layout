---
editUrl: false
title: "IExportLayoutAsSvgOptions"
description: "A grid-to-image export utility — nothing previously captured the rendered grid as a static image (a report, a thumbnail preview, a \"share my dashboard…"
---

A grid-to-image export utility — nothing previously captured the
rendered grid as a static image (a report, a thumbnail preview, a
"share my dashboard layout" feature). Deliberately built as a
dependency-free SVG generator directly from layout data, rather than
a `html2canvas`-style DOM-to-canvas wrapper: the latter would need a
new runtime dependency shipped in this library's own bundle (or left
for the consumer to add themselves, in which case this helper adds
little value over them calling it directly on the rendered grid's
root element), and — being a real DOM screenshot — would be more
faithful to arbitrary custom slot content (a chart, an image) than a
hand-built SVG can be. This trades that fidelity for zero bundle-size
cost and no rendering dependency: it draws each item as a labeled
rectangle from the layout data alone, not a snapshot of whatever's
actually rendered inside each `GridItem`. Good for a structural
thumbnail/overview of the layout itself; not a substitute for a real
screenshot of custom content.

See
[Export layout as SVG](https://github.com/gwinnem/vue-responsive-grid-layout/blob/main/vitepress-docs/examples/28-example.md).

## Properties

### backgroundColor?

> `optional` **backgroundColor?**: `string` \| `null`

Background color for the whole SVG. `null` (default) leaves it transparent.

***

### colNum?

> `optional` **colNum?**: `number`

Number of columns the layout uses. Default `12`, matching `GridLayout`'s own `colNum` default.

***

### containerWidth?

> `optional` **containerWidth?**: `number`

The pixel width to lay the grid out against — this needs to be
supplied explicitly, unlike `GridLayout` itself, which measures its
own container automatically via `ResizeObserver`; there's no DOM
element for this standalone function to measure. Pass the same
width your actual `GridLayout` is rendered at for a matching
result. Default `1200`.

***

### itemFill?

> `optional` **itemFill?**: `string`

Fill color for each item's rectangle. Default `'#eef2ff'`.

***

### itemStroke?

> `optional` **itemStroke?**: `string`

Stroke (border) color for each item's rectangle. Default `'#c7d2fe'`.

***

### labelColor?

> `optional` **labelColor?**: `string`

Text color for each item's id label. Default `'#3730a3'`.

***

### margin?

> `optional` **margin?**: \[`number`, `number`\]

`[horizontal, vertical]` spacing between items, in pixels. Default `[10, 10]`, matching `GridLayout`'s own `margin` default.

***

### rowHeight?

> `optional` **rowHeight?**: `number`

Height of one grid row, in pixels. Default `150`, matching `GridLayout`'s own `rowHeight` default.
