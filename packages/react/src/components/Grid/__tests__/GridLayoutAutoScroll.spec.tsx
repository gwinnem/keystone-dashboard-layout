import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { TLayout } from '@keystone-dashboard-layout/core';

/**
 * `createNativeAutoScroll()` drives a real, `requestAnimationFrame`-based
 * scrolling engine — rather than trying to observe its actual scrolling
 * behavior (which the Vue package's own test suite doesn't attempt
 * either, per that composable's own doc comment: "no test in this suite
 * currently exercises autoScroll's own scrolling behavior directly"),
 * this mocks the factory itself so these tests can assert on *when*
 * `start`/`update`/`stop` get called — the actual behavioral contract
 * `useGridItemDrag.ts`/`useGridItemResize.ts` are responsible for, as
 * opposed to the scrolling engine's own internals (already covered by
 * `core`'s own test suite). `mockAutoScrollSpies` (not e.g.
 * `autoScrollSpies`) — the `mock` prefix is required by Vitest's own
 * hoisting-safety check for referencing an outer variable from inside a
 * `vi.mock` factory.
 */
const mockAutoScrollSpies = { start: vi.fn(), stop: vi.fn(), update: vi.fn() };

vi.mock(`@keystone-dashboard-layout/core`, async importOriginal => {
  const actual = await importOriginal<typeof import('@keystone-dashboard-layout/core')>();
  return {
    ...actual,
    createNativeAutoScroll: vi.fn(() => mockAutoScrollSpies),
  };
});

import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { dispatchDragEvent, dispatchResizeEvent, restoreOffsetWidth, stubOffsetWidth } from './test-helpers';

const basicLayout = (): TLayout => [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];

describe(`GridLayout autoScroll`, () => {
  beforeEach(() => {
    mockAutoScrollSpies.start.mockClear();
    mockAutoScrollSpies.update.mockClear();
    mockAutoScrollSpies.stop.mockClear();
  });

  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should not call start/update at all when autoScroll is off (the default) — stop() itself is still called defensively regardless, matching Vue's own unconditional "safe no-op if never started" pattern on dragend/resizeend`, () => {
    const { container } = render(
      <GridLayout layout={basicLayout()}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 50, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 50, clientY: 0 });

    expect(mockAutoScrollSpies.start).not.toHaveBeenCalled();
    expect(mockAutoScrollSpies.update).not.toHaveBeenCalled();
  });

  it(`Should start on dragstart, update on dragmove, and stop on dragend when enabled`, () => {
    const { container } = render(
      <GridLayout autoScroll layout={basicLayout()}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    expect(mockAutoScrollSpies.start).toHaveBeenCalledTimes(1);
    expect(mockAutoScrollSpies.stop).not.toHaveBeenCalled();

    dispatchDragEvent(target, `dragmove`, { clientX: 50, clientY: 0 });
    expect(mockAutoScrollSpies.update).toHaveBeenCalledTimes(1);

    dispatchDragEvent(target, `dragend`, { clientX: 50, clientY: 0 });
    expect(mockAutoScrollSpies.stop).toHaveBeenCalledTimes(1);
  });

  it(`Should start on resizestart, update on resizemove, and stop on resizeend when enabled`, () => {
    const { container } = render(
      <GridLayout autoScroll layout={basicLayout()}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchResizeEvent(target, `resizestart`);
    expect(mockAutoScrollSpies.start).toHaveBeenCalledTimes(1);

    dispatchResizeEvent(target, `resizemove`, { clientX: 50, clientY: 0 });
    expect(mockAutoScrollSpies.update).toHaveBeenCalledTimes(1);

    dispatchResizeEvent(target, `resizeend`, { clientX: 50, clientY: 0 });
    expect(mockAutoScrollSpies.stop).toHaveBeenCalledTimes(1);
  });

  it(`Should respect a per-item override that disables autoScroll even when the grid-wide default is on`, () => {
    const layout: TLayout = [{ autoScroll: false, h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const { container } = render(
      <GridLayout autoScroll layout={layout}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);

    expect(mockAutoScrollSpies.start).not.toHaveBeenCalled();
  });

  it(`Should respect a per-item override that enables autoScroll even when the grid-wide default is off`, () => {
    const layout: TLayout = [{ autoScroll: true, h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const { container } = render(
      <GridLayout layout={layout}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);

    expect(mockAutoScrollSpies.start).toHaveBeenCalledTimes(1);
  });
});
