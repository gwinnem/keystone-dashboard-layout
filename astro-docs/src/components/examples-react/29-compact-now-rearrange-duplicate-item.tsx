import { useRef, useState } from 'react';
import { GridLayout, GridItem, type IGridLayoutHandle } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import { ECompactType } from 'keystone-dashboard-layout-core';
import type { TLayout } from 'keystone-dashboard-layout-core';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';
import '../examples-react/shared-example-item.css';
import './29-compact-now-rearrange-duplicate-item.css';

// compactType: NONE — without this, the default vertical compaction
// would re-run on every external layout change (including scatter's
// own random repositioning below) and immediately re-tidy everything
// right back, leaving no visible gap for compactNow()/rearrange() to
// demonstrably fix at all.
const initialLayout: TLayout = [
  { h: 2, i: 'a', w: 3, x: 0, y: 0 },
  { h: 2, i: 'b', w: 3, x: 3, y: 0 },
  { h: 2, i: 'c', w: 3, x: 6, y: 0 },
  { h: 2, i: 'd', w: 3, x: 9, y: 0 },
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

  function removeItem(id: string | number): void {
    setLayout((current) => current.filter((item) => item.i !== id));
  }

  return (
    <>
      <div className="demo-controls">
        <button className="demo-btn" onClick={scatter} type="button">Scatter (leaves gaps)</button>
        <button className="demo-btn" onClick={() => gridRef.current?.compactNow()} type="button">Tidy up (compactNow)</button>
        <button className="demo-btn demo-btn--ghost" onClick={() => gridRef.current?.duplicateItem('a')} type="button">
          Duplicate item "a"
        </button>
      </div>

      <GridLayout
        colNum={12}
        compactType={ECompactType.NONE}
        layout={layout}
        onItemClose={removeItem}
        onLayoutChange={setLayout}
        ref={gridRef}
        rowHeight={60}
        showCloseButton
        showGridLines
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
