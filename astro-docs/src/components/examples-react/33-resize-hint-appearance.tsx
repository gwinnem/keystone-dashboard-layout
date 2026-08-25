import { useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import ExampleToggle from '../harness-react/ExampleToggle';
import '../examples-react/shared-example-item.css';
import './33-resize-hint-appearance.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
];

export default function ResizeHintAppearance() {
  const [showResizeHandles, setShowResizeHandles] = useState(true);
  const [resizeHandleColor, setResizeHandleColor] = useState('#f2a93b');
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <>
      <div className="demo-controls">
        <ExampleToggle checked={showResizeHandles} label="showResizeHandles" onChange={setShowResizeHandles} />
        <label className="demo-color-field">
          resizeHandleColor
          <input onChange={(e) => setResizeHandleColor(e.target.value)} type="color" value={resizeHandleColor} />
        </label>
      </div>

      <GridLayout
        colNum={12}
        layout={layout}
        onLayoutChange={setLayout}
        resizeHandleColor={resizeHandleColor}
        rowHeight={70}
        showGridLines
        showResizeHandles={showResizeHandles}
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
