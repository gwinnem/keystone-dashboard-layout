// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { createApp, defineComponent, h, inject, reactive } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { EGridItemEvent } from '@/core/griditem/enums/EGridItemEvents';
import { createEventEmitter } from '@/core/helpers/event-emitter';
import { GridItem, GridLayout } from '../src/components';
import { restoreOffsetWidth, stubOffsetWidth, mountGrid } from './helpers/mountGrid';

const trio = () => [
  { i: `0`, x: 0, y: 0, w: 2, h: 2 },
  { i: `1`, x: 2, y: 0, w: 2, h: 2 },
  { i: `2`, x: 0, y: 2, w: 2, h: 2 },
];

const stubClientHeight = (height: number): void => {
  Object.defineProperty(HTMLElement.prototype, `clientHeight`, { configurable: true, value: height });
};

const restoreClientHeight = (): void => {
  delete HTMLElement.prototype.clientHeight;
};

/** The real item with this id (the grid's own drag placeholder is also a `.vue-grid-item`). */
const item = (wrapper, id) => wrapper.find(`[data-grid-item-id="${id}"]`);

const isHidden = (wrapper, id) => item(wrapper, id).attributes(`style`).includes(`display: none`);

const mountSettled = async (layout, layoutProps = {}, itemProps = {}) => {
  stubOffsetWidth(1200);
  stubClientHeight(500);
  const wrapper = mountGrid(layout, { itemProps, layoutProps });
  await flushPromises();
  return wrapper;
};

describe(`GridLayout maximize / restore`, () => {
  afterEach(() => {
    restoreOffsetWidth();
    restoreClientHeight();
  });

  describe(`maximizing`, () => {
    it(`Should fill the grid minus one margin on each side`, async () => {
      const wrapper = await mountSettled(trio(), { maximizedItem: `1` });

      const style = item(wrapper, `1`).attributes(`style`);

      // jsdom serializes the transform without a space after the first comma.
      expect(style).toMatch(/translate3d\(10px,\s*10px,\s*0\)/);
      expect(style).toContain(`width: 1180px`);
      expect(style).toContain(`height: 480px`);
    });

    it(`Should hide every other item but keep it mounted`, async () => {
      const wrapper = await mountSettled(trio(), { maximizedItem: `1` });

      expect(item(wrapper, `0`).exists()).toBe(true);
      expect(item(wrapper, `2`).exists()).toBe(true);
      expect(isHidden(wrapper, `0`)).toBe(true);
      expect(isHidden(wrapper, `2`)).toBe(true);
      expect(isHidden(wrapper, `1`)).toBe(false);
    });

    it(`Should mark the maximized item with a class`, async () => {
      const wrapper = await mountSettled(trio(), { maximizedItem: `1` });

      expect(item(wrapper, `1`).classes()).toContain(`vue-grid-item-maximized`);
      expect(item(wrapper, `0`).classes()).not.toContain(`vue-grid-item-maximized`);
    });

    it(`Should maximize and restore through the exposed methods`, async () => {
      const wrapper = await mountSettled(trio());
      expect(wrapper.vm.maximizedItem).toBeNull();

      wrapper.vm.maximize(`2`);
      await flushPromises();
      expect(wrapper.vm.maximizedItem).toBe(`2`);
      expect(item(wrapper, `2`).attributes(`style`)).toContain(`width: 1180px`);

      wrapper.vm.restore();
      await flushPromises();
      expect(wrapper.vm.maximizedItem).toBeNull();
      expect(isHidden(wrapper, `0`)).toBe(false);
    });

    it(`Should switch straight to another item`, async () => {
      const wrapper = await mountSettled(trio(), { maximizedItem: `0` });

      wrapper.vm.maximize(`1`);
      await flushPromises();

      expect(isHidden(wrapper, `0`)).toBe(true);
      expect(isHidden(wrapper, `1`)).toBe(false);
      expect(item(wrapper, `1`).attributes(`style`)).toContain(`width: 1180px`);
    });

    it(`Should toggle with toggleMaximize`, async () => {
      const wrapper = await mountSettled(trio());

      wrapper.vm.toggleMaximize(`1`);
      expect(wrapper.vm.maximizedItem).toBe(`1`);

      wrapper.vm.toggleMaximize(`2`);
      expect(wrapper.vm.maximizedItem).toBe(`2`);

      wrapper.vm.toggleMaximize(`2`);
      expect(wrapper.vm.maximizedItem).toBeNull();
    });

    it(`Should follow the maximizedItem prop after mount`, async () => {
      const wrapper = await mountSettled(trio());

      await wrapper.setProps({ maximizedItem: `1` });
      await flushPromises();
      expect(isHidden(wrapper, `0`)).toBe(true);

      await wrapper.setProps({ maximizedItem: null });
      await flushPromises();
      expect(isHidden(wrapper, `0`)).toBe(false);
    });

    it(`Should use the grid height measured when the item was maximized`, async () => {
      const wrapper = await mountSettled(trio());
      stubClientHeight(300);

      wrapper.vm.maximize(`0`);
      await flushPromises();

      expect(item(wrapper, `0`).attributes(`style`)).toContain(`height: 280px`);
    });

    it(`Should anchor to the right edge when the grid is mirrored`, async () => {
      const wrapper = await mountSettled(trio(), { isMirrored: true, maximizedItem: `0`, useCssTransforms: false });

      const style = item(wrapper, `0`).attributes(`style`);

      expect(style).toContain(`right: 10px`);
      expect(style).not.toContain(`left: 10px`);
    });

    it(`Should ignore an id the layout does not have`, async () => {
      const wrapper = await mountSettled(trio(), { maximizedItem: `nope` });

      expect(wrapper.vm.maximizedItem).toBeNull();
      expect(isHidden(wrapper, `0`)).toBe(false);
    });

    it(`Should work with a numeric id`, async () => {
      const layout = [{ i: 0, x: 0, y: 0, w: 2, h: 2 }, { i: 1, x: 2, y: 0, w: 2, h: 2 }];
      const wrapper = await mountSettled(layout, { maximizedItem: 0 });

      expect(wrapper.vm.maximizedItem).toBe(0);
      expect(isHidden(wrapper, `1`)).toBe(true);
    });
  });

  describe(`restoring`, () => {
    it(`Should put every item back where layout has it, without touching layout`, async () => {
      const layout = trio();
      const wrapper = await mountSettled(layout);
      const before = JSON.stringify(layout);
      const styleBefore = item(wrapper, `1`).attributes(`style`);

      wrapper.vm.maximize(`1`);
      await flushPromises();
      expect(JSON.stringify(layout)).toBe(before);

      wrapper.vm.restore();
      await flushPromises();

      expect(JSON.stringify(layout)).toBe(before);
      expect(item(wrapper, `1`).attributes(`style`)).toBe(styleBefore);
      expect(item(wrapper, `1`).classes()).not.toContain(`vue-grid-item-maximized`);
    });

    it(`Should do nothing when nothing is maximized`, async () => {
      const wrapper = await mountSettled(trio());

      wrapper.vm.restore();

      expect(wrapper.emitted(`update:maximizedItem`)).toBeUndefined();
    });

    it(`Should un-hide the others when the maximized item is removed from layout`, async () => {
      const layout = reactive(trio());
      const wrapper = await mountSettled(layout, { maximizedItem: `1` });
      expect(isHidden(wrapper, `0`)).toBe(true);

      layout.splice(1, 1);
      await flushPromises();

      expect(wrapper.vm.maximizedItem).toBeNull();
      expect(isHidden(wrapper, `0`)).toBe(false);
      expect(wrapper.emitted(`update:maximizedItem`)).toStrictEqual([[null]]);
    });
  });

  describe(`events`, () => {
    it(`Should emit update:maximizedItem with the id, then null`, async () => {
      const wrapper = await mountSettled(trio());

      wrapper.vm.maximize(`1`);
      wrapper.vm.restore();

      expect(wrapper.emitted(`update:maximizedItem`)).toStrictEqual([[`1`], [null]]);
    });

    it(`Should not emit when the item is already maximized`, async () => {
      const wrapper = await mountSettled(trio());

      wrapper.vm.maximize(`1`);
      wrapper.vm.maximize(`1`);

      expect(wrapper.emitted(`update:maximizedItem`)).toHaveLength(1);
    });

    it(`Should not emit for an id the layout does not have`, async () => {
      const wrapper = await mountSettled(trio());

      wrapper.vm.maximize(`nope`);

      expect(wrapper.emitted(`update:maximizedItem`)).toBeUndefined();
    });

    it(`Should not emit when the change came from the prop`, async () => {
      const wrapper = await mountSettled(trio());

      await wrapper.setProps({ maximizedItem: `1` });
      await wrapper.setProps({ maximizedItem: null });

      expect(wrapper.emitted(`update:maximizedItem`)).toBeUndefined();
    });

    it(`Should not emit a layout update just for maximizing`, async () => {
      const wrapper = await mountSettled(trio());
      const updates = (wrapper.emitted(`update:layout`) ?? []).length;

      wrapper.vm.maximize(`1`);
      await flushPromises();
      wrapper.vm.restore();
      await flushPromises();

      expect((wrapper.emitted(`update:layout`) ?? []).length).toBe(updates);
    });
  });

  describe(`Escape`, () => {
    it(`Should restore on Escape`, async () => {
      const wrapper = await mountSettled(trio(), { maximizedItem: `1` });

      await item(wrapper, `1`).trigger(`keydown`, { key: `Escape` });

      expect(wrapper.vm.maximizedItem).toBeNull();
      expect(wrapper.emitted(`update:maximizedItem`)).toStrictEqual([[null]]);
    });

    it(`Should ignore other keys`, async () => {
      const wrapper = await mountSettled(trio(), { maximizedItem: `1` });

      await item(wrapper, `1`).trigger(`keydown`, { key: `Enter` });

      expect(wrapper.vm.maximizedItem).toBe(`1`);
    });

    it(`Should leave an Escape that something inside the item already handled`, async () => {
      const wrapper = await mountSettled(trio(), { maximizedItem: `1` });
      item(wrapper, `1`).element.addEventListener(`keydown`, event => event.preventDefault());

      await item(wrapper, `1`).trigger(`keydown`, { key: `Escape` });

      expect(wrapper.vm.maximizedItem).toBe(`1`);
    });

    it(`Should do nothing on Escape when nothing is maximized`, async () => {
      const wrapper = await mountSettled(trio());

      await item(wrapper, `1`).trigger(`keydown`, { key: `Escape` });

      expect(wrapper.emitted(`update:maximizedItem`)).toBeUndefined();
    });
  });

  describe(`compaction`, () => {
    const gap = () => [{ i: `0`, x: 0, y: 0, w: 2, h: 2 }, { i: `1`, x: 0, y: 6, w: 2, h: 2 }];

    it(`Should suspend compaction while maximized, and compact once on restore`, async () => {
      const layout = gap();
      const wrapper = await mountSettled(layout, { maximizedItem: `0` });
      const found = id => layout.find(entry => entry.i === id);
      // Mounting with an item maximized left the gap alone.
      expect(found(`1`).y).toBe(6);

      wrapper.vm.compactNow();
      expect(found(`1`).y).toBe(6);

      wrapper.vm.restore();
      await flushPromises();

      expect(found(`1`).y).toBe(2);
    });

    it(`Should emit the layout events on restore only when compaction moved something`, async () => {
      const layout = gap();
      const wrapper = await mountSettled(layout, { maximizedItem: `0` });
      const updates = () => (wrapper.emitted(`update:layout`) ?? []).length;
      const before = updates();

      wrapper.vm.restore();
      await flushPromises();
      expect(updates()).toBe(before + 1);

      wrapper.vm.maximize(`0`);
      const settled = updates();
      wrapper.vm.restore();
      await flushPromises();
      expect(updates()).toBe(settled);
    });

    it(`Should tell the items to recompute on restore even when nothing had to move`, async () => {
      const heard = vi.fn();
      // Sits in the grid like an item does and listens on the same event bus the items use.
      const Probe = defineComponent({
        setup() {
          inject(`eventBus`).on(`compact`, heard);
          return () => h(`span`);
        },
      });
      stubOffsetWidth(1200);
      stubClientHeight(500);
      const layout = trio();
      const wrapper = mount(GridLayout, {
        props: { layout, maximizedItem: `0` },
        slots: { default: () => [h(Probe), ...layout.map(entry => h(GridItem, { ...entry, key: entry.i }))] },
      });
      await flushPromises();
      heard.mockClear();

      wrapper.vm.restore();
      await flushPromises();

      expect(heard).toHaveBeenCalled();
    });

    it(`Should show the compacted positions once restored`, async () => {
      const restored = await mountSettled(gap(), { maximizedItem: `0` });
      restored.vm.restore();
      await flushPromises();
      // The same layout, compacted from the start, is where the restored item has to end up on screen too.
      const reference = await mountSettled(gap());

      expect(item(restored, `1`).attributes(`style`)).toBe(item(reference, `1`).attributes(`style`));
    });
  });

  describe(`interaction while maximized`, () => {
    it(`Should not be draggable or resizable, and be again once restored`, async () => {
      const wrapper = await mountSettled(trio());
      expect(item(wrapper, `1`).classes()).toContain(`vue-draggable`);
      expect(item(wrapper, `1`).classes()).toContain(`vue-resizable`);

      wrapper.vm.maximize(`1`);
      await flushPromises();
      expect(item(wrapper, `1`).classes()).not.toContain(`vue-draggable`);
      expect(item(wrapper, `1`).classes()).not.toContain(`vue-resizable`);
      expect(item(wrapper, `1`).find(`.vue-resize-hint--se`).exists()).toBe(false);

      wrapper.vm.restore();
      await flushPromises();
      expect(item(wrapper, `1`).classes()).toContain(`vue-draggable`);
      expect(item(wrapper, `1`).classes()).toContain(`vue-resizable`);
    });

    it(`Should not move from the keyboard while maximized`, async () => {
      const layout = trio();
      const wrapper = await mountSettled(layout);
      const found = () => layout.find(entry => entry.i === `1`);

      wrapper.vm.maximize(`1`);
      await flushPromises();
      await item(wrapper, `1`).trigger(`keydown`, { key: `ArrowRight` });
      expect(found().x).toBe(2);

      wrapper.vm.restore();
      await flushPromises();
      await item(wrapper, `1`).trigger(`keydown`, { key: `ArrowRight` });
      expect(found().x).toBe(3);
    });

    it(`Should keep the close button while maximized`, async () => {
      const wrapper = await mountSettled(trio(), { maximizedItem: `1`, showCloseButton: true });

      expect(item(wrapper, `1`).find(`.btn-close`).exists()).toBe(true);
    });
  });

  describe(`the maximize button`, () => {
    it(`Should not render by default`, async () => {
      const wrapper = await mountSettled(trio());

      expect(wrapper.find(`.btn-maximize`).exists()).toBe(false);
    });

    it(`Should render on every item when the grid asks for it`, async () => {
      const wrapper = await mountSettled(trio(), { showMaximizeButton: true });

      expect(wrapper.findAll(`.btn-maximize`)).toHaveLength(3);
    });

    it(`Should let an item decide for itself, either way`, async () => {
      const on = await mountSettled(trio(), {}, { showMaximizeButton: true });
      const off = await mountSettled(trio(), { showMaximizeButton: true }, { showMaximizeButton: false });

      expect(on.findAll(`.btn-maximize`)).toHaveLength(3);
      expect(off.find(`.btn-maximize`).exists()).toBe(false);
    });

    it(`Should maximize its item when clicked, then restore it`, async () => {
      const wrapper = await mountSettled(trio(), { showMaximizeButton: true });

      await item(wrapper, `1`).find(`.btn-maximize`).trigger(`click`);
      expect(wrapper.vm.maximizedItem).toBe(`1`);
      expect(isHidden(wrapper, `0`)).toBe(true);

      await item(wrapper, `1`).find(`.btn-maximize`).trigger(`click`);
      expect(wrapper.vm.maximizedItem).toBeNull();
      expect(isHidden(wrapper, `0`)).toBe(false);
    });

    it(`Should label itself Maximize, and Restore while maximized`, async () => {
      const wrapper = await mountSettled(trio(), { showMaximizeButton: true });
      const label = () => item(wrapper, `1`).find(`.btn-maximize .visually-hidden`).text();
      expect(label()).toBe(`Maximize`);

      wrapper.vm.maximize(`1`);
      await flushPromises();

      expect(label()).toBe(`Restore`);
      expect(item(wrapper, `1`).find(`.btn-maximize`).classes()).toContain(`btn-maximize--active`);
    });

    it(`Should take its labels from ariaLabels`, async () => {
      const wrapper = await mountSettled(trio(), { ariaLabels: { maximizeButton: `Vergroot`, restoreButton: `Herstel` }, showMaximizeButton: true });
      const label = () => item(wrapper, `1`).find(`.btn-maximize .visually-hidden`).text();
      expect(label()).toBe(`Vergroot`);

      wrapper.vm.maximize(`1`);
      await flushPromises();

      expect(label()).toBe(`Herstel`);
    });

    it(`Should work on a static item and with edit mode off`, async () => {
      const layout = [{ i: `0`, x: 0, y: 0, w: 2, h: 2, isStatic: true }, { i: `1`, x: 2, y: 0, w: 2, h: 2 }];
      const wrapper = await mountSettled(layout, { enableEditMode: false, showMaximizeButton: true });

      await item(wrapper, `0`).find(`.btn-maximize`).trigger(`click`);

      expect(wrapper.vm.maximizedItem).toBe(`0`);
    });

    it(`Should not count as a click on the item`, async () => {
      const wrapper = await mountSettled(trio(), { multiSelect: true, showMaximizeButton: true });

      await item(wrapper, `1`).find(`.btn-maximize`).trigger(`click`);

      expect(wrapper.vm.selectedItemIds.size).toBe(0);
    });

    describe(`focus (Safari does not focus a button on click)`, () => {
      const attached = [];

      afterEach(() => {
        attached.splice(0).forEach(wrapper => wrapper.unmount());
      });

      /** Mounted into the document: `focus()` does nothing on an element that is not in it. */
      const mountAttached = async () => {
        stubOffsetWidth(1200);
        stubClientHeight(500);
        const layout = trio();
        const wrapper = mount(GridLayout, {
          attachTo: document.body,
          props: { layout, showMaximizeButton: true },
          slots: { default: () => layout.map(entry => h(GridItem, { ...entry, key: entry.i }, () => `Item ${entry.i}`)) },
        });
        attached.push(wrapper);
        await flushPromises();
        return wrapper;
      };

      const button = (wrapper, id) => item(wrapper, id).find(`.btn-maximize`);

      it(`Should take focus when clicked, so the grid hears the next key`, async () => {
        const wrapper = await mountAttached();
        expect(document.activeElement).not.toBe(button(wrapper, `1`).element);

        await button(wrapper, `1`).trigger(`click`);

        expect(document.activeElement).toBe(button(wrapper, `1`).element);
      });

      it(`Should restore on Escape right after a click maximized the item`, async () => {
        const wrapper = await mountAttached();
        await button(wrapper, `1`).trigger(`click`);
        expect(wrapper.vm.maximizedItem).toBe(`1`);

        document.activeElement.dispatchEvent(new KeyboardEvent(`keydown`, { bubbles: true, cancelable: true, key: `Escape` }));
        await flushPromises();

        expect(wrapper.vm.maximizedItem).toBeNull();
      });

      it(`Should keep focus on the same button when a click restores the item`, async () => {
        const wrapper = await mountAttached();
        await button(wrapper, `1`).trigger(`click`);
        const focused = document.activeElement;

        await button(wrapper, `1`).trigger(`click`);

        expect(wrapper.vm.maximizedItem).toBeNull();
        expect(document.activeElement).toBe(focused);
        expect(focused).toBe(button(wrapper, `1`).element);
      });

      it(`Should leave focus alone when the item is maximized through the exposed method`, async () => {
        const wrapper = await mountAttached();
        const input = document.createElement(`input`);
        document.body.appendChild(input);
        input.focus();

        wrapper.vm.maximize(`1`);
        await flushPromises();

        expect(document.activeElement).toBe(input);
        input.remove();
      });
    });
  });

  describe(`which items react`, () => {
    const resizedCount = (wrapper, id) => (wrapper.findComponent(`[data-grid-item-id="${id}"]`).emitted(`container-resized`) ?? []).length;

    it(`Should recompute only the items a maximize change involves`, async () => {
      const wrapper = await mountSettled(trio());
      const base = [resizedCount(wrapper, `0`), resizedCount(wrapper, `1`), resizedCount(wrapper, `2`)];

      wrapper.vm.maximize(`0`);
      await flushPromises();
      expect(resizedCount(wrapper, `0`)).toBeGreaterThan(base[0]);
      expect(resizedCount(wrapper, `1`)).toBe(base[1]);
      expect(resizedCount(wrapper, `2`)).toBe(base[2]);
      const next = [resizedCount(wrapper, `0`), resizedCount(wrapper, `1`), resizedCount(wrapper, `2`)];

      wrapper.vm.maximize(`1`);
      await flushPromises();
      // The item that was maximized goes back to its layout size, the new one fills the grid, the third is left alone.
      expect(resizedCount(wrapper, `0`)).toBeGreaterThan(next[0]);
      expect(resizedCount(wrapper, `1`)).toBeGreaterThan(next[1]);
      expect(resizedCount(wrapper, `2`)).toBe(next[2]);
      expect(item(wrapper, `0`).attributes(`style`)).not.toContain(`width: 1180px`);
    });
  });

  describe(`standing on its own`, () => {
    const mountBare = props => {
      const element = document.createElement(`div`);
      document.body.appendChild(element);
      const errors = [];
      const app = createApp(GridItem, { h: 2, i: `0`, w: 2, x: 0, y: 0, ...props });
      app.provide(`eventBus`, createEventEmitter());
      app.config.errorHandler = error => errors.push(error);
      app.mount(element);
      return { app, element, errors };
    };

    it(`Should neither hide itself nor show the maximize button without a grid around it`, () => {
      const { app, element, errors } = mountBare({});

      expect(errors).toStrictEqual([]);
      expect(element.querySelector(`.vue-grid-item`)).not.toBeNull();
      expect(element.querySelector(`.vue-grid-item`).getAttribute(`style`)).not.toContain(`display: none`);
      expect(element.querySelector(`.btn-maximize`)).toBeNull();
      app.unmount();
    });

    it(`Should still show the maximize button when the item asks for it`, () => {
      const { app, element, errors } = mountBare({ showMaximizeButton: true });

      expect(errors).toStrictEqual([]);
      expect(element.querySelector(`.btn-maximize`)).not.toBeNull();
      app.unmount();
    });
  });

  describe(`Android touch handling`, () => {
    const hasNoTouch = async layoutProps => {
      const original = navigator.userAgent;
      Object.defineProperty(navigator, `userAgent`, { configurable: true, value: `Android` });
      try {
        const wrapper = await mountSettled(trio(), layoutProps);
        return item(wrapper, `0`).classes().includes(`no-touch`);
      } finally {
        Object.defineProperty(navigator, `userAgent`, { configurable: true, value: original });
      }
    };

    it(`Should apply no-touch when the item can be dragged or resized, either one`, async () => {
      expect(await hasNoTouch({ isDraggable: true, isResizable: false })).toBe(true);
      expect(await hasNoTouch({ isDraggable: false, isResizable: true })).toBe(true);
    });

    it(`Should not apply no-touch when the item can be neither dragged nor resized`, async () => {
      expect(await hasNoTouch({ isDraggable: false, isResizable: false })).toBe(false);
    });
  });

  describe(`resizing after an item stops being static`, () => {
    it(`Should wire the resize handles up when isStatic is switched off`, async () => {
      stubOffsetWidth(1200);
      stubClientHeight(500);
      // The prop lives apart from the layout entry, as it does for a consumer: the grid copies a static prop onto the
      // entry and takes it off again, which would fight a test that flipped the entry itself.
      const entry = { i: `0`, x: 0, y: 0, w: 2, h: 2 };
      const itemProps = reactive({ isStatic: false });
      const wrapper = mount(GridLayout, {
        props: { layout: [entry] },
        slots: { default: () => h(GridItem, { ...entry, isStatic: itemProps.isStatic }) },
      });
      await flushPromises();

      // Static takes the handles away; switching it off renders new ones, which nothing listens to until re-attached.
      itemProps.isStatic = true;
      await flushPromises();
      expect(item(wrapper, `0`).find(`.vue-resize-hint--se`).exists()).toBe(false);
      itemProps.isStatic = false;
      await flushPromises();
      expect(item(wrapper, `0`).find(`.vue-resize-hint--se`).exists()).toBe(true);

      const root = item(wrapper, `0`).element;
      Object.defineProperty(root, `offsetParent`, { configurable: true, value: document.body });
      document.body.getBoundingClientRect = () => ({ bottom: 0, height: 0, left: 0, right: 0, toJSON: () => ({}), top: 0, width: 0, x: 0, y: 0 });
      item(wrapper, `0`).find(`.vue-resize-hint--se`).element.dispatchEvent(new PointerEvent(`pointerdown`, { bubbles: true, button: 0, clientX: 0, clientY: 0, pointerId: 1 }));

      expect(wrapper.findComponent(`[data-grid-item-id="0"]`).emitted(EGridItemEvent.RESIZE)).toBeTruthy();
    });
  });

  describe(`resizing after a restore`, () => {
    it(`Should wire the new resize handles up again`, async () => {
      const wrapper = await mountSettled(trio());
      wrapper.vm.maximize(`1`);
      await flushPromises();
      wrapper.vm.restore();
      await flushPromises();

      // What the item reads its position from while a gesture starts.
      const root = item(wrapper, `1`).element;
      Object.defineProperty(root, `offsetParent`, { configurable: true, value: document.body });
      document.body.getBoundingClientRect = () => ({ bottom: 0, height: 0, left: 0, right: 0, toJSON: () => ({}), top: 0, width: 0, x: 0, y: 0 });
      item(wrapper, `1`).find(`.vue-resize-hint--se`).element.dispatchEvent(new PointerEvent(`pointerdown`, { bubbles: true, button: 0, clientX: 0, clientY: 0, pointerId: 1 }));

      expect(wrapper.findComponent(`[data-grid-item-id="1"]`).emitted(EGridItemEvent.RESIZE)).toBeTruthy();
    });
  });

  describe(`item events`, () => {
    it(`Should report the new pixel size of the maximized item`, async () => {
      const wrapper = await mountSettled(trio());

      wrapper.vm.maximize(`1`);
      await flushPromises();

      const resized = wrapper.findComponent(`[data-grid-item-id="1"]`);
      const events = resized.emitted(`container-resized`);
      expect(events.at(-1).slice(3)).toStrictEqual([480, 1180]);
    });
  });
});
