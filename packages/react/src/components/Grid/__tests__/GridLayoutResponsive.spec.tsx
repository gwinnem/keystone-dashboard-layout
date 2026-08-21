import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ECompactType } from '@keystone-dashboard-layout/core';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { dispatchDragEvent, restoreOffsetWidth, stubOffsetWidth, triggerResize } from './test-helpers';

const basicLayout = (): TLayout => [
  { h: 2, i: `0`, w: 2, x: 0, y: 0 },
  { h: 2, i: `1`, w: 2, x: 2, y: 0 },
];

describe(`GridLayout responsive`, () => {
  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should not affect colNum (and never call onBreakpointChange) when responsive is off (the default)`, () => {
    stubOffsetWidth(500);
    const handleBreakpointChange = vi.fn();
    const { container } = render(
      <GridLayout colNum={12} layout={basicLayout()} margin={[10, 10]} onBreakpointChange={handleBreakpointChange} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    expect(handleBreakpointChange).not.toHaveBeenCalled();
    expect(container.querySelector(`.kdl-grid-item`)).toBeTruthy();
  });

  it(`Should resolve the active breakpoint from the measured container width and call onBreakpointChange`, () => {
    // Default breakpoints: xxs:0, xs:480, sm:768, md:996, lg:1200,
    // xl:1400, xxl:1600 — the match uses strict "width > threshold", so
    // 500 lands on "xs" (500 > 480, not > 768) with its own default 4 cols.
    stubOffsetWidth(500);
    const handleBreakpointChange = vi.fn();
    render(
      <GridLayout layout={basicLayout()} onBreakpointChange={handleBreakpointChange} responsive>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    expect(handleBreakpointChange).toHaveBeenCalledWith(`xs`, 4);
  });

  it(`Should use a custom breakpoints/cols object when provided`, () => {
    stubOffsetWidth(500);
    const handleBreakpointChange = vi.fn();
    render(
      <GridLayout
        breakpoints={{ lg: 1200, md: 996, sm: 768, xl: 1400, xs: 300, xxl: 1600, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xl: 12, xs: 8, xxl: 12, xxs: 2 }}
        layout={basicLayout()}
        onBreakpointChange={handleBreakpointChange}
        responsive
      >
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    // 500 > 300 (custom xs) but not > 768 (sm) -> "xs", with the custom 8 cols.
    expect(handleBreakpointChange).toHaveBeenCalledWith(`xs`, 8);
  });

  it(`Should reuse a pre-defined responsiveLayouts entry for the matching breakpoint instead of auto-generating`, () => {
    stubOffsetWidth(500);
    const handleChange = vi.fn();
    const presetXsLayout: TLayout = [{ h: 3, i: `0`, w: 1, x: 1, y: 1 }];
    render(
      <GridLayout layout={basicLayout()} onLayoutChange={handleChange} responsive responsiveLayouts={{ xs: presetXsLayout }}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(lastCall.find(entry => entry.i === `0`)).toMatchObject({ h: 3, w: 1, x: 1, y: 1 });
  });

  it(`Should bounds-correct an item that no longer fits within the new (narrower) breakpoint's column count`, () => {
    stubOffsetWidth(500);
    const handleChange = vi.fn();
    // "xs" (500px) has only 4 cols by default — this item's own x+w (10)
    // overflows that entirely under the default breakpoints/cols.
    const layout: TLayout = [{ h: 2, i: `0`, w: 4, x: 6, y: 0 }];
    render(
      <GridLayout layout={layout} onLayoutChange={handleChange} responsive>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    const item = lastCall.find(entry => entry.i === `0`)!;
    expect(item.x + item.w).toBeLessThanOrEqual(4);
  });

  it(`Should still respect compactType while generating a responsive layout`, () => {
    stubOffsetWidth(500);
    const handleChange = vi.fn();
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 0, y: 5 },
    ];
    render(
      <GridLayout compactType={ECompactType.NONE} layout={layout} onLayoutChange={handleChange} responsive>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    // compactType NONE still resolves genuine collisions/gaps are left
    // alone by `correctBounds`/`getCompactor(NONE)` itself — item "1"
    // should stay at its own y:5, not forced to compact to y:2.
    expect(lastCall.find(entry => entry.i === `1`)!.y).toBe(5);
  });

  it(`Should drive drag math off the resolved (breakpoint) colNum, not the plain colNum prop, once responsive is on`, () => {
    stubOffsetWidth(1200);
    const handleChange = vi.fn();
    const layout: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    const { container } = render(
      // colNum prop (20) would be ignored in favor of the resolved
      // breakpoint's own cols (10, for "md" at exactly 1200px — see the
      // strict ">" boundary note in the earlier breakpoint test).
      <GridLayout colNum={20} isBounded layout={layout} margin={[10, 10]} onLayoutChange={handleChange} responsive rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 50000, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 50000, clientY: 0 });

    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    const item = lastCall.find(entry => entry.i === `0`)!;
    // Bounded within "md"'s own 10 cols (item w:2 -> max x:8), not the
    // plain colNum prop's 20.
    expect(item.x).toBeLessThanOrEqual(8);
  });

  it(`Should cache the outgoing breakpoint's own layout and restore it when returning to that breakpoint later`, () => {
    stubOffsetWidth(500); // "xs"
    const handleChange = vi.fn();
    const { container } = render(
      <GridLayout compactType={ECompactType.NONE} layout={basicLayout()} margin={[10, 10]} onLayoutChange={handleChange} responsive rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    // Modify item "0"'s own position at "xs" via a real drag, so its
    // cached "xs" state is demonstrably different from whatever a fresh
    // regeneration would produce — proving the cache actually restores
    // *this* state specifically, not just "a" plausible xs layout.
    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 100, clientY: 0 });
    dispatchDragEvent(target, `dragend`, { clientX: 100, clientY: 0 });
    const draggedXs = handleChange.mock.calls.at(-1)![0] as TLayout;
    const draggedItem0X = draggedXs.find(entry => entry.i === `0`)!.x;
    expect(draggedItem0X).not.toBe(0);

    // Move to "lg" (a real second live transition — simulated via
    // triggerResize, since jsdom's own ResizeObserver never fires on
    // its own) — this is what exercises the "cache the layout we're
    // leaving" branch specifically; a single transition (xs on mount)
    // never reaches it, since there's no "previous" breakpoint yet.
    triggerResize(1300);

    // Back to "xs" — should restore the exact dragged/cached state, not
    // regenerate a fresh one (which would put item "0" back at x:0).
    triggerResize(500);
    const backToXs = handleChange.mock.calls.at(-1)![0] as TLayout;
    expect(backToXs.find(entry => entry.i === `0`)!.x).toBe(draggedItem0X);
  });

  /**
   * Phase 20 (`docs/PARITY_GAP_IMPLEMENTATION_PLAN.md`) — `TResponsiveLayout`
   * now type-checks a custom (non-standard) breakpoint-name key,
   * matching Vue's own looser `responsiveLayouts` typing. This is a
   * type-level fix, not a new runtime feature: `getBreakpointFromWidth`
   * (shared with `breakpoints`/`cols`, both still fixed to the 7
   * standard names) can only ever resolve to one of those 7 names, so a
   * custom-keyed entry is accepted by the type but never actually
   * looked up. This test locks that "present, but inert" behavior in
   * explicitly, rather than leaving it merely implied by the type
   * change.
   */
  it(`Should accept a custom (non-standard) breakpoint-name key in responsiveLayouts, and silently ignore it during a real breakpoint change`, () => {
    stubOffsetWidth(500); // resolves to "xs" per the default breakpoints
    const handleChange = vi.fn();
    const customKeyedLayout: TLayout = [{ h: 9, i: `0`, w: 9, x: 9, y: 9 }];
    render(
      <GridLayout
        layout={basicLayout()}
        onLayoutChange={handleChange}
        responsive
        responsiveLayouts={{ 'tablet-landscape': customKeyedLayout }}
      >
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    // Resolves to a freshly-generated "xs" layout, not the inert
    // "tablet-landscape" entry — confirming the custom key type-checks
    // (this test compiling at all is half the point) without silently
    // becoming reachable at runtime.
    const lastCall = handleChange.mock.calls.at(-1)![0] as TLayout;
    const item0 = lastCall.find(entry => entry.i === `0`)!;
    expect(item0).not.toMatchObject({ h: 9, w: 9, x: 9, y: 9 });
  });
});
