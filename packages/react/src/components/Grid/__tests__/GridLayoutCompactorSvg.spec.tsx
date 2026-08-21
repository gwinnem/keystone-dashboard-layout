import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { ICompactor, TLayout } from '@keystone-dashboard-layout/core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import type { IGridLayoutHandle } from '../grid-layout-handle.interface';
import { dispatchDragEvent, restoreOffsetWidth, stubOffsetWidth } from './test-helpers';

describe(`GridLayout compactor`, () => {
  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should use a custom compactor instead of the built-in strategy when provided`, () => {
    stubOffsetWidth(1200);
    const handleChange = vi.fn();
    // A deliberately unrealistic strategy (moves everything to x:0) so
    // there's no ambiguity about whether it — rather than the default
    // VERTICAL compactor — actually ran.
    const shelfCompactor: ICompactor = {
      compact: (layout: TLayout): TLayout => layout.map(item => ({ ...item, x: 0 })),
      type: `shelf`,
    };
    const layout: TLayout = [{ h: 2, i: `0`, w: 2, x: 5, y: 0 }];
    const { container } = render(
      <GridLayout compactor={shelfCompactor} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 0, clientY: 200 });
    dispatchDragEvent(target, `dragend`, { clientX: 0, clientY: 200 });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    // The custom compactor forces x:0 on every commit, regardless of
    // where the drag itself tried to move the item.
    expect(lastCall.find(entry => entry.i === `0`)!.x).toBe(0);
  });
});

describe(`GridLayout exportLayoutAsSvg`, () => {
  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should render the current layout as an SVG string, pre-filled with this grid's own dimensions`, () => {
    // stubOffsetWidth is required here even though this test doesn't
    // drag/resize anything — exportLayoutAsSvg() reads the *measured*
    // containerWidth, and the unstubbed jsdom default (falling back to
    // GridLayout's own 100px seed value) combined with the default
    // colNum:12/margin:10 produces a *negative* colWidth
    // ((100 - 13*10)/12), which core's own validation correctly rejects.
    stubOffsetWidth(1200);
    const ref = createRef<IGridLayoutHandle>();
    const layout: TLayout = [{ h: 2, i: `widget-a`, w: 2, x: 0, y: 0 }];
    render(
      <GridLayout layout={layout} ref={ref}>
        <GridItem i="widget-a">Widget A</GridItem>
      </GridLayout>,
    );

    const svg = ref.current!.exportLayoutAsSvg();

    expect(svg).toContain(`<svg`);
    expect(svg).toContain(`widget-a`);
  });

  it(`Should let an explicit option override the pre-filled grid dimension`, () => {
    stubOffsetWidth(1200);
    const ref = createRef<IGridLayoutHandle>();
    const layout: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    render(
      <GridLayout colNum={12} layout={layout} ref={ref}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const svg = ref.current!.exportLayoutAsSvg({ containerWidth: 2000 });

    expect(svg).toContain(`width="2000"`);
  });
});
