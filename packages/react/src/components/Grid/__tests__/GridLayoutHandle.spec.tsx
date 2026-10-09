import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { ECompactType } from 'keystone-dashboard-layout-core';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import type { IGridLayoutHandle } from '../grid-layout-handle.interface';

/**
 * Runs `fn` inside `act()` and hands back what it returned. Every method on the imperative handle updates the grid's state
 * from outside React's own event system, so calling one bare makes React warn that the update was not wrapped in `act(...)`.
 */
function callInAct<T>(fn: () => T): T {
  let result: T | undefined;
  act(() => {
    result = fn();
  });
  return result as T;
}

describe(`GridLayout imperative handle`, () => {
  describe(`compactNow / rearrange`, () => {
    it(`Should compact a layout with a gap when compactNow is called`, () => {
      const handleChange = vi.fn();
      const ref = createRef<IGridLayoutHandle>();
      const layout: TLayout = [
        { h: 2, i: `0`, w: 2, x: 0, y: 0 },
        { h: 2, i: `1`, w: 2, x: 0, y: 5 },
      ];
      render(
        <GridLayout compactType={ECompactType.VERTICAL} layout={layout} onLayoutChange={handleChange} ref={ref}>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      callInAct(() => ref.current!.compactNow());

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      expect(lastCall.find(entry => entry.i === `1`)!.y).toBe(2);
    });

    it(`Should still tidy up when compactType is NONE — a manual "tidy up" always tidies up, regardless of the ambient auto-compact setting`, () => {
      const handleChange = vi.fn();
      const ref = createRef<IGridLayoutHandle>();
      const layout: TLayout = [
        { h: 2, i: `0`, w: 2, x: 0, y: 0 },
        { h: 2, i: `1`, w: 2, x: 0, y: 5 },
      ];
      render(
        <GridLayout compactType={ECompactType.NONE} layout={layout} onLayoutChange={handleChange} ref={ref}>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      callInAct(() => ref.current!.compactNow());

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      expect(lastCall.find(entry => entry.i === `1`)!.y).toBe(2);
    });

    it(`rearrange() should be an alias for compactNow()`, () => {
      const handleChange = vi.fn();
      const ref = createRef<IGridLayoutHandle>();
      const layout: TLayout = [
        { h: 2, i: `0`, w: 2, x: 0, y: 0 },
        { h: 2, i: `1`, w: 2, x: 0, y: 5 },
      ];
      render(
        <GridLayout layout={layout} onLayoutChange={handleChange} ref={ref}>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      callInAct(() => ref.current!.rearrange());

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      expect(lastCall.find(entry => entry.i === `1`)!.y).toBe(2);
    });
  });

  describe(`duplicateItem`, () => {
    it(`Should clone the item with a new, collision-safe id, placed below the source`, () => {
      const handleChange = vi.fn();
      const ref = createRef<IGridLayoutHandle>();
      const layout: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];
      render(
        <GridLayout compactType={ECompactType.NONE} layout={layout} onLayoutChange={handleChange} ref={ref}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const newId = callInAct(() => ref.current!.duplicateItem(`0`));

      expect(newId).toBe(`0-copy`);
      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      const copy = lastCall.find(entry => entry.i === `0-copy`);
      expect(copy).toBeTruthy();
      expect(copy!.w).toBe(2);
      expect(copy!.h).toBe(2);
      expect(copy!.x).toBe(0);
    });

    it(`Should not carry over the source item's own moved flag`, () => {
      const handleChange = vi.fn();
      const ref = createRef<IGridLayoutHandle>();
      const layout: TLayout = [{ h: 2, i: `0`, moved: true, w: 2, x: 0, y: 0 }];
      render(
        <GridLayout compactType={ECompactType.NONE} layout={layout} onLayoutChange={handleChange} ref={ref}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      callInAct(() => ref.current!.duplicateItem(`0`));

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      const copy = lastCall.find(entry => entry.i === `0-copy`);
      expect(copy!.moved).not.toBe(true);
    });

    it(`Should generate a further-suffixed id when a previous copy already exists`, () => {
      const handleChange = vi.fn();
      const ref = createRef<IGridLayoutHandle>();
      const layout: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];
      const { rerender } = render(
        <GridLayout compactType={ECompactType.NONE} layout={layout} onLayoutChange={handleChange} ref={ref}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const firstCopyId = callInAct(() => ref.current!.duplicateItem(`0`));
      const afterFirst = handleChange.mock.calls.at(-1)![0] as TLayout;
      rerender(
        <GridLayout compactType={ECompactType.NONE} layout={afterFirst} onLayoutChange={handleChange} ref={ref}>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="0-copy">Item 0 copy</GridItem>
        </GridLayout>,
      );

      const secondCopyId = callInAct(() => ref.current!.duplicateItem(`0`));

      expect(firstCopyId).toBe(`0-copy`);
      expect(secondCopyId).toBe(`0-copy-2`);
    });

    it(`Should return null when the id doesn't match any item currently in the layout`, () => {
      const ref = createRef<IGridLayoutHandle>();
      render(
        <GridLayout layout={[{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]} ref={ref}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      expect(callInAct(() => ref.current!.duplicateItem(`does-not-exist`))).toBeNull();
    });
  });
});
