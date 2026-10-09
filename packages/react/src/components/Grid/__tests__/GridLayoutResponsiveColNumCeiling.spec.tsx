import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ECompactType } from 'keystone-dashboard-layout-core';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { restoreOffsetWidth, stubOffsetWidth } from './test-helpers';

/**
 * With `responsive` on, `colNum` is a hard ceiling on the breakpoint's column count (`min(colNum, breakpoint columns)`),
 * as in the Vue and Angular packages. React used to replace it outright, so `colNum: 8` still got 12 columns at a wide
 * breakpoint (found by the React props e2e suite, `e2e/props-responsive.spec.ts`). It has to hold in the count the layout
 * is bounds-corrected against and the one reported to `onBreakpointChange`, not only in the rendered `colNum`.
 */

const BREAKPOINTS = { lg: 1000, md: 800, sm: 600, xl: 2500, xs: 400, xxl: 3000, xxs: 0 };
const COLS = { lg: 12, md: 10, sm: 6, xl: 12, xs: 4, xxl: 12, xxs: 2 };

/** Item "0" is 4 wide at x:8, so it only fits within 12 columns, not within 8. */
const wideLayout = (): TLayout => [{ h: 2, i: `0`, w: 4, x: 8, y: 0 }];

describe(`GridLayout responsive — colNum as a ceiling`, () => {
  afterEach(() => {
    restoreOffsetWidth();
  });

  const render8 = (colNum: number, onBreakpointChange: (breakpoint: string, cols: number) => void, onLayoutChange: (layout: TLayout) => void): void => {
    render(
      <GridLayout
        breakpoints={BREAKPOINTS}
        colNum={colNum}
        cols={COLS}
        compactType={ECompactType.NONE}
        layout={wideLayout()}
        onBreakpointChange={onBreakpointChange}
        onLayoutChange={onLayoutChange}
        responsive
        rowHeight={100}
      >
        <GridItem i="0">A</GridItem>
      </GridLayout>,
    );
  };

  it(`Should cap a wider breakpoint at colNum: the layout is bounds-corrected to it and the capped count is reported`, () => {
    stubOffsetWidth(1100); // "lg": 12 columns
    const onBreakpointChange = vi.fn();
    const onLayoutChange = vi.fn();

    render8(8, onBreakpointChange, onLayoutChange);

    expect(onBreakpointChange).toHaveBeenLastCalledWith(`lg`, 8);
    const settled = onLayoutChange.mock.calls.at(-1)![0] as TLayout;
    // 8 columns: a 4-wide item can sit no further right than x:4. Under 12 columns it would have stayed at x:8.
    expect(settled[0].x).toBe(4);
  });

  it(`Should not raise a narrower breakpoint to colNum`, () => {
    stubOffsetWidth(500); // "xs": 4 columns
    const onBreakpointChange = vi.fn();
    const onLayoutChange = vi.fn();

    render8(8, onBreakpointChange, onLayoutChange);

    expect(onBreakpointChange).toHaveBeenLastCalledWith(`xs`, 4);
  });

  it(`Should leave the breakpoint's own column count alone when colNum is not smaller`, () => {
    stubOffsetWidth(900); // "md": 10 columns
    const onBreakpointChange = vi.fn();

    render8(12, onBreakpointChange, vi.fn());

    expect(onBreakpointChange).toHaveBeenLastCalledWith(`md`, 10);
  });
});
