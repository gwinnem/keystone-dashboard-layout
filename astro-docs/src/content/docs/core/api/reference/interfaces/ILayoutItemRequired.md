---
editUrl: false
title: "ILayoutItemRequired"
description: "`vue-ts-responsive-grid-layout/core` — the pure grid-layout math this library's own Vue and React components are both built on, with zero framework…"
---

`vue-ts-responsive-grid-layout/core` — the pure grid-layout math this
library's own Vue and React components are both built on, with zero
framework dependency for the vast majority of it (every function
takes plain data in, returns plain data out, no live DOM/browser
requirement). Usable standalone too: validating a layout
server-side, computing collisions/compaction for a batch job, or
building an entirely different UI layer on top of the same
algorithms, without installing Vue, React, or mounting any component
at all.

Every export here is re-exported from every other file that already
imported it before this entry point existed — this file adds a new
*public* door into code that was already internally shared and
already framework-free, not new logic. See `docs/REFACTORING.md` for
the import-path audit that confirmed nothing in this dependency
graph reaches into `@/components`'s own Vue component code (every
import of a layout/breakpoint type goes directly to its defining
file, e.g. `@/components/Grid/layout-definition`, never through the
main barrel) — the thing that would otherwise silently pull the
entire component tree into what's supposed to be a framework-free
bundle.

One deliberate exception to the "no live browser needed" promise
above: `createNativeDraggable`/`createNativeResizable`/
`createNativeAutoScroll` (from `native-interaction.ts`) need a real
DOM to do anything at all — kept here rather than duplicated into
each framework package specifically because they're genuinely
framework-agnostic (built on the plain Pointer Events API, no
Vue/React-specific code whatsoever), so both packages share this one
implementation. Still excludes what's tied to a *component's own*
lifecycle rather than being reusable as-is: DOM measurement
(`DOM.ts`), and the cross-grid registry (a runtime coordination
singleton tied to component mount/unmount, not a pure calculation).

## Extended by

- [`ILayoutItem`](/core/api/reference/interfaces/ilayoutitem/)

## Properties

### h

> **h**: `number`

Height, in grid row units.

***

### i

> **i**: `string` \| `number`

Unique identifier, matched against a `GridItem`'s `i` prop.

***

### w

> **w**: `number`

Width, in grid column units.

***

### x

> **x**: `number`

Horizontal position, in grid column units.

***

### y

> **y**: `number`

Vertical position, in grid row units.
