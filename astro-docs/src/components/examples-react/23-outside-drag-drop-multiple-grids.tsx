import { useRef, useState } from 'react';
import { GridLayout, GridItem } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import type { TLayout } from 'keystone-dashboard-layout-core';
import '../examples-react/shared-example-item.css';
import './04-multiple-grids.css';
import './11-outside-drag-drop.css';

export default function OutsideDragDropMultipleGrids() {
  const [layoutA, setLayoutA] = useState<TLayout>([]);
  const [layoutB, setLayoutB] = useState<TLayout>([]);
  const nextId = useRef(0);

  function handleDragStart(event: React.DragEvent<HTMLDivElement>): void {
    event.dataTransfer.setData('text/plain', 'from-outside');
  }

  function handleDroppedA({ x, y, w, h }: { x: number; y: number; w: number; h: number }): void {
    setLayoutA((current) => {
      const newItem = { h, i: `a${nextId.current}`, w, x, y };
      nextId.current += 1;
      return [...current, newItem];
    });
  }

  function handleDroppedB({ x, y, w, h }: { x: number; y: number; w: number; h: number }): void {
    setLayoutB((current) => {
      const newItem = { h, i: `b${nextId.current}`, w, x, y };
      nextId.current += 1;
      return [...current, newItem];
    });
  }

  return (
    <>
      <div className="demo-controls">
        <div className="outside-source" draggable="true" onDragStart={handleDragStart}>
          drag me in
        </div>
      </div>

      <div className="grids-row">
        <div className="grid-column">
          <p className="grid-label">Grid A</p>
          <GridLayout allowOutsideDrop colNum={6} layout={layoutA} onLayoutChange={setLayoutA} onOutsideDrop={handleDroppedA} rowHeight={60} showGridLines>
            {layoutA.map((item) => (
              <GridItem i={item.i} key={item.i}>
                <div className="example-item">{item.i}</div>
              </GridItem>
            ))}
          </GridLayout>
        </div>
        <div className="grid-column">
          <p className="grid-label">Grid B</p>
          <GridLayout allowOutsideDrop colNum={6} layout={layoutB} onLayoutChange={setLayoutB} onOutsideDrop={handleDroppedB} rowHeight={60} showGridLines>
            {layoutB.map((item) => (
              <GridItem i={item.i} key={item.i}>
                <div className="example-item">{item.i}</div>
              </GridItem>
            ))}
          </GridLayout>
        </div>
      </div>
    </>
  );
}
