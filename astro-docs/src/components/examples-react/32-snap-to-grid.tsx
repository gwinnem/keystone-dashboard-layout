import { useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import { ECompactType } from '@keystone-dashboard-layout/core';
import type { TLayout } from '@keystone-dashboard-layout/core';
import ExampleToggle from '../harness-react/ExampleToggle';
import ExampleNumberField from '../harness-react/ExampleNumberField';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';
import '../examples-react/shared-example-item.css';

// compactType: NONE — without this, automatic vertical compaction
// would fight against the snapped position itself, potentially
// undoing/shifting the item right after snapToGrid places it.
const initialLayout: TLayout = [
  { h: 2, i: '0', w: 2, x: 0, y: 6 },
  { h: 2, i: '1', w: 8, x: 0, y: 0 },
];

export default function SnapToGrid() {
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [snapThreshold, setSnapThreshold] = useState(2);
  const [showGridLines, setShowGridLines] = useState(true);
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <>
      <div className="demo-controls">
        <ExampleToggle checked={snapToGrid} label="snapToGrid" onChange={setSnapToGrid} />
        <ExampleToggle checked={showGridLines} label="showGridLines" onChange={setShowGridLines} />
        <ExampleNumberField label="snapThreshold" max={4} min={0} onChange={setSnapThreshold} value={snapThreshold} />
      </div>

      <GridLayout
        colNum={12}
        compactType={ECompactType.NONE}
        layout={layout}
        onLayoutChange={setLayout}
        rowHeight={60}
        showGridLines={showGridLines}
        snapThreshold={snapThreshold}
        snapToGrid={snapToGrid}
      >
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">{item.i}</div>
          </GridItem>
        ))}
      </GridLayout>

      <LayoutJsonViewer layout={layout} />
    </>
  );
}
