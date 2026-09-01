import { Injectable } from '@angular/core';
import { deserializeLayout, serializeLayout } from 'keystone-dashboard-layout-core';
import type { TLayout } from 'keystone-dashboard-layout-core';

const hasWindow = (): boolean => typeof window !== `undefined`;

/**
 * The Angular equivalent of Vue's own `useLayoutPresets.ts` composable /
 * React's equivalent hook: named layout presets, beyond
 * `GridLayoutStorageService`'s single-slot persistence — a way to save
 * and switch between several named arrangements of the *same* items
 * (e.g. a "compact view" and a "detailed view" of the same dashboard
 * widgets). Layers on top of the same `core`'s own `serializeLayout`/
 * `deserializeLayout` building blocks `GridLayoutStorageService` uses,
 * rather than replacing them — reach for that service directly for the
 * simpler single-layout case, and this one when a consumer specifically
 * needs several named ones.
 *
 * Stores every preset for a given `key` together, as a single
 * `{ [name]: serializedLayoutJson }` object under one storage key — one
 * `Storage` read/write per operation, rather than one per preset, and
 * no separate index needed to know what's been saved. Matches Vue's own
 * `useLayoutPresets.ts` storage shape exactly, so presets saved by one
 * framework's port are readable by another's, given the same `key`.
 *
 * **Same "not a ref-bound composable/hook" note as
 * `GridLayoutStorageService`'s own doc comment** — every method here
 * takes/returns a plain `TLayout` value directly rather than binding to
 * a reactive value this service doesn't own, matching this whole port's
 * fully-controlled-component convention.
 *
 * SSR-safe: every storage access is guarded behind a `typeof window`
 * check, same as `GridLayoutStorageService` — every method is a silent
 * no-op (`false`/`[]` where applicable) during a server render rather
 * than throwing.
 */
@Injectable({ providedIn: `root` })
export class GridLayoutPresetsService {
  /** Serializes `layout` and saves it under `name`, overwriting any existing preset of the same name. A no-op if no `Storage` is available. */
  savePreset(key: string, name: string, layout: TLayout, storage?: Storage): void {
    if(!this.resolveStorage(storage)) {
      return;
    }
    const presets = this.readAllPresets(key, storage);
    presets[name] = serializeLayout(layout);
    this.writeAllPresets(key, presets, storage);
  }

  /**
   * Returns the layout saved under `name`, or `null` if no preset
   * exists under that name, or its stored value isn't a valid layout —
   * the same "nothing usable was there" convention `load()` on
   * `GridLayoutStorageService` uses, rather than throwing.
   */
  loadPreset(key: string, name: string, storage?: Storage): TLayout | null {
    const presets = this.readAllPresets(key, storage);
    const raw = presets[name];
    if(!raw) {
      return null;
    }
    return deserializeLayout(raw);
  }

  /** Removes the preset saved under `name`. A no-op if it doesn't exist, or no `Storage` is available. */
  deletePreset(key: string, name: string, storage?: Storage): void {
    if(!this.resolveStorage(storage)) {
      return;
    }
    const presets = this.readAllPresets(key, storage);
    delete presets[name];
    this.writeAllPresets(key, presets, storage);
  }

  /** Every currently-saved preset name under `key`, in the order they were first saved. */
  listPresets(key: string, storage?: Storage): string[] {
    return Object.keys(this.readAllPresets(key, storage));
  }

  /** Whether a preset exists under `name`. */
  hasPreset(key: string, name: string, storage?: Storage): boolean {
    return name in this.readAllPresets(key, storage);
  }

  private resolveStorage(storage?: Storage): Storage | null {
    if(storage) {
      return storage;
    }
    return hasWindow() ? window.localStorage : null;
  }

  private readAllPresets(key: string, storage?: Storage): Record<string, string> {
    const target = this.resolveStorage(storage);
    if(!target) {
      return {};
    }
    const raw = target.getItem(key);
    if(!raw) {
      return {};
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if(parsed && typeof parsed === `object` && !Array.isArray(parsed)) {
        return parsed as Record<string, string>;
      }
      return {};
    } catch{
      return {};
    }
  }

  private writeAllPresets(key: string, presets: Record<string, string>, storage?: Storage): void {
    this.resolveStorage(storage)?.setItem(key, JSON.stringify(presets));
  }
}
