import { Directive } from '@angular/core';

/**
 * Marker directive (Phase 22) a consumer applies to their own header
 * content — `<div kdlGridItemHeader>...</div>` — projected into
 * `GridItemComponent`'s own dedicated header region instead of its
 * plain, unnamed default content.
 *
 * Angular has no direct equivalent of Vue's own reactive `$slots.
 * header` check (`GridItem.vue`'s own `v-if="$slots.header"`,
 * confirmed via a direct source read — not assumed present, since an
 * earlier stale-cache read of that same file turned up no matches at
 * all for "header" before a fresh re-fetch corrected that): Angular's
 * own named `<ng-content select="...">` projection has no built-in way
 * to ask "was anything actually projected into this slot" from within
 * the component class itself. This directive exists purely so
 * `GridItemComponent` can detect its own presence via `@ContentChild`
 * — it has no behavior of its own beyond existing as a marker other
 * code can query for.
 */
@Directive({
  selector: `[kdlGridItemHeader]`,
  standalone: true,
})
export class GridItemHeaderDirective {}
