import { useState } from 'react';
import { GridLayout, GridItem } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import type { TLayout } from 'keystone-dashboard-layout-core';
import './18-custom-drag-handle-close-button.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0, dragAllowFrom: '.drag-glyph', resizeIgnoreFrom: '.drag-glyph' },
  { h: 2, i: '1', w: 3, x: 3, y: 0, dragAllowFrom: '.drag-glyph', resizeIgnoreFrom: '.drag-glyph' },
];

export default function CustomDragHandleCloseButton() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  function removeItem(id: string | number): void {
    setLayout((current) => current.filter((item) => item.i !== id));
  }

  return (
    <GridLayout colNum={12} layout={layout} onLayoutChange={setLayout} rowHeight={70} showGridLines>
      {layout.map((item) => (
        <GridItem i={item.i} key={item.i}>
          <div className="example-item">
            <span className="drag-glyph">⠿</span>
            <span>{item.i}</span>
            <button className="custom-close-btn" onClick={() => removeItem(item.i)} type="button">×</button>
          </div>
        </GridItem>
      ))}
    </GridLayout>
  );
}
