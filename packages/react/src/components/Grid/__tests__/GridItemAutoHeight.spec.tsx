import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { restoreOffsetWidth, stubOffsetWidth } from './test-helpers';
import { triggerResizeObserverMockAt } from '../../../../tests/setup';

function stubRect(el: HTMLElement, height: number, width: number): void {
  el.getBoundingClientRect = () => (
    { bottom: 0, height, left: 0, right: 0, toJSON: () => ({}), top: 0, width, x: 0, y: 0 }
  );
}

describe(`GridItem autoHeight`, () => {
  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should not render the auto-height wrapper by default (autoHeight unset)`, () => {
    const { container } = render(
      <GridLayout layout={[{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    expect(container.querySelector(`.kdl-grid-item-auto-height-wrapper`)).toBeFalsy();
  });

  it(`Should render the auto-height wrapper when autoHeight is on`, () => {
    const layout: TLayout = [{ autoHeight: true, h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const { container, getByText } = render(
      <GridLayout layout={layout}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const wrapper = container.querySelector(`.kdl-grid-item-auto-height-wrapper`);
    expect(wrapper).toBeTruthy();
    expect(getByText(`Item 0`)).toBeTruthy();
  });

  it(`Should commit a resizeend-style height change when the wrapper's content grows, rounding height *up* (not to the nearest unit)`, () => {
    // colWidth = (1210 - 10*13)/12 = 90. rowHeight=100, margin=[10,10].
    stubOffsetWidth(1210);
    const layout: TLayout = [{ autoHeight: true, h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout colNum={12} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const wrapper = container.querySelector(`.kdl-grid-item-auto-height-wrapper`) as HTMLElement;
    // width:190 converts to w=round((190+10)/(90+10))=2 (unchanged).
    // height:250 converts to h=ceil((250+10)/(100+10))=ceil(2.36)=3 —
    // a plain Math.round would land on 2 (the normal resize path's own
    // rounding), so landing on 3 here confirms the height-specific
    // ceiling behavior is actually in effect, not just "something
    // changed".
    stubRect(wrapper, 250, 190);

    // Effect-mount order (child effects before parent effects) means
    // this item's own auto-height observer is very likely constructed
    // before GridLayout's own container-width observer — but triggering
    // both indices is what actually makes this test robust regardless
    // of that assumption: GridLayout's own container-observer callback
    // never calls onItemResize/onLayoutChange on its own, so triggering
    // it here (whichever index it turns out to be) is a safe no-op for
    // this assertion either way.
    triggerResizeObserverMockAt(0);
    triggerResizeObserverMockAt(1);

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    const resized = lastCall.find(entry => entry.i === `0`)!;
    expect(resized.h).toBe(3);
    expect(resized.w).toBe(2);
  });

  it(`Should not commit anything when the measured size converts to the same grid units the item already has`, () => {
    stubOffsetWidth(1210);
    const layout: TLayout = [{ autoHeight: true, h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout colNum={12} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const wrapper = container.querySelector(`.kdl-grid-item-auto-height-wrapper`) as HTMLElement;
    // height:210 -> ceil((210+10)/110) = ceil(2) = 2 (unchanged);
    // width:190 -> round(200/100) = 2 (unchanged).
    stubRect(wrapper, 210, 190);

    triggerResizeObserverMockAt(0);
    triggerResizeObserverMockAt(1);

    expect(handleChange).not.toHaveBeenCalled();
  });

  it(`Should clamp the auto-measured height/width to minH/maxH/minW/maxW`, () => {
    stubOffsetWidth(1210);
    const layout: TLayout = [{ autoHeight: true, h: 2, i: `0`, maxH: 2, w: 2, x: 0, y: 0 }];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout colNum={12} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const wrapper = container.querySelector(`.kdl-grid-item-auto-height-wrapper`) as HTMLElement;
    // Content measures tall enough to compute h=5 unclamped, but maxH=2
    // should cap it back down to 2 — with h already at 2, this means
    // no actual change should be committed at all.
    stubRect(wrapper, 600, 190);

    triggerResizeObserverMockAt(0);
    triggerResizeObserverMockAt(1);

    expect(handleChange).not.toHaveBeenCalled();
  });

  // The five tests below each isolate one of the *other* clamp branches
  // in `useGridItemResize.ts`'s own `autoSize` — the `maxH` test above
  // only ever exercises that one condition, leaving `minW`/`maxW`/`minH`
  // and the two hard-floor-of-1 checks entirely untested. Each measures
  // a size that would clamp to something *different* from the item's
  // current w/h (unlike the maxH test's own "clamps back to what it
  // already was" case), so the resulting commit's actual clamped value
  // can be asserted directly, confirming the clamp fired rather than
  // merely that a size changed at all.
  it(`Should clamp up to minW when the measured width converts to less than it`, () => {
    stubOffsetWidth(1210);
    const layout: TLayout = [{ autoHeight: true, h: 2, i: `0`, minW: 5, w: 2, x: 0, y: 0 }];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout colNum={12} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const wrapper = container.querySelector(`.kdl-grid-item-auto-height-wrapper`) as HTMLElement;
    // width:10 -> round((10+10)/100)=0, unclamped — minW=5 should raise
    // it back up to exactly 5, not merely "some positive value".
    // height:210 -> ceil(220/110)=2 (unchanged), isolating this to a
    // width-only clamp.
    stubRect(wrapper, 210, 10);

    triggerResizeObserverMockAt(0);
    triggerResizeObserverMockAt(1);

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    const resized = lastCall.find(entry => entry.i === `0`)!;
    expect(resized.w).toBe(5);
    expect(resized.h).toBe(2);
  });

  it(`Should clamp down to maxW when the measured width converts to more than it`, () => {
    stubOffsetWidth(1210);
    const layout: TLayout = [{ autoHeight: true, h: 2, i: `0`, maxW: 3, w: 2, x: 0, y: 0 }];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout colNum={12} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const wrapper = container.querySelector(`.kdl-grid-item-auto-height-wrapper`) as HTMLElement;
    // width:990 -> round(1000/100)=10, unclamped — maxW=3 should cap it
    // back down to exactly 3.
    stubRect(wrapper, 210, 990);

    triggerResizeObserverMockAt(0);
    triggerResizeObserverMockAt(1);

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    const resized = lastCall.find(entry => entry.i === `0`)!;
    expect(resized.w).toBe(3);
    expect(resized.h).toBe(2);
  });

  it(`Should clamp up to minH when the measured height converts to less than it`, () => {
    stubOffsetWidth(1210);
    const layout: TLayout = [{ autoHeight: true, h: 2, i: `0`, minH: 5, w: 2, x: 0, y: 0 }];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout colNum={12} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const wrapper = container.querySelector(`.kdl-grid-item-auto-height-wrapper`) as HTMLElement;
    // height:10 -> ceil(20/110)=1, unclamped — minH=5 should raise it
    // back up to exactly 5. width:190 -> round(200/100)=2 (unchanged),
    // isolating this to a height-only clamp.
    stubRect(wrapper, 10, 190);

    triggerResizeObserverMockAt(0);
    triggerResizeObserverMockAt(1);

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    const resized = lastCall.find(entry => entry.i === `0`)!;
    expect(resized.h).toBe(5);
    expect(resized.w).toBe(2);
  });

  it(`Should floor width to 1 when minW is explicitly set below 1 and the measurement would otherwise be non-positive`, () => {
    stubOffsetWidth(1210);
    // minW:0 deliberately bypasses the earlier minW clamp (0 isn't
    // "less than" a non-positive measured value the way the library's
    // own usual minW:1 default would be) — isolating this to the
    // dedicated hard floor-of-1 check, distinct from the minW clamp
    // covered by the test above.
    const layout: TLayout = [{ autoHeight: true, h: 2, i: `0`, minW: 0, w: 2, x: 0, y: 0 }];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout colNum={12} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const wrapper = container.querySelector(`.kdl-grid-item-auto-height-wrapper`) as HTMLElement;
    // A negative measured width converts to a negative/zero grid unit
    // before any clamp — the hard floor is what brings it up to 1, not
    // minW (0, which a negative value still fails to clear).
    stubRect(wrapper, 210, -500);

    triggerResizeObserverMockAt(0);
    triggerResizeObserverMockAt(1);

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    const resized = lastCall.find(entry => entry.i === `0`)!;
    expect(resized.w).toBe(1);
  });

  it(`Should floor height to 1 when minH is explicitly set below 1 and the measurement would otherwise be non-positive`, () => {
    stubOffsetWidth(1210);
    const layout: TLayout = [{ autoHeight: true, h: 2, i: `0`, minH: 0, w: 2, x: 0, y: 0 }];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout colNum={12} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const wrapper = container.querySelector(`.kdl-grid-item-auto-height-wrapper`) as HTMLElement;
    stubRect(wrapper, -500, 190);

    triggerResizeObserverMockAt(0);
    triggerResizeObserverMockAt(1);

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    const resized = lastCall.find(entry => entry.i === `0`)!;
    expect(resized.h).toBe(1);
  });
});
