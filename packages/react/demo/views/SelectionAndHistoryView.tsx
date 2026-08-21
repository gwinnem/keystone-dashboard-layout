import { useRef, useState } from 'react';
import type { TAlignEdge, TDistributeAxis, TLayout } from '@keystone-dashboard-layout/core';
import { GridItem, GridLayout } from '../../src/index';
import type { IGridLayoutHandle } from '../../src/index';

const ALIGN_EDGES: TAlignEdge[] = [`left`, `right`, `top`, `bottom`, `center-x`, `center-y`];
const DISTRIBUTE_AXES: TDistributeAxis[] = [`horizontal`, `vertical`];

function initialLayout(): TLayout {
  return [
    { h: 2, i: `0`, w: 3, x: 0, y: 0 },
    { h: 2, i: `1`, w: 3, x: 4, y: 0 },
    { h: 2, i: `2`, w: 3, x: 9, y: 0 },
    { h: 2, i: `3`, w: 3, x: 4, y: 3 },
  ];
}

/**
 * Two closely-related, ref-driven feature groups that don't map to any
 * grid-wide/per-item prop at all — `multiSelect` (selection state,
 * group move/resize, align/distribute) and undo/redo history. See
 * `docs/DEMO_APP_IMPLEMENTATION_PLAN.md`'s own section 5 for the full,
 * confirmed feature list this covers.
 */
export default function SelectionAndHistoryView(): React.JSX.Element {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const gridRef = useRef<IGridLayoutHandle>(null);
  const [enableUndoRedo, setEnableUndoRedo] = useState(true);
  const [undoHistoryLimit, setUndoHistoryLimit] = useState(50);
  const [selectedItems, setSelectedItems] = useState<(string | number)[]>([]);
  const [log, setLog] = useState<string[]>([]);
  // ref.current.canUndo/canRedo are plain booleans snapshotted at the
  // moment the imperative handle itself was last recomputed -- reading
  // them straight in render wouldn't reactively update this component,
  // since nothing here re-renders just because the ref's own contents
  // changed. This tick forces a re-render after every action, so the
  // canUndo/canRedo reads below stay current.
  const [, forceRerender] = useState(0);

  const appendLog = (entry: string): void => {
    setLog(prev => [...prev.slice(-49), entry]);
  };

  return (
    <div className="demo-view" data-testid="view-selection-history">
      <h2>Selection &amp; history</h2>
      <p className="demo-view-description">
        <code>multiSelect</code> (selection state, group move/resize, <code>alignSelected</code>/
        <code>distributeSelected</code>) and <code>enableUndoRedo</code> — two ref-driven feature groups
        with no grid-wide prop equivalent to point at elsewhere in this demo.
      </p>

      <div className="demo-controls">
            <fieldset className="demo-control-group">
              <legend>Selection</legend>
              <div className="demo-control">
                <span>Click an item to select it exclusively; Ctrl/Shift+click to toggle it into the selection.</span>
              </div>
              <div className="demo-control demo-control--wrap">
                <button data-testid="button-clear-selection" onClick={() => gridRef.current?.clearSelection()} type="button">clearSelection()</button>
                {layout.map(item => (
                  <button
                    data-testid={`button-toggle-select-${item.i}`}
                    key={item.i}
                    onClick={() => gridRef.current?.toggleItemSelection(item.i)}
                    type="button"
                  >
                    {`toggleItemSelection(${item.i})`}
                  </button>
                ))}
              </div>
              <div className="demo-control">
                <span data-testid="selected-items">{`Selected: ${selectedItems.length > 0 ? selectedItems.join(`, `) : `none`}`}</span>
              </div>
            </fieldset>

            <fieldset className="demo-control-group">
              <legend>alignSelected (2+ selected)</legend>
              <div className="demo-control demo-control--wrap">
                {ALIGN_EDGES.map(edge => (
                  <button data-testid={`button-align-${edge}`} key={edge} onClick={() => { gridRef.current?.alignSelected(edge); forceRerender(v => v + 1); }} type="button">
                    {edge}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="demo-control-group">
              <legend>distributeSelected (3+ selected)</legend>
              <div className="demo-control demo-control--wrap">
                {DISTRIBUTE_AXES.map(axis => (
                  <button data-testid={`button-distribute-${axis}`} key={axis} onClick={() => { gridRef.current?.distributeSelected(axis); forceRerender(v => v + 1); }} type="button">
                    {axis}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="demo-control-group">
              <legend>History</legend>
              <div className="demo-control">
                <input
                  checked={enableUndoRedo}
                  data-testid="toggle-enableUndoRedo"
                  id="enableUndoRedo"
                  onChange={e => setEnableUndoRedo(e.target.checked)}
                  type="checkbox"
                />
                <label htmlFor="enableUndoRedo">enableUndoRedo</label>
              </div>
              <div className="demo-control">
                <label htmlFor="undoHistoryLimit">undoHistoryLimit</label>
                <input
                  data-testid="input-undoHistoryLimit"
                  id="undoHistoryLimit"
                  min={1}
                  onChange={e => setUndoHistoryLimit(Number(e.target.value))}
                  type="number"
                  value={undoHistoryLimit}
                />
              </div>
              <div className="demo-control">
                <button
                  data-testid="button-undo"
                  disabled={!gridRef.current?.canUndo}
                  onClick={() => { gridRef.current?.undo(); forceRerender(v => v + 1); }}
                  type="button"
                >
                  undo()
                </button>
                <button
                  data-testid="button-redo"
                  disabled={!gridRef.current?.canRedo}
                  onClick={() => { gridRef.current?.redo(); forceRerender(v => v + 1); }}
                  type="button"
                >
                  redo()
                </button>
              </div>
            </fieldset>
          </div>

      <div className="demo-view-body">
        <div className="demo-view-main">
          <div className="demo-grid-area">
            <GridLayout
              enableUndoRedo={enableUndoRedo}
              layout={layout}
              multiSelect
              onLayoutChange={setLayout}
              onSelectionChanged={ids => {
                setSelectedItems(ids);
                appendLog(`onSelectionChanged([${ids.join(`, `)}])`);
              }}
              ref={gridRef}
              rowHeight={80}
              undoHistoryLimit={undoHistoryLimit}
            >
              {layout.map(item => (
                <GridItem i={item.i} key={item.i}>
                  <div className="demo-item-content">{`Item ${item.i}`}</div>
                </GridItem>
              ))}
            </GridLayout>
          </div>
        </div>

        <div className="demo-view-log-column">
          <div className="demo-event-log" data-testid="event-log">
            {log.map((entry, index) => (
              // eslint-disable-next-line react/no-array-index-key -- log entries have no stable identity of their own, same rationale as GridLayout.tsx's own alignment-guide keys.
              <div className="demo-event-log-entry" key={index}>{entry}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
