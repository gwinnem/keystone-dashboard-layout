import { useRef, useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
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
  const previousLayoutRef = useRef<TLayout>(initialLayout);

  function pushEvent(message: string): void {
    setEvents((current) => [message, ...current].slice(0, 6));
  }

  function handleLayoutChange(next: TLayout): void {
    const previous = previousLayoutRef.current;
    for (const item of next) {
      const before = previous.find((p) => p.i === item.i);
      if (!before) continue;
      if (before.x !== item.x || before.y !== item.y) {
        pushEvent(`${item.i} moved to x:${item.x} y:${item.y}`);
      }
      if (before.w !== item.w || before.h !== item.h) {
        pushEvent(`${item.i} resized to w:${item.w} h:${item.h}`);
      }
    }
    previousLayoutRef.current = next;
    setLayout(next);
  }

  return (
    <>
      <GridLayout colNum={12} layout={layout} onLayoutChange={handleLayoutChange} rowHeight={60} showGridLines>
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
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
    </>
  );
}
