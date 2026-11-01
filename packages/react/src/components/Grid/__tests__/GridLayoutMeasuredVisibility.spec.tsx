import { afterEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import type { ReactElement } from 'react';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { restoreOffsetWidth, stubOffsetWidth, triggerResize } from './test-helpers';

/**
 * Before its container is measured, the grid has only a seed width of 100px to lay items out at, which makes every item of a
 * 12-column grid about 5px wide. On the docs site that squashed grid was the server-rendered markup, and stayed on screen until
 * the island hydrated and measured. The grid is now `visibility: hidden` until the first real measurement, and that measurement
 * happens in a layout effect (before the first paint) rather than a passive one.
 */
describe(`GridLayout hidden until measured`, () => {
  const layout: TLayout = [
    { h: 2, i: `a`, w: 2, x: 0, y: 0 },
    { h: 2, i: `b`, w: 2, x: 2, y: 0 },
  ];

  const grid = (): ReactElement => (
    <GridLayout colNum={12} layout={layout} margin={[10, 10]} rowHeight={60}>
      <GridItem i="a">a</GridItem>
      <GridItem i="b">b</GridItem>
    </GridLayout>
  );

  const root = (container: HTMLElement): HTMLElement => container.querySelector(`.kdl-grid-layout`) as HTMLElement;

  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should hide the grid while the container has not been measured (jsdom reports a width of 0)`, () => {
    const { container } = render(grid());

    expect(root(container).style.visibility).toBe(`hidden`);
  });

  it(`Should not hide the grid once the container has a width, in the very first render`, () => {
    stubOffsetWidth(1210);

    const { container } = render(grid());

    expect(root(container).style.visibility).toBe(``);
  });

  it(`Should lay the items out at the measured width in that first render, not at the 100px seed`, () => {
    stubOffsetWidth(1210);

    const { container } = render(grid());

    // (1210 - 13 * 10) / 12 = 90 per column, so a two-column item is 2 * 90 + 10 = 190px wide.
    const item = container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement;
    expect(Number.parseFloat(item.style.width)).toBe(190);
  });

  it(`Should show the grid when a container that had no width gets one`, () => {
    const { container } = render(grid());
    expect(root(container).style.visibility).toBe(`hidden`);

    triggerResize(800);

    expect(root(container).style.visibility).toBe(``);
  });

  it(`Should keep the grid shown when the container later reports a width of 0 again`, () => {
    stubOffsetWidth(1210);
    const { container } = render(grid());

    triggerResize(0);

    expect(root(container).style.visibility).toBe(``);
  });

  it(`Should keep the grid's other inline styles while it is hidden`, () => {
    const { container } = render(grid());

    expect(root(container).style.position).toBe(`relative`);
  });

  it(`Should render the server markup hidden, since nothing can be measured on the server`, () => {
    const html = renderToString(grid());

    expect(html).toMatch(/class="kdl-grid-layout[^"]*"[^>]*style="[^"]*visibility:hidden/);
  });
});
