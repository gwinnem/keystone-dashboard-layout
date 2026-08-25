import { useRef, useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import '../examples-react/shared-example-item.css';
import './10-add-remove-items.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
];

export default function AddRemoveItems() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const nextId = useRef(2);

  function addItem(): void {
    setLayout((current) => [...current, { h: 2, i: String(nextId.current), w: 3, x: 0, y: Infinity }]);
    nextId.current += 1;
  }

  function removeItem(id: string | number): void {
    setLayout((current) => current.filter((item) => item.i !== id));
  }

  return (
    <>
      <div className="demo-controls">
        <button className="demo-btn" onClick={addItem} type="button">+ Add item</button>
      </div>

      <GridLayout
        colNum={12}
        layout={layout}
        onItemClose={removeItem}
        onLayoutChange={setLayout}
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
    </>
  );
}
