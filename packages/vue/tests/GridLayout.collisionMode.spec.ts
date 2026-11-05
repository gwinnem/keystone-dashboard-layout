// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { afterEach, describe, expect, it } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { restoreOffsetWidth, stubOffsetWidth, mountGrid } from './helpers/mountGrid';

const row = () => [
  { i: `0`, x: 0, y: 0, w: 2, h: 2 },
  { i: `1`, x: 2, y: 0, w: 2, h: 2 },
];

const mountSettled = async (layout, layoutProps = {}) => {
  stubOffsetWidth(1200);
  const wrapper = mountGrid(layout, { layoutProps });
  await flushPromises();
  return wrapper;
};

const at = (layout, id) => {
  const found = layout.find(l => l.i === id);
  return [found.x, found.y];
};

describe(`GridLayout collisionMode`, () => {
  afterEach(() => {
    restoreOffsetWidth();
  });

  it(`Should swap the dragged item with the one it is dropped on when collisionMode is swap`, async () => {
    const layout = row();
    const wrapper = await mountSettled(layout, { collisionMode: `swap` });

    wrapper.vm.dragEvent(`dragstart`, `0`, 0, 0, 2, 2);
    wrapper.vm.dragEvent(`dragend`, `0`, 2, 0, 2, 2);

    expect(at(layout, `0`)).toEqual([2, 0]);
    expect(at(layout, `1`)).toEqual([0, 0]);
  });

  it(`Should push the other item aside by default, as before`, async () => {
    const layout = row();
    const wrapper = await mountSettled(layout);

    wrapper.vm.dragEvent(`dragstart`, `0`, 0, 0, 2, 2);
    wrapper.vm.dragEvent(`dragend`, `0`, 2, 0, 2, 2);

    expect(at(layout, `0`)).toEqual([2, 0]);
    expect(at(layout, `1`)[0]).toBe(2);
    expect(at(layout, `1`)[1]).toBeGreaterThan(0);
  });

  it(`Should put a swapped-out item back when the drag moves on to somewhere else`, async () => {
    const layout = row();
    const wrapper = await mountSettled(layout, { collisionMode: `swap` });

    wrapper.vm.dragEvent(`dragstart`, `0`, 0, 0, 2, 2);
    wrapper.vm.dragEvent(`dragmove`, `0`, 2, 0, 2, 2);
    expect(at(layout, `1`)).toEqual([0, 0]);

    wrapper.vm.dragEvent(`dragmove`, `0`, 6, 0, 2, 2);
    wrapper.vm.dragEvent(`dragend`, `0`, 6, 0, 2, 2);

    expect(at(layout, `0`)).toEqual([6, 0]);
    expect(at(layout, `1`)).toEqual([2, 0]);
  });

  it(`Should fall back to pushing when the drag has not yet cleared the other item`, async () => {
    const layout = row();
    const wrapper = await mountSettled(layout, { collisionMode: `swap` });

    wrapper.vm.dragEvent(`dragstart`, `0`, 0, 0, 2, 2);
    wrapper.vm.dragEvent(`dragend`, `0`, 1, 0, 2, 2);

    // Not swapped: item 1 did not end up in item 0's old cell.
    expect(at(layout, `1`)).not.toEqual([0, 0]);
  });

  it(`Should ignore swap while preventCollision is on, so the drop is blocked`, async () => {
    const layout = row();
    const wrapper = await mountSettled(layout, { collisionMode: `swap`, preventCollision: true });

    wrapper.vm.dragEvent(`dragstart`, `0`, 0, 0, 2, 2);
    wrapper.vm.dragEvent(`dragend`, `0`, 2, 0, 2, 2);

    expect(at(layout, `0`)).toEqual([0, 0]);
    expect(at(layout, `1`)).toEqual([2, 0]);
  });

  it(`Should not swap with a static item`, async () => {
    const layout = [{ i: `0`, x: 0, y: 0, w: 2, h: 2 }, { i: `1`, x: 2, y: 0, w: 2, h: 2, isStatic: true }];
    const wrapper = await mountSettled(layout, { collisionMode: `swap` });

    wrapper.vm.dragEvent(`dragstart`, `0`, 0, 0, 2, 2);
    wrapper.vm.dragEvent(`dragend`, `0`, 2, 0, 2, 2);

    expect(at(layout, `1`)).toEqual([2, 0]);
    expect(at(layout, `0`)).not.toEqual([2, 0]);
  });

  it(`Should start every drag from a clean state, whatever the previous one did`, async () => {
    const layout = row();
    const wrapper = await mountSettled(layout, { collisionMode: `swap` });

    wrapper.vm.dragEvent(`dragstart`, `0`, 0, 0, 2, 2);
    wrapper.vm.dragEvent(`dragend`, `0`, 2, 0, 2, 2);
    // Item 0 is now at x=2, item 1 at x=0. Drag item 1 back onto item 0.
    wrapper.vm.dragEvent(`dragstart`, `1`, 0, 0, 2, 2);
    wrapper.vm.dragEvent(`dragend`, `1`, 2, 0, 2, 2);

    expect(at(layout, `0`)).toEqual([0, 0]);
    expect(at(layout, `1`)).toEqual([2, 0]);
  });
});
