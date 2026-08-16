/**
 * A minimal typed event emitter, replacing `mitt` as the implementation
 * behind `TGridLayoutEventBus`/`TGridItemEventBus` (see
 * `gridlayout/interfaces/layout-data.interface.ts` and
 * `griditem/interfaces/grid-item.interfaces.ts`) — the internal pub/sub
 * connecting `GridLayout` and `GridItem` (and their composables).
 *
 * `mitt`'s own `Emitter<Events>` type was never part of this package's
 * public API (`TGridLayoutEventBus`/`TGridItemEventBus` aren't exported
 * from the barrel), and every actual call site here only ever uses
 * `on`/`off`/`emit` for a fixed, named set of events — never `mitt`'s
 * wildcard (`'*'`) listener support or its exposed `.all` map. That
 * narrow surface is what this file implements directly, removing the
 * dependency entirely rather than keeping it around for features
 * nothing here actually uses.
 *
 * Type signatures deliberately mirror `mitt`'s own `Emitter<Events>`
 * exactly (including the `emit(type)` no-payload overload, which only
 * applies when `Events[Key]` includes `undefined` — e.g. an optional
 * property like `resizeEvent?: IEventsData`, or an explicit `void`
 * value like `compact: void`, since `undefined extends void` holds),
 * so every existing `eventBus.on(...)`/`.off(...)`/`.emit(...)` call
 * across this codebase needed zero changes when this replaced `mitt()`.
 */

/** A single event handler, receiving that event's payload type. */
export type TEventHandler<T = unknown> = (event: T) => void;

/** Matches mitt's own `EventType` — event names/keys are strings or symbols. Exported so call sites that previously imported `EventType` from `'mitt'` (e.g. `GridLayout.vue`'s own `dragEvent`/`resizeEvent` parameter types) need only change their import source, not any type annotation. */
export type TEventType = string | symbol;

/** The narrow emitter surface this codebase actually uses — `on`/`off`/`emit` for a fixed set of named events, no wildcard support. */
export interface IEventEmitter<Events extends Record<string, unknown>> {
  /** Registers `handler` for `type`. Multiple handlers for the same `type` all run, in registration order. */
  on<Key extends keyof Events>(type: Key, handler: TEventHandler<Events[Key]>): void;
  /** Removes `handler` from `type`'s listeners, if it was registered — a no-op otherwise. Omitting `handler` removes every listener for `type`. */
  off<Key extends keyof Events>(type: Key, handler?: TEventHandler<Events[Key]>): void;
  /** Calls every handler registered for `type` with `event`, in registration order. A no-op if nothing is listening. */
  emit<Key extends keyof Events>(type: Key, event: Events[Key]): void;
  /** The no-payload overload — only usable for a `type` whose event shape includes `undefined` (an optional property, or an explicit `void`/`undefined` value). */
  emit<Key extends keyof Events>(type: undefined extends Events[Key] ? Key : never): void;
}

/**
 * Creates a new, independent `IEventEmitter` instance — one per
 * `GridLayout`, exactly like `mitt()` was called once per instance
 * before this.
 */
export function createEventEmitter<Events extends Record<string, unknown>>(): IEventEmitter<Events> {
  const listeners = new Map<keyof Events, Set<TEventHandler<Events[keyof Events]>>>();

  return {
    on(type, handler) {
      let set = listeners.get(type);
      if(!set) {
        set = new Set();
        listeners.set(type, set);
      }
      set.add(handler as TEventHandler<Events[keyof Events]>);
    },
    off(type, handler) {
      const set = listeners.get(type);
      if(!set) {
        return;
      }
      if(handler) {
        set.delete(handler as TEventHandler<Events[keyof Events]>);
      } else {
        set.clear();
      }
    },
    emit(type: keyof Events, event?: Events[keyof Events]) {
      const set = listeners.get(type);
      if(!set || set.size === 0) {
        return;
      }
      // Snapshot via Array.from before iterating: a handler calling
      // `off()` on itself (or registering a new listener via `on()`)
      // during emit must not affect the set of handlers this specific
      // emit call runs — the same iteration-safety guarantee mitt's
      // own array-based handler lists provide.
      Array.from(set).forEach(handler => handler(event as Events[keyof Events]));
    },
  } as IEventEmitter<Events>;
}
