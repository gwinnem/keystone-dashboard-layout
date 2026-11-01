// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSSRApp, h } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { renderToString } from 'vue/server-renderer';
import GridLayout from '../src/components/Grid/GridLayout.vue';
import GridItem from '../src/components/Grid/GridItem.vue';
import { mountGrid as mountUntrackedGrid, restoreOffsetWidth, stubOffsetWidth } from './helpers/mountGrid';

type TWrapper = ReturnType<typeof mountUntrackedGrid>;

// A mounted grid keeps listening to `window` resize events until it is
// unmounted, so a grid left over from an earlier test would react to the
// resizes later tests dispatch. Every grid mounted here is unmounted again
// in `afterEach`.
const mountedGrids: TWrapper[] = [];
const unmountedGrids = new WeakSet<TWrapper>();

const mountGrid = (...args: Parameters<typeof mountUntrackedGrid>): TWrapper => {
  const wrapper = mountUntrackedGrid(...args);
  const unmount = wrapper.unmount.bind(wrapper);
  wrapper.unmount = (): void => {
    unmountedGrids.add(wrapper);
    unmount();
  };
  mountedGrids.push(wrapper);
  return wrapper;
};

const basicLayout = () => [
  { i: `0`, x: 0, y: 0, w: 2, h: 2 },
  { i: `1`, x: 2, y: 0, w: 2, h: 2 },
];

/**
 * A grid is hidden until it has measured its width, and keeps item
 * transitions off until two animation frames after that — so neither the
 * server-rendered markup (plain full-width blocks) nor the first
 * provisional placement is ever shown or animated.
 */
describe(`GridLayout hidden until measured, transitions off until settled`, () => {
  let queue: Map<number, FrameRequestCallback>;
  let nextId: number;
  let requestSpy: ReturnType<typeof vi.fn>;
  let cancelSpy: ReturnType<typeof vi.fn>;
  /** How many settle frames GridLayout has requested (other components may request their own frames). */
  let layoutRequests: number;
  const realRequestFrame = globalThis.requestAnimationFrame;
  const realCancelFrame = globalThis.cancelAnimationFrame;

  /** Runs every callback queued right now (callbacks queued while running wait for the next frame). */
  const runFrame = (): void => {
    const pending = [...queue.entries()];
    queue.clear();
    pending.forEach(([, callback]) => callback(0));
  };

  const rootStyle = (wrapper): string => wrapper.find(`.vue-grid-layout`).attributes(`style`) ?? ``;

  beforeEach(() => {
    queue = new Map();
    nextId = 1;
    layoutRequests = 0;
    requestSpy = vi.fn((callback: FrameRequestCallback) => {
      // Other code (GridItems, helpers) requests frames of its own, so
      // GridLayout's settle frames are told apart by their own source:
      // both callbacks reference `hasSettled`, nothing else does.
      if(callback.toString().includes(`hasSettled`)) {
        layoutRequests += 1;
      }
      const id = nextId++;
      queue.set(id, callback);
      return id;
    });
    cancelSpy = vi.fn((id: number) => {
      queue.delete(id);
    });
    vi.stubGlobal(`requestAnimationFrame`, requestSpy);
    vi.stubGlobal(`cancelAnimationFrame`, cancelSpy);
  });

  afterEach(() => {
    mountedGrids.splice(0).forEach(wrapper => {
      if(!unmountedGrids.has(wrapper)) {
        wrapper.unmount();
      }
    });
    // Not `vi.unstubAllGlobals()`: that would also drop tests/setup.ts's own
    // ResizeObserver stub, which every later test in this file needs.
    vi.stubGlobal(`requestAnimationFrame`, realRequestFrame);
    vi.stubGlobal(`cancelAnimationFrame`, realCancelFrame);
    restoreOffsetWidth();
  });

  it(`Should be hidden while the container has no measurable width`, async () => {
    const wrapper = mountGrid(basicLayout());
    await flushPromises();

    expect(rootStyle(wrapper)).toContain(`visibility: hidden`);
  });

  it(`Should keep transitions off while hidden`, async () => {
    const wrapper = mountGrid(basicLayout());
    await flushPromises();

    expect(rootStyle(wrapper)).toContain(`--grid-transition-duration: 0ms`);
  });

  it(`Should not schedule any settle frames while it has no width`, async () => {
    mountGrid(basicLayout());
    await flushPromises();

    expect(requestSpy).not.toHaveBeenCalled();
  });

  it(`Should be shown as soon as the container has been measured`, async () => {
    stubOffsetWidth(800);
    const wrapper = mountGrid(basicLayout());
    await flushPromises();

    expect(rootStyle(wrapper)).not.toContain(`visibility`);
  });

  it(`Should keep transitions off right after the first measurement`, async () => {
    stubOffsetWidth(800);
    const wrapper = mountGrid(basicLayout(), { layoutProps: { transitionDurationMs: 500 } });
    await flushPromises();

    expect(rootStyle(wrapper)).toContain(`--grid-transition-duration: 0ms`);
  });

  it(`Should still have transitions off after one frame`, async () => {
    stubOffsetWidth(800);
    const wrapper = mountGrid(basicLayout(), { layoutProps: { transitionDurationMs: 500 } });
    await flushPromises();

    runFrame();
    await flushPromises();

    expect(rootStyle(wrapper)).toContain(`--grid-transition-duration: 0ms`);
  });

  it(`Should switch transitions on, at the configured duration, after two frames`, async () => {
    stubOffsetWidth(800);
    const wrapper = mountGrid(basicLayout(), { layoutProps: { transitionDurationMs: 500 } });
    await flushPromises();

    runFrame();
    runFrame();
    await flushPromises();

    expect(rootStyle(wrapper)).toContain(`--grid-transition-duration: 500ms`);
    expect(rootStyle(wrapper)).not.toContain(`visibility`);
  });

  it(`Should apply a duration changed before settling once it has settled`, async () => {
    stubOffsetWidth(800);
    const wrapper = mountGrid(basicLayout());
    await flushPromises();

    await wrapper.setProps({ transitionDurationMs: 750 });
    expect(rootStyle(wrapper)).toContain(`--grid-transition-duration: 0ms`);

    runFrame();
    runFrame();
    await flushPromises();

    expect(rootStyle(wrapper)).toContain(`--grid-transition-duration: 750ms`);
  });

  it(`Should keep the timing function applied throughout`, async () => {
    stubOffsetWidth(800);
    const wrapper = mountGrid(basicLayout(), { layoutProps: { transitionTimingFunction: `linear` } });
    await flushPromises();
    expect(rootStyle(wrapper)).toContain(`--grid-transition-timing: linear`);

    runFrame();
    runFrame();
    await flushPromises();
    expect(rootStyle(wrapper)).toContain(`--grid-transition-timing: linear`);
  });

  it(`Should only schedule its two settle frames once, however often it is resized afterwards`, async () => {
    stubOffsetWidth(800);
    mountGrid(basicLayout());
    await flushPromises();
    runFrame();
    runFrame();
    await flushPromises();
    expect(layoutRequests).toBe(2);

    stubOffsetWidth(600);
    window.dispatchEvent(new Event(`resize`));
    await flushPromises();
    stubOffsetWidth(900);
    window.dispatchEvent(new Event(`resize`));
    await flushPromises();

    expect(layoutRequests).toBe(2);
  });

  it(`Should stay shown and settled when the container later reports a zero width`, async () => {
    stubOffsetWidth(800);
    const wrapper = mountGrid(basicLayout(), { layoutProps: { transitionDurationMs: 500 } });
    await flushPromises();
    runFrame();
    runFrame();
    await flushPromises();

    stubOffsetWidth(0);
    window.dispatchEvent(new Event(`resize`));
    await flushPromises();

    expect(rootStyle(wrapper)).not.toContain(`visibility`);
    expect(rootStyle(wrapper)).toContain(`--grid-transition-duration: 500ms`);
  });

  it(`Should be shown once a container that started unmeasurable gains a width`, async () => {
    const wrapper = mountGrid(basicLayout());
    await flushPromises();
    expect(rootStyle(wrapper)).toContain(`visibility: hidden`);

    stubOffsetWidth(700);
    window.dispatchEvent(new Event(`resize`));
    await flushPromises();

    expect(rootStyle(wrapper)).not.toContain(`visibility`);
    expect(rootStyle(wrapper)).toContain(`--grid-transition-duration: 0ms`);

    runFrame();
    runFrame();
    await flushPromises();
    expect(rootStyle(wrapper)).toContain(`--grid-transition-duration: 200ms`);
  });

  it(`Should cancel its pending settle frames when unmounted`, async () => {
    stubOffsetWidth(800);
    const wrapper = mountGrid(basicLayout());
    await flushPromises();
    expect(queue.size).toBeGreaterThan(0);

    wrapper.unmount();

    expect(cancelSpy).toHaveBeenCalled();
    expect(queue.size).toBe(0);
  });

  it(`Should cancel the second settle frame too when unmounted between the two frames`, async () => {
    stubOffsetWidth(800);
    const wrapper = mountGrid(basicLayout());
    await flushPromises();
    runFrame();
    expect(queue.size).toBeGreaterThan(0);

    wrapper.unmount();

    expect(queue.size).toBe(0);
  });

  it(`Should not cancel anything when unmounted without having scheduled a frame`, async () => {
    const wrapper = mountGrid(basicLayout());
    await flushPromises();

    wrapper.unmount();

    expect(cancelSpy).not.toHaveBeenCalled();
  });

  it(`Should render hidden, transitions-off markup on the server`, async () => {
    const app = createSSRApp({
      render: () => h(GridLayout, { layout: basicLayout() }, {
        default: () => basicLayout().map(item => h(GridItem, { ...item, key: item.i }, () => `Item ${item.i}`)),
      }),
    });

    const html = await renderToString(app);

    expect(html).toContain(`visibility:hidden`);
    expect(html).toContain(`--grid-transition-duration:0ms`);
  });
});
