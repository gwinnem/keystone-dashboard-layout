// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { mountGrid, restoreOffsetWidth, stubOffsetWidth } from './helpers/mountGrid';

/**
 * The per-breakpoint cache is seeded from `responsiveLayouts`. It used to be seeded only at mount, so a value that
 * arrived later (a prop set after mount, or responsive mode switched on afterwards) was never used.
 */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 8; i++) {
    // eslint-disable-next-line no-await-in-loop
    await nextTick();
  }
};

const baseLayout = () => [
  { h: 2, i: `0`, w: 2, x: 0, y: 0 },
  { h: 2, i: `1`, w: 2, x: 2, y: 0 },
];

describe(`GridLayout responsiveLayouts supplied after mount`, () => {
  beforeEach(() => {
    stubOffsetWidth(500); // 'xs' under the default breakpoints
  });

  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should use a supplied layout for the current breakpoint when responsive mode is switched on afterwards`, async () => {
    // compactType "none": the default (vertical) would float the supplied items up to row 0 and hide what is asserted.
    const wrapper = mountGrid(baseLayout(), { layoutProps: { compactType: `none`, margin: [10, 10], rowHeight: 100 } });
    await settle();
    const supplied = [{ h: 3, i: `0`, w: 1, x: 1, y: 1 }, { h: 3, i: `1`, w: 1, x: 3, y: 1 }];

    await wrapper.setProps({ responsive: true, responsiveLayouts: { xs: supplied } });
    await settle();

    const changed = wrapper.emitted(`breakpoint-changed`);
    expect(changed).toBeTruthy();
    const [name, layout] = changed.at(-1);
    expect(name).toBe(`xs`);
    expect(layout).toMatchObject(supplied);
  });

  it(`Should reset the per-breakpoint cache to the new value when responsiveLayouts is replaced`, async () => {
    const wrapper = mountGrid(baseLayout(), { layoutProps: { margin: [10, 10], responsive: true, rowHeight: 100 } });
    await settle();
    // Responsive mode already built a cache entry for the current breakpoint.
    expect(wrapper.vm.layouts).toHaveProperty(`xs`);

    const seeded = [{ h: 1, i: `0`, w: 1, x: 0, y: 0 }];
    await wrapper.setProps({ responsiveLayouts: { md: seeded } });
    await settle();

    expect(wrapper.vm.layouts).toHaveProperty(`md`);
    expect(wrapper.vm.layouts).not.toHaveProperty(`xs`);
  });
});
