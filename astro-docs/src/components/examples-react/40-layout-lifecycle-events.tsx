import { useState } from 'react';
import { GridLayout, GridItem } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import type { TLayout } from 'keystone-dashboard-layout-core';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';
import '../examples-react/shared-example-item.css';
import './40-layout-lifecycle-events.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
];

export default function LayoutLifecycleEvents() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const [events, setEvents] = useState<string[]>([]);

  function logEvent(name: string): void {
    setEvents((current) => [name, ...current].slice(0, 20));
  }

  function handleLayoutChange(next: TLayout): void {
    logEvent('onLayoutChange');
    setLayout(next);
  }

  return (
    <>
      <GridLayout
        colNum={12}
        layout={layout}
        onColumnsChanged={() => logEvent('onColumnsChanged')}
        onDragEnd={(id) => logEvent(`onDragEnd: ${id}`)}
        onDragMove={(id) => logEvent(`onDragMove: ${id}`)}
        onDragStart={(id) => logEvent(`onDragStart: ${id}`)}
        onLayoutChange={handleLayoutChange}
        onLayoutReady={() => logEvent('onLayoutReady')}
        rowHeight={60}
        showGridLines
      >
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">{item.i}</div>
          </GridItem>
        ))}
      </GridLayout>

      <div className="event-log-panel">
        <p className="event-log__label">LIFECYCLE LOG</p>
        <ul className="event-log">
          {events.map((entry, index) => <li className="event-log__entry" key={index}>{entry}</li>)}
        </ul>
      </div>

      <LayoutJsonViewer layout={layout} />
    </>
  );
}
