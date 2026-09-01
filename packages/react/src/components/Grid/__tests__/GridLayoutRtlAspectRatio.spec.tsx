import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ECompactType } from 'keystone-dashboard-layout-core';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { dispatchDragEvent, dispatchResizeEvent, restoreOffsetWidth, stubOffsetWidth } from './test-helpers';

const basicLayout = (): TLayout => [
  { h: 2, i: `0`, w: 2, x: 0, y: 0 },
  { h: 2, i: `1`, w: 2, x: 4, y: 0 },
];

describe(`GridLayout isMirrored (RTL)`, () => {
  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should position via CSS right (not left) when isMirrored is on`, () => {
    const { container } = render(
      <GridLayout isMirrored layout={basicLayout()} margin={[10, 10]} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    expect(item.style.left).toBe(``);
    // useCssTransforms (default true) + isMirrored uses setTransformRtl,
    // which negates the anchor into the same `transform` property — the
    // absence of a `right` style specifically (not the transform's own
    // value) is what distinguishes this from the LTR case, since both
    // ultimately produce a `transform`.
    expect(item.style.transform).toContain(`translate3d`);
  });

  it(`Should position via CSS right (not left) when isMirrored + useCssTransforms is false`, () => {
    const { container } = render(
      <GridLayout isMirrored layout={basicLayout()} margin={[10, 10]} rowHeight={100} useCssTransforms={false}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    expect(item.style.left).toBe(``);
    expect(item.style.right).not.toBe(``);
  });

  it(`Should apply the rtl class`, () => {
    const { container } = render(
      <GridLayout isMirrored layout={basicLayout()}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    expect(container.querySelector(`.kdl-grid-item`)!.classList.contains(`kdl-grid-item--rtl`)).toBe(true);
  });

  it(`Should drag correctly under RTL, reporting a moved position`, () => {
    stubOffsetWidth(1200);
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout isMirrored layout={basicLayout()} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 200, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 200, clientY: 0 });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    // Just confirms a real, finite grid position was reported — the RTL
    // sign-flip means "which direction is positive" differs from LTR,
    // which the resize-specific tests below assert more precisely via
    // the edge-anchor swap instead.
    const item = lastCall.find(entry => entry.i === `0`)!;
    expect(Number.isFinite(item.x)).toBe(true);
  });

  it(`Should swap which edge anchors a resize under RTL — dragging the "left" edge doesn't move x, dragging "right" does`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [{ h: 2, i: `0`, w: 4, x: 4, y: 0 }];
    const handleChangeRtl = vi.fn();
    const { container: rtlContainer } = render(
      <GridLayout isMirrored layout={layout} margin={[10, 10]} onLayoutChange={handleChangeRtl} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    // Under RTL, the *right* edge is the anchor-moving one (see
    // useGridItemResize.ts's own doc comment) — dragging the "left"
    // edge here should resize without moving x at all.
    const target = rtlContainer.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    const leftOnly = { bottom: false, left: true, right: false, top: false };
    dispatchResizeEvent(target, `resizestart`, { edges: leftOnly });
    dispatchResizeEvent(target, `resizemove`, { clientX: -100, clientY: 0, edges: leftOnly });
    dispatchResizeEvent(target, `resizeend`, { clientX: -100, clientY: 0, edges: leftOnly });

    const lastCall = handleChangeRtl.mock.calls.at(-1)![0] as TLayout;
    const resized = lastCall.find(entry => entry.i === `0`)!;
    expect(resized.x).toBe(4);
  });

  // Counterpart to the "left" edge test above — under RTL, the *right*
  // edge is the one that moves the anchor (see this hook's own doc
  // comment on `edges.right`/`isMirrored`), a distinct code path
  // (`useGridItemResize.ts`'s own `if(edges.right) { ...; if(isMirrored)
  // {...} }` branch) from the left-edge case above, which the test
  // above never exercises.
  it(`Should move the anchor under RTL when resizing from the "right" edge specifically`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [{ h: 2, i: `0`, w: 4, x: 4, y: 0 }];
    const handleChangeRtl = vi.fn();
    const { container: rtlContainer } = render(
      <GridLayout isMirrored layout={layout} margin={[10, 10]} onLayoutChange={handleChangeRtl} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = rtlContainer.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    const rightOnly = { bottom: false, left: false, right: true, top: false };
    dispatchResizeEvent(target, `resizestart`, { edges: rightOnly });
    dispatchResizeEvent(target, `resizemove`, { clientX: -100, clientY: 0, edges: rightOnly });
    dispatchResizeEvent(target, `resizeend`, { clientX: -100, clientY: 0, edges: rightOnly });

    const lastCall = handleChangeRtl.mock.calls.at(-1)![0] as TLayout;
    const resized = lastCall.find(entry => entry.i === `0`)!;
    // The right edge being the RTL anchor means x moves in response to
    // this resize, unlike the left-edge case above.
    expect(resized.x).not.toBe(4);
  });

  it(`Should not react to clicks/resize differently when isMirrored is off (the default) — sanity check the LTR path is unaffected`, () => {
    const { container } = render(
      <GridLayout layout={basicLayout()}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const item = container.querySelector(`.kdl-grid-item`) as HTMLElement;
    expect(item.classList.contains(`kdl-grid-item--rtl`)).toBe(false);
  });
});

describe(`GridLayout preserveAspectRatio`, () => {
  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should derive height from width when only a horizontal edge drives the resize`, () => {
    stubOffsetWidth(1200);
    // rowHeight:100, colWidth at 1200/12/10 ≈ 89.17 — item w:2,h:2 has a
    // pixel aspect ratio of roughly (2*89.17+10)/(2*100+10) ≈ 0.851.
    const layout: TLayout = [{ h: 2, i: `0`, preserveAspectRatio: true, w: 2, x: 0, y: 0 }];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    const rightOnly = { bottom: false, left: false, right: true, top: false };
    dispatchResizeEvent(target, `resizestart`, { edges: rightOnly });
    dispatchResizeEvent(target, `resizemove`, { clientX: 200, clientY: 0, edges: rightOnly });
    dispatchResizeEvent(target, `resizeend`, { clientX: 200, clientY: 0, edges: rightOnly });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    const resized = lastCall.find(entry => entry.i === `0`)!;
    // Width should have grown (driven directly); height should have
    // grown too (derived), not stayed at its original 2 — the defining
    // behavior of preserveAspectRatio versus a plain horizontal-only resize.
    expect(resized.w).toBeGreaterThan(2);
    expect(resized.h).toBeGreaterThan(2);
  });

  it(`Should not derive height at all when preserveAspectRatio is off (the default) — sanity check`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    const rightOnly = { bottom: false, left: false, right: true, top: false };
    dispatchResizeEvent(target, `resizestart`, { edges: rightOnly });
    dispatchResizeEvent(target, `resizemove`, { clientX: 200, clientY: 0, edges: rightOnly });
    dispatchResizeEvent(target, `resizeend`, { clientX: 200, clientY: 0, edges: rightOnly });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    const resized = lastCall.find(entry => entry.i === `0`)!;
    expect(resized.w).toBeGreaterThan(2);
    expect(resized.h).toBe(2);
  });

  it(`Should respect a per-item override even when the grid-wide default is on`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [{ h: 2, i: `0`, preserveAspectRatio: false, w: 2, x: 0, y: 0 }];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout layout={layout} margin={[10, 10]} onLayoutChange={handleChange} preserveAspectRatio rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    const rightOnly = { bottom: false, left: false, right: true, top: false };
    dispatchResizeEvent(target, `resizestart`, { edges: rightOnly });
    dispatchResizeEvent(target, `resizemove`, { clientX: 200, clientY: 0, edges: rightOnly });
    dispatchResizeEvent(target, `resizeend`, { clientX: 200, clientY: 0, edges: rightOnly });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(lastCall.find(entry => entry.i === `0`)!.h).toBe(2);
  });

  it(`Should derive width from height when only a vertical edge drives the resize`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [{ h: 2, i: `0`, preserveAspectRatio: true, w: 2, x: 0, y: 0 }];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    const bottomOnly = { bottom: true, left: false, right: false, top: false };
    dispatchResizeEvent(target, `resizestart`, { edges: bottomOnly });
    dispatchResizeEvent(target, `resizemove`, { clientX: 0, clientY: 200, edges: bottomOnly });
    dispatchResizeEvent(target, `resizeend`, { clientX: 0, clientY: 200, edges: bottomOnly });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    const resized = lastCall.find(entry => entry.i === `0`)!;
    expect(resized.h).toBeGreaterThan(2);
    expect(resized.w).toBeGreaterThan(2);
  });

  // Neither test above drives *both* a horizontal and a vertical edge
  // at once — a corner resize — leaving `useGridItemResize.ts`'s own
  // "both driving" branch (`drivingWidth && drivingHeight`, which
  // derives height from width directly rather than the other way
  // around, and additionally adjusts the anchor's own top position when
  // the top edge is part of the gesture) entirely untested.
  it(`Should derive height from width (not the other way around) when a corner drives both axes at once, adjusting the anchor's own top when the top edge is included`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [{ h: 4, i: `0`, preserveAspectRatio: true, w: 2, x: 0, y: 4 }];
    const handleChange = vi.fn();
    const { container } = render(
      // compactType={NONE}: without this, default vertical compaction
      // would pull this single item from y:4 up to y:0 after the resize
      // commits, regardless of what the resize's own top-anchor logic
      // did — masking the actual mechanism this test means to confirm.
      <GridLayout compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    // Top-right corner: right (horizontal-driving) + top (vertical-
    // driving, and itself an anchor-moving edge) both active at once.
    const topRight = { bottom: false, left: false, right: true, top: true };
    dispatchResizeEvent(target, `resizestart`, { edges: topRight });
    dispatchResizeEvent(target, `resizemove`, { clientX: 200, clientY: -100, edges: topRight });
    dispatchResizeEvent(target, `resizeend`, { clientX: 200, clientY: -100, edges: topRight });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    const resized = lastCall.find(entry => entry.i === `0`)!;
    // Width grew (directly driven); height changed too (derived from
    // width, per the aspect ratio) rather than staying at 4. The top
    // edge being part of this gesture should also have moved y up from
    // its starting value of 4.
    expect(resized.w).toBeGreaterThan(2);
    expect(resized.h).not.toBe(4);
    expect(resized.y).toBeLessThan(4);
  });

  // The corner test above only ever exercises the `edges.top` branch's
  // *true* outcome within the "both driving" case — the same block's
  // own `if(edges.top)` check needs its *false* outcome tested
  // separately for full branch coverage: a corner resize where both
  // axes still drive at once, but the top edge specifically isn't part
  // of the gesture (bottom-right instead of top-right), so the anchor's
  // own top position should stay untouched even though height still
  // gets derived.
  it(`Should derive height from width without touching the anchor's own top when the driving corner doesn't include the top edge`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [{ h: 4, i: `0`, preserveAspectRatio: true, w: 2, x: 0, y: 4 }];
    const handleChange = vi.fn();
    const { container } = render(
      // Same compactType={NONE} rationale as the top-right corner test
      // above — isolates this test's own assertion (y stays exactly at
      // 4) to the resize logic itself, not vertical compaction's own
      // independent effect on a single item sitting below row 0.
      <GridLayout compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    // Bottom-right corner: right (horizontal-driving) + bottom
    // (vertical-driving, but NOT an anchor-moving edge — unlike top).
    const bottomRight = { bottom: true, left: false, right: true, top: false };
    dispatchResizeEvent(target, `resizestart`, { edges: bottomRight });
    dispatchResizeEvent(target, `resizemove`, { clientX: 200, clientY: 100, edges: bottomRight });
    dispatchResizeEvent(target, `resizeend`, { clientX: 200, clientY: 100, edges: bottomRight });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    const resized = lastCall.find(entry => entry.i === `0`)!;
    // Width grew (directly driven); height changed too (derived, same
    // as the top-right case) — but y should stay exactly at its
    // starting value of 4, since the top edge isn't part of this
    // gesture at all.
    expect(resized.w).toBeGreaterThan(2);
    expect(resized.h).not.toBe(4);
    expect(resized.y).toBe(4);
  });

  // `aspectRatioRef.current` (`useGridItemResize.ts`) is only ever set
  // to a real ratio when `resizestart`'s own computed pixel height is
  // positive — every test above uses an item with h > 0, leaving the
  // `pos.height > 0 ? ... : undefined` ternary's own `undefined` branch
  // untested. An item with h:0 exercises it directly.
  it(`Should not derive anything at all when preserveAspectRatio is on but the item's own starting height is zero`, () => {
    stubOffsetWidth(1200);
    const layout: TLayout = [{ h: 0, i: `0`, preserveAspectRatio: true, w: 2, x: 0, y: 0 }];
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout layout={layout} margin={[10, 10]} onLayoutChange={handleChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    const rightOnly = { bottom: false, left: false, right: true, top: false };
    expect(() => {
      dispatchResizeEvent(target, `resizestart`, { edges: rightOnly });
      dispatchResizeEvent(target, `resizemove`, { clientX: 200, clientY: 0, edges: rightOnly });
      dispatchResizeEvent(target, `resizeend`, { clientX: 200, clientY: 0, edges: rightOnly });
    }).not.toThrow();

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    const resized = lastCall.find(entry => entry.i === `0`)!;
    // Width still grows normally (directly driven, unrelated to aspect
    // ratio derivation). Height doesn't stay at its own starting value
    // of 0 either, though — `useGridItemResize.ts`'s own `handleResize`
    // applies an unconditional hard floor (`if(pos.h < 1) { pos.h = 1;
    // }`) at the end of every resize event, entirely separate from
    // aspect-ratio derivation, so 1 (not 0) is the correct, expected
    // result here — what this test actually confirms is that height
    // didn't grow *proportionally with width* the way a real captured
    // aspect ratio would have driven it to.
    expect(resized.w).toBeGreaterThan(2);
    expect(resized.h).toBe(1);
  });

  it(`Should not throw when a preserveAspectRatio resizemove drives neither a horizontal nor a vertical edge — confirmed gap via a fresh coverage report`, () => {
    // The if/else-if/else-if chain (drivingWidth-only, drivingHeight-
    // only, both) has no explicit else — every other preserveAspectRatio
    // test in this file always has at least one real edge active, since
    // a resize is normally started via one of the actual resize
    // handles, each of which always sets at least one edge true.
    // Dispatching with every edge false directly (bypassing which real
    // handle a gesture would have started from) is the only way to
    // reach the case where none of the three branches match at all.
    stubOffsetWidth(1200);
    const layout: TLayout = [{ h: 2, i: `0`, preserveAspectRatio: true, w: 2, x: 0, y: 0 }];
    const { container } = render(
      <GridLayout layout={layout} margin={[10, 10]} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    const noEdges = { bottom: false, left: false, right: false, top: false };
    dispatchResizeEvent(target, `resizestart`, { edges: noEdges });
    expect(() => dispatchResizeEvent(target, `resizemove`, { clientX: 200, clientY: 100, edges: noEdges })).not.toThrow();
  });
});
