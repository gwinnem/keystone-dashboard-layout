import { useState } from 'react';
import { GridItem, GridLayout } from '../../src/index';
import type { TLayout } from 'keystone-dashboard-layout-core';

export default function DynamicItems(): React.JSX.Element {
  const [layout, setLayout] = useState<TLayout>([
    { h: 2, i: `0`, w: 3, x: 0, y: 0 },
  ]);
  const [nextId, setNextId] = useState(1);

  const addItem = (): void => {
    setLayout(current => [...current, { h: 2, i: String(nextId), w: 3, x: 0, y: Infinity }]);
    setNextId(current => current + 1);
  };

  const removeLastItem = (): void => {
    setLayout(current => current.slice(0, -1));
  };

  return (
    <div data-testid="dynamic-items-wrap">
      <button data-testid="add-item" onClick={addItem} type="button">Add item</button>
      <button data-testid="remove-item" onClick={removeLastItem} type="button">Remove item</button>
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
