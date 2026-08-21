import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { dispatchDragEvent, restoreOffsetWidth, stubOffsetWidth } from './test-helpers';

describe(`GridLayout horizontalShift`, () => {
  // A (w:2,x:0) and B (w:2,x:2) start adjacent, touching but not
  // overlapping — dragging A right by exactly 2 grid units lands it
  // squarely on B's own original spot (a full-overlap collision), and
  // vacates A's own starting spot entirely. h:1 (not 2) on both is
  // deliberate: it keeps whichever direction B ends up pushed in from
  // re-colliding with A's own new position in either scenario below —
  // a *second*, cascading collision would exercise a separate,
  // pre-existing argument-order bug in `moveElementAwayFromCollision`'s
  // own recursive call (unrelated to `horizontalShift` being wired up
  // correctly, and out of scope for this phase — flagged separately in
  // the docs), so this geometry is chosen specifically to stay clear
  // of it and isolate the one thing this test actually needs to check.
  const buildLayout = (): TLayout => [
    { h: 1, i: `a`, w: 2, x: 0, y: 0 },
    { h: 1, i: `b`, w: 2, x: 2, y: 0 },
  ];

  it(`Should push the collided-with item straight down by default (horizontalShift off)`, () => {
    stubOffsetWidth(1210);
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout colNum={12} layout={buildLayout()} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="a">A</GridItem>
        <GridItem i="b">B</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    // colWidth = (1210-130)/12 = 90. Landing at grid x=2 needs
    // left ≈ 210 (round((210-10)/100)=2); dragstart's own stubbed left
    // is 5, so a clientX delta of 205 lands there.
    dispatchDragEvent(target, `dragmove`, { clientX: 205, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 205, clientY: 0 });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    const b = lastCall.find(entry => entry.i === `b`)!;
    expect(b.x).toBe(2);
    expect(b.y).toBe(1);
    restoreOffsetWidth();
  });

  it(`Should push the collided-with item horizontally instead, when horizontalShift is on`, () => {
    stubOffsetWidth(1210);
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout colNum={12} horizontalShift layout={buildLayout()} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="a">A</GridItem>
        <GridItem i="b">B</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="a"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 205, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 205, clientY: 0 });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    const b = lastCall.find(entry => entry.i === `b`)!;
    // Pushed left by A's own width (2), into A's now-vacated spot,
    // staying on the same row — distinctly different from the
    // vertical-push default above.
    expect(b.x).toBe(0);
    expect(b.y).toBe(0);
    restoreOffsetWidth();
  });
});
