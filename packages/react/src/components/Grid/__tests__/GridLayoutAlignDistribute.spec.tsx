import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { ECompactType } from 'keystone-dashboard-layout-core';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import type { IGridLayoutHandle } from '../grid-layout-handle.interface';

describe(`GridLayout align/distribute`, () => {
  describe(`alignSelected`, () => {
    it(`Should align every other selected item's left edge to the anchor's, without moving the anchor itself`, () => {
      const ref = createRef<IGridLayoutHandle>();
      const handleChange = vi.fn();
      const layout: TLayout = [
        { h: 2, i: `anchor`, w: 2, x: 5, y: 0 },
        { h: 2, i: `other`, w: 2, x: 0, y: 4 },
      ];
      render(
        <GridLayout compactType={ECompactType.NONE} layout={layout} multiSelect onLayoutChange={handleChange} ref={ref}>
          <GridItem i="anchor">Anchor</GridItem>
          <GridItem i="other">Other</GridItem>
        </GridLayout>,
      );

      act(() => {
        ref.current!.selectItem(`anchor`);
      });
      act(() => {
        ref.current!.selectItem(`other`);
      });

      act(() => {
        ref.current!.alignSelected(`left`);
      });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      expect(lastCall.find(entry => entry.i === `anchor`)!.x).toBe(5);
      expect(lastCall.find(entry => entry.i === `other`)!.x).toBe(5);
    });

    it(`Should align to the right edge`, () => {
      const ref = createRef<IGridLayoutHandle>();
      const handleChange = vi.fn();
      // "other" stays far away in y (y:10) throughout, so aligning its x
      // inside the anchor's own x-footprint never creates a collision
      // for compaction to resolve.
      const layout: TLayout = [
        { h: 2, i: `anchor`, w: 4, x: 0, y: 0 },
        { h: 2, i: `other`, w: 2, x: 10, y: 10 },
      ];
      render(
        <GridLayout compactType={ECompactType.NONE} layout={layout} multiSelect onLayoutChange={handleChange} ref={ref}>
          <GridItem i="anchor">Anchor</GridItem>
          <GridItem i="other">Other</GridItem>
        </GridLayout>,
      );

      act(() => {
        ref.current!.selectItem(`anchor`);
      });
      act(() => {
        ref.current!.selectItem(`other`);
      });

      act(() => {
        ref.current!.alignSelected(`right`);
      });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      // anchor's right edge: 0+4=4; other (w:2) needs x:2 for its own right edge (2+2=4) to match.
      expect(lastCall.find(entry => entry.i === `other`)!.x).toBe(2);
    });

    it(`Should align to the top edge`, () => {
      const ref = createRef<IGridLayoutHandle>();
      const handleChange = vi.fn();
      // "other" stays at x:10 throughout — outside the anchor's own
      // x-footprint (0-4) — so aligning its y never creates a collision.
      const layout: TLayout = [
        { h: 2, i: `anchor`, w: 4, x: 0, y: 0 },
        { h: 2, i: `other`, w: 2, x: 10, y: 10 },
      ];
      render(
        <GridLayout compactType={ECompactType.NONE} layout={layout} multiSelect onLayoutChange={handleChange} ref={ref}>
          <GridItem i="anchor">Anchor</GridItem>
          <GridItem i="other">Other</GridItem>
        </GridLayout>,
      );

      act(() => {
        ref.current!.selectItem(`anchor`);
      });
      act(() => {
        ref.current!.selectItem(`other`);
      });

      act(() => {
        ref.current!.alignSelected(`top`);
      });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      expect(lastCall.find(entry => entry.i === `other`)!.y).toBe(0);
    });

    it(`Should align to the bottom edge`, () => {
      const ref = createRef<IGridLayoutHandle>();
      const handleChange = vi.fn();
      const layout: TLayout = [
        { h: 4, i: `anchor`, w: 2, x: 0, y: 0 },
        { h: 2, i: `other`, w: 2, x: 10, y: 10 },
      ];
      render(
        <GridLayout compactType={ECompactType.NONE} layout={layout} multiSelect onLayoutChange={handleChange} ref={ref}>
          <GridItem i="anchor">Anchor</GridItem>
          <GridItem i="other">Other</GridItem>
        </GridLayout>,
      );

      act(() => {
        ref.current!.selectItem(`anchor`);
      });
      act(() => {
        ref.current!.selectItem(`other`);
      });

      act(() => {
        ref.current!.alignSelected(`bottom`);
      });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      // anchor's bottom edge: 0+4=4; other (h:2) needs y:2 for its own bottom edge (2+2=4) to match.
      expect(lastCall.find(entry => entry.i === `other`)!.y).toBe(2);
    });

    it(`Should be a no-op when fewer than 2 items are selected`, () => {
      const ref = createRef<IGridLayoutHandle>();
      const handleChange = vi.fn();
      const layout: TLayout = [
        { h: 2, i: `0`, w: 2, x: 0, y: 0 },
        { h: 2, i: `1`, w: 2, x: 4, y: 0 },
      ];
      render(
        <GridLayout compactType={ECompactType.NONE} layout={layout} multiSelect onLayoutChange={handleChange} ref={ref}>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      act(() => {
        ref.current!.selectItem(`0`);
      });

      expect(() => act(() => {
        ref.current!.alignSelected(`left`);
      })).not.toThrow();
      expect(handleChange).not.toHaveBeenCalled();
    });

    it(`Should skip an adjustment that would collide with a non-selected item when preventCollision is on`, () => {
      const ref = createRef<IGridLayoutHandle>();
      const handleChange = vi.fn();
      const layout: TLayout = [
        { h: 2, i: `anchor`, w: 2, x: 5, y: 0 },
        { h: 2, i: `other`, w: 2, x: 0, y: 4 },
        { h: 2, i: `blocker`, w: 2, x: 5, y: 4 },
      ];
      render(
        <GridLayout compactType={ECompactType.NONE} layout={layout} multiSelect onLayoutChange={handleChange} preventCollision ref={ref}>
          <GridItem i="anchor">Anchor</GridItem>
          <GridItem i="other">Other</GridItem>
          <GridItem i="blocker">Blocker</GridItem>
        </GridLayout>,
      );

      act(() => {
        ref.current!.selectItem(`anchor`);
      });
      act(() => {
        ref.current!.selectItem(`other`);
      });

      // Aligning "other" to the anchor's left edge (x:5) would land it
      // exactly on "blocker" (also at x:5, same y:4 row) — a real,
      // non-selected item, not the anchor itself.
      act(() => {
        ref.current!.alignSelected(`left`);
      });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      expect(lastCall.find(entry => entry.i === `other`)!.x).toBe(0);
    });

    it(`Should apply an adjustment normally when preventCollision is on but that specific adjustment doesn't actually collide with anything — confirmed gap via a fresh coverage report`, () => {
      // applyAlignDistributeAdjustments's own "if(collisions.length > 0)
      // { return; }" guard — the test above only ever exercises the
      // "skip" branch (a real collision found); this covers the other
      // side: preventCollision on, but the specific adjustment lands in
      // genuinely empty space.
      const ref = createRef<IGridLayoutHandle>();
      const handleChange = vi.fn();
      const layout: TLayout = [
        { h: 2, i: `anchor`, w: 2, x: 5, y: 0 },
        { h: 2, i: `other`, w: 2, x: 0, y: 20 },
      ];
      render(
        <GridLayout compactType={ECompactType.NONE} layout={layout} multiSelect onLayoutChange={handleChange} preventCollision ref={ref}>
          <GridItem i="anchor">Anchor</GridItem>
          <GridItem i="other">Other</GridItem>
        </GridLayout>,
      );

      act(() => {
        ref.current!.selectItem(`anchor`);
      });
      act(() => {
        ref.current!.selectItem(`other`);
      });

      // Nothing else occupies y:20 at x:5 — preventCollision has
      // nothing to block here.
      act(() => {
        ref.current!.alignSelected(`left`);
      });

      const lastCall2 = handleChange.mock.calls.at(-1)![0] as TLayout;
      expect(lastCall2.find(entry => entry.i === `other`)!.x).toBe(5);
    });

    it(`Should be undo-able`, () => {
      const ref = createRef<IGridLayoutHandle>();
      const handleChange = vi.fn();
      const layout: TLayout = [
        { h: 2, i: `anchor`, w: 2, x: 5, y: 0 },
        { h: 2, i: `other`, w: 2, x: 0, y: 4 },
      ];
      render(
        <GridLayout compactType={ECompactType.NONE} enableUndoRedo layout={layout} multiSelect onLayoutChange={handleChange} ref={ref}>
          <GridItem i="anchor">Anchor</GridItem>
          <GridItem i="other">Other</GridItem>
        </GridLayout>,
      );

      act(() => {
        ref.current!.selectItem(`anchor`);
      });
      act(() => {
        ref.current!.selectItem(`other`);
      });
      act(() => {
        ref.current!.alignSelected(`left`);
      });
      expect(handleChange.mock.calls.at(-1)![0].find((e: { i: string }) => e.i === `other`).x).toBe(5);

      act(() => {
        ref.current!.undo();
      });
      expect(handleChange.mock.calls.at(-1)![0].find((e: { i: string }) => e.i === `other`).x).toBe(0);
    });
  });

  describe(`distributeSelected`, () => {
    it(`Should distribute the middle selected item evenly between the two outermost selected items`, () => {
      const ref = createRef<IGridLayoutHandle>();
      const handleChange = vi.fn();
      const layout: TLayout = [
        { h: 2, i: `first`, w: 2, x: 0, y: 0 },
        { h: 2, i: `middle`, w: 2, x: 5, y: 0 },
        { h: 2, i: `last`, w: 2, x: 20, y: 0 },
      ];
      render(
        <GridLayout compactType={ECompactType.NONE} layout={layout} multiSelect onLayoutChange={handleChange} ref={ref}>
          <GridItem i="first">First</GridItem>
          <GridItem i="middle">Middle</GridItem>
          <GridItem i="last">Last</GridItem>
        </GridLayout>,
      );

      act(() => {
        ref.current!.selectItem(`first`);
      });
      act(() => {
        ref.current!.selectItem(`middle`);
      });
      act(() => {
        ref.current!.selectItem(`last`);
      });

      act(() => {
        ref.current!.distributeSelected(`horizontal`);
      });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      expect(lastCall.find(entry => entry.i === `first`)!.x).toBe(0);
      expect(lastCall.find(entry => entry.i === `middle`)!.x).toBe(10);
      expect(lastCall.find(entry => entry.i === `last`)!.x).toBe(20);
    });

    it(`Should distribute on the vertical axis too`, () => {
      const ref = createRef<IGridLayoutHandle>();
      const handleChange = vi.fn();
      const layout: TLayout = [
        { h: 2, i: `first`, w: 2, x: 0, y: 0 },
        { h: 2, i: `middle`, w: 2, x: 0, y: 5 },
        { h: 2, i: `last`, w: 2, x: 0, y: 20 },
      ];
      render(
        <GridLayout compactType={ECompactType.NONE} layout={layout} multiSelect onLayoutChange={handleChange} ref={ref}>
          <GridItem i="first">First</GridItem>
          <GridItem i="middle">Middle</GridItem>
          <GridItem i="last">Last</GridItem>
        </GridLayout>,
      );

      act(() => {
        ref.current!.selectItem(`first`);
      });
      act(() => {
        ref.current!.selectItem(`middle`);
      });
      act(() => {
        ref.current!.selectItem(`last`);
      });

      act(() => {
        ref.current!.distributeSelected(`vertical`);
      });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      expect(lastCall.find(entry => entry.i === `middle`)!.y).toBe(10);
    });

    it(`Should be a no-op when fewer than 3 items are selected`, () => {
      const ref = createRef<IGridLayoutHandle>();
      const handleChange = vi.fn();
      const layout: TLayout = [
        { h: 2, i: `0`, w: 2, x: 0, y: 0 },
        { h: 2, i: `1`, w: 2, x: 20, y: 0 },
      ];
      render(
        <GridLayout compactType={ECompactType.NONE} layout={layout} multiSelect onLayoutChange={handleChange} ref={ref}>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      act(() => {
        ref.current!.selectItem(`0`);
      });
      act(() => {
        ref.current!.selectItem(`1`);
      });

      expect(() => act(() => {
        ref.current!.distributeSelected(`horizontal`);
      })).not.toThrow();
      expect(handleChange).not.toHaveBeenCalled();
    });
  });
});
