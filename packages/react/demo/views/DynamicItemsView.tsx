import { useState } from 'react';
import { findFirstFitSlot } from '@keystone-dashboard-layout/core';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { GridItem, GridLayout, useLayoutStorage } from '../../src/index';

const PRESET_A: TLayout = [
  { h: 2, i: `0`, w: 3, x: 0, y: 0 },
  { h: 2, i: `1`, w: 3, x: 3, y: 0 },
];

const PRESET_B: TLayout = [
  { h: 3, i: `0`, w: 4, x: 0, y: 0 },
  { h: 3, i: `1`, w: 4, x: 4, y: 0 },
  { h: 3, i: `2`, w: 4, x: 8, y: 0 },
];

const PRESETS = [
  { id: `a`, label: `Preset A (2 items)`, layout: PRESET_A },
  { id: `b`, label: `Preset B (3 items)`, layout: PRESET_B },
] as const;

let nextIdCounter = 100;

/**
 * Adding/removing items without rebuilding the whole layout, plus two
 * related, previously-missing pieces (see
 * `docs/DEMO_APP_IMPLEMENTATION_PLAN.md`'s own section 3): persistence
 * (`useLayoutStorage`) and layout-switching techniques (named presets,
 * `key`-forced remount).
 */
export default function DynamicItemsView(): React.JSX.Element {
  const [layout, setLayout] = useState<TLayout>(PRESET_A);
  const [presetId, setPresetId] = useState<(typeof PRESETS)[number]['id']>(`a`);
  const [remountKey, setRemountKey] = useState(0);
  const [statusMessage, setStatusMessage] = useState(``);
  const storage = useLayoutStorage(`kdl-demo-dynamic-items`);

  const addItem = (): void => {
    const id = String(nextIdCounter);
    nextIdCounter += 1;
    // A real first-fit slot (`core`'s own `findFirstFitSlot`) — not
    // just `y: Infinity`, which can't jump over a static item blocking
    // the column above an actual gap. Matches the same placement
    // `GridLayout.tsx`'s own `acceptExternalCrossGridItem` uses.
    const slot = findFirstFitSlot(layout, 12, 3, 2);
    setLayout(prev => [...prev, { h: 2, i: id, w: 3, x: slot.x, y: slot.y }]);
  };

  const removeItem = (id: string | number): void => {
    setLayout(prev => prev.filter(item => item.i !== id));
  };

  const switchPreset = (id: (typeof PRESETS)[number]['id']): void => {
    setPresetId(id);
    setLayout(PRESETS.find(preset => preset.id === id)!.layout);
  };

  const forceRemount = (): void => {
    // A full remount via a changed `key` — the simpler choice over
    // reconciling in place whenever a consumer wants to guarantee a
    // completely fresh internal state (undo history, selection, drag
    // state) rather than a diffed update. Re-applies the current
    // preset's own layout from scratch.
    setRemountKey(prev => prev + 1);
    setLayout(PRESETS.find(preset => preset.id === presetId)!.layout);
  };

  return (
    <div className="demo-view" data-testid="view-dynamic-items">
      <h2>Dynamic items, persistence &amp; layout switching</h2>
      <p className="demo-view-description">
        Adding/removing items without rebuilding the whole layout — a controlled <code>layout</code> state
        array, demonstrating the fully-controlled contract (<code>GridLayout</code> never mutates <code>layout</code> in
        place). Also covers <code>useLayoutStorage</code> persistence and two layout-switching patterns
        (named presets, a <code>key</code>-forced remount) built from ordinary state, not dedicated props.
      </p>

      <div className="demo-controls">
        <fieldset className="demo-control-group">
          <legend>Items</legend>
          <div className="demo-control">
            <button data-testid="button-add-item" onClick={addItem} type="button">Add item</button>
          </div>
        </fieldset>

        <fieldset className="demo-control-group">
          <legend>Persistence (useLayoutStorage)</legend>
          <div className="demo-control">
            <button
              data-testid="button-save-layout"
              onClick={() => {
                storage.save(layout);
                setStatusMessage(`Saved ${layout.length} item(s) to localStorage.`);
              }}
              type="button"
            >
              save()
            </button>
            <button
              data-testid="button-load-layout"
              onClick={() => {
                const loaded = storage.load();
                if(loaded) {
                  setLayout(loaded);
                  setStatusMessage(`Loaded ${loaded.length} item(s) from localStorage.`);
                } else {
                  setStatusMessage(`Nothing stored yet.`);
                }
              }}
              type="button"
            >
              load()
            </button>
            <button
              data-testid="button-clear-layout"
              onClick={() => {
                storage.clear();
                setStatusMessage(`Cleared localStorage.`);
              }}
              type="button"
            >
              clear()
            </button>
          </div>
          {statusMessage && <p className="demo-status" data-testid="storage-status">{statusMessage}</p>}
        </fieldset>

        <fieldset className="demo-control-group">
          <legend>Layout switching</legend>
          <div className="demo-control">
            <label htmlFor="preset">Named preset</label>
            <select data-testid="select-preset" id="preset" onChange={e => switchPreset(e.target.value as (typeof PRESETS)[number]['id'])} value={presetId}>
              {PRESETS.map(preset => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
            </select>
          </div>
          <div className="demo-control">
            <button data-testid="button-force-remount" onClick={forceRemount} type="button">Force remount (key)</button>
          </div>
        </fieldset>
      </div>

      <div className="demo-grid-area">
        <GridLayout colNum={12} key={remountKey} layout={layout} onLayoutChange={setLayout} rowHeight={80}>
          {layout.map(item => (
            <GridItem i={item.i} key={item.i}>
              <div className="demo-item-content">
                {`Item ${item.i}`}
                <button data-testid={`button-remove-${item.i}`} onClick={() => removeItem(item.i)} type="button">×</button>
              </div>
            </GridItem>
          ))}
        </GridLayout>
      </div>
    </div>
  );
}
