import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import type { ReactElement } from 'react';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayout } from '../GridLayout';
import { GridItem } from '../GridItem';
import { restoreOffsetWidth, stubOffsetWidth, triggerResize } from './test-helpers';

/**
 * On a server-rendered page the items are in the DOM at the seed width, so the first measured layout would show them growing to
 * their real size over the transition's duration. The root carries `data-kdl-settling` (which the stylesheet turns into
 * `transition: none` for the items) until the grid has been painted once at its measured width: two animation frames after the
 * first measurement.
 */
describe(`GridLayout settling (no transitions until first painted at the measured width)`, () => {
  const layout: TLayout = [{ h: 2, i: `a`, w: 2, x: 0, y: 0 }];

  const grid = (): ReactElement => (
    <GridLayout colNum={12} layout={layout} margin={[10, 10]} rowHeight={60}>
      <GridItem i="a">a</GridItem>
    </GridLayout>
  );

  /** The attribute's value: `''` while the grid is settling, `null` once it is not there any more. */
  const settling = (container: HTMLElement): string | null => (container.querySelector(`.kdl-grid-layout`) as HTMLElement).getAttribute(`data-kdl-settling`);

  let frames: Map<number, FrameRequestCallback>;
  let nextFrameId: number;

  /** Runs every callback queued so far, as one animation frame; callbacks they queue wait for the next one. */
  const flushFrame = (): void => {
    const due = [...frames.values()];
    frames.clear();
    act(() => {
      due.forEach(callback => callback(0));
    });
  };

  beforeEach(() => {
    frames = new Map();
    nextFrameId = 0;
    vi.spyOn(window, `requestAnimationFrame`).mockImplementation(callback => {
      nextFrameId += 1;
      frames.set(nextFrameId, callback);
      return nextFrameId;
    });
    vi.spyOn(window, `cancelAnimationFrame`).mockImplementation(id => {
      frames.delete(id);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    restoreOffsetWidth();
  });

  it(`Should carry the settling attribute while the container has not been measured, however many frames pass`, () => {
    const { container } = render(grid());

    flushFrame();
    flushFrame();
    flushFrame();

    expect(settling(container)).toBe(``);
  });

  it(`Should carry the settling attribute in the first render of a measured grid`, () => {
    stubOffsetWidth(1210);

    const { container } = render(grid());

    expect(settling(container)).toBe(``);
  });

  it(`Should still carry it after one frame, and drop it after the second`, () => {
    stubOffsetWidth(1210);
    const { container } = render(grid());

    flushFrame();
    expect(settling(container)).toBe(``);

    flushFrame();
    expect(settling(container)).toBeNull();
  });

  it(`Should stay settled once it is, through later frames`, () => {
    stubOffsetWidth(1210);
    const { container } = render(grid());
    flushFrame();
    flushFrame();

    flushFrame();

    expect(settling(container)).toBeNull();
  });

  it(`Should start counting from the first measurement when a container that had no width gets one`, () => {
    const { container } = render(grid());
    flushFrame();
    flushFrame();
    expect(settling(container)).toBe(``);

    triggerResize(800);
    flushFrame();
    expect(settling(container)).toBe(``);
    flushFrame();

    expect(settling(container)).toBeNull();
  });

  it(`Should cancel the pending frame when the grid unmounts before the first one`, () => {
    stubOffsetWidth(1210);
    const { unmount } = render(grid());

    unmount();

    expect(frames.size).toBe(0);
  });

  it(`Should cancel the second frame when the grid unmounts between the two`, () => {
    stubOffsetWidth(1210);
    const { unmount } = render(grid());
    flushFrame();
    expect(frames.size).toBe(1);

    unmount();

    expect(frames.size).toBe(0);
  });

  it(`Should render the server markup as settling`, () => {
    expect(renderToString(grid())).toMatch(/class="kdl-grid-layout[^"]*"[^>]*data-kdl-settling=""/);
  });
});
