import { ILayoutItem } from '@keystone-dashboard-layout/core';

/**
 * A `GridLayoutComponent` instance's registration in the shared
 * cross-grid registry (`cross-grid-registry.ts`), created when
 * `allowCrossGridDrag` is true. Lets *other* `GridLayoutComponent`
 * instances discover this one without needing a common ancestor to
 * inject through — grids participating in cross-grid drag/drop are
 * frequently siblings-of-siblings or otherwise unrelated in the
 * component tree, so a module-level registry (a plain `Set`, not
 * Angular DI-scoped state) is what makes discovery possible at all.
 *
 * A local copy of `@keystone-dashboard-layout/core`'s own
 * `gridlayout/interfaces/cross-grid.interfaces` — not re-derived, kept
 * field-for-field identical to that file (confirmed via a direct
 * source read at the time of copying) — deliberately duplicated rather
 * than imported from that subpath. `ng-packagr`'s own Ivy
 * partial-compilation pass fails to resolve a *linked* (`workspace:*`)
 * dependency's secondary `exports` subpaths, even when that subpath
 * resolves correctly for a plain `tsc` invocation using the exact same
 * `tsconfig.lib.json` — confirmed via `--traceResolution` output showing
 * a full, correct resolution chain, then confirmed as a known,
 * long-standing `ng-packagr` limitation specific to linked/symlinked
 * dependencies (ng-packagr/ng-packagr#2378: "Linking a re-exported
 * secondary entry point fails when building a library" — the exact
 * same symptom, including that issue's own confirmation that the
 * identical import resolves fine once the dependency is actually
 * published to npm rather than linked). Vue and React's own Vite-based
 * builds have no equivalent limitation, so only this package needs the
 * workaround. If `core`'s own cross-grid types/registry logic ever
 * changes, this file needs updating to match — there is currently no
 * automated check enforcing that; a future improvement would be a
 * lint rule or test asserting these two files stay in sync.
 */
export interface ICrossGridZone {
  /** This grid's `layoutId` (either explicitly set via the input, or auto-generated). Used to identify the source/target grid in emitted event payloads. */
  layoutId: string;
  /** Live read of this grid's current `disableExternalDrop` input — a function, not a snapshotted boolean, so a later change to the input is respected without needing to re-register. */
  isExternalDropDisabled: () => boolean;
  /** Returns this grid's container element's current bounding rect, or `null` if it's not mounted/measurable. Read fresh on every check rather than cached, since layout/scroll can change between drags. */
  getRect: () => DOMRect | null;
  /** Called by the *source* grid when a drop is accepted — inserts `item` into this (the target) grid's `layout` and emits `crossGridItemDropped`. */
  acceptDrop: (item: ILayoutItem, sourceLayoutId: string) => void;
  /** Called by the *source* grid when this (the target) grid has `disableExternalDrop` set — emits `crossGridDropRejected` on the target; does not modify either grid's layout. */
  rejectDrop: (itemId: string | number, sourceLayoutId: string) => void;
}

/** Payload for `crossGridDropRejected`, emitted on the target grid. */
export interface ICrossGridDropRejected {
  itemId: string | number;
  sourceLayoutId: string;
}

/** Payload for `crossGridItemDropped`, emitted on the target grid. */
export interface ICrossGridItemDropped {
  item: ILayoutItem;
  sourceLayoutId: string;
}
