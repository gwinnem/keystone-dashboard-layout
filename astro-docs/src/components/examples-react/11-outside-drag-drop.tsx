import { useRef, useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import '../examples-react/shared-example-item.css';
import './11-outside-drag-drop.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
];

export default function OutsideDragDrop() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const nextId = useRef(1);

  function handleDragStart(event: React.DragEvent<HTMLDivElement>): void {
    event.dataTransfer.setData('text/plain', 'from-outside');
  }

  function handleOutsideDrop({ x, y, w, h }: { x: number; y: number; w: number; h: number }): void {
    setLayout((current) => [...current, { h, i: String(nextId.current), w, x, y }]);
    nextId.current += 1;
  }

  return (
    <>
      <div className="demo-controls">
        <div className="outside-source" draggable="true" onDragStart={handleDragStart}>
          drag me in
        </div>
      </div>

      <GridLayout
        allowOutsideDrop
        colNum={12}
        layout={layout}
        onLayoutChange={setLayout}
        onOutsideDrop={handleOutsideDrop}
        outsideDropHeight={2}
        outsideDropWidth={3}
        rowHeight={60}
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
