import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import type { IGridLayoutHandle } from '../grid-layout-handle.interface';

describe(`GridLayout scrollToItem/focusItem`, () => {
  const buildLayout = (): TLayout => [
    { h: 2, i: `a`, w: 2, x: 0, y: 0 },
    { h: 2, i: `b`, w: 2, x: 2, y: 0 },
  ];

  it(`Should scroll the matching item's own element into view`, async () => {
    const ref = createRef<IGridLayoutHandle>();
    const { container } = render(
      <GridLayout layout={buildLayout()} ref={ref}>
        <GridItem i="a">A</GridItem>
        <GridItem i="b">B</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="b"]`) as HTMLElement;
    const scrollIntoViewSpy = vi.fn();
    target.scrollIntoView = scrollIntoViewSpy;

    await ref.current!.scrollToItem(`b`);

    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: `smooth`, block: `nearest`, inline: `nearest` });
  });

  it(`Should be a no-op (not throw) when scrollToItem is called with an id that doesn't match any rendered item`, async () => {
    const ref = createRef<IGridLayoutHandle>();
    render(
      <GridLayout layout={buildLayout()} ref={ref}>
        <GridItem i="a">A</GridItem>
        <GridItem i="b">B</GridItem>
      </GridLayout>,
    );

    await expect(ref.current!.scrollToItem(`does-not-exist`)).resolves.toBeUndefined();
  });

  it(`Should move keyboard focus to the matching item's own element`, async () => {
    const ref = createRef<IGridLayoutHandle>();
    const { container } = render(
      <GridLayout layout={buildLayout()} ref={ref}>
        <GridItem i="a">A</GridItem>
        <GridItem i="b">B</GridItem>
      </GridLayout>,
    );

    await ref.current!.focusItem(`b`);

    const target = container.querySelector(`[data-grid-item-id="b"]`) as HTMLElement;
    expect(document.activeElement).toBe(target);
  });

  it(`Should be a no-op (not throw) when focusItem is called with an id that doesn't match any rendered item`, async () => {
    const ref = createRef<IGridLayoutHandle>();
    render(
      <GridLayout layout={buildLayout()} ref={ref}>
        <GridItem i="a">A</GridItem>
        <GridItem i="b">B</GridItem>
      </GridLayout>,
    );

    await expect(ref.current!.focusItem(`does-not-exist`)).resolves.toBeUndefined();
  });

  it(`Should scope the lookup to this grid's own container (not a global document query)`, async () => {
    // Two GridLayout instances, each with an item sharing the same id
    // ('shared') — scrollToItem on the *second* grid's own ref should
    // only ever touch that grid's own element, never the first's.
    const refA = createRef<IGridLayoutHandle>();
    const refB = createRef<IGridLayoutHandle>();
    render(
      <>
        <GridLayout layout={[{ h: 2, i: `shared`, w: 2, x: 0, y: 0 }]} ref={refA}>
          <GridItem i="shared">Grid A's shared item</GridItem>
        </GridLayout>
        <GridLayout layout={[{ h: 2, i: `shared`, w: 2, x: 0, y: 0 }]} ref={refB}>
          <GridItem i="shared">Grid B's shared item</GridItem>
        </GridLayout>
      </>,
    );

    const allSharedElements = document.querySelectorAll(`[data-grid-item-id="shared"]`);
    expect(allSharedElements.length).toBe(2);
    const [elementInA, elementInB] = Array.from(allSharedElements) as HTMLElement[];
    const scrollSpyA = vi.fn();
    const scrollSpyB = vi.fn();
    elementInA.scrollIntoView = scrollSpyA;
    elementInB.scrollIntoView = scrollSpyB;

    await refB.current!.scrollToItem(`shared`);

    expect(scrollSpyB).toHaveBeenCalledTimes(1);
    expect(scrollSpyA).not.toHaveBeenCalled();
  });
});
