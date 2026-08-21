import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { dispatchDragEvent, dispatchResizeEvent, restoreOffsetWidth, stubOffsetWidth } from './test-helpers';

/**
 * jsdom applies no real CSS transforms/layout at all, so there's no way
 * to render a genuinely scaled ancestor and observe the browser's own
 * rendering — the same limitation this suite's own RTL (Phase 7) tests
 * work around. Instead, these tests verify the arithmetic directly:
 * with a stubbed `containerWidth` (via `stubOffsetWidth`) producing a
 * known `colWidth`, a hand-computed raw pointer delta produces a
 * specific, hand-computed grid-unit result at `transformScale={1}`,
 * and a *different*, also hand-computed result at other scale values
 * — confirming the delta is actually divided by `transformScale`
 * before being applied, not just that *something* changed.
 */
describe(`GridLayout transformScale`, () => {
  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should not affect drag math at all when left at the default (1)`, () => {
    // colNum=20 (wide enough that clamping to the grid's own right edge
    // never interferes with the numbers below) at containerWidth=2010,
    // margin=[10,10] — colWidth = (2010 - 10*21)/20 = 90.
    stubOffsetWidth(2010);
    const layout: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout colNum={20} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    // dispatchDragEvent's own stub fixes the item's own dragstart
    // position at left:5 (via a stubbed getBoundingClientRect) — a raw
    // 1005px pointer delta from there lands at left:1010, which
    // converts to grid x = round((1010-10)/(90+10)) = 10.
    dispatchDragEvent(target, `dragmove`, { clientX: 1005, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 1005, clientY: 0 });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(lastCall.find(entry => entry.i === `0`)!.x).toBe(10);
  });

  it(`Should halve the effective drag distance at transformScale=2`, () => {
    stubOffsetWidth(2010);
    const layout: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout colNum={20} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100} transformScale={2}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    // Same raw 1005px pointer delta as the scale=1 test above, but
    // divided by transformScale=2 first: 1005/2=502.5, landing at
    // left:5+502.5=507.5 -> grid x = round((507.5-10)/100) = 5, half
    // of the scale=1 test's own result (10), not the same value.
    dispatchDragEvent(target, `dragmove`, { clientX: 1005, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 1005, clientY: 0 });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(lastCall.find(entry => entry.i === `0`)!.x).toBe(5);
  });

  it(`Should double the effective drag distance at transformScale=0.5`, () => {
    stubOffsetWidth(2010);
    const layout: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout colNum={20} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100} transformScale={0.5}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    // 1005/0.5 = 2010 -> left:5+2010=2015 -> grid x = round((2015-10)/100)
    // = round(20.05) = 20, clamped to colNum-w = 18 (the point of this
    // test is confirming the *pre-clamp* value roughly doubled, not
    // that clamping itself changed — 18 here is the grid's own bound,
    // reached specifically *because* the scale-compensated delta is
    // large enough to exceed it, unlike the scale=1/2 cases above).
    dispatchDragEvent(target, `dragmove`, { clientX: 1005, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 1005, clientY: 0 });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(lastCall.find(entry => entry.i === `0`)!.x).toBe(18);
  });

  it(`Should scale resize deltas the same way`, () => {
    stubOffsetWidth(2010);
    const layout: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout colNum={20} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100} transformScale={2}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    const seOnly = { bottom: true, left: false, right: true, top: false };
    dispatchResizeEvent(target, `resizestart`, { edges: seOnly });
    // resizestart's own width is 190px (calcPosition(0,0,2,2) with
    // colWidth=90,margin=10: round(90*2+10)=190). A raw 1005px delta,
    // divided by transformScale=2 first (502.5), lands at
    // 190+502.5=692.5 -> w = round((692.5+10)/100) = round(7.025) = 7.
    dispatchResizeEvent(target, `resizemove`, { clientX: 1005, clientY: 0, edges: seOnly });
    dispatchResizeEvent(target, `resizeend`, { clientX: 1005, clientY: 0, edges: seOnly });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(lastCall.find(entry => entry.i === `0`)!.w).toBe(7);
  });
});
