import { afterEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ECompactType } from '@keystone-dashboard-layout/core';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { dispatchDragEvent, restoreOffsetWidth, stubOffsetWidth } from './test-helpers';

/**
 * `showAlignmentGuides`/`showSpacingGuides` already had *some*
 * coverage before this file — `GridLayout.spec.tsx`'s own describe
 * blocks under the same names (not to be confused with
 * `GridLayoutAlignDistribute.spec.tsx`, which covers the entirely
 * different `alignSelected`/`distributeSelected` imperative commands)
 * check that a guide/indicator shows up at all, that it clears on
 * drag/resize end, and — for spacing indicators — the label text
 * ("3 cols"/"1 col"). Correction made after actually re-reading that
 * file: this document's own first draft claimed "no dedicated coverage
 * at all", which was wrong.
 *
 * What was genuinely missing, and what this file actually adds: none
 * of those existing tests assert the *pixel* values
 * (`style.left`/`style.top`/`style.width`/`style.height`) at all —
 * only presence/count/label. Every arithmetic operator in
 * `updateGuidesAndIndicators`'s own pixel conversion (`GridLayout.tsx`,
 * lines ~849-874 at the time this was written) could be mutated
 * (`+` -> `-`, `*` -> `/`, etc.) without any existing test noticing,
 * since a wrong pixel value still counts as "a guide showed up" or
 * "the label says 3 cols." This file's own tests assert the exact
 * computed style instead, closing that specific gap without
 * duplicating what the existing tests already cover well.
 *
 * `containerWidth=1210` (colWidth exactly 90, via `calcColWidth`:
 * `(1210 - 13*10) / 12`) and `clientX:200`/`clientY:200` (a known,
 * already-established-elsewhere pattern — see the group-move tests in
 * `GridLayoutMultiSelect.spec.tsx` — that lands a drag exactly 2 grid
 * units over) are chosen so every expected pixel value below is a
 * clean, hand-computable round number, not something that could mask
 * an off-by-a-rounding-error mutant.
 */
describe(`GridLayout showAlignmentGuides/showSpacingGuides`, () => {
  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should render a vertical (x-axis) guide line at the exact pixel position where two edges align`, () => {
    stubOffsetWidth(1210);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 4, y: 0 },
    ];
    const { container } = render(
      <GridLayout compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} rowHeight={100} showAlignmentGuides>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    // Lands item "0" at grid x:2 (established pattern) — its own right
    // edge (2+2=4) then lines up exactly with item "1"'s left edge (4).
    dispatchDragEvent(target, `dragmove`, { clientX: 200, clientY: 0 });

    const guide = container.querySelector(`.kdl-grid-alignment-guide`) as HTMLElement;
    expect(guide).toBeTruthy();
    // left = position * (colWidth + margin[0]) + margin[0] = 4*100+10
    expect(guide.style.left).toBe(`410px`);
    expect(guide.style.top).toBe(`0px`);
    expect(guide.style.width).toBe(`1px`);
    expect(guide.style.height).toBe(`100%`);
  });

  it(`Should render a horizontal (y-axis) guide line at the exact pixel position where two edges align`, () => {
    stubOffsetWidth(1210);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 6, y: 2 },
    ];
    const { container } = render(
      <GridLayout compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} rowHeight={100} showAlignmentGuides>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    // Lands item "0" at grid y:2 (same clientY:200 -> 2-unit pattern,
    // mirrored onto the y axis) — its own top edge then lines up
    // exactly with item "1"'s own top edge (both at y:2).
    dispatchDragEvent(target, `dragmove`, { clientX: 0, clientY: 200 });

    const guide = container.querySelector(`.kdl-grid-alignment-guide`) as HTMLElement;
    expect(guide).toBeTruthy();
    // top = position * (rowHeight + margin[1]) + margin[1] = 2*110+10
    expect(guide.style.top).toBe(`230px`);
    expect(guide.style.left).toBe(`0px`);
    expect(guide.style.height).toBe(`1px`);
    expect(guide.style.width).toBe(`100%`);
  });

  it(`Should not render any guide at all when showAlignmentGuides is off (the default), even where one would otherwise fire`, () => {
    stubOffsetWidth(1210);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 4, y: 0 },
    ];
    const { container } = render(
      <GridLayout compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 200, clientY: 0 });

    expect(container.querySelector(`.kdl-grid-alignment-guide`)).toBeFalsy();
  });

  // Distinct from the "off by default" test above: showAlignmentGuides
  // is ON here, but item "1" is positioned (x:1,y:1,w:1,h:1 -- nothing
  // shares an x/y/edge with item "0" at any position it could reach
  // via this small drag) so that `findAlignmentGuides` genuinely
  // returns an empty array -- exercising `guides.length === 0`'s own
  // true branch, which no other test reaches (every other guides-on
  // test guarantees a match; this one guarantees the opposite).
  it(`Should render no guide when the feature is on but nothing actually aligns`, () => {
    stubOffsetWidth(1210);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 1, i: `1`, w: 1, x: 9, y: 9 },
    ];
    const { container } = render(
      <GridLayout compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} rowHeight={100} showAlignmentGuides>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 30, clientY: 0 });

    expect(container.querySelectorAll(`.kdl-grid-alignment-guide`)).toHaveLength(0);
  });

  it(`Should clear any rendered guide once the drag ends`, () => {
    stubOffsetWidth(1210);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 4, y: 0 },
    ];
    const { container } = render(
      <GridLayout compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} rowHeight={100} showAlignmentGuides>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 200, clientY: 0 });
    expect(container.querySelector(`.kdl-grid-alignment-guide`)).toBeTruthy();

    dispatchDragEvent(target, `dragend`, { clientX: 200, clientY: 0 });
    expect(container.querySelector(`.kdl-grid-alignment-guide`)).toBeFalsy();
  });

  it(`Should render a labeled spacing indicator with the exact gap distance and pixel position`, () => {
    stubOffsetWidth(1210);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 6, y: 0 },
    ];
    const { container } = render(
      <GridLayout compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} rowHeight={100} showSpacingGuides>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    // Lands item "0" at grid x:2 — its own right edge (4) to item "1"'s
    // left edge (6) leaves a 2-column gap (both share the same y-range,
    // so this qualifies per findSpacingIndicators's own y-overlap check).
    dispatchDragEvent(target, `dragmove`, { clientX: 200, clientY: 0 });

    const indicator = container.querySelector(`.kdl-grid-spacing-indicator`) as HTMLElement;
    expect(indicator).toBeTruthy();
    expect(indicator.textContent).toBe(`2 cols`);
    // startPx = gapStart*(colWidth+margin[0])+margin[0] = 4*100+10 = 410
    // endPx = gapEnd*(colWidth+margin[0])+margin[0] = 6*100+10 = 610
    // left = (410+610)/2 = 510
    expect(indicator.style.left).toBe(`510px`);
    // centerY = (y+h/2)*(rowHeight+margin[1])+margin[1] = (0+1)*110+10 = 120
    expect(indicator.style.top).toBe(`120px`);
  });

  it(`Should use the singular label for an exact 1-unit gap`, () => {
    stubOffsetWidth(1210);
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
    // Right edge (4) to item "1"'s left edge (5): a 1-column gap.
    dispatchDragEvent(target, `dragmove`, { clientX: 200, clientY: 0 });

    const indicator = container.querySelector(`.kdl-grid-spacing-indicator`) as HTMLElement;
    expect(indicator.textContent).toBe(`1 col`);
  });

  it(`Should not render any indicator at all when showSpacingGuides is off (the default), even where one would otherwise fire`, () => {
    stubOffsetWidth(1210);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 6, y: 0 },
    ];
    const { container } = render(
      <GridLayout compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} rowHeight={100}>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 200, clientY: 0 });

    expect(container.querySelector(`.kdl-grid-spacing-indicator`)).toBeFalsy();
  });

  // Same rationale as the matching alignment-guide test above: on, but
  // nothing shares a y-overlap with item "0" here (item "1" is at
  // y:9, far from item "0"'s y:0/h:2 range), so `findSpacingIndicators`
  // genuinely returns empty -- exercising `indicators.length === 0`'s
  // own true branch, unreached by any other spacing-guide test.
  it(`Should render no indicator when the feature is on but nothing qualifies`, () => {
    stubOffsetWidth(1210);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 1, i: `1`, w: 1, x: 9, y: 9 },
    ];
    const { container } = render(
      <GridLayout compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} rowHeight={100} showSpacingGuides>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    dispatchDragEvent(target, `dragmove`, { clientX: 30, clientY: 0 });

    expect(container.querySelectorAll(`.kdl-grid-spacing-indicator`)).toHaveLength(0);
  });

  it(`Should render a labeled spacing indicator with the exact gap distance and pixel position for a vertical (row) gap — confirmed gap via a fresh coverage report`, () => {
    // updateGuidesAndIndicators's own "indicator.axis === 'x' ? ... :
    // ..." branch — every other spacing-indicator test in this file
    // has items sharing the same y-range (a horizontal, column gap);
    // this uses items sharing the same x-range instead, so
    // findSpacingIndicators returns a row (y-axis) indicator, reaching
    // the else side of that ternary for the first time.
    stubOffsetWidth(1210);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 0, y: 8 },
    ];
    const { container } = render(
      <GridLayout compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} rowHeight={100} showSpacingGuides>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    // Lands item "0" at grid y:2 (established clientY:200 -> 2-unit
    // pattern) — its own bottom edge (2+2=4) to item "1"'s top edge (8)
    // leaves a 4-row gap, both sharing the same x-range (0-2).
    dispatchDragEvent(target, `dragmove`, { clientX: 0, clientY: 200 });

    const indicator = container.querySelector(`.kdl-grid-spacing-indicator`) as HTMLElement;
    expect(indicator).toBeTruthy();
    expect(indicator.textContent).toBe(`4 rows`);
    // startPxY = gapStart*(rowHeight+margin[1])+margin[1] = 4*110+10 = 450
    // endPxY = gapEnd*(rowHeight+margin[1])+margin[1] = 8*110+10 = 890
    // top = (450+890)/2 = 670
    expect(indicator.style.top).toBe(`670px`);
    // centerX = (x+w/2)*(colWidth+margin[0])+margin[0] = (0+1)*100+10 = 110
    expect(indicator.style.left).toBe(`110px`);
  });

  it(`Should use the singular label for an exact 1-row gap — confirmed gap via a fresh coverage report`, () => {
    // Distinct from the y-axis pixel-position test above, which only
    // ever exercises a plural gap (4 rows) — the singular ternary
    // ("row", not "rows") for the y-axis specifically was never
    // exercised; only the x-axis singular case ("1 col") already had
    // coverage, via a separate, earlier test in this file.
    stubOffsetWidth(1210);
    const layout: TLayout = [
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 0, y: 5 },
    ];
    const { container } = render(
      <GridLayout compactType={ECompactType.NONE} layout={layout} margin={[10, 10]} rowHeight={100} showSpacingGuides>
        <GridItem i="0">Item 0</GridItem>
        <GridItem i="1">Item 1</GridItem>
      </GridLayout>,
    );

    const target = container.querySelector(`[data-grid-item-id="0"]`) as HTMLElement;
    dispatchDragEvent(target, `dragstart`);
    // Bottom edge (2+2=4) to item "1"'s top edge (5): a 1-row gap.
    dispatchDragEvent(target, `dragmove`, { clientX: 0, clientY: 200 });

    const indicator = container.querySelector(`.kdl-grid-spacing-indicator`) as HTMLElement;
    expect(indicator.textContent).toBe(`1 row`);
  });
});
