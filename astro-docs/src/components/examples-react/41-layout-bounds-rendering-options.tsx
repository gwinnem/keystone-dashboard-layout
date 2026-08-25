import { useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import ExampleToggle from '../harness-react/ExampleToggle';
import ExampleNumberField from '../harness-react/ExampleNumberField';
import '../examples-react/shared-example-item.css';

const initialLayout: TLayout = Array.from({ length: 8 }, (_, index) => ({
  h: 2,
  i: String(index),
  w: 3,
  x: (index % 4) * 3,
  y: Math.floor(index / 4) * 2,
}));

export default function LayoutBoundsRenderingOptions() {
  const [maxRows, setMaxRows] = useState(4);
  const [distributeEvenly, setDistributeEvenly] = useState(false);
  const [useCssTransforms, setUseCssTransforms] = useState(true);
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <>
      <div className="demo-controls">
        <ExampleNumberField label="maxRows" max={10} min={1} onChange={setMaxRows} value={maxRows} />
        <ExampleToggle checked={distributeEvenly} label="distributeEvenly" onChange={setDistributeEvenly} />
        <ExampleToggle checked={useCssTransforms} label="useCssTransforms" onChange={setUseCssTransforms} />
      </div>

      <GridLayout
        colNum={12}
        distributeEvenly={distributeEvenly}
        layout={layout}
        maxRows={maxRows}
        onLayoutChange={setLayout}
        rowHeight={50}
        showGridLines
        useCssTransforms={useCssTransforms}
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
