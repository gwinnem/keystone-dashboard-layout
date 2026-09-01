import { useState } from 'react';
import { GridLayout, GridItem } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import type { TLayout } from 'keystone-dashboard-layout-core';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';
import './31-per-item-auto-height.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 4, x: 0, y: 0, autoHeight: true },
];

export default function PerItemAutoHeight() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const [lines, setLines] = useState(['One line of content.']);

  function addLine(): void {
    setLines((current) => [...current, `Line ${current.length + 1} of content.`]);
  }

  function removeLine(): void {
    setLines((current) => (current.length > 1 ? current.slice(0, -1) : current));
  }

  return (
    <>
      <div className="demo-controls">
        <button className="demo-btn" onClick={addLine} type="button">+ Add a line</button>
        <button className="demo-btn demo-btn--ghost" onClick={removeLine} type="button">- Remove a line</button>
      </div>

      <GridLayout colNum={12} layout={layout} onLayoutChange={setLayout} rowHeight={30} showGridLines>
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">
              {lines.map((line, index) => <p key={index}>{line}</p>)}
            </div>
          </GridItem>
        ))}
      </GridLayout>

      <LayoutJsonViewer layout={layout} />
    </>
  );
}
