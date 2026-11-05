// Kills mutation-testing survivors in src/helpers/native-interaction.ts that
// the behavioural suite in native-interaction.spec.ts left alive: exact
// auto-scroll arithmetic at non-zero distances (the existing exact-value tests
// use distance 0, where `1 - d/m`, `1 + d/m` and `/ (1 - …)` all coincide),
// listener/pointer-capture cleanup, and the overflow checks.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createNativeAutoScroll,
  createNativeDraggable,
  createNativeResizable,
} from '../src/helpers/native-interaction';

const pointer = (type: string, clientX: number, clientY: number, pointerId = 1): PointerEvent => (
  new PointerEvent(type, { bubbles: true, button: 0, clientX, clientY, pointerId })
);

const rect = (right: number, bottom: number, left = 0, top = 0): DOMRect => (
  { bottom, height: bottom - top, left, right, toJSON: () => ({}), top, width: right - left, x: left, y: top }
);

describe(`native-interaction (mutation hardening)`, () => {
  afterEach(() => {
    document.body.innerHTML = ``;
    vi.restoreAllMocks();
  });

  describe(`createNativeDraggable`, () => {
    const setup = (options: Parameters<typeof createNativeDraggable>[1] extends () => infer R ? R : never = { enabled: true }) => {
      const el = document.createElement(`div`);
      document.body.appendChild(el);
      const events: { type: string }[] = [];
      const draggable = createNativeDraggable(el, () => options, (event) => events.push(event));
      return { draggable, el, events };
    };

    it(`Should measure the threshold from the pointerdown position, not from the origin`, () => {
      const { el, events } = setup();
      el.dispatchEvent(pointer(`pointerdown`, 100, 100));
      el.dispatchEvent(pointer(`pointermove`, 101, 101));
      expect(events).toStrictEqual([]);

      const second = setup();
      second.el.dispatchEvent(pointer(`pointerdown`, 0, 100));
      second.el.dispatchEvent(pointer(`pointermove`, 1, 101));
      expect(second.events).toStrictEqual([]);
    });

    it(`Should start a drag at exactly the threshold distance (3px) but not just under it`, () => {
      const under = setup();
      under.el.dispatchEvent(pointer(`pointerdown`, 10, 10));
      under.el.dispatchEvent(pointer(`pointermove`, 12, 10));
      expect(under.events).toStrictEqual([]);

      const exact = setup();
      exact.el.dispatchEvent(pointer(`pointerdown`, 10, 10));
      exact.el.dispatchEvent(pointer(`pointermove`, 13, 10));
      expect(exact.events.map((e) => e.type)).toStrictEqual([`dragstart`, `dragmove`]);
    });

    it(`Should treat a null activationDistance as unset (default threshold), not throw`, () => {
      const { el, events } = setup({ activationDistance: null, enabled: true });
      el.dispatchEvent(pointer(`pointerdown`, 0, 0));
      expect(() => el.dispatchEvent(pointer(`pointermove`, 10, 0))).not.toThrow();
      expect(events.map((e) => e.type)).toStrictEqual([`dragstart`, `dragmove`]);
    });

    it(`Should still drag when ignoreFrom is set but does not match the pointerdown target`, () => {
      const { el, events } = setup({ enabled: true, ignoreFrom: `.nope` });
      el.dispatchEvent(pointer(`pointerdown`, 0, 0));
      el.dispatchEvent(pointer(`pointermove`, 10, 0));
      expect(events.map((e) => e.type)).toStrictEqual([`dragstart`, `dragmove`]);
    });

    it(`Should release pointer capture and remove all three gesture listeners on pointerup`, () => {
      const { el } = setup();
      const release = vi.fn();
      el.releasePointerCapture = release;
      const removeSpy = vi.spyOn(el, `removeEventListener`);

      el.dispatchEvent(pointer(`pointerdown`, 0, 0, 7));
      el.dispatchEvent(pointer(`pointerup`, 0, 0, 7));

      expect(release).toHaveBeenCalledWith(7);
      const removed = removeSpy.mock.calls.map(([name]) => name);
      expect(removed).toContain(`pointermove`);
      expect(removed).toContain(`pointerup`);
      expect(removed).toContain(`pointercancel`);
      expect(removeSpy.mock.calls.find(([name]) => name === `pointermove`)?.[1]).toBeTypeOf(`function`);
    });

    it(`Should register a pointercancel listener, and end the drag when it fires`, () => {
      const { el, events } = setup();
      const addSpy = vi.spyOn(el, `addEventListener`);
      el.dispatchEvent(pointer(`pointerdown`, 0, 0));
      expect(addSpy.mock.calls.map(([name]) => name)).toContain(`pointercancel`);

      el.dispatchEvent(pointer(`pointermove`, 20, 0));
      el.dispatchEvent(pointer(`pointercancel`, 20, 0));
      expect(events.map((e) => e.type)).toStrictEqual([`dragstart`, `dragmove`, `dragend`]);
    });

    it(`Should not throw, and still clean up, when releasePointerCapture throws`, () => {
      const { el, events } = setup();
      el.releasePointerCapture = vi.fn(() => {
        throw new Error(`already released`);
      });
      const removeSpy = vi.spyOn(el, `removeEventListener`);

      el.dispatchEvent(pointer(`pointerdown`, 0, 0));
      el.dispatchEvent(pointer(`pointermove`, 20, 0));
      expect(() => el.dispatchEvent(pointer(`pointerup`, 20, 0))).not.toThrow();
      expect(events.map((e) => e.type)).toContain(`dragend`);
      expect(removeSpy.mock.calls.map(([name]) => name)).toContain(`pointercancel`);
    });

    it(`Should not touch pointer capture on destroy() when no gesture is in flight`, () => {
      const { draggable, el } = setup();
      const release = vi.fn();
      el.releasePointerCapture = release;
      draggable.destroy();
      expect(release).not.toHaveBeenCalled();
    });

    it(`Should release pointer capture when destroy() interrupts an in-flight gesture`, () => {
      const { draggable, el } = setup();
      const release = vi.fn();
      el.releasePointerCapture = release;
      el.dispatchEvent(pointer(`pointerdown`, 0, 0, 3));
      draggable.destroy();
      expect(release).toHaveBeenCalledWith(3);
    });
  });

  describe(`createNativeResizable`, () => {
    const setup = (options: Parameters<typeof createNativeResizable>[2] extends () => infer R ? R : never = { enabled: true }) => {
      const root = document.createElement(`div`);
      const handle = document.createElement(`span`);
      root.appendChild(handle);
      document.body.appendChild(root);
      const events: { type: string }[] = [];
      const resizable = createNativeResizable(root, { se: handle }, () => options, (event) => events.push(event));
      return { events, handle, resizable, root };
    };

    it(`Should still resize when ignoreFrom is set but does not match the pointerdown target`, () => {
      const { events, handle } = setup({ enabled: true, ignoreFrom: `.nope` });
      handle.dispatchEvent(pointer(`pointerdown`, 0, 0));
      expect(events.map((e) => e.type)).toStrictEqual([`resizestart`]);
    });

    it(`Should still resize when ignoreFrom is an empty string, which means no selector rather than an invalid one`, () => {
      // An empty string is falsy, so nothing is ignored. Handing it to Element.closest() would throw a SyntaxError and stop resizestart.
      const { events, handle } = setup({ enabled: true, ignoreFrom: `` });
      handle.dispatchEvent(pointer(`pointerdown`, 0, 0));
      expect(events.map((e) => e.type)).toStrictEqual([`resizestart`]);
    });

    it(`Should release pointer capture and remove all three gesture listeners from the handle on pointerup`, () => {
      const { handle } = setup();
      const release = vi.fn();
      handle.releasePointerCapture = release;
      const removeSpy = vi.spyOn(handle, `removeEventListener`);

      handle.dispatchEvent(pointer(`pointerdown`, 0, 0, 5));
      handle.dispatchEvent(pointer(`pointerup`, 0, 0, 5));

      expect(release).toHaveBeenCalledWith(5);
      const removed = removeSpy.mock.calls.map(([name]) => name);
      expect(removed).toContain(`pointermove`);
      expect(removed).toContain(`pointerup`);
      expect(removed).toContain(`pointercancel`);
    });

    it(`Should register a pointercancel listener, and end the resize when it fires`, () => {
      const { events, handle } = setup();
      const addSpy = vi.spyOn(handle, `addEventListener`);
      handle.dispatchEvent(pointer(`pointerdown`, 0, 0));
      expect(addSpy.mock.calls.map(([name]) => name)).toContain(`pointercancel`);

      handle.dispatchEvent(pointer(`pointercancel`, 0, 0));
      expect(events.map((e) => e.type)).toStrictEqual([`resizestart`, `resizeend`]);
    });

    it(`Should not throw, and still clean up, when releasePointerCapture throws`, () => {
      const { events, handle } = setup();
      handle.releasePointerCapture = vi.fn(() => {
        throw new Error(`already released`);
      });
      const removeSpy = vi.spyOn(handle, `removeEventListener`);

      handle.dispatchEvent(pointer(`pointerdown`, 0, 0));
      expect(() => handle.dispatchEvent(pointer(`pointerup`, 0, 0))).not.toThrow();
      expect(events.map((e) => e.type)).toContain(`resizeend`);
      expect(removeSpy.mock.calls.map(([name]) => name)).toContain(`pointercancel`);
    });

    it(`Should not touch pointer capture on destroy() when no gesture is in flight`, () => {
      const { handle, resizable } = setup();
      const release = vi.fn();
      handle.releasePointerCapture = release;
      resizable.destroy();
      expect(release).not.toHaveBeenCalled();
    });

    it(`Should release pointer capture and stop listening when destroy() interrupts an in-flight resize`, () => {
      const { events, handle, resizable } = setup();
      const release = vi.fn();
      handle.releasePointerCapture = release;
      handle.dispatchEvent(pointer(`pointerdown`, 0, 0, 4));
      resizable.destroy();

      expect(release).toHaveBeenCalledWith(4);
      handle.dispatchEvent(pointer(`pointerup`, 0, 0, 4));
      expect(events.map((e) => e.type)).toStrictEqual([`resizestart`]);
    });
  });

  describe(`createNativeAutoScroll`, () => {
    let scrollingElementDescriptor: PropertyDescriptor | undefined;

    beforeEach(() => {
      vi.useFakeTimers();
      scrollingElementDescriptor = Object.getOwnPropertyDescriptor(document, `scrollingElement`);
      // No fallback container: only an explicit scrollable ancestor may be chosen.
      Object.defineProperty(document, `scrollingElement`, { configurable: true, value: null });
    });

    afterEach(() => {
      vi.useRealTimers();
      if(scrollingElementDescriptor) {
        Object.defineProperty(document, `scrollingElement`, scrollingElementDescriptor);
      } else {
        delete (document as { scrollingElement?: Element | null }).scrollingElement;
      }
    });

    interface IContainerSetup {
      /** The container's box on the page; defaults to 400x400 at the origin. */
      box?: DOMRect;
      overflowX?: string;
      overflowY?: string;
      scrollHeight?: number;
      clientHeight?: number;
      scrollWidth?: number;
      clientWidth?: number;
    }

    /** A 400x400 container (CSS box) whose overflow/scroll metrics are configurable. */
    const build = (config: IContainerSetup = {}) => {
      const {
        box = rect(400, 400), clientHeight = 400, clientWidth = 400, overflowX = `visible`, overflowY = `auto`,
        scrollHeight = 800, scrollWidth = 400,
      } = config;
      const container = document.createElement(`div`);
      const el = document.createElement(`div`);
      container.appendChild(el);
      document.body.appendChild(container);
      Object.defineProperty(container, `scrollHeight`, { configurable: true, value: scrollHeight });
      Object.defineProperty(container, `clientHeight`, { configurable: true, value: clientHeight });
      Object.defineProperty(container, `scrollWidth`, { configurable: true, value: scrollWidth });
      Object.defineProperty(container, `clientWidth`, { configurable: true, value: clientWidth });
      container.getBoundingClientRect = () => box;
      const scrollBy = vi.fn();
      container.scrollBy = scrollBy;
      vi.spyOn(window, `getComputedStyle`).mockImplementation(
        (node) => (node === container ? { overflowX, overflowY } : { overflowX: `visible`, overflowY: `visible` }) as CSSStyleDeclaration,
      );
      return { autoScroll: createNativeAutoScroll(), el, scrollBy };
    };

    const runAt = (x: number, y: number, config?: IContainerSetup) => {
      const { autoScroll, el, scrollBy } = build(config);
      autoScroll.start(el);
      autoScroll.update(x, y);
      vi.advanceTimersByTime(20);
      autoScroll.stop();
      return scrollBy;
    };

    // Distances 20 and 10 from an edge (margin 40, max speed 12) give 12*(1-20/40)=6 and 12*(1-10/40)=9.
    it.each([
      { dx: -6, dy: 0, name: `left, halfway into the margin`, x: 20, y: 200 },
      { dx: 6, dy: 0, name: `right, halfway into the margin`, x: 380, y: 200 },
      { dx: 0, dy: -6, name: `top, halfway into the margin`, x: 200, y: 20 },
      { dx: 0, dy: 6, name: `bottom, halfway into the margin`, x: 200, y: 380 },
      { dx: -9, dy: 0, name: `left, a quarter into the margin`, x: 10, y: 200 },
      { dx: 9, dy: 0, name: `right, a quarter into the margin`, x: 390, y: 200 },
      { dx: 0, dy: -9, name: `top, a quarter into the margin`, x: 200, y: 10 },
      { dx: 0, dy: 9, name: `bottom, a quarter into the margin`, x: 200, y: 390 },
    ])(`Should scroll by an exact, distance-proportional amount: $name`, ({ dx, dy, x, y }) => {
      const scrollBy = runAt(x, y);
      expect(scrollBy).toHaveBeenCalledWith(dx, dy);
    });

    it.each([
      { name: `left of the container`, x: -10, y: 200 },
      { name: `right of the container`, x: 410, y: 200 },
      { name: `above the container`, x: 200, y: -10 },
      { name: `below the container`, x: 200, y: 410 },
      { name: `exactly one margin in from the left`, x: 40, y: 200 },
      { name: `exactly one margin in from the bottom`, x: 200, y: 360 },
    ])(`Should not scroll when the pointer is $name`, ({ x, y }) => {
      expect(runAt(x, y)).not.toHaveBeenCalled();
    });

    // The container is not always at the page origin, and distances are measured from ITS edges. Everything above uses a box at (0, 0),
    // where subtracting its left/top and adding it give the same answer. This box starts at (100, 50): 10px in from each edge is 9.
    it.each([
      { dx: -9, dy: 0, name: `left`, x: 110, y: 250 },
      { dx: 0, dy: -9, name: `top`, x: 300, y: 60 },
    ])(`Should measure from the container's own left and top edges, not the page origin: $name`, ({ dx, dy, x, y }) => {
      expect(runAt(x, y, { box: rect(500, 450, 100, 50) })).toHaveBeenCalledWith(dx, dy);
    });

    // In a container narrower than two margins the zones from opposite edges overlap. At exactly one margin from the left the pointer is
    // outside the left zone (the speed there would be 0 anyway), so the right zone still has to get its turn instead of being skipped.
    it(`Should still scroll right at exactly one margin from the left of a container narrower than two margins`, () => {
      // 60px wide: 40 from the left, 20 from the right, so the right zone applies: 12 * (1 - 20 / 40) = 6.
      expect(runAt(40, 200, { box: rect(60, 400) })).toHaveBeenCalledWith(6, 0);
    });

    it(`Should still scroll down at exactly one margin from the top of a container shorter than two margins`, () => {
      // 60px tall: 40 from the top, 20 from the bottom, so the bottom zone applies: 6.
      expect(runAt(200, 40, { box: rect(400, 60) })).toHaveBeenCalledWith(0, 6);
    });

    describe(`scrollable-ancestor detection`, () => {
      it.each([
        { expected: true, name: `overflowY auto with overflowing content`, config: { overflowY: `auto` } },
        { expected: true, name: `overflowY scroll with overflowing content`, config: { overflowY: `scroll` } },
        { expected: false, name: `overflowY hidden despite overflowing content`, config: { overflowY: `hidden` } },
        { expected: false, name: `overflowY auto but content exactly fits`, config: { overflowY: `auto`, scrollHeight: 400 } },
        { expected: false, name: `overflowY scroll but content exactly fits`, config: { overflowY: `scroll`, scrollHeight: 400 } },
        { expected: true, name: `overflowX auto with overflowing content`, config: { overflowX: `auto`, overflowY: `visible`, scrollHeight: 400, scrollWidth: 800 } },
        { expected: true, name: `overflowX scroll with overflowing content`, config: { overflowX: `scroll`, overflowY: `visible`, scrollHeight: 400, scrollWidth: 800 } },
        { expected: false, name: `overflowX hidden despite overflowing content`, config: { overflowX: `hidden`, overflowY: `visible`, scrollHeight: 400, scrollWidth: 800 } },
        { expected: false, name: `overflowX auto but content exactly fits`, config: { overflowX: `auto`, overflowY: `visible`, scrollHeight: 400, scrollWidth: 400 } },
        { expected: false, name: `overflowX scroll but content exactly fits`, config: { overflowX: `scroll`, overflowY: `visible`, scrollHeight: 400, scrollWidth: 400 } },
        { expected: false, name: `overflowY hidden and content fits, overflowX visible`, config: { overflowY: `hidden`, scrollHeight: 400 } },
      ])(`Should ${`pick`} the container only when scrollable: $name`, ({ config, expected }) => {
        const scrollBy = runAt(0, 0, config);
        if(expected) {
          expect(scrollBy).toHaveBeenCalledWith(-12, -12);
        } else {
          expect(scrollBy).not.toHaveBeenCalled();
        }
      });
    });

    describe(`requestAnimationFrame scheduling`, () => {
      it(`Should schedule one frame, not another, when start() is called twice with a container`, () => {
        const { autoScroll, el } = build();
        const raf = vi.spyOn(globalThis, `requestAnimationFrame`);
        autoScroll.start(el);
        autoScroll.start(el);
        expect(raf).toHaveBeenCalledTimes(1);
        autoScroll.stop();
      });

      it(`Should not schedule a frame when there is no scrollable container`, () => {
        const { autoScroll } = build({ overflowY: `visible` });
        const raf = vi.spyOn(globalThis, `requestAnimationFrame`);
        autoScroll.start(document.createElement(`div`));
        expect(raf).not.toHaveBeenCalled();
        autoScroll.stop();
      });

      it(`Should not schedule a frame when the ancestor is not scrollable`, () => {
        const { autoScroll, el } = build({ overflowY: `hidden` });
        const raf = vi.spyOn(globalThis, `requestAnimationFrame`);
        autoScroll.start(el);
        expect(raf).not.toHaveBeenCalled();
        autoScroll.stop();
      });

      it(`Should cancel the pending frame exactly once on stop(), and never when nothing is pending`, () => {
        const { autoScroll, el } = build();
        const cancel = vi.spyOn(globalThis, `cancelAnimationFrame`);

        autoScroll.stop();
        expect(cancel).not.toHaveBeenCalled();

        autoScroll.start(el);
        autoScroll.stop();
        expect(cancel).toHaveBeenCalledTimes(1);

        autoScroll.stop();
        expect(cancel).toHaveBeenCalledTimes(1);
      });

      it(`Should be able to start again after stop() (the frame id is cleared)`, () => {
        const { autoScroll, el, scrollBy } = build();
        autoScroll.start(el);
        autoScroll.stop();
        autoScroll.start(el);
        autoScroll.update(0, 0);
        vi.advanceTimersByTime(20);
        expect(scrollBy).toHaveBeenCalledWith(-12, -12);
        autoScroll.stop();
      });
    });
  });
});
