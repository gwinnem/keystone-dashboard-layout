// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { afterEach, describe, expect, it } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { exportLayoutAsSvg } from '../src/components';
import { restoreOffsetWidth, stubOffsetWidth, mountGrid } from './helpers/mountGrid';

const items = () => [
  { i: `a`, x: 0, y: 0, w: 4, h: 2 },
  { i: `b`, x: 4, y: 0, w: 2, h: 3 },
];

const mountSettled = async (layoutProps = {}, width = 1200) => {
  stubOffsetWidth(width);
  const layout = items();
  const wrapper = mountGrid(layout, { layoutProps });
  await flushPromises();
  return { wrapper, layout };
};

describe(`GridLayout exportLayoutAsSvg`, () => {
  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should render the grid's own layout with its live colNum, rowHeight, margin and width`, async () => {
    const { wrapper, layout } = await mountSettled({ colNum: 6, rowHeight: 40, margin: [4, 8] }, 900);

    expect(wrapper.vm.exportLayoutAsSvg()).toBe(
      exportLayoutAsSvg(layout, { colNum: 6, rowHeight: 40, margin: [4, 8], containerWidth: 900 }),
    );
  });

  it(`Should fall back to a 1200px container width while the grid has not been measured yet`, async () => {
    // No stubOffsetWidth: jsdom reports 0, so the grid never gets a real width.
    const layout = items();
    const wrapper = mountGrid(layout, { layoutProps: { colNum: 6, rowHeight: 40, margin: [4, 8] } });
    await flushPromises();

    expect(wrapper.vm.exportLayoutAsSvg()).toBe(
      exportLayoutAsSvg(layout, { colNum: 6, rowHeight: 40, margin: [4, 8], containerWidth: 1200 }),
    );
  });

  it(`Should return a complete svg document`, async () => {
    const { wrapper } = await mountSettled();

    const svg = wrapper.vm.exportLayoutAsSvg();
    expect(svg.startsWith(`<svg`)).toBe(true);
    expect(svg.trimEnd().endsWith(`</svg>`)).toBe(true);
  });

  it(`Should let explicit options override the grid's values`, async () => {
    const { wrapper, layout } = await mountSettled({ colNum: 6, rowHeight: 40, margin: [4, 8] }, 900);

    expect(wrapper.vm.exportLayoutAsSvg({ backgroundColor: `#ff0000`, containerWidth: 600 })).toBe(
      exportLayoutAsSvg(layout, {
        colNum: 6,
        rowHeight: 40,
        margin: [4, 8],
        containerWidth: 600,
        backgroundColor: `#ff0000`,
      }),
    );
  });

  it(`Should reflect layout changes made after mount`, async () => {
    const { wrapper, layout } = await mountSettled({ colNum: 6, rowHeight: 40, margin: [4, 8] }, 900);
    const before = wrapper.vm.exportLayoutAsSvg();

    layout.push({ i: `c`, x: 0, y: 5, w: 2, h: 2 });

    expect(wrapper.vm.exportLayoutAsSvg()).not.toBe(before);
  });
});
