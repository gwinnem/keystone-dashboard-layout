import { useRef, useState } from 'react';
import { GridLayout, GridItem, type IGridLayoutHandle } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import ExampleNumberField from '../harness-react/ExampleNumberField';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';
import '../examples-react/shared-example-item.css';
import './43-undo-redo.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 2, x: 0, y: 0 },
  { h: 2, i: '1', w: 2, x: 2, y: 0 },
  { h: 2, i: '2', w: 2, x: 4, y: 0 },
];

export default function UndoRedo() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  // Set well below the library's own default (50) specifically so the
  // cap itself is easy to observe: add more items than the limit, then
  // keep undoing — canUndo becomes false before every addition is
  // undone, since the oldest snapshot was already dropped to stay
  // under it.
  const [undoHistoryLimit, setUndoHistoryLimit] = useState(3);
  const gridRef = useRef<IGridLayoutHandle>(null);
  const nextIdRef = useRef(3);
  // canUndo/canRedo on the imperative handle are a snapshot, not
  // reactive — this tick forces a re-render (on every layout change,
  // undo, redo, or add) so the buttons' disabled state reads the
  // latest value instead of a stale one from the initial render.
  const [, forceUpdate] = useState(0);

  function handleLayoutChange(next: TLayout): void {
    setLayout(next);
    forceUpdate((tick) => tick + 1);
  }

  function handleUndo(): void {
    gridRef.current?.undo();
    forceUpdate((tick) => tick + 1);
  }

  function handleRedo(): void {
    gridRef.current?.redo();
    forceUpdate((tick) => tick + 1);
  }

  function addItem(): void {
    const id = String(nextIdRef.current);
    nextIdRef.current += 1;
    setLayout((current) => [...current, { h: 2, i: id, w: 2, x: 0, y: Infinity }]);
    forceUpdate((tick) => tick + 1);
  }

  return (
    <>
      <div className="demo-controls">
        <button className="demo-btn" disabled={!gridRef.current?.canUndo} onClick={handleUndo} type="button">Undo</button>
        <button className="demo-btn" disabled={!gridRef.current?.canRedo} onClick={handleRedo} type="button">Redo</button>
        <button className="demo-btn demo-btn--ghost" onClick={addItem} type="button">Add item</button>
        <ExampleNumberField label="undoHistoryLimit" max={20} min={1} onChange={setUndoHistoryLimit} value={undoHistoryLimit} />
      </div>

      <GridLayout
        colNum={12}
        enableUndoRedo
        layout={layout}
        onLayoutChange={handleLayoutChange}
        ref={gridRef}
        rowHeight={60}
        showGridLines
        undoHistoryLimit={undoHistoryLimit}
      >
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">{item.i}</div>
          </GridItem>
        ))}
      </GridLayout>

      <LayoutJsonViewer layout={layout} />
    </>
  );
}
