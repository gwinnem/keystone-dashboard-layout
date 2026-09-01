import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { restoreOffsetWidth, stubOffsetWidth, triggerResize } from './test-helpers';

describe(`GridLayout onLayoutReady`, () => {
  it(`Should call onLayoutReady exactly once, after the first successful container-width measurement, with the current layout`, () => {
    stubOffsetWidth(1210);
    const onLayoutReady = vi.fn();
    const layout: TLayout = [{ h: 2, i: `a`, w: 2, x: 0, y: 0 }];
    render(
      <GridLayout layout={layout} onLayoutReady={onLayoutReady}>
        <GridItem i="a">A</GridItem>
      </GridLayout>,
    );

    expect(onLayoutReady).toHaveBeenCalledTimes(1);
    const readyLayout = onLayoutReady.mock.calls[0][0] as TLayout;
    expect(readyLayout.find(entry => entry.i === `a`)).toBeTruthy();
    restoreOffsetWidth();
  });

  it(`Should not call onLayoutReady again on a later container resize`, () => {
    stubOffsetWidth(1210);
    const onLayoutReady = vi.fn();
    render(
      <GridLayout layout={[{ h: 2, i: `a`, w: 2, x: 0, y: 0 }]} onLayoutReady={onLayoutReady}>
        <GridItem i="a">A</GridItem>
      </GridLayout>,
    );
    expect(onLayoutReady).toHaveBeenCalledTimes(1);

    triggerResize(600);
    expect(onLayoutReady).toHaveBeenCalledTimes(1);
    restoreOffsetWidth();
  });
});

describe(`GridLayout onColumnsChanged`, () => {
  it(`Should not fire on initial mount`, () => {
    const onColumnsChanged = vi.fn();
    render(
      <GridLayout colNum={12} layout={[{ h: 2, i: `a`, w: 2, x: 0, y: 0 }]} onColumnsChanged={onColumnsChanged}>
        <GridItem i="a">A</GridItem>
      </GridLayout>,
    );

    expect(onColumnsChanged).not.toHaveBeenCalled();
  });

  it(`Should fire with the new value when the colNum prop itself changes`, () => {
    const onColumnsChanged = vi.fn();
    const layout: TLayout = [{ h: 2, i: `a`, w: 2, x: 0, y: 0 }];
    const { rerender } = render(
      <GridLayout colNum={12} layout={layout} onColumnsChanged={onColumnsChanged}>
        <GridItem i="a">A</GridItem>
      </GridLayout>,
    );

    rerender(
      <GridLayout colNum={6} layout={layout} onColumnsChanged={onColumnsChanged}>
        <GridItem i="a">A</GridItem>
      </GridLayout>,
    );

    expect(onColumnsChanged).toHaveBeenCalledWith(6);
    expect(onColumnsChanged).toHaveBeenCalledTimes(1);
  });

  it(`Should not fire from a responsive breakpoint change alone (that's onBreakpointChange's own scope, not colNum the prop)`, () => {
    stubOffsetWidth(1210);
    const onColumnsChanged = vi.fn();
    const onBreakpointChange = vi.fn();
    render(
      <GridLayout layout={[{ h: 2, i: `a`, w: 2, x: 0, y: 0 }]} onBreakpointChange={onBreakpointChange} onColumnsChanged={onColumnsChanged} responsive>
        <GridItem i="a">A</GridItem>
      </GridLayout>,
    );

    triggerResize(500);

    expect(onBreakpointChange).toHaveBeenCalled();
    expect(onColumnsChanged).not.toHaveBeenCalled();
    restoreOffsetWidth();
  });

  // Confirmed gap via a fresh mutation run: every test above always
  // provides onColumnsChanged, so a mutant removing the `?.` entirely
  // (calling it directly) never actually gets exercised in a scenario
  // where it's `undefined` -- which would throw, but only if some test
  // changes colNum without providing the callback at all.
  it(`Should not throw when colNum changes and onColumnsChanged isn't provided`, () => {
    const layout: TLayout = [{ h: 2, i: `a`, w: 2, x: 0, y: 0 }];
    const { rerender } = render(
      <GridLayout colNum={12} layout={layout}>
        <GridItem i="a">A</GridItem>
      </GridLayout>,
    );

    expect(() => rerender(
      <GridLayout colNum={6} layout={layout}>
        <GridItem i="a">A</GridItem>
      </GridLayout>,
    )).not.toThrow();
  });
});
