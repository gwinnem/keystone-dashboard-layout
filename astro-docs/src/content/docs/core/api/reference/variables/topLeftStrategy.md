---
editUrl: false
title: "topLeftStrategy"
description: "Positions items with absolute `top`/`left` (`top`/`right` when mirrored). Slower to animate than transformStrategy, but it does not create a containing…"
---

> `const` **topLeftStrategy**: [`IPositionStrategy`](/core/api/reference/interfaces/ipositionstrategy/)

Positions items with absolute `top`/`left` (`top`/`right` when
mirrored). Slower to animate than [transformStrategy](/core/api/reference/variables/transformstrategy/), but it
does not create a containing block for fixed-position descendants.
Behind `useCssTransforms: false`.
