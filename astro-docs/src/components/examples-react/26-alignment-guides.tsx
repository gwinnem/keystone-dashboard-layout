import { useState } from 'react';
import { GridLayout, GridItem } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import { ECompactType } from 'keystone-dashboard-layout-core';
import type { TLayout } from 'keystone-dashboard-layout-core';
import ExampleToggle from '../harness-react/ExampleToggle';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';
import '../examples-react/shared-example-item.css';

// compactType: NONE — without this, the default vertical compaction
// actively fights against positioning items to test alignment: items
// would snap/settle after each drag rather than staying exactly where
// placed, making it hard to actually see two edges line up.
const initialLayout: TLayout = [
  { h: 2, i: '0', w: 2, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 4, y: 0 },
  { h: 2, i: '2', w: 2, x: 6, y: 4 },
];

export default function AlignmentGuides() {
  const [showAlignmentGuides, setShowAlignmentGuides] = useState(true);
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <>
      <div className="demo-controls">
        <ExampleToggle checked={showAlignmentGuides} label="showAlignmentGuides" onChange={setShowAlignmentGuides} />
      </div>

      <GridLayout
        colNum={12}
        compactType={ECompactType.NONE}
        layout={layout}
        onLayoutChange={setLayout}
        rowHeight={60}
        showAlignmentGuides={showAlignmentGuides}
        showGridLines
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
