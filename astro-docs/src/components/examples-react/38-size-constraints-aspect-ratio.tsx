import { useState } from 'react';
import { GridLayout, GridItem } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import type { TLayout } from 'keystone-dashboard-layout-core';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';
import './38-size-constraints-aspect-ratio.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0, minW: 2, maxW: 5, minH: 2, maxH: 4 },
  { h: 2, i: '1', w: 2, x: 3, y: 0, preserveAspectRatio: true },
  { h: 2, i: '2', w: 3, x: 5, y: 0 },
];

const labels: Record<string, string> = {
  '0': 'w: 2-5, h: 2-4',
  '1': 'aspect locked',
};

export default function SizeConstraintsAspectRatio() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <>
      <GridLayout colNum={12} layout={layout} onLayoutChange={setLayout} rowHeight={60} showGridLines>
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">{labels[item.i] ?? item.i}</div>
          </GridItem>
        ))}
      </GridLayout>

      <LayoutJsonViewer layout={layout} />
    </>
  );
}
