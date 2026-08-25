import { useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import '../examples-react/shared-example-item.css';
import './49-per-item-z-index.css';

const initialLayout: TLayout = [
  { h: 3, i: 'pinned', w: 4, x: 4, y: 0, zIndex: 10 },
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 8, y: 0 },
];

export default function PerItemZIndex() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <GridLayout colNum={12} layout={layout} onLayoutChange={setLayout} rowHeight={60} showGridLines>
      {layout.map((item) => (
        <GridItem i={item.i} key={item.i}>
          <div className={`example-item${item.i === 'pinned' ? ' example-item--pinned' : ''}`}>{item.i}</div>
        </GridItem>
      ))}
    </GridLayout>
  );
}
