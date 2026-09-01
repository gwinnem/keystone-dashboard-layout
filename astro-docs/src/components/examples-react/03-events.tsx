import { useState } from 'react';
import { GridLayout, GridItem } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import type { TLayout } from 'keystone-dashboard-layout-core';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';
import '../examples-react/shared-example-item.css';
import './03-events.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 2, x: 0, y: 0 },
  { h: 2, i: '1', w: 2, x: 2, y: 0 },
  { h: 2, i: '2', w: 2, x: 4, y: 0 },
];

export default function Events() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const [events, setEvents] = useState<string[]>([]);

  function log(message: string): void {
    setEvents((current) => [`${new Date().toLocaleTimeString()} — ${message}`, ...current].slice(0, 8));
  }

  return (
    <>
      <GridLayout
        colNum={12}
        layout={layout}
        onColumnsChanged={(cols) => log(`onColumnsChanged: ${cols}`)}
        onDragEnd={(id) => log(`dragend: ${id}`)}
        onDragMove={() => log('dragmove')}
        onDragStart={(id) => log(`dragstart: ${id}`)}
        onLayoutChange={(next) => {
          log('onLayoutChange');
          setLayout(next);
        }}
        rowHeight={60}
        showGridLines
      >
        {layout.map((item) => (
          <GridItem
            i={item.i}
            key={item.i}
            onItemMoved={({ i, x, y }) => log(`moved: ${i} -> (${x},${y})`)}
            onItemResized={({ i, w, h }) => log(`resized: ${i} -> ${w}x${h}`)}
          >
            <div className="example-item">{item.i}</div>
          </GridItem>
        ))}
      </GridLayout>

      <div className="event-log-panel">
        <p className="event-log__label">EVENT LOG</p>
        <ul className="event-log">
          {events.length === 0 ? (
            <li className="event-log__empty">Drag or resize an item to see events appear here.</li>
          ) : (
            events.map((entry, index) => <li className="event-log__entry" key={index}>{entry}</li>)
          )}
        </ul>
      </div>

      <LayoutJsonViewer layout={layout} />
    </>
  );
}
