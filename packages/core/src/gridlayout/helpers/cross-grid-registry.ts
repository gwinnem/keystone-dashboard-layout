import { ICrossGridZone } from '../interfaces/cross-grid.interfaces';

/**
 * Every mounted `GridLayout` with `allowCrossGridDrag` enabled registers
 * itself here (see `GridLayout.vue`'s `onMounted`/`onBeforeUnmount`) and
 * deregisters on unmount. Deliberately a plain module-level `Set`, not
 * Vue reactive state or a `provide`/`inject` value — grids that drag
 * items between each other are frequently not in a Vue ancestor/descendant
 * relationship (siblings under different parents, or in entirely separate
 * component trees), so discovery can't rely on the component tree shape
 * at all. This is the same category of "shared, cross-instance state
 * that isn't naturally Vue state" as the `eventBus` `GridLayout` already
 * hands each `GridItem` — just needed across separate `GridLayout`
 * instances instead of within one.
 *
 * Bug fix: this file's own import of `ICrossGridZone` used to go through
 * the `@/core` alias (a historical carryover from when this code lived
 * inside the Vue package's own `src/core/`, where every internal
 * cross-reference used that same self-referential alias) — a raw
 * relative path escaping the project root, resolved only via each
 * consuming package's own `vite.config.ts`/`vitest.config.ts` alias
 * definition. That broke this file specifically once it needed to be
 * reachable from *outside* `@keystone-dashboard-layout/core`'s own
 * build (via the package's new `./gridlayout/helpers/cross-grid-registry`
 * subpath export, added for React's own `useCrossGridDrag.ts` — see
 * that file's own comment): Stryker's own sandboxed test runs relocate
 * a consuming package's `vitest.config.ts` one directory level deeper
 * than its real location, which breaks any alias computed as a
 * relative path escaping that config file's own directory, in a way no
 * amount of Stryker configuration can work around — the mismatch is
 * structural, not a settings problem. A plain relative import within
 * this package's own `src/` tree never crosses a package or sandbox
 * boundary at all, so it can't break this way regardless of where or
 * how this file ends up being loaded from.
 */
const zones = new Set<ICrossGridZone>();

/** Registers a zone; returns a function that deregisters it (call from `onBeforeUnmount`). */
export function registerCrossGridZone(zone: ICrossGridZone): () => void {
  zones.add(zone);
  return () => {
    zones.delete(zone);
  };
}

/**
 * Finds the first registered zone (other than `excludeLayoutId`, so a
 * grid never matches itself) whose current bounding rect contains the
 * given viewport coordinates. Rects are read fresh via each zone's own
 * `getRect()` on every call rather than cached, since scroll position and
 * layout can change between one drag and the next — or even during one,
 * if a page is scrollable.
 */
export function findCrossGridZoneAt(x: number, y: number, excludeLayoutId: string): ICrossGridZone | undefined {
  for(const zone of zones) {
    if(zone.layoutId === excludeLayoutId) {
      continue;
    }
    const rect = zone.getRect();
    if(!rect) {
      continue;
    }
    if(x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return zone;
    }
  }
  return undefined;
}
