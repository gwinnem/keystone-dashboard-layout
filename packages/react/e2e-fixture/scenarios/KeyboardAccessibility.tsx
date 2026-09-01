import { useState } from 'react';
import { GridItem, GridLayout } from '../../src/index';
import type { TLayout } from 'keystone-dashboard-layout-core';

export default function KeyboardAccessibility(): React.JSX.Element {
  const [layout, setLayout] = useState<TLayout>([
    { h: 2, i: `0`, w: 3, x: 0, y: 0 },
  ]);

  return (
    <div data-testid="keyboard-wrap">
      <GridLayout colNum={12} layout={layout} onLayoutChange={setLayout} rowHeight={80}>
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
