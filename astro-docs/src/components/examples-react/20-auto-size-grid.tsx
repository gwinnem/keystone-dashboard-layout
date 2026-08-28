import { useRef, useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';
import '../examples-react/shared-example-item.css';
import './20-auto-size-grid.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 6, x: 0, y: 0 },
  { h: 2, i: '1', w: 6, x: 6, y: 0 },
];

export default function AutoSizeGrid() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const nextRow = useRef(1);

  function addRow(): void {
    setLayout((current) => {
      const y = current.reduce((max, item) => Math.max(max, item.y + item.h), 0);
      const newItem = { h: 2, i: `row-${nextRow.current}`, w: 12, x: 0, y };
      nextRow.current += 1;
      return [...current, newItem];
    });
  }

  function removeRow(): void {
    setLayout((current) => (current.length > 1 ? current.slice(0, -1) : current));
  }

  return (
    <>
      <div className="demo-controls">
        <button className="demo-btn" onClick={addRow} type="button">+ Add row</button>
        <button className="demo-btn demo-btn--ghost" onClick={removeRow} type="button">- Remove row</button>
      </div>

      <GridLayout autoSize colNum={12} layout={layout} onLayoutChange={setLayout} rowHeight={50} showGridLines>
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
