import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { dispatchResizeEvent, restoreOffsetWidth, stubOffsetWidth } from './test-helpers';

/**
 * `useGridItemResize.ts`'s own `handleResize` has its own minW/maxW/
 * minH/maxH clamp block (and hard floor-of-1 for both dimensions) — a
 * *separate* code path from `autoSize`'s own, identically-shaped clamp
 * block, which `GridItemAutoHeight.spec.tsx` already covers thoroughly.
 * Confirmed gap: nothing in this suite previously drove a real
 * resizestart/resizemove/resizeend gesture far enough to actually hit
 * any of `handleResize`'s own clamps — every other resize-related test
 * either isolates other concerns (RTL, preserveAspectRatio,
 * dragAllowFrom/resizeIgnoreFrom) or stays within already-legal
 * min/max bounds.
 *
 * colWidth = (1210 - 10*13)/12 = 90; rowHeight=100, margin=[10,10] —
 * matching every other spec file's own convention in this suite.
 */
const basicLayout = (): TLayout => [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];

describe(`GridItem resize minW/maxW/minH/maxH clamping (real gesture, not autoSize)`, () => {
  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should clamp up to minW when a right-edge resize would shrink below it`, () => {
    stubOffsetWidth(1210);
    const layout: TLayout = [{ h: 2, i: `0`, minW: 3, w: 2, x: 0, y: 0 }];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout colNum={12} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    const rightOnly = { bottom: false, left: false, right: true, top: false };
    dispatchResizeEvent(target, `resizestart`, { edges: rightOnly });
    // Dragging the right edge far left shrinks width well past 0 before clamping.
    dispatchResizeEvent(target, `resizemove`, { clientX: -170, clientY: 0, edges: rightOnly });
    dispatchResizeEvent(target, `resizeend`, { clientX: -170, clientY: 0, edges: rightOnly });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(lastCall.find(entry => entry.i === `0`)!.w).toBe(3);
  });

  it(`Should clamp down to maxW when a right-edge resize would grow past it`, () => {
    stubOffsetWidth(1210);
    const layout: TLayout = [{ h: 2, i: `0`, maxW: 3, w: 2, x: 0, y: 0 }];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout colNum={12} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    const rightOnly = { bottom: false, left: false, right: true, top: false };
    dispatchResizeEvent(target, `resizestart`, { edges: rightOnly });
    dispatchResizeEvent(target, `resizemove`, { clientX: 1000, clientY: 0, edges: rightOnly });
    dispatchResizeEvent(target, `resizeend`, { clientX: 1000, clientY: 0, edges: rightOnly });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(lastCall.find(entry => entry.i === `0`)!.w).toBe(3);
  });

  it(`Should clamp up to minH when a bottom-edge resize would shrink below it`, () => {
    stubOffsetWidth(1210);
    const layout: TLayout = [{ h: 2, i: `0`, minH: 3, w: 2, x: 0, y: 0 }];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout colNum={12} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    const bottomOnly = { bottom: true, left: false, right: false, top: false };
    dispatchResizeEvent(target, `resizestart`, { edges: bottomOnly });
    dispatchResizeEvent(target, `resizemove`, { clientX: 0, clientY: -190, edges: bottomOnly });
    dispatchResizeEvent(target, `resizeend`, { clientX: 0, clientY: -190, edges: bottomOnly });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(lastCall.find(entry => entry.i === `0`)!.h).toBe(3);
  });

  it(`Should clamp down to maxH when a bottom-edge resize would grow past it`, () => {
    stubOffsetWidth(1210);
    const layout: TLayout = [{ h: 2, i: `0`, maxH: 3, w: 2, x: 0, y: 0 }];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout colNum={12} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    const bottomOnly = { bottom: true, left: false, right: false, top: false };
    dispatchResizeEvent(target, `resizestart`, { edges: bottomOnly });
    dispatchResizeEvent(target, `resizemove`, { clientX: 0, clientY: 1000, edges: bottomOnly });
    dispatchResizeEvent(target, `resizeend`, { clientX: 0, clientY: 1000, edges: bottomOnly });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(lastCall.find(entry => entry.i === `0`)!.h).toBe(3);
  });

  it(`Should floor width to 1 (not minW) when minW itself is 0 and the resize would otherwise compute non-positive`, () => {
    stubOffsetWidth(1210);
    // minW:0 deliberately bypasses the minW clamp itself (0 isn't
    // "greater than" a computed value that's already <= 0) — isolating
    // this to the dedicated hard floor-of-1 check, the same distinction
    // GridItemAutoHeight.spec.tsx's own equivalent test already draws
    // for autoSize's separate clamp block.
    const layout: TLayout = [{ h: 2, i: `0`, minW: 0, w: 2, x: 0, y: 0 }];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout colNum={12} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    const rightOnly = { bottom: false, left: false, right: true, top: false };
    dispatchResizeEvent(target, `resizestart`, { edges: rightOnly });
    dispatchResizeEvent(target, `resizemove`, { clientX: -100000, clientY: 0, edges: rightOnly });
    dispatchResizeEvent(target, `resizeend`, { clientX: -100000, clientY: 0, edges: rightOnly });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(lastCall.find(entry => entry.i === `0`)!.w).toBe(1);
  });

  it(`Should floor height to 1 (not minH) when minH itself is 0 and the resize would otherwise compute non-positive`, () => {
    stubOffsetWidth(1210);
    const layout: TLayout = [{ h: 2, i: `0`, minH: 0, w: 2, x: 0, y: 0 }];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout colNum={12} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    const bottomOnly = { bottom: true, left: false, right: false, top: false };
    dispatchResizeEvent(target, `resizestart`, { edges: bottomOnly });
    dispatchResizeEvent(target, `resizemove`, { clientX: 0, clientY: -100000, edges: bottomOnly });
    dispatchResizeEvent(target, `resizeend`, { clientX: 0, clientY: -100000, edges: bottomOnly });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(lastCall.find(entry => entry.i === `0`)!.h).toBe(1);
  });

  it(`Should leave w/h unclamped when they resolve within minW/maxW/minH/maxH — sanity check the clamps don't fire unnecessarily`, () => {
    stubOffsetWidth(1210);
    const layout: TLayout = [{ h: 2, i: `0`, maxH: 10, maxW: 10, minH: 1, minW: 1, w: 2, x: 0, y: 0 }];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout colNum={12} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    const rightOnly = { bottom: false, left: false, right: true, top: false };
    dispatchResizeEvent(target, `resizestart`, { edges: rightOnly });
    dispatchResizeEvent(target, `resizemove`, { clientX: 90, clientY: 0, edges: rightOnly });
    dispatchResizeEvent(target, `resizeend`, { clientX: 90, clientY: 0, edges: rightOnly });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(lastCall.find(entry => entry.i === `0`)!.w).toBe(3);
  });
});
