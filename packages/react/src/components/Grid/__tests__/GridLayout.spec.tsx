import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ECompactType } from '@keystone-dashboard-layout/core';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { dispatchDragEvent, dispatchResizeEvent, restoreOffsetWidth, stubOffsetWidth } from './test-helpers';

const basicLayout = (): TLayout => [
  { h: 2, i: `0`, w: 2, x: 0, y: 0 },
  { h: 2, i: `1`, w: 2, x: 2, y: 0 },
];

describe(`GridLayout`, () => {
  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should render one GridItem per layout entry`, () => {
    const { container } = render(
      <GridLayout layout={basicLayout()}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    expect(container.querySelectorAll(`.kdl-grid-item`)).toHaveLength(2);
  });

  it(`Should compute a pixel container height from the layout when autoSize is true (the default)`, () => {
    const { container } = render(
      <GridLayout layout={basicLayout()} margin={[10, 10]} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    // bottom y-coordinate is 2 rows (h:2 items at y:0) -> 2 * (100 + 10) + 10 = 230px
    const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
    expect(root.style.height).toBe(`230px`);
  });

  it(`Should render with no explicit height when autoSize is false`, () => {
    const { container } = render(
      <GridLayout autoSize={false} layout={basicLayout()}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
    expect(root.style.height).toBe(``);
  });

  it(`Should reflect a wholesale layout prop change (controlled component)`, () => {
    const { container, rerender } = render(
      <GridLayout layout={basicLayout()} margin={[10, 10]} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const before = (container.querySelector(`.kdl-grid-item`) as HTMLElement).style.transform;

    rerender(
      <GridLayout layout={[{ h: 2, i: `0`, w: 2, x: 5, y: 5 }]} margin={[10, 10]} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const after = (container.querySelector(`.kdl-grid-item`) as HTMLElement).style.transform;
    expect(after).not.toBe(before);
  });

  it(`Should never mutate the layout array/items passed in as props`, () => {
    const layout = basicLayout();
    const originalSnapshot = JSON.parse(JSON.stringify(layout));
    const { container } = render(
      <GridLayout layout={layout} margin={[10, 10]} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 300, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 300, clientY: 0 });

    expect(layout).toStrictEqual(originalSnapshot);
  });

  it(`Should compact a layout with a gap after a drag ends (default compactType: VERTICAL)`, () => {
    // item "1" shares item "0"'s own x-range (0-2) here, deliberately —
    // vertical compaction only stops an item at a genuine 2D collision;
    // if the two didn't overlap in x at all, there'd be nothing to stop
    // item "1" rising all the way to y:0, not settling at y:2.
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 0, y: 5 },
    ];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    // Trigger any drag/resize tick on item "0" (a no-op move to its own
    // position) just to run the commit/compaction pipeline — item "1"'s
    // own gap above it should close as a side effect, the same way any
    // layout-affecting action in the Vue package also re-compacts
    // everything, not just the item actually being dragged.
    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragend`);

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(lastCall.find(entry => entry.i === `1`)!.y).toBe(2);
  });

  it(`Should not compact at all when compactType is NONE`, () => {
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 0, y: 5 },
    ];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragend`);

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(lastCall.find(entry => entry.i === `1`)!.y).toBe(5);
  });

  it(`Should block a move entirely when preventCollision is on and the target position collides`, () => {
    // A realistic, wide container (matching Vue's own test convention
    // for exactly this reason — see stubOffsetWidth's own doc comment)
    // — jsdom's own default (0, falling back to GridLayout's internal
    // 100px safe default) produces degenerate colWidth math for a
    // 12-column grid, making the actual landing position unpredictable
    // rather than just "clamped to some bound," which is what this
    // test specifically needs to assert.
    stubOffsetWidth(1200);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 2, y: 0 },
    ];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} preventCollision rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    // colWidth at 1200px/12 cols/10px margin: (1200 - 13*10)/12 ≈ 89.17.
    // clientX:200 lands the drag at grid x:2 — exactly item "1"'s own
    // position — which preventCollision should block entirely.
    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 200, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 200, clientY: 0 });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(lastCall.find(entry => entry.i === `0`)!.x).toBe(0);
    expect(lastCall.find(entry => entry.i === `1`)!.x).toBe(2);
  });

  it(`Should push a colliding item out of the way when preventCollision is off (the default)`, () => {
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 2, y: 0 },
    ];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 300, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 300, clientY: 0 });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(lastCall.find(entry => entry.i === `0`)!.x).toBeGreaterThan(0);
  });

  it(`Should not throw when the layout is empty`, () => {
    expect(() => render(<GridLayout layout={[]} />)).not.toThrow();
  });

  it(`Should apply a custom className alongside its own root class`, () => {
    const { container } = render(
      <GridLayout className="my-custom-class" layout={basicLayout()}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
    expect(root.classList.contains(`my-custom-class`)).toBe(true);
  });

  it(`Should clamp the resized size when preventCollision is on and it would collide`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 4, y: 0 },
    ];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} preventCollision rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    // Growing item "0" (x:0) with a huge pixel delta would otherwise
    // overlap item "1" (x:4) — preventCollision should clamp its width
    // to exactly the gap between them (4), not push or overlap "1".
    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchResizeEvent(target, `resizestart`);
    dispatchResizeEvent(target, `resizemove`, { clientX: 5000, clientY: 0 });
    dispatchResizeEvent(target, `resizeend`, { clientX: 5000, clientY: 0 });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(lastCall.find(entry => entry.i === `0`)!.w).toBe(4);
    expect(lastCall.find(entry => entry.i === `1`)!.x).toBe(4);
    // Confirmed gap via a fresh mutation run: item "1" sits at the same
    // y (0) as item "0" here, deliberately exercising `other.y >
    // item.y`'s own false branch -- but nothing below asserted `.h`
    // itself, so a mutant flipping that `>` to `>=` (wrongly treating
    // item "1" as ALSO constraining height, clamping h to 0) survived
    // simply because nothing checked. `h` should stay unclamped here.
    expect(lastCall.find(entry => entry.i === `0`)!.h).not.toBe(0);
  });

  it(`Should clamp the resized height when preventCollision is on and it would collide vertically`, () => {
    // The horizontal test above only exercises the leastX branch of
    // GridLayout's own preventCollision clamp (both items share the
    // same y) — this one collides vertically instead (same x, item
    // "1" positioned below), exercising the matching leastY branch.
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 0, y: 4 },
    ];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} preventCollision rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchResizeEvent(target, `resizestart`);
    dispatchResizeEvent(target, `resizemove`, { clientX: 0, clientY: 5000 });
    dispatchResizeEvent(target, `resizeend`, { clientX: 0, clientY: 5000 });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(lastCall.find(entry => entry.i === `0`)!.h).toBe(4);
    expect(lastCall.find(entry => entry.i === `1`)!.y).toBe(4);
    // Same rationale as the horizontal test's own new assertion above,
    // mirrored for the other axis: item "1" shares item "0"'s own x
    // (0) here, exercising `other.x > item.x`'s own false branch -- a
    // mutant flipping that to `>=` would wrongly clamp `w` to 0, and
    // nothing previously checked `.w` at all in this test.
    expect(lastCall.find(entry => entry.i === `0`)!.w).not.toBe(0);
  });

  it(`Should not throw when a drag reports an id no longer present in the layout (a plausible race: item removed mid-gesture)`, () => {
    const handleChange = vi.fn();
    const layout: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const { container, rerender } = render(
      <GridLayout layout={layout} onLayoutChange={handleChange}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    // dragstart first, establishing draggingRef.current inside the hook
    // — without this, dragend's own early-return guard
    // (`if(!draggingRef.current) return`) short-circuits before ever
    // reaching GridLayout's own onDrag callback, meaning this wouldn't
    // actually exercise the id-no-longer-present guard at all.
    dispatchDragEvent(target, `dragstart`);
    // Remove the item from the layout entirely before the gesture's
    // own dragend tick fires — the detached DOM node's own handler
    // reference is still callable directly via the backdoor.
    rerender(<GridLayout layout={[]} onLayoutChange={handleChange} />);

    expect(() => dispatchDragEvent(target, `dragend`)).not.toThrow();
  });

  it(`Should not throw when a resize reports an id no longer present in the layout`, () => {
    const handleChange = vi.fn();
    const layout: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const { container, rerender } = render(
      <GridLayout layout={layout} onLayoutChange={handleChange}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    rerender(<GridLayout layout={[]} onLayoutChange={handleChange} />);

    expect(() => dispatchResizeEvent(target, `resizeend`)).not.toThrow();
  });

  describe(`heightMode`, () => {
    it(`Should default to null, deferring entirely to autoSize`, () => {
      const { container } = render(
        <GridLayout layout={basicLayout()}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );
      expect(container.querySelector(`.kdl-grid-layout`)).toBeTruthy();
    });

    it(`Should compute the same pixel height as autoSize: true (the default) when heightMode is 'auto'`, () => {
      const { container } = render(
        <GridLayout heightMode="auto" layout={basicLayout()} margin={[10, 10]} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
      expect(root.style.height).toBe(`230px`);
    });

    it(`Should render with no explicit height when heightMode is 'fixed', matching autoSize: false's own prior behavior`, () => {
      const { container } = render(
        <GridLayout heightMode="fixed" layout={basicLayout()}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
      expect(root.style.height).toBe(``);
      expect(root.style.overflowY).toBe(``);
    });

    it(`Should render with no explicit height but an inline overflow-y: auto when heightMode is 'scroll'`, () => {
      const { container } = render(
        <GridLayout heightMode="scroll" layout={basicLayout()}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
      expect(root.style.height).toBe(``);
      expect(root.style.overflowY).toBe(`auto`);
    });

    it(`Should lock height to 100% and set overflow-y: auto when heightMode is 'fit'`, () => {
      const { container } = render(
        <GridLayout heightMode="fit" layout={basicLayout()}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
      expect(root.style.height).toBe(`100%`);
      expect(root.style.overflowY).toBe(`auto`);
    });

    it(`Should let an explicit heightMode win outright over autoSize when both are set, not merge or average them`, () => {
      const { container } = render(
        <GridLayout autoSize={true} heightMode="fixed" layout={basicLayout()} margin={[10, 10]} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
      expect(root.style.height).toBe(``);
    });
  });

  describe(`resizeHandles`, () => {
    it(`Should render all 8 resize-hint spans by default`, () => {
      const { container } = render(
        <GridLayout layout={basicLayout()}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      expect(container.querySelectorAll(`.kdl-resize-hint`)).toHaveLength(8);
    });

    it(`Should render only the resolved subset of resize-hint spans`, () => {
      const { container } = render(
        <GridLayout layout={basicLayout()} resizeHandles={[`se`, `e`, `s`]}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const hints = container.querySelectorAll(`.kdl-resize-hint`);
      expect(hints).toHaveLength(3);
      expect(container.querySelector(`.kdl-resize-hint--se`)).toBeTruthy();
      expect(container.querySelector(`.kdl-resize-hint--n`)).toBeFalsy();
    });

    it(`Should only allow resizing from a handle actually present in the resolved set`, () => {
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout layout={basicLayout()} margin={[10, 10]} onLayoutChange={handleChange} resizeHandles={[`se`]} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const seHandle = container.querySelector(`.kdl-resize-hint--se`) as HTMLElement;
      seHandle.dispatchEvent(new PointerEvent(`pointerdown`, { bubbles: true, button: 0, clientX: 0, clientY: 0, pointerId: 1 }));
      seHandle.dispatchEvent(new PointerEvent(`pointermove`, { bubbles: true, button: 0, clientX: 100, clientY: 0, pointerId: 1 }));
      seHandle.dispatchEvent(new PointerEvent(`pointerup`, { bubbles: true, button: 0, clientX: 100, clientY: 0, pointerId: 1 }));

      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe(`showGridLines`, () => {
    it(`Should not apply the grid-lines class by default`, () => {
      const { container } = render(
        <GridLayout layout={basicLayout()}>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
      expect(root.classList.contains(`kdl-grid-layout--grid-lines`)).toBe(false);
    });

    it(`Should apply the grid-lines class and size CSS custom properties from the actual colNum/rowHeight/margin when true`, () => {
      stubOffsetWidth(1200);
      const { container } = render(
        <GridLayout colNum={4} layout={basicLayout()} margin={[10, 10]} rowHeight={100} showGridLines>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      );

      const root = container.querySelector(`.kdl-grid-layout`) as HTMLElement;
      expect(root.classList.contains(`kdl-grid-layout--grid-lines`)).toBe(true);
      // colWidth at 1200px/4 cols/10px margin: (1200 - 5*10)/4 = 287.5; column-size = colWidth + margin = 297.5px.
      expect(root.style.getPropertyValue(`--kdl-grid-line-column-size`)).toBe(`297.5px`);
      expect(root.style.getPropertyValue(`--kdl-grid-line-row-size`)).toBe(`110px`);
    });

    it(`Should not throw before the container has been measured (containerWidth still at its safe default)`, () => {
      expect(() => render(
        <GridLayout layout={basicLayout()} showGridLines>
          <GridItem i="0">Item 0</GridItem>
        </GridLayout>,
      )).not.toThrow();
    });
  });

  describe(`snapToGrid`, () => {
    it(`Should snap a drag within snapThreshold to align with another item's edge, landing somewhere other than the raw (unsnapped) position`, () => {
      // colWidth at 1200px/8 cols/0px margin: 1200/8 = 150px — clean
      // round numbers, chosen deliberately so the raw (unsnapped) grid
      // position and the snapped target are easy to compute by hand
      // and tell apart. colNum:8 (not 3) specifically to leave enough
      // headroom that calcXY's own `cols - w` clamp doesn't silently
      // cap the raw position before snapping ever gets a chance to run
      // — confirmed the hard way once already in this file's own test
      // history (see the `preventCollision` tests above).
      stubOffsetWidth(1200);
      const layout: TLayout = [
        { h: 2, i: `0`, w: 2, x: 0, y: 0 },
        { h: 2, i: `1`, w: 2, x: 5, y: 0 },
      ];
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout colNum={8} compactType={ECompactType.NONE} layout={layout} margin={[0, 0]} onLayoutChange={handleChange} rowHeight={100} snapToGrid>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      // dragstart fixes the initial pixel offset at 5 (test-helper's own
      // mocked getBoundingClientRect); clientX:280 lands the RAW grid x
      // at round((5+280)/150) = 2 — close to (but not exactly at) the
      // position where item "0"'s own right edge (x+2) would align with
      // item "1"'s left edge (5): x=3. Distance between the two
      // candidates is 1, exactly at the default snapThreshold.
      const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
      dispatchDragEvent(target, `dragstart`);
      dispatchDragEvent(target, `dragmove`, { clientX: 280, clientY: 0 });
      dispatchDragEvent(target, `dragend`, { clientX: 280, clientY: 0 });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      expect(lastCall.find(entry => entry.i === `0`)!.x).toBe(3);
    });

    it(`Should not snap at all when snapToGrid is off (the default) — the raw grid position is used unchanged`, () => {
      stubOffsetWidth(1200);
      const layout: TLayout = [
        { h: 2, i: `0`, w: 2, x: 0, y: 0 },
        { h: 2, i: `1`, w: 2, x: 5, y: 0 },
      ];
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout colNum={8} compactType={ECompactType.NONE} layout={layout} margin={[0, 0]} onLayoutChange={handleChange} rowHeight={100}>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
      dispatchDragEvent(target, `dragstart`);
      dispatchDragEvent(target, `dragmove`, { clientX: 280, clientY: 0 });
      dispatchDragEvent(target, `dragend`, { clientX: 280, clientY: 0 });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      expect(lastCall.find(entry => entry.i === `0`)!.x).toBe(2);
    });

    it(`Should not snap when the nearest edge is further than snapThreshold`, () => {
      stubOffsetWidth(1200);
      const layout: TLayout = [
        { h: 2, i: `0`, w: 2, x: 0, y: 0 },
        { h: 2, i: `1`, w: 2, x: 5, y: 0 },
      ];
      const handleChange = vi.fn();
      const { container } = render(
        <GridLayout colNum={8} compactType={ECompactType.NONE} layout={layout} margin={[0, 0]} onLayoutChange={handleChange} rowHeight={100} snapThreshold={0} snapToGrid>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
      dispatchDragEvent(target, `dragstart`);
      dispatchDragEvent(target, `dragmove`, { clientX: 280, clientY: 0 });
      dispatchDragEvent(target, `dragend`, { clientX: 280, clientY: 0 });

      const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
      expect(lastCall.find(entry => entry.i === `0`)!.x).toBe(2);
    });
  });

  describe(`showAlignmentGuides`, () => {
    it(`Should not render any guide lines by default`, () => {
      const { container } = render(
        <GridLayout layout={basicLayout()}>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      dispatchDragEvent(container.querySelector(`.kdl-grid-item`) as HTMLElement, `dragstart`);
      expect(container.querySelectorAll(`.kdl-grid-alignment-guide`)).toHaveLength(0);
    });

    it(`Should render a guide line for each edge alignment found while dragging, and clear them on dragend`, () => {
      stubOffsetWidth(1200);
      // Both items start at y:0 with h:2 — top edges AND bottom edges
      // both already align, so this produces exactly 2 guides (one per
      // axis-y position) throughout the drag, since only x changes.
      const layout: TLayout = [
        { h: 2, i: `0`, w: 2, x: 0, y: 0 },
        { h: 2, i: `1`, w: 2, x: 5, y: 0 },
      ];
      const { container } = render(
        <GridLayout compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} rowHeight={100} showAlignmentGuides>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
      dispatchDragEvent(target, `dragstart`);
      dispatchDragEvent(target, `dragmove`, { clientX: 50, clientY: 0 });

      expect(container.querySelectorAll(`.kdl-grid-alignment-guide`)).toHaveLength(2);

      dispatchDragEvent(target, `dragend`, { clientX: 50, clientY: 0 });
      expect(container.querySelectorAll(`.kdl-grid-alignment-guide`)).toHaveLength(0);
    });

    it(`Should also render guide lines while resizing, cleared on resizeend`, () => {
      stubOffsetWidth(1200);
      const layout: TLayout = [
        { h: 2, i: `0`, w: 2, x: 0, y: 0 },
        { h: 2, i: `1`, w: 2, x: 5, y: 0 },
      ];
      const { container } = render(
        <GridLayout compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} rowHeight={100} showAlignmentGuides>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
      dispatchResizeEvent(target, `resizestart`);
      dispatchResizeEvent(target, `resizemove`, { clientX: 20, clientY: 0 });

      expect(container.querySelectorAll(`.kdl-grid-alignment-guide`).length).toBeGreaterThan(0);

      dispatchResizeEvent(target, `resizeend`, { clientX: 20, clientY: 0 });
      expect(container.querySelectorAll(`.kdl-grid-alignment-guide`)).toHaveLength(0);
    });
  });

  describe(`showSpacingGuides`, () => {
    it(`Should not render any spacing indicator by default`, () => {
      const { container } = render(
        <GridLayout layout={basicLayout()}>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      dispatchDragEvent(container.querySelector(`.kdl-grid-item`) as HTMLElement, `dragstart`);
      expect(container.querySelectorAll(`.kdl-grid-spacing-indicator`)).toHaveLength(0);
    });

    it(`Should render a labeled distance badge for the gap to the nearest neighbor while dragging, and clear it on dragend`, () => {
      stubOffsetWidth(1200);
      // item "0" (x:0,w:2, right edge at 2) and item "1" (x:5) leave a
      // 3-unit gap between them, with overlapping y-ranges (both y:0,h:2).
      const layout: TLayout = [
        { h: 2, i: `0`, w: 2, x: 0, y: 0 },
        { h: 2, i: `1`, w: 2, x: 5, y: 0 },
      ];
      const { container } = render(
        <GridLayout compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} rowHeight={100} showSpacingGuides>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
      dispatchDragEvent(target, `dragstart`);
      dispatchDragEvent(target, `dragmove`, { clientX: 0, clientY: 0 });

      const indicator = container.querySelector(`.kdl-grid-spacing-indicator`);
      expect(indicator?.textContent).toBe(`3 cols`);

      dispatchDragEvent(target, `dragend`, { clientX: 0, clientY: 0 });
      expect(container.querySelectorAll(`.kdl-grid-spacing-indicator`)).toHaveLength(0);
    });

    it(`Should use the singular label when the gap is exactly 1`, () => {
      stubOffsetWidth(1200);
      const layout: TLayout = [
        { h: 2, i: `0`, w: 2, x: 0, y: 0 },
        { h: 2, i: `1`, w: 2, x: 3, y: 0 },
      ];
      const { container } = render(
        <GridLayout compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} rowHeight={100} showSpacingGuides>
          <GridItem i="0">Item 0</GridItem>
          <GridItem i="1">Item 1</GridItem>
        </GridLayout>,
      );

      const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
      dispatchDragEvent(target, `dragstart`);
      dispatchDragEvent(target, `dragmove`, { clientX: 0, clientY: 0 });

      const indicator = container.querySelector(`.kdl-grid-spacing-indicator`);
      expect(indicator?.textContent).toBe(`1 col`);
    });
  });
});
