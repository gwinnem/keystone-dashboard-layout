import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ECompactType } from '@keystone-dashboard-layout/core';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { dispatchDragEvent, restoreOffsetWidth, stubOffsetWidth } from './test-helpers';

describe(`GridItem per-item resizeHandles override`, () => {
  it(`Should restrict this item's own resize handles independently of the grid-wide set`, () => {
    const layout: TLayout = [
      { h: 2, i: `0`, resizeHandles: [`se`], w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 4, y: 0 },
    ];
    const { container } = render(
      <GridLayout layout={layout}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    const items = container.querySelectorAll(`.kdl-grid-item`);
    expect(items[0].querySelectorAll(`.kdl-resize-hint`)).toHaveLength(1);
    expect(items[0].querySelector(`.kdl-resize-hint--se`)).toBeTruthy();
    // The other item is unaffected, still using the grid-wide default (all 8).
    expect(items[1].querySelectorAll(`.kdl-resize-hint`)).toHaveLength(8);
  });

  it(`Should treat an empty array as a deliberate "no handle-driven resize" value, distinct from isResizable: false`, () => {
    const layout: TLayout = [{ h: 2, i: `0`, resizeHandles: [], w: 2, x: 0, y: 0 }];
    const { container } = render(
      <GridLayout layout={layout}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    expect(container.querySelectorAll(`.kdl-resize-hint`)).toHaveLength(0);
    // Still resizable in principle (e.g. via keyboard) — isResizable
    // itself was never set to false, only the handle set was emptied.
    expect(item.classList.contains(`kdl-grid-item--static`)).toBe(false);
  });

  it(`Should defer to the grid-wide resizeHandles when the item doesn't set its own`, () => {
    const { container } = render(
      <GridLayout layout={[{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]} resizeHandles={[`n`, `s`]}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    expect(container.querySelectorAll(`.kdl-resize-hint`)).toHaveLength(2);
  });
});

describe(`GridItem per-item isMirrored override`, () => {
  it(`Should let an item opt out of the grid's own RTL mirroring`, () => {
    const layout: TLayout = [
      { h: 2, i: `0`, isMirrored: false, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 4, y: 0 },
    ];
    const { container } = render(
      <GridLayout isMirrored layout={layout}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    const items = container.querySelectorAll(`.kdl-grid-item`);
    expect(items[0].classList.contains(`kdl-grid-item--rtl`)).toBe(false);
    expect(items[1].classList.contains(`kdl-grid-item--rtl`)).toBe(true);
  });

  it(`Should have no effect when the grid itself isn't mirrored at all`, () => {
    const layout: TLayout = [{ h: 2, i: `0`, isMirrored: true, w: 2, x: 0, y: 0 }];
    const { container } = render(
      <GridLayout layout={layout}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    expect(container.querySelector(`.kdl-grid-item`)!.classList.contains(`kdl-grid-item--rtl`)).toBe(false);
  });

  it(`Should participate in RTL by default (item.isMirrored left unset)`, () => {
    const { container } = render(
      <GridLayout isMirrored layout={[{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    expect(container.querySelector(`.kdl-grid-item`)!.classList.contains(`kdl-grid-item--rtl`)).toBe(true);
  });
});

describe(`GridItem per-item isBounded override`, () => {
  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should clamp this item's own drag within the container even when the grid-wide default is off`, () => {
    // The X axis can't distinguish isBounded's own effect from colNum's
    // separate grid-unit clamp: colWidth is *derived* from
    // containerWidth/colNum together (calcColWidth), so the container's
    // own right edge and the colNum-th column boundary always coincide,
    // no matter how large colNum is made. The Y axis has no such
    // confound — maxRows defaults to Infinity (no grid-unit bound on y
    // at all unless explicitly set), while clientHeight is a genuinely
    // independent value, so stubbing it directly isolates isBounded's
    // own pixel-based clamp cleanly. compactType:NONE is required too —
    // with the default VERTICAL compaction and only one item in the
    // layout, every commit (including the dragstart-triggered one)
    // collapses this lone, uncontested item's own y straight back to 0
    // regardless of isBounded, making a y assertion meaningless
    // otherwise (the same lesson learned the hard way earlier in this
    // test suite's own history).
    stubOffsetWidth(300);
    Object.defineProperty(document.body, `clientHeight`, { configurable: true, value: 300 });
    const layout: TLayout = [{ h: 2, i: `0`, isBounded: true, w: 2, x: 0, y: 0 }];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 0, clientY: 5000 });
    dispatchDragEvent(target, `dragend`, { clientX: 0, clientY: 5000 });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    // Bounded to the (narrow) 300px-tall container — a small y, not the
    // huge, effectively-unbounded distance the raw drag itself covers.
    expect(lastCall.find(entry => entry.i === `0`)!.y).toBeLessThan(5);
  });

  it(`Should let this item opt out of the grid-wide isBounded default`, () => {
    stubOffsetWidth(300);
    Object.defineProperty(document.body, `clientHeight`, { configurable: true, value: 300 });
    const layout: TLayout = [{ h: 2, i: `0`, isBounded: false, w: 2, x: 0, y: 0 }];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout compactType={ECompactType.NONE} isBounded layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 0, clientY: 5000 });
    dispatchDragEvent(target, `dragend`, { clientX: 0, clientY: 5000 });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    // Unbounded for this item specifically — reaches a large y, since
    // `maxRows` defaults to Infinity (no grid-unit bound either), unlike
    // the grid-wide isBounded default the parent would otherwise apply.
    expect(lastCall.find(entry => entry.i === `0`)!.y).toBeGreaterThan(5);
  });
});
