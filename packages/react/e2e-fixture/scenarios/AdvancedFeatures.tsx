import { useEffect, useRef, useState } from 'react';
import { GridItem, GridLayout, useLayoutStorage } from '../../src/index';
import type { IGridLayoutHandle } from '../../src/index';
import { ECompactType } from 'keystone-dashboard-layout-core';
import type { ICompactor, TLayout } from 'keystone-dashboard-layout-core';

/**
 * A custom compactor that settles every non-static item *downward*
 * toward the grid's own lower bound instead of the built-in vertical
 * compactor's upward direction — deliberately the opposite of the
 * default, so a real, only-explicable-by-the-custom-compactor-actually-
 * running outcome is observable. Mirrors the Vue package's own
 * `advanced-features` demo view.
 */
const downwardCompactor: ICompactor = {
  compact: (layout: TLayout): TLayout => layout.map(item => (item.isStatic ? item : { ...item, y: item.y + 3 })),
  type: `downward`,
};

const initialLayout = (): TLayout => [
  { h: 2, i: `0`, w: 2, x: 0, y: 0 },
  { h: 2, i: `wall`, isStatic: true, w: 2, x: 4, y: 0 },
  { autoHeight: true, h: 2, i: `growable`, w: 3, x: 8, y: 0 },
];

/**
 * Real-browser coverage for everything `advanced-features.spec.ts`
 * covers besides `multiSelect` (already covered separately, in
 * `MultiSelect.tsx`/`multi-select.spec.ts`): `preventCollision` +
 * `onMoveBlockedByCollision` feedback, a custom `compactor`,
 * `undo()`/`redo()`, `compactNow()`, `duplicateItem()`, `snapToGrid`,
 * saving/loading a layout via `useLayoutStorage`, `autoHeight`, and
 * `showGridLines` — all previously untested in React's e2e suite
 * despite full feature parity with Vue. See
 * `packages/react/e2e/advanced-features.spec.ts` and the Vue package's
 * own `e2e/advanced-features.spec.ts`, which this mirrors as closely as
 * React's ref-based (rather than Vue's template-ref-`defineExpose`)
 * architecture allows.
 */
export default function AdvancedFeatures(): React.JSX.Element {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const [preventCollision, setPreventCollision] = useState(false);
  const [useCustomCompactor, setUseCustomCompactor] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showGridLines, setShowGridLines] = useState(false);
  const [compactType, setCompactType] = useState<ECompactType>(ECompactType.VERTICAL);
  const [blockedCount, setBlockedCount] = useState(0);
  const [lastBlockedId, setLastBlockedId] = useState<string | null>(null);
  const [growTicks, setGrowTicks] = useState(0);
  const gridRef = useRef<IGridLayoutHandle>(null);
  const { load, save } = useLayoutStorage(`e2e-advanced-features-preset`);
  const [presetSaved, setPresetSaved] = useState(false);
  // Reading gridRef.current?.canUndo/canRedo directly in render is
  // unreliable — confirmed via a fresh e2e run, not assumed: React
  // renders this (parent) component before GridLayout (the child)
  // within the same commit, so a render triggered by onLayoutChange
  // (itself fired *before* GridLayout's own undoRedoVersion-driven
  // re-render has committed and updated useImperativeHandle's returned
  // object) reads the *stale*, pre-action value. Refs never trigger a
  // re-render on their own, so nothing forces this component to read
  // the corrected value afterward either. Tracking both in real state,
  // re-read inside an effect (which runs after the full commit,
  // including the child's own re-render) is what actually stays
  // correct.
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  useEffect(() => {
    setCanUndo(Boolean(gridRef.current?.canUndo));
    setCanRedo(Boolean(gridRef.current?.canRedo));
  }, [layout]);

  return (
    <div>
      <label>
        preventCollision
        <input
          checked={preventCollision}
          data-testid="toggle-prevent-collision"
          onChange={event => setPreventCollision(event.target.checked)}
          type="checkbox"
        />
      </label>
      <label>
        custom compactor
        <input
          checked={useCustomCompactor}
          data-testid="toggle-custom-compactor"
          onChange={event => setUseCustomCompactor(event.target.checked)}
          type="checkbox"
        />
      </label>
      <label>
        snapToGrid
        <input
          checked={snapToGrid}
          data-testid="toggle-snap-to-grid"
          onChange={event => setSnapToGrid(event.target.checked)}
          type="checkbox"
        />
      </label>
      <label>
        showGridLines
        <input
          checked={showGridLines}
          data-testid="toggle-show-grid-lines"
          onChange={event => setShowGridLines(event.target.checked)}
          type="checkbox"
        />
      </label>
      <label>
        compactType
        <select
          data-testid="select-compact-type"
          onChange={event => setCompactType(event.target.value as ECompactType)}
          value={compactType}
        >
          <option value={ECompactType.VERTICAL}>vertical</option>
          <option value={ECompactType.NONE}>none</option>
        </select>
      </label>
      <div data-testid="blocked-feedback">
        {`Blocked moves: ${blockedCount}${lastBlockedId ? `, last: "${lastBlockedId}"` : ``}`}
      </div>
      <button data-testid="undo-button" disabled={!canUndo} onClick={() => gridRef.current?.undo()} type="button">Undo</button>
      <button data-testid="redo-button" disabled={!canRedo} onClick={() => gridRef.current?.redo()} type="button">Redo</button>
      <button data-testid="compact-now" onClick={() => gridRef.current?.compactNow()} type="button">Compact now</button>
      <button data-testid="duplicate-item" onClick={() => gridRef.current?.duplicateItem(`0`)} type="button">Duplicate item 0</button>
      <button data-testid="grow-content" onClick={() => setGrowTicks(current => current + 1)} type="button">Grow content</button>
      <button
        data-testid="save-preset-compact"
        onClick={() => {
          save(layout);
          setPresetSaved(true);
        }}
        type="button"
      >
        Save preset
      </button>
      {presetSaved && (
        <button
          data-testid="load-preset-compact"
          onClick={() => {
            const loaded = load();
            if(loaded) {
              setLayout(loaded);
            }
          }}
          type="button"
        >
          Load preset
        </button>
      )}

      <GridLayout
        compactor={useCustomCompactor ? downwardCompactor : null}
        compactType={compactType}
        enableUndoRedo
        layout={layout}
        onLayoutChange={setLayout}
        onMoveBlockedByCollision={id => {
          setBlockedCount(current => current + 1);
          setLastBlockedId(String(id));
        }}
        preventCollision={preventCollision}
        ref={gridRef}
        rowHeight={80}
        showGridLines={showGridLines}
        snapThreshold={1}
        snapToGrid={snapToGrid}
      >
        {layout.map(item => (
          <GridItem i={item.i} key={item.i}>
            <div className="fixture-item-content">
              {item.i === `growable` ? (
                <div style={{ height: `${20 + growTicks * 10}px` }}>{`Item ${item.i}`}</div>
              ) : (
                `Item ${item.i}`
              )}
            </div>
          </GridItem>
        ))}
      </GridLayout>
    </div>
  );
}
