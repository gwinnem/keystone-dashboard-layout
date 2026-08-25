import { useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import ExampleToggle from '../harness-react/ExampleToggle';
import '../examples-react/shared-example-item.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 2, x: 0, y: 0 },
  { h: 2, i: '1', w: 2, x: 2, y: 0 },
  { h: 2, i: '2', w: 2, x: 4, y: 0 },
];

export default function CloseButton() {
  const [showCloseButton, setShowCloseButton] = useState(true);
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  function removeItem(id: string | number): void {
    setLayout((current) => current.filter((item) => item.i !== id));
  }

  return (
    <>
      <div className="demo-controls">
        <ExampleToggle checked={showCloseButton} label="showCloseButton" onChange={setShowCloseButton} />
      </div>

      <GridLayout
        colNum={12}
        layout={layout}
        onItemClose={removeItem}
        onLayoutChange={setLayout}
        rowHeight={60}
        showCloseButton={showCloseButton}
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
