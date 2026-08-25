import { useRef, useState } from 'react';
import { GridLayout, GridItem, type IGridLayoutHandle } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import '../examples-react/shared-example-item.css';
import './29-compact-now-rearrange-duplicate-item.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
  { h: 2, i: '2', w: 3, x: 6, y: 0 },
  { h: 2, i: '3', w: 3, x: 9, y: 0 },
];

export default function CompactNowRearrangeDuplicateItem() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const gridRef = useRef<IGridLayoutHandle>(null);

  function scatter(): void {
    setLayout((current) =>
      current.map((item) => ({
        ...item,
        x: Math.floor(Math.random() * 9),
        y: Math.floor(Math.random() * 6),
      })),
    );
  }

  return (
    <>
      <div className="demo-controls">
        <button className="demo-btn" onClick={scatter} type="button">Scatter</button>
        <button className="demo-btn" onClick={() => gridRef.current?.compactNow()} type="button">compactNow()</button>
        <button className="demo-btn" onClick={() => gridRef.current?.rearrange()} type="button">rearrange()</button>
        <button className="demo-btn demo-btn--ghost" onClick={() => gridRef.current?.duplicateItem('0')} type="button">
          duplicateItem('0')
        </button>
      </div>

      <GridLayout colNum={12} layout={layout} onLayoutChange={setLayout} ref={gridRef} rowHeight={60} showGridLines>
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">{item.i}</div>
          </GridItem>
        ))}
      </GridLayout>
    </>
  );
}
