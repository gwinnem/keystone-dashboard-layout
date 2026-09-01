import { useState } from 'react';
import { GridItem, GridLayout } from '../../src/index';
import type { TLayout } from 'keystone-dashboard-layout-core';

export default function BasicGrid(): React.JSX.Element {
  const [layout, setLayout] = useState<TLayout>([
    { h: 2, i: `0`, w: 3, x: 0, y: 0 },
    { h: 2, i: `1`, w: 3, x: 3, y: 0 },
    { h: 3, i: `2`, w: 3, x: 6, y: 0 },
    { h: 2, i: `3`, w: 3, x: 0, y: 2 },
  ]);

  return (
    <div data-testid="basic-grid-wrap">
      {/* GridItem's own root element already carries a stable
          data-grid-item-id={i} attribute — neither GridLayout nor
          GridItem forward arbitrary extra props (see
          grid-item-props.interface.ts/grid-layout-props.interface.ts),
          so a data-testid prop passed directly to either would be
          silently dropped. e2e specs target items via
          [data-grid-item-id="..."] instead. */}
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
