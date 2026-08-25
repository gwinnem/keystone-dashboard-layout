import { useRef, useState } from 'react';
import { GridLayout, GridItem, type IGridLayoutHandle } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import { ECompactType } from '@keystone-dashboard-layout/core';
import type { TLayout } from '@keystone-dashboard-layout/core';
import '../examples-react/shared-example-item.css';
import './46-align-distribute-selected.css';

const initialLayout: TLayout = [
  { h: 2, i: 'a', w: 2, x: 0, y: 0 },
  { h: 2, i: 'b', w: 3, x: 3, y: 2 },
  { h: 2, i: 'c', w: 2, x: 7, y: 1 },
  { h: 2, i: 'd', w: 2, x: 5, y: 4 },
];

export default function AlignDistributeSelected() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const [selectedItems, setSelectedItems] = useState<(string | number)[]>([]);
  const gridRef = useRef<IGridLayoutHandle>(null);

  return (
    <>
      <div className="demo-controls">
        <span className="demo-description">Selected: {selectedItems.join(', ') || 'none'}</span>
        <button className="demo-btn" onClick={() => gridRef.current?.alignSelected('left')} type="button">Align left</button>
        <button className="demo-btn" onClick={() => gridRef.current?.alignSelected('center-x')} type="button">Align center-x</button>
        <button className="demo-btn" onClick={() => gridRef.current?.alignSelected('right')} type="button">Align right</button>
        <button className="demo-btn" onClick={() => gridRef.current?.alignSelected('top')} type="button">Align top</button>
        <button className="demo-btn demo-btn--ghost" onClick={() => gridRef.current?.distributeSelected('horizontal')} type="button">
          Distribute horizontal
        </button>
        <button className="demo-btn demo-btn--ghost" onClick={() => gridRef.current?.distributeSelected('vertical')} type="button">
          Distribute vertical
        </button>
      </div>

      <GridLayout
        compactType={ECompactType.NONE}
        layout={layout}
        multiSelect
        onLayoutChange={setLayout}
        onSelectionChanged={setSelectedItems}
        ref={gridRef}
        rowHeight={60}
        showGridLines
      >
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">{item.i}</div>
          </GridItem>
        ))}
      </GridLayout>
    </>
  );
}
