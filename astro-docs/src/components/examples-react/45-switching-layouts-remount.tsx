import { useRef, useState } from 'react';
import { GridLayout, GridItem, type IGridLayoutHandle } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import type { TLayout } from 'keystone-dashboard-layout-core';
import ExampleToggle from '../harness-react/ExampleToggle';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';
import '../examples-react/shared-example-item.css';
import './45-switching-layouts-remount.css';

const layoutA: TLayout = [
  { h: 2, i: 'a0', w: 2, x: 0, y: 0 },
  { h: 2, i: 'a1', w: 2, x: 2, y: 0 },
  { h: 2, i: 'a2', w: 2, x: 4, y: 0 },
];

// Deliberately the same length (3 items) as layoutA — this package's
// own controlled-component sync commits an undo point whenever the
// layout's own length changes (see the render-phase sync's own doc
// comment in GridLayout.tsx), which would otherwise fire on every
// switch regardless of whether anything was actually dragged,
// confounding this example's own demonstration of canUndo staying
// stale specifically from Layout A's own drag.
const layoutB: TLayout = [
  { h: 3, i: 'b0', w: 4, x: 0, y: 0 },
  { h: 3, i: 'b1', w: 4, x: 4, y: 0 },
  { h: 2, i: 'b2', w: 8, x: 0, y: 3 },
];

export default function SwitchingLayoutsRemount() {
  const [forceRemount, setForceRemount] = useState(false);
  const [layout, setLayout] = useState<TLayout>(() => layoutA.map((item) => ({ ...item })));
  const [currentLayoutName, setCurrentLayoutName] = useState<'A' | 'B'>('A');
  const gridRef = useRef<IGridLayoutHandle>(null);
  // Only meaningful while forceRemount is on — changing this changes
  // the GridLayout's own `key`, which is what actually triggers React
  // to unmount and remount the component (a fresh instance, all
  // internal state reset) rather than just reactively updating props
  // on the existing one. Incrementing on every switch (not just
  // toggling true/false once) means switching back and forth between
  // A and B remounts every time, not just the first switch after
  // enabling it.
  const gridKeyRef = useRef(0);
  const [, forceUpdate] = useState(0);

  function switchTo(target: 'a' | 'b'): void {
    setLayout((target === 'a' ? layoutA : layoutB).map((item) => ({ ...item })));
    setCurrentLayoutName(target === 'a' ? 'A' : 'B');
    gridKeyRef.current += 1;
    forceUpdate((tick) => tick + 1);
  }

  return (
    <>
      <div className="demo-controls">
        <ExampleToggle checked={forceRemount} label="Force remount on switch" onChange={setForceRemount} />
        <button className="demo-btn" onClick={() => switchTo('a')} type="button">Switch to Layout A</button>
        <button className="demo-btn" onClick={() => switchTo('b')} type="button">Switch to Layout B</button>
      </div>

      <GridLayout
        colNum={12}
        enableUndoRedo
        key={forceRemount ? gridKeyRef.current : 'stable'}
        layout={layout}
        onLayoutChange={setLayout}
        ref={gridRef}
        rowHeight={70}
        showGridLines
      >
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">{item.i}</div>
          </GridItem>
        ))}
      </GridLayout>

      <p className="demo-description">Current layout: <strong>{currentLayoutName}</strong></p>
      <p className="demo-description">canUndo: <strong>{String(gridRef.current?.canUndo ?? false)}</strong></p>

      <LayoutJsonViewer layout={layout} />
    </>
  );
}
