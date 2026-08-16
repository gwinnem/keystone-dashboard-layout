import { describe, expect, it, vi } from 'vitest';
import { createEventEmitter } from '../src/helpers/event-emitter';

describe(`createEventEmitter`, () => {
  it(`Should call a registered handler with the emitted payload`, () => {
    const emitter = createEventEmitter<{ greet: string }>();
    const handler = vi.fn();

    emitter.on(`greet`, handler);
    emitter.emit(`greet`, `hello`);

    expect(handler).toHaveBeenCalledWith(`hello`);
  });

  it(`Should call every handler registered for the same type, in registration order`, () => {
    const emitter = createEventEmitter<{ tick: number }>();
    const calls: number[] = [];

    emitter.on(`tick`, () => calls.push(1));
    emitter.on(`tick`, () => calls.push(2));
    emitter.on(`tick`, () => calls.push(3));
    emitter.emit(`tick`, 0);

    expect(calls).toStrictEqual([1, 2, 3]);
  });

  it(`Should not call a handler registered for a different event type`, () => {
    const emitter = createEventEmitter<{ a: string; b: string }>();
    const handlerA = vi.fn();
    const handlerB = vi.fn();

    emitter.on(`a`, handlerA);
    emitter.on(`b`, handlerB);
    emitter.emit(`a`, `only-a`);

    expect(handlerA).toHaveBeenCalledWith(`only-a`);
    expect(handlerB).not.toHaveBeenCalled();
  });

  it(`Should do nothing (not throw) when emitting a type with no registered handlers`, () => {
    const emitter = createEventEmitter<{ unheard: string }>();

    expect(() => emitter.emit(`unheard`, `anyone?`)).not.toThrow();
  });

  it(`Should remove a specific handler via off(type, handler), leaving other handlers for the same type intact`, () => {
    const emitter = createEventEmitter<{ tick: void }>();
    const handlerA = vi.fn();
    const handlerB = vi.fn();

    emitter.on(`tick`, handlerA);
    emitter.on(`tick`, handlerB);
    emitter.off(`tick`, handlerA);
    emitter.emit(`tick`);

    expect(handlerA).not.toHaveBeenCalled();
    expect(handlerB).toHaveBeenCalled();
  });

  it(`Should remove every handler for a type when off(type) is called without a handler`, () => {
    const emitter = createEventEmitter<{ tick: void }>();
    const handlerA = vi.fn();
    const handlerB = vi.fn();

    emitter.on(`tick`, handlerA);
    emitter.on(`tick`, handlerB);
    emitter.off(`tick`);
    emitter.emit(`tick`);

    expect(handlerA).not.toHaveBeenCalled();
    expect(handlerB).not.toHaveBeenCalled();
  });

  it(`Should do nothing (not throw) calling off() for a type that was never registered`, () => {
    const emitter = createEventEmitter<{ neverUsed: string }>();

    expect(() => emitter.off(`neverUsed`)).not.toThrow();
    expect(() => emitter.off(`neverUsed`, vi.fn())).not.toThrow();
  });

  it(`Should do nothing (not throw) removing a handler that was never actually registered`, () => {
    const emitter = createEventEmitter<{ tick: void }>();
    emitter.on(`tick`, vi.fn());

    expect(() => emitter.off(`tick`, vi.fn())).not.toThrow();
  });

  it(`Should support emit with no payload for a type whose value includes undefined`, () => {
    const emitter = createEventEmitter<{ compact: void; resizeEvent?: string }>();
    const compactHandler = vi.fn();
    const resizeHandler = vi.fn();

    emitter.on(`compact`, compactHandler);
    emitter.on(`resizeEvent`, resizeHandler);
    emitter.emit(`compact`);
    emitter.emit(`resizeEvent`);

    expect(compactHandler).toHaveBeenCalledWith(undefined);
    expect(resizeHandler).toHaveBeenCalledWith(undefined);
  });

  it(`Should not affect other listeners when a handler removes itself during emit (iteration-safety)`, () => {
    const emitter = createEventEmitter<{ tick: void }>();
    const secondHandler = vi.fn();
    // eslint-disable-next-line prefer-const
    let firstHandler: () => void;
    firstHandler = vi.fn(() => {
      emitter.off(`tick`, firstHandler);
    });

    emitter.on(`tick`, firstHandler);
    emitter.on(`tick`, secondHandler);
    emitter.emit(`tick`);

    // Both should have run for this emit — self-removal during emit
    // shouldn't skip a still-pending handler in the same call.
    expect(firstHandler).toHaveBeenCalledTimes(1);
    expect(secondHandler).toHaveBeenCalledTimes(1);

    // A second emit should no longer reach the now-removed handler.
    emitter.emit(`tick`);
    expect(firstHandler).toHaveBeenCalledTimes(1);
    expect(secondHandler).toHaveBeenCalledTimes(2);
  });

  it(`Should keep separate emitter instances fully independent`, () => {
    const emitterA = createEventEmitter<{ tick: void }>();
    const emitterB = createEventEmitter<{ tick: void }>();
    const handlerA = vi.fn();
    const handlerB = vi.fn();

    emitterA.on(`tick`, handlerA);
    emitterB.on(`tick`, handlerB);
    emitterA.emit(`tick`);

    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).not.toHaveBeenCalled();
  });

  it(`Should allow registering the same handler function for the same type only once effectively (Set semantics)`, () => {
    const emitter = createEventEmitter<{ tick: void }>();
    const handler = vi.fn();

    emitter.on(`tick`, handler);
    emitter.on(`tick`, handler);
    emitter.emit(`tick`);

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
