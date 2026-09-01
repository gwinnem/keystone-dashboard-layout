import { useState } from 'react';
import { GridLayout, GridItem } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import type { TLayout } from 'keystone-dashboard-layout-core';
import './48-custom-header-slot.css';

const initialLayout: TLayout = [
  { h: 3, i: '0', w: 4, x: 0, y: 0 },
  { h: 3, i: '1', w: 4, x: 4, y: 0 },
];

export default function CustomHeaderSlot() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <GridLayout colNum={12} layout={layout} onLayoutChange={setLayout} rowHeight={60} showGridLines>
      {layout.map((item) => (
        <GridItem header={<div className="item-header">{item.i} — header</div>} i={item.i} key={item.i}>
          <div className="item-body">
            {[1, 2, 3, 4].map((n) => (
              <p key={n}>Body content line {n} — scrolls internally if the item is too short to fit everything.</p>
            ))}
          </div>
        </GridItem>
      ))}
    </GridLayout>
  );
}
