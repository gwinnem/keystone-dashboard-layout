import { useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import '../examples-react/shared-example-item.css';
import './17-static-items.css';

const initialLayout: TLayout = [
  { h: 2, i: 'anchor', w: 4, x: 0, y: 0, isStatic: true },
  { h: 2, i: '1', w: 2, x: 4, y: 0 },
  { h: 2, i: '2', w: 2, x: 6, y: 0 },
];

export default function StaticItems() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <GridLayout colNum={12} layout={layout} onLayoutChange={setLayout} rowHeight={60} showCloseButton showGridLines>
      {layout.map((item) => (
        <GridItem i={item.i} key={item.i}>
          <div className={`example-item${item.i === 'anchor' ? ' example-item--static' : ''}`}>
            {item.i === 'anchor' ? 'locked in place' : item.i}
          </div>
        </GridItem>
      ))}
    </GridLayout>
  );
}
