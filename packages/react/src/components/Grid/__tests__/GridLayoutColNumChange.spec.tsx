import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { restoreOffsetWidth, stubOffsetWidth } from './test-helpers';

/**
 * A changed `colNum` re-fits the layout to the new column count (Vue does the same: its `colNum` watcher always runs the
 * responsive-layout pass). Before this, going from 12 to 6 columns left items at x: 6 and x: 8, drawn off the right edge, with
 * nothing reported through `onLayoutChange`.
 */
describe(`GridLayout colNum change`, () => {
  // Five items in a row, the last two past column 6 (this is the layout of the docs' "Basic drag & resize" example).
  const buildLayout = (): TLayout => [
    { h: 2, i: `a`, w: 2, x: 0, y: 0 },
    { h: 2, i: `b`, w: 2, x: 2, y: 0 },
    { h: 2, i: `c`, w: 2, x: 4, y: 0 },
    { h: 4, i: `d`, w: 2, x: 6, y: 0 },
    { h: 2, i: `e`, w: 2, x: 8, y: 0 },
  ];

  const ids = [`a`, `b`, `c`, `d`, `e`];

  const renderGrid = (colNum: number, layout: TLayout, onLayoutChange: (next: TLayout) => void, extra: Record<string, unknown> = {}): ReactElement => (
    <GridLayout colNum={colNum} layout={layout} margin={[10, 10]} onLayoutChange={onLayoutChange} rowHeight={60} {...extra}>
      {ids.map(id => (
        <GridItem i={id} key={id}>{id}</GridItem>
      ))}
    </GridLayout>
  );

  const overlaps = (a: TLayout[number], b: TLayout[number]): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  const expectFitsAndSeparate = (layout: TLayout, cols: number): void => {
    layout.forEach(item => {
      expect(item.x).toBeGreaterThanOrEqual(0);
      expect(item.x + item.w).toBeLessThanOrEqual(cols);
    });
    layout.forEach((item, index) => {
      layout.slice(index + 1).forEach(other => {
        expect(overlaps(item, other)).toBe(false);
      });
    });
  };

  const lastLayout = (handler: ReturnType<typeof vi.fn>): TLayout => handler.mock.calls.at(-1)![0] as TLayout;

  /** The rendered right edge of an item, in px, read from the inline style the grid positions it with. */
  const renderedRightEdge = (container: HTMLElement, id: string): number => {
    const element = container.querySelector(`[data-grid-item-id="${id}"]`) as HTMLElement;
    const left = Number(/translate3d\((-?[\d.]+)px/.exec(element.style.transform)![1]);
    return left + Number.parseFloat(element.style.width);
  };

  beforeEach(() => {
    stubOffsetWidth(1210);
  });

  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should pull items past the last column back inside when colNum shrinks, and report it`, () => {
    const handleChange = vi.fn();
    const { rerender } = render(renderGrid(12, buildLayout(), handleChange));
    handleChange.mockClear();

    rerender(renderGrid(6, buildLayout(), handleChange));

    expect(handleChange).toHaveBeenCalledTimes(1);
    expectFitsAndSeparate(lastLayout(handleChange), 6);
  });

  it(`Should keep every item inside the grid's pixel width after colNum shrinks`, () => {
    const { container, rerender } = render(renderGrid(12, buildLayout(), vi.fn()));

    rerender(renderGrid(6, buildLayout(), vi.fn()));

    ids.forEach(id => {
      expect(renderedRightEdge(container, id)).toBeLessThanOrEqual(1210);
    });
  });

  it(`Should leave the items that already fit where they are`, () => {
    const handleChange = vi.fn();
    const { rerender } = render(renderGrid(12, buildLayout(), handleChange));
    handleChange.mockClear();

    rerender(renderGrid(6, buildLayout(), handleChange));

    const result = lastLayout(handleChange);
    expect(result.find(item => item.i === `a`)).toMatchObject({ x: 0, y: 0 });
    expect(result.find(item => item.i === `b`)).toMatchObject({ x: 2, y: 0 });
    expect(result.find(item => item.i === `c`)).toMatchObject({ x: 4, y: 0 });
  });

  it(`Should not change the layout array the consumer passed in`, () => {
    const handleChange = vi.fn();
    const original = buildLayout();
    const { rerender } = render(renderGrid(12, original, handleChange));

    rerender(renderGrid(6, original, handleChange));

    expect(original).toEqual(buildLayout());
  });

  it(`Should report nothing when the new colNum needs no change to the layout`, () => {
    const handleChange = vi.fn();
    const compact: TLayout = [
      { h: 2, i: `a`, w: 2, x: 0, y: 0 },
      { h: 2, i: `b`, w: 2, x: 2, y: 0 },
    ];
    const { rerender } = render(
      <GridLayout colNum={12} layout={compact} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={60}>
        <GridItem i="a">a</GridItem>
        <GridItem i="b">b</GridItem>
      </GridLayout>,
    );
    handleChange.mockClear();

    rerender(
      <GridLayout colNum={6} layout={compact} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={60}>
        <GridItem i="a">a</GridItem>
        <GridItem i="b">b</GridItem>
      </GridLayout>,
    );

    expect(handleChange).not.toHaveBeenCalled();
  });

  it(`Should report nothing when colNum grows`, () => {
    const handleChange = vi.fn();
    const fitting = buildLayout().slice(0, 3);
    const render3 = (colNum: number): ReactElement => (
      <GridLayout colNum={colNum} layout={fitting} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={60}>
        {[`a`, `b`, `c`].map(id => (
          <GridItem i={id} key={id}>{id}</GridItem>
        ))}
      </GridLayout>
    );
    const { rerender } = render(render3(6));
    handleChange.mockClear();

    rerender(render3(12));

    expect(handleChange).not.toHaveBeenCalled();
  });

  it(`Should not re-fit anything on the initial mount`, () => {
    const handleChange = vi.fn();

    render(renderGrid(12, buildLayout(), handleChange));

    expect(handleChange).not.toHaveBeenCalled();
  });

  it(`Should fire onLayoutChange once, not again when the consumer passes the reported layout back`, () => {
    const handleChange = vi.fn();
    const { rerender } = render(renderGrid(12, buildLayout(), handleChange));
    handleChange.mockClear();

    rerender(renderGrid(6, buildLayout(), handleChange));
    // What a controlled consumer does next: store the reported layout and pass it back in.
    rerender(renderGrid(6, lastLayout(handleChange), handleChange));

    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it(`Should re-fit with responsive on too, inside the same breakpoint`, () => {
    const handleChange = vi.fn();
    // 1210px is the `lg` breakpoint (12 columns) with the default breakpoints, so colNum is the only thing that changes.
    const { rerender } = render(renderGrid(12, buildLayout(), handleChange, { responsive: true }));
    handleChange.mockClear();

    rerender(renderGrid(6, buildLayout(), handleChange, { responsive: true }));

    expect(handleChange).toHaveBeenCalled();
    expectFitsAndSeparate(lastLayout(handleChange), 6);
  });

  it(`Should compact the re-fitted layout, not just clamp it`, () => {
    const handleChange = vi.fn();
    const { rerender } = render(renderGrid(12, buildLayout(), handleChange));
    handleChange.mockClear();

    rerender(renderGrid(6, buildLayout(), handleChange));

    // d and e had nowhere to go on row 0 (a, b and c fill all six columns), so they sit below it, and nothing is left floating
    // with a free row above it.
    const result = lastLayout(handleChange);
    const d = result.find(item => item.i === `d`)!;
    const e = result.find(item => item.i === `e`)!;
    expect(d.y).toBeGreaterThanOrEqual(2);
    expect(e.y).toBeGreaterThanOrEqual(2);
    expect(Math.min(d.y, e.y)).toBe(2);
  });
});
