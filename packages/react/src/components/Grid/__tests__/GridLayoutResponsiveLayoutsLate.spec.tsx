import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ECompactType } from 'keystone-dashboard-layout-core';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { restoreOffsetWidth, stubOffsetWidth } from './test-helpers';

/**
 * The per-breakpoint layout cache was seeded from `responsiveLayouts` once, at mount, so a layout supplied after mount was
 * silently ignored and one was generated instead (found by the React props e2e suite, `e2e/props-responsive.spec.ts`,
 * where the lab fills the prop in after the grid is up). It now re-seeds when the prop's *content* changes.
 */

const BREAKPOINTS = { lg: 1000, md: 800, sm: 600, xl: 2500, xs: 400, xxl: 3000, xxs: 0 };
const COLS = { lg: 12, md: 10, sm: 6, xl: 12, xs: 4, xxl: 12, xxs: 2 };

const baseLayout = (): TLayout => [
  { h: 2, i: `0`, w: 2, x: 0, y: 0 },
  { h: 2, i: `1`, w: 2, x: 2, y: 0 },
];

/** A layout for "md" that plain generation could never produce: item "0" parked at x:5, y:3, with compaction off. */
const suppliedMd = (): TLayout => [
  { h: 1, i: `0`, w: 3, x: 5, y: 3 },
  { h: 2, i: `1`, w: 2, x: 0, y: 0 },
];

const itemZero = (layout: TLayout): TLayout[number] => layout.find(entry => entry.i === `0`)!;

describe(`GridLayout — responsiveLayouts supplied after mount`, () => {
  afterEach(() => {
    restoreOffsetWidth();
  });

  const grid = (props: { responsive: boolean; responsiveLayouts: Record<string, TLayout> }, onLayoutChange: (layout: TLayout) => void): React.JSX.Element => (
    <GridLayout
      breakpoints={BREAKPOINTS}
      cols={COLS}
      compactType={ECompactType.NONE}
      layout={baseLayout()}
      onLayoutChange={onLayoutChange}
      responsive={props.responsive}
      responsiveLayouts={props.responsiveLayouts}
      rowHeight={100}
    >
      <GridItem i="0">A</GridItem>
      <GridItem i="1">B</GridItem>
    </GridLayout>
  );

  it(`Should use a layout supplied after mount, once responsive mode is on and the breakpoint is entered`, () => {
    stubOffsetWidth(900); // "md" under the breakpoints above
    const onLayoutChange = vi.fn();
    const { rerender } = render(grid({ responsive: false, responsiveLayouts: {} }, onLayoutChange));

    rerender(grid({ responsive: false, responsiveLayouts: { md: suppliedMd() } }, onLayoutChange));
    rerender(grid({ responsive: true, responsiveLayouts: { md: suppliedMd() } }, onLayoutChange));

    const settled = onLayoutChange.mock.calls.at(-1)![0] as TLayout;
    expect(itemZero(settled)).toMatchObject({ h: 1, w: 3, x: 5, y: 3 });
  });

  it(`Should not re-seed the cache for a new object whose content is identical`, () => {
    stubOffsetWidth(900);
    const onLayoutChange = vi.fn();
    const { rerender } = render(grid({ responsive: true, responsiveLayouts: { md: suppliedMd() } }, onLayoutChange));
    const callsAfterMount = onLayoutChange.mock.calls.length;

    // A fresh object with the same content, as an inline literal produces on every parent render: nothing to re-seed, so
    // nothing changes and the consumer is not told about a layout change.
    rerender(grid({ responsive: true, responsiveLayouts: { md: suppliedMd() } }, onLayoutChange));

    expect(onLayoutChange.mock.calls.length).toBe(callsAfterMount);
  });

  it(`Should use a layout supplied at mount as before`, () => {
    stubOffsetWidth(900);
    const onLayoutChange = vi.fn();
    render(grid({ responsive: true, responsiveLayouts: { md: suppliedMd() } }, onLayoutChange));

    const settled = onLayoutChange.mock.calls.at(-1)![0] as TLayout;
    expect(itemZero(settled)).toMatchObject({ h: 1, w: 3, x: 5, y: 3 });
  });
});
