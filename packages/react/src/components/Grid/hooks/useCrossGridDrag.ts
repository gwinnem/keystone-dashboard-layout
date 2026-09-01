import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
// Bug fix: these two imports used to go through the raw `@/core` alias
// (`@/core/gridlayout/helpers/cross-grid-registry`/
// `@/core/gridlayout/interfaces/cross-grid.interfaces`) — a relative
// path escaping this package's own project root, resolved only via
// this package's own `vite.config.ts`/`vitest.config.ts` alias
// definition (`resolve(__dirname, '../core/src')`). That broke under
// Stryker's own sandboxed test runs specifically: Stryker relocates a
// copy of this package's own `vitest.config.ts` one directory level
// deeper than its real location (`.stryker-tmp/sandbox-XXXX/`), and a
// relative path computed from *that* file's own `__dirname` no longer
// points at `packages/core/src` at all — confirmed directly via
// Stryker's own trace-level log, which showed every spec file
// importing `GridLayout.tsx` (which imports this file) failing to even
// load, with `Failed to resolve import "@/core/gridlayout/helpers/
// cross-grid-registry" ... Does the file exist?`. No `stryker.conf.json`
// setting can fix this, since the mismatch is structural — any
// sandbox/relocation adds exactly this kind of extra directory
// nesting, permanently breaking a relative path that escapes the
// project root. `keystone-dashboard-layout-core` now exposes both of
// these via dedicated subpath exports (see its own `package.json`)
// specifically so this import resolves through `node_modules` — a real
// package name, stable regardless of where this file itself gets
// relocated to, sandboxed or otherwise.
import { findCrossGridZoneAt, registerCrossGridZone } from 'keystone-dashboard-layout-core/gridlayout/helpers/cross-grid-registry';
import type { ICrossGridDropRejected, ICrossGridItemDropped, ICrossGridZone } from 'keystone-dashboard-layout-core/gridlayout/interfaces/cross-grid.interfaces';
import type { ILayoutItem } from 'keystone-dashboard-layout-core';

export interface IUseCrossGridDragOptions {
  allowCrossGridDrag: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  disableExternalDrop: boolean;
  layoutId: string;
  onAcceptExternalItem: (item: ILayoutItem) => void;
  onCrossGridDropRejected?: (payload: ICrossGridDropRejected) => void;
  onCrossGridItemDropped?: (payload: ICrossGridItemDropped) => void;
}

export interface IUseCrossGridDragReturn {
  /**
   * Called from `GridLayout`'s own `handleItemDrag` at `dragend`, after
   * the item's own final grid position has already been resolved, but
   * *before* committing it as a normal in-grid move — the return value
   * decides which of the two happens. Returns `true` if another
   * registered grid accepted the drop (in which case the caller should
   * remove the item from its own layout and commit *that* instead of a
   * normal move — the item no longer belongs to this grid at all).
   * Returns `false` for every other case (`allowCrossGridDrag` is off,
   * no drag was in progress, no target zone found at the drop point, or
   * the target rejected it) — the caller should fall through to its
   * own normal end-of-drag handling exactly as if this function didn't
   * exist.
   */
  handleDragEnd: (id: string | number, clientX: number | undefined, clientY: number | undefined, currentItem: ILayoutItem) => boolean;
  /** Called from `handleItemDrag` at `dragstart` — records which item is being dragged, if cross-grid dragging is enabled. */
  handleDragStart: (id: string | number) => void;
}

/**
 * The React port of Vue's own `useCrossGridDrag.ts` composable —
 * `allowCrossGridDrag`: registers this grid into the shared
 * `keystone-dashboard-layout-core` cross-grid registry (a module-level
 * `Set`, not React/Vue state — grids that drag items between each
 * other are frequently not in any component-tree relationship at all,
 * siblings under different parents or in entirely separate trees, so
 * discovery can't rely on tree shape), tracks which item (if any) is
 * currently being dragged with cross-grid dropping possible, and makes
 * the accept/reject decision at `dragend`.
 *
 * Deliberately reads every option through a ref (`optionsRef`), not a
 * `useCallback`/`useEffect` dependency array on the returned functions
 * themselves — `handleDragStart`/`handleDragEnd` are handed to
 * `GridLayout`'s own `handleItemDrag`, itself a stable `useCallback`;
 * giving these two a stable identity too (rather than a new function
 * every render some option changed) avoids churning that dependency
 * chain on every unrelated render.
 */
export function useCrossGridDrag(options: IUseCrossGridDragOptions): IUseCrossGridDragReturn {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const draggedIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if(!options.allowCrossGridDrag) {
      return undefined;
    }
    const zone: ICrossGridZone = {
      acceptDrop: (item, sourceLayoutId) => {
        optionsRef.current.onAcceptExternalItem(item);
        optionsRef.current.onCrossGridItemDropped?.({ item, sourceLayoutId });
      },
      /* v8 ignore next -- the `?? null` fallback here protects against `containerRef.current` being null while this zone is *still registered* — not reachable in practice: this ref is the same element this effect itself runs on, populated for the entire span between mount and unmount, and unmounting is the only thing that clears it, which *also* runs this same effect's own cleanup (deregistering the zone) in the same commit. A registered zone with a null container ref isn't a real, reachable state under React's own lifecycle guarantees — kept as a defensive fallback for the type (`RefObject<HTMLDivElement | null>` genuinely allows null), not because it's expected to fire. */
      getRect: () => optionsRef.current.containerRef.current?.getBoundingClientRect() ?? null,
      isExternalDropDisabled: () => optionsRef.current.disableExternalDrop,
      layoutId: options.layoutId,
      rejectDrop: (itemId, sourceLayoutId) => {
        optionsRef.current.onCrossGridDropRejected?.({ itemId, sourceLayoutId });
      },
    };
    return registerCrossGridZone(zone);
  }, [options.allowCrossGridDrag, options.layoutId]);

  const handleDragStart = useCallback((id: string | number): void => {
    if(optionsRef.current.allowCrossGridDrag) {
      draggedIdRef.current = id;
    }
  }, []);

  const handleDragEnd = useCallback((
    id: string | number,
    clientX: number | undefined,
    clientY: number | undefined,
    currentItem: ILayoutItem,
  ): boolean => {
    if(!optionsRef.current.allowCrossGridDrag || draggedIdRef.current === null) {
      return false;
    }

    const targetZone = findCrossGridZoneAt(clientX ?? Number.NaN, clientY ?? Number.NaN, optionsRef.current.layoutId);
    draggedIdRef.current = null;

    if(!targetZone) {
      return false;
    }

    if(targetZone.isExternalDropDisabled()) {
      // Rejected — emitted on the *target* grid (targetZone.rejectDrop
      // does that), not this one. This grid's own item stays exactly
      // where it was, as if the cross-grid attempt never happened: the
      // caller falls through to its own normal end-of-drag handling.
      targetZone.rejectDrop(id, optionsRef.current.layoutId);
      return false;
    }

    // Accepted — hand the current item data to the target grid. No
    // moveElement()/compaction call for *this* grid's own layout here:
    // the caller is responsible for removing the item from its own
    // layout and committing that, since this hook has no access to
    // `workingLayoutRef` itself.
    targetZone.acceptDrop({ ...currentItem }, optionsRef.current.layoutId);
    return true;
  }, []);

  return { handleDragEnd, handleDragStart };
}
