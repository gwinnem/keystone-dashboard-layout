import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { restoreOffsetWidth, stubOffsetWidth, triggerResize } from './test-helpers';

describe(`GridLayout distributeEvenly`, () => {
  // A static item at x:0-2,y:0-1 (h:1) blocks vertical compaction from
  // pulling a redistributed item at x:0,y:1 back up to y:0 afterward —
  // without this, the distribute-evenly wrap-to-next-row effect would
  // be invisible by the time compaction (which always runs after
  // correctBounds) finishes, since nothing else would stop the item
  // rising straight back to y:0.
  const buildLayout = (): TLayout => [
    { h: 1, i: `static`, isStatic: true, w: 2, x: 0, y: 0 },
    { h: 2, i: `a`, w: 2, x: 8, y: 0 },
  ];

  it(`Should clamp an out-of-bounds item to the right edge on a breakpoint change by default (distributeEvenly off)`, () => {
    stubOffsetWidth(1210);
    const handleChange = vi.fn();
    render(
      <GridLayout layout={buildLayout()} onLayoutChange={handleChange} responsive>
        <GridItem i="static">Static</GridItem>
        <GridItem i="a">A</GridItem>
      </GridLayout>,
    );

    // Default breakpoints/cols: 'xs' applies from 480px width (its own
    // threshold) up to just under 768px ('sm'); at 400px, *below* that
    // 480px threshold, the applicable breakpoint is actually 'xxs'
    // (threshold 0, cols=2) instead — 500px lands squarely inside 'xs'
    // (cols=4) instead, avoiding that off-by-one-breakpoint mistake.
    // 'a' (x:8,w:2) no longer fits at cols=4 (8+2=10 > 4).
    triggerResize(500);

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    const a = lastCall.find(entry => entry.i === `a`)!;
    expect(a.x).toBe(2);
    expect(a.y).toBe(0);
    restoreOffsetWidth();
  });

  it(`Should wrap an out-of-bounds item to the next row instead of clamping, when distributeEvenly is on`, () => {
    stubOffsetWidth(1210);
    const handleChange = vi.fn();
    render(
      <GridLayout distributeEvenly layout={buildLayout()} onLayoutChange={handleChange} responsive>
        <GridItem i="static">Static</GridItem>
        <GridItem i="a">A</GridItem>
      </GridLayout>,
    );

    triggerResize(500);

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    const a = lastCall.find(entry => entry.i === `a`)!;
    expect(a.x).toBe(0);
    expect(a.y).toBe(1);
    restoreOffsetWidth();
  });
});
