import { useState } from 'react';
import { GridItem, GridLayout } from '../../src/index';
import type { TLayout } from 'keystone-dashboard-layout-core';

export default function Responsive(): React.JSX.Element {
  const [layout, setLayout] = useState<TLayout>([
    { h: 2, i: `0`, w: 2, x: 0, y: 0 },
    { h: 2, i: `1`, w: 2, x: 2, y: 0 },
  ]);

  return (
    <div data-testid="responsive-wrap">
      <GridLayout layout={layout} onLayoutChange={setLayout} responsive rowHeight={80}>
        {layout.map(item => (
          <GridItem i={item.i} key={item.i}>
            <div className="fixture-item-content">
              {`Item ${item.i}`}
            </div>
          </GridItem>
        ))}
      </GridLayout>
    </div>
  );
}
