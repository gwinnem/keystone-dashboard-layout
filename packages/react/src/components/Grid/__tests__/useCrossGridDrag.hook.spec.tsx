import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import { findCrossGridZoneAt } from 'keystone-dashboard-layout-core/gridlayout/helpers/cross-grid-registry';
import { useCrossGridDrag } from '../hooks/useCrossGridDrag';
import type { IUseCrossGridDragOptions } from '../hooks/useCrossGridDrag';

/**
 * Registration lifecycle of `useCrossGridDrag`: whether and under which id this grid is listed as a drop target in the shared
 * `keystone-dashboard-layout-core` registry. Asked directly through the registry's own lookup, which is the only thing another grid
 * ever sees. The registry is a module-level `Set`, so every hook is unmounted after each test or one test's grid would be found by the next.
 */

const BOX = { bottom: 100, height: 100, left: 0, right: 100, toJSON: () => ({}), top: 0, width: 100, x: 0, y: 0 };

const makeOptions = (overrides: Partial<IUseCrossGridDragOptions> = {}): IUseCrossGridDragOptions => ({
  allowCrossGridDrag: true,
  containerRef: { current: { getBoundingClientRect: () => BOX } as unknown as HTMLDivElement },
  disableExternalDrop: false,
  layoutId: `grid-a`,
  onAcceptExternalItem: vi.fn(),
  ...overrides,
});

/** The zone another grid (asking under `askingAs`) would find at a point inside this grid's own box. */
const zoneAsSeenBy = (askingAs: string) => findCrossGridZoneAt(50, 50, askingAs);

describe(`useCrossGridDrag registration`, () => {
  afterEach(() => {
    cleanup();
  });

  it(`Should list the grid as a drop target while allowCrossGridDrag is on`, () => {
    renderHook(() => useCrossGridDrag(makeOptions()));

    expect(zoneAsSeenBy(`some-other-grid`)?.layoutId).toBe(`grid-a`);
  });

  it(`Should not list the grid as a drop target at all while allowCrossGridDrag is off`, () => {
    renderHook(() => useCrossGridDrag(makeOptions({ allowCrossGridDrag: false })));

    expect(zoneAsSeenBy(`some-other-grid`)).toBeUndefined();
  });

  it(`Should start listing the grid once allowCrossGridDrag is switched on after mount`, () => {
    const { rerender } = renderHook((props: IUseCrossGridDragOptions) => useCrossGridDrag(props), {
      initialProps: makeOptions({ allowCrossGridDrag: false }),
    });
    expect(zoneAsSeenBy(`some-other-grid`)).toBeUndefined();

    rerender(makeOptions({ allowCrossGridDrag: true }));

    expect(zoneAsSeenBy(`some-other-grid`)?.layoutId).toBe(`grid-a`);
  });

  it(`Should stop listing the grid once allowCrossGridDrag is switched off after mount`, () => {
    const { rerender } = renderHook((props: IUseCrossGridDragOptions) => useCrossGridDrag(props), {
      initialProps: makeOptions({ allowCrossGridDrag: true }),
    });
    expect(zoneAsSeenBy(`some-other-grid`)?.layoutId).toBe(`grid-a`);

    rerender(makeOptions({ allowCrossGridDrag: false }));

    expect(zoneAsSeenBy(`some-other-grid`)).toBeUndefined();
  });

  it(`Should list the grid under its new layoutId once the id changes after mount`, () => {
    const { rerender } = renderHook((props: IUseCrossGridDragOptions) => useCrossGridDrag(props), {
      initialProps: makeOptions({ layoutId: `old-id` }),
    });

    rerender(makeOptions({ layoutId: `new-id` }));

    // Asked as the OLD id the grid is a different grid and is found, under its new name; asked as the NEW id it is the grid itself and is
    // excluded. A registration that kept its first id would answer the other way round.
    expect(zoneAsSeenBy(`old-id`)?.layoutId).toBe(`new-id`);
    expect(zoneAsSeenBy(`new-id`)).toBeUndefined();
  });

  it(`Should remove the grid from the registry when it unmounts`, () => {
    const { unmount } = renderHook(() => useCrossGridDrag(makeOptions()));
    expect(zoneAsSeenBy(`some-other-grid`)?.layoutId).toBe(`grid-a`);

    unmount();

    expect(zoneAsSeenBy(`some-other-grid`)).toBeUndefined();
  });
});
