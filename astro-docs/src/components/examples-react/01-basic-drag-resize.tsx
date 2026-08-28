import { useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import ExampleToggle from '../harness-react/ExampleToggle';
import ExampleNumberField from '../harness-react/ExampleNumberField';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';
import './01-basic-drag-resize.css';

const letters = ['a', 'b', 'c', 'd', 'e'];

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 2, x: 0, y: 0 },
  { h: 2, i: '1', w: 2, x: 2, y: 0 },
  { h: 2, i: '2', w: 2, x: 4, y: 0 },
  { h: 4, i: '3', w: 2, x: 6, y: 0 },
  { h: 2, i: '4', w: 2, x: 8, y: 0 },
];

export default function BasicDragResize() {
  const [isDraggable, setIsDraggable] = useState(true);
  const [isResizable, setIsResizable] = useState(true);
  const [colNum, setColNum] = useState(12);
  const [activeId, setActiveId] = useState<string | number | null>(null);
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <>
      <div className="demo-controls">
        <ExampleToggle checked={isDraggable} label="isDraggable" onChange={setIsDraggable} />
        <ExampleToggle checked={isResizable} label="isResizable" onChange={setIsResizable} />
        <ExampleNumberField label="colNum" max={12} min={1} onChange={setColNum} value={colNum} />
      </div>

      <GridLayout
        colNum={colNum}
        isDraggable={isDraggable}
        isResizable={isResizable}
        layout={layout}
        onDragEnd={() => setActiveId(null)}
        onDragStart={(id) => setActiveId(id)}
        onLayoutChange={setLayout}
        rowHeight={60}
        showGridLines
      >
        {layout.map((item, index) => (
          <GridItem i={item.i} key={item.i}>
            <div className={`panel${activeId === item.i ? ' panel--active' : ''}`}>
              <span className="panel__title">panel {letters[index]}</span>
              <span className="panel__bar" />
            </div>
          </GridItem>
        ))}
      </GridLayout>

      <LayoutJsonViewer layout={layout} />
    </>
  );
}
