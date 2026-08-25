import { useRef, useState } from 'react';
import { GridLayout, GridItem, type IGridLayoutHandle } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import '../examples-react/shared-example-item.css';
import './43-undo-redo.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
  { h: 2, i: '2', w: 3, x: 6, y: 0 },
];

export default function UndoRedo() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const gridRef = useRef<IGridLayoutHandle>(null);
  // canUndo/canRedo on the imperative handle are a snapshot, not
  // reactive — this tick forces a re-render (on every layout change,
  // undo, or redo) so the buttons' disabled state reads the latest
  // value instead of a stale one from the initial render.
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

  return (
    <>
      <div className="demo-controls">
        <button className="demo-btn" disabled={!gridRef.current?.canUndo} onClick={handleUndo} type="button">Undo</button>
        <button className="demo-btn" disabled={!gridRef.current?.canRedo} onClick={handleRedo} type="button">Redo</button>
      </div>

      <GridLayout colNum={12} enableUndoRedo layout={layout} onLayoutChange={handleLayoutChange} ref={gridRef} rowHeight={60} showGridLines undoHistoryLimit={20}>
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">{item.i}</div>
          </GridItem>
        ))}
      </GridLayout>
    </>
  );
}
