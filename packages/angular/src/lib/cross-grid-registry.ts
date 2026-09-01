import { ICrossGridZone } from './cross-grid.interfaces';

/**
 * Every mounted `GridLayoutComponent` with `allowCrossGridDrag` enabled
 * registers itself here (see `setCrossGridDragEnabled` in
 * `grid-layout.component.ts`) and deregisters on destroy/toggle-off.
 * Deliberately a plain module-level `Set`, not an Angular DI-scoped
 * service — grids that drag items between each other are frequently
 * not in an Angular ancestor/descendant injector relationship at all
 * (siblings under different parents, or in entirely separate component
 * trees), so discovery can't rely on the component tree shape.
 *
 * A local copy of `keystone-dashboard-layout-core`'s own
 * `gridlayout/helpers/cross-grid-registry` — see `cross-grid.
 * interfaces.ts`'s own doc comment in this same directory for the full
 * rationale (a confirmed, long-standing `ng-packagr` limitation with
 * resolving a *linked* workspace dependency's secondary `exports`
 * subpaths during Ivy partial compilation), not a stylistic choice or
 * an oversight.
 */
const zones = new Set<ICrossGridZone>();

/** Registers a zone; returns a function that deregisters it (call from `ngOnDestroy`/when `allowCrossGridDrag` toggles off). */
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
 * `getRect()` on every call rather than cached, since scroll position
 * and layout can change between one drag and the next — or even
 * during one, if a page is scrollable.
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
