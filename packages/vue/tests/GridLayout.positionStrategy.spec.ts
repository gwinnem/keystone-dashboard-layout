// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { afterEach, describe, expect, it } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { restoreOffsetWidth, stubOffsetWidth, mountGrid } from './helpers/mountGrid';
import { topLeftStrategy, transformStrategy } from '../src/components';

const layout = () => [{ i: `0`, x: 0, y: 0, w: 2, h: 2 }];

/** Puts every item at a fixed, recognisable spot so a test can tell this strategy's style from the built-in ones. */
const markerStrategy = {
  className: `my-position`,
  getStyle: ({ width, height }) => ({ height: `${height}px`, left: `7px`, position: `absolute`, top: `9px`, width: `${width}px` }),
  type: `marker`,
};

/** The real item, not the grid's own drag placeholder (which is also a `.vue-grid-item`). */
const firstItem = wrapper => wrapper.findAll(`.vue-grid-item`).find(item => item.text().includes(`Item 0`));

/** Grid-wide settings (and the container width) reach each item through the event bus after mount, so let that settle first. */
const mountSettled = async (layoutProps = {}) => {
  stubOffsetWidth(1200);
  const wrapper = mountGrid(layout(), { layoutProps });
  await flushPromises();
  return wrapper;
};

describe(`GridLayout positionStrategy`, () => {
  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should position with CSS transforms by default`, async () => {
    const item = firstItem(await mountSettled());

    expect(item.classes()).toContain(`css-transforms`);
    expect(item.attributes(`style`)).toContain(`translate3d`);
  });

  it(`Should keep using useCssTransforms: false when no strategy is given`, async () => {
    const item = firstItem(await mountSettled({ useCssTransforms: false }));

    expect(item.classes()).not.toContain(`css-transforms`);
    expect(item.attributes(`style`)).not.toContain(`translate3d`);
  });

  it(`Should use a custom strategy's style and class`, async () => {
    const item = firstItem(await mountSettled({ positionStrategy: markerStrategy }));

    expect(item.classes()).toContain(`my-position`);
    expect(item.classes()).not.toContain(`css-transforms`);
    expect(item.attributes(`style`)).toContain(`left: 7px`);
    expect(item.attributes(`style`)).toContain(`top: 9px`);
  });

  it(`Should let positionStrategy win over useCssTransforms`, async () => {
    const item = firstItem(await mountSettled({ positionStrategy: topLeftStrategy, useCssTransforms: true }));

    expect(item.classes()).not.toContain(`css-transforms`);
    expect(item.attributes(`style`)).not.toContain(`translate3d`);
  });

  it(`Should add no class for a strategy that does not ask for one`, async () => {
    const item = firstItem(await mountSettled({ positionStrategy: { ...markerStrategy, className: undefined } }));

    expect(item.classes()).not.toContain(`my-position`);
    expect(item.classes()).not.toContain(`css-transforms`);
  });

  it(`Should switch strategy after mount, restyling items already rendered`, async () => {
    const wrapper = await mountSettled();
    expect(firstItem(wrapper).attributes(`style`)).toContain(`translate3d`);

    await wrapper.setProps({ positionStrategy: markerStrategy });
    await flushPromises();

    expect(firstItem(wrapper).classes()).toContain(`my-position`);
    expect(firstItem(wrapper).attributes(`style`)).toContain(`left: 7px`);

    await wrapper.setProps({ positionStrategy: null });
    await flushPromises();

    expect(firstItem(wrapper).classes()).toContain(`css-transforms`);
    expect(firstItem(wrapper).attributes(`style`)).toContain(`translate3d`);
  });

  it(`Should pass rtl and the right anchor to the strategy when the grid is mirrored`, async () => {
    const seen = [];
    const spy = { getStyle: input => (seen.push(input), transformStrategy.getStyle(input)), type: `spy` };
    await mountSettled({ isMirrored: true, positionStrategy: spy });

    expect(seen.length).toBeGreaterThan(0);
    expect(seen.some(input => input.rtl === true && typeof input.right === `number`)).toBe(true);
  });
});
