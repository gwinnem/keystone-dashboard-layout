import { useRef, useState } from 'react';
import { GridLayout, GridItem } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import { readOutsideDropPayload } from 'keystone-dashboard-layout-core';
import type { TLayout } from 'keystone-dashboard-layout-core';
import '../examples-react/shared-example-item.css';
import './34-outside-drop-accept-payload.css';

interface IWidgetPayload {
  kind: string;
  label: string;
}

export default function OutsideDropAcceptPayload() {
  const [layout, setLayout] = useState<TLayout>([]);
  const [lastPayload, setLastPayload] = useState<string | null>(null);
  const nextId = useRef(0);

  function handleDragStart(isWidget: boolean, event: React.DragEvent<HTMLDivElement>): void {
    const payload: IWidgetPayload = isWidget
      ? { kind: 'widget', label: 'A real widget' }
      : { kind: 'not-a-widget', label: 'Should be rejected' };
    event.dataTransfer.setData('application/json', JSON.stringify(payload));
    // A second, marker-only MIME type carrying no value of its own —
    // `dataTransfer.types` (unlike `.getData()`) is readable during
    // dragenter/dragover, so this is what `outsideDropAccept` below
    // actually checks. Only the real widget sets it.
    if (isWidget) {
      event.dataTransfer.setData('application/x-widget', '');
    }
  }

  function outsideDropAccept(dataTransfer: DataTransfer | null): boolean {
    // Deliberately checks `.types`, not the payload itself — reading
    // `.getData()`'s actual value only works at `drop` time; during
    // dragenter/dragover (when this is called) it always returns an
    // empty string, so a payload-parsing check here would silently
    // reject every drag, real widget or not.
    return !!dataTransfer?.types.includes('application/x-widget');
  }

  function handleOutsideDrop({ x, y, w, h, dataTransfer }: { x: number; y: number; w: number; h: number; dataTransfer: DataTransfer | null }): void {
    const payload = readOutsideDropPayload<IWidgetPayload>(dataTransfer, 'application/json');
    setLastPayload(JSON.stringify(payload));
    setLayout((current) => {
      const newItem = { h, i: String(nextId.current), w, x, y };
      nextId.current += 1;
      return [...current, newItem];
    });
  }

  return (
    <>
      <div className="demo-controls">
        <div className="outside-source outside-source--accepted" draggable="true" onDragStart={(e) => handleDragStart(true, e)}>
          widget (accepted)
        </div>
        <div className="outside-source outside-source--rejected" draggable="true" onDragStart={(e) => handleDragStart(false, e)}>
          not-a-widget (rejected)
        </div>
      </div>

      <div className="drop-zone-frame">
        <GridLayout
          allowOutsideDrop
          colNum={12}
          heightMode="fit"
          layout={layout}
          onLayoutChange={setLayout}
          onOutsideDrop={handleOutsideDrop}
          outsideDropAccept={outsideDropAccept}
          rowHeight={60}
          showGridLines
        >
          {layout.map((item) => (
            <GridItem i={item.i} key={item.i}>
              <div className="example-item">{item.i}</div>
            </GridItem>
          ))}
        </GridLayout>
      </div>

      <p className="demo-description">Last payload: {lastPayload ?? 'none yet'}</p>
    </>
  );
}
