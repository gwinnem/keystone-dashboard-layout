import { useState } from 'react';
import { GridLayout, GridItem } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import type { TLayout } from 'keystone-dashboard-layout-core';
import '../examples-react/shared-example-item.css';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';
import './25-custom-drag-placeholder.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
];

export default function CustomDragPlaceholder() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <>
      <GridLayout
        colNum={12}
        layout={layout}
        onLayoutChange={setLayout}
        renderPlaceholder={(placeholder, isDragging) => (
          <div className="custom-placeholder">
            {isDragging && placeholder && (
              <span className="custom-placeholder-label">
                drop at x:{placeholder.x} y:{placeholder.y}
              </span>
            )}
          </div>
        )}
        rowHeight={70}
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
