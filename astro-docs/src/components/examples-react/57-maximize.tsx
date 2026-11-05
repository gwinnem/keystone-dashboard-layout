import { useRef, useState } from 'react';
import { GridLayout, GridItem } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import type { TLayout } from 'keystone-dashboard-layout-core';
import '../examples-react/shared-example-item.css';
import './57-maximize.css';

const initialLayout: TLayout = [
  { h: 2, i: 'A', w: 4, x: 0, y: 0 },
  { h: 2, i: 'B', w: 4, x: 4, y: 0 },
  { h: 2, i: 'C', w: 4, x: 8, y: 0 },
  { h: 2, i: 'D', w: 4, x: 0, y: 2 },
  { h: 2, i: 'E', w: 4, x: 4, y: 2 },
  { h: 2, i: 'F', w: 4, x: 8, y: 2 },
];

export default function Maximize() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const [maximized, setMaximized] = useState<string | number | null>(null);
  const [note, setNote] = useState('');
  // Items added while something is maximized: compaction is paused until the grid is restored.
  const [waiting, setWaiting] = useState<string[]>([]);
  const nextId = useRef(initialLayout.length);

  // Called by the grid for a change it made itself (the card's button, Escape), and by the Restore button below.
  function handleMaximizedChange(id: string | number | null): void {
    setMaximized(id);
    if (id === null) {
      setNote(waiting.length > 0 ? `Restored. Compaction ran once and placed ${waiting.join(', ')}.` : 'Restored.');
      setWaiting([]);
    }
  }

  function addItem(): void {
    const id = String.fromCharCode(65 + nextId.current);
    nextId.current += 1;
    // y: Infinity is the usual "append it, let compaction place it" pattern. While an item is maximized compaction is
    // paused, so the new card is simply held until the grid is restored.
    setLayout((current) => [...current, { h: 2, i: id, w: 4, x: 0, y: Infinity }]);
    if (maximized === null) {
      setNote(`Added ${id}.`);
    } else {
      setWaiting((current) => [...current, id]);
      setNote(`Added ${id}. Compaction is paused while ${maximized} is maximized; ${id} is placed when you restore.`);
    }
  }

  function statusText(): string {
    if (maximized !== null) {
      return `${maximized} fills the grid. The layout is unchanged. Press Escape, use its button, or click Restore.`;
    }
    return note || 'Click the square icon in a card’s corner to maximize it.';
  }

  return (
    <>
      <div className="demo-controls">
        <button className="demo-btn" onClick={addItem} type="button">+ Add item</button>
        <button
          className="demo-btn demo-btn--ghost"
          disabled={maximized === null}
          onClick={() => handleMaximizedChange(null)}
          type="button">
          Restore
        </button>
      </div>

      <GridLayout
        className="maximize-grid"
        colNum={12}
        heightMode="scroll"
        layout={layout}
        maximizedItem={maximized}
        onLayoutChange={setLayout}
        onMaximizedItemChange={handleMaximizedChange}
        rowHeight={60}
        showMaximizeButton>
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">{item.i}</div>
          </GridItem>
        ))}
      </GridLayout>

      <p aria-live="polite" className="demo-status">{statusText()}</p>
    </>
  );
}
