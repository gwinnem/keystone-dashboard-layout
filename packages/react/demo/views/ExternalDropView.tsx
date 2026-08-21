import { useState } from 'react';
import { readOutsideDropPayload } from '@keystone-dashboard-layout/core';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { GridItem, GridLayout } from '../../src/index';

function leftLayout(): TLayout {
  return [{ h: 2, i: `left-0`, w: 3, x: 0, y: 0 }];
}

function rightLayout(): TLayout {
  return [{ h: 2, i: `right-0`, w: 3, x: 0, y: 0 }];
}

let nextIdCounter = 100;

/**
 * `allowOutsideDrop`/`outsideDropWidth`/`outsideDropHeight`/
 * `outsideDropAccept`/`onOutsideDrop` — a plain `draggable="true"`
 * element outside any grid, dragged in via the browser's own native
 * HTML5 drag-and-drop (distinct from `CrossGridView`'s pointer-driven
 * engine). Both grids here also keep `allowCrossGridDrag` on, so an
 * already-added item can additionally move between them.
 */
export default function ExternalDropView(): React.JSX.Element {
  const [leftItems, setLeftItems] = useState<TLayout>(leftLayout);
  const [rightItems, setRightItems] = useState<TLayout>(rightLayout);
  const [rejectDrops, setRejectDrops] = useState(false);
  const [outsideDropWidth, setOutsideDropWidth] = useState(2);
  const [outsideDropHeight, setOutsideDropHeight] = useState(2);
  const [log, setLog] = useState<string[]>([]);

  const appendLog = (entry: string): void => {
    setLog(prev => [...prev.slice(-49), entry]);
  };

  // outsideDropAccept's own worked example: reject the drag entirely
  // (no placeholder, no onOutsideDrop) when the toggle is on, by
  // checking dataTransfer's own declared MIME types before a single
  // native drag attribute is read. Deliberately has no side effects of
  // its own (no logging here) -- this can fire repeatedly per gesture
  // (dragenter/dragover), not just once, so anything with a visible
  // side effect belongs in onOutsideDrop instead, not here.
  const outsideDropAccept = rejectDrops
    ? (dataTransfer: DataTransfer | null) => dataTransfer?.types.includes(`application/x-demo-widget`) ?? false
    : undefined;

  const handleOutsideDrop = (
    targetSetItems: React.Dispatch<React.SetStateAction<TLayout>>,
    label: string,
  ) => (payload: { x: number; y: number; w: number; h: number; dataTransfer: DataTransfer | null }): void => {
    // readOutsideDropPayload's own worked example — parsing the
    // structured data the drag source attached, rather than reading
    // dataTransfer directly.
    const parsed = readOutsideDropPayload<{ label: string }>(payload.dataTransfer, `application/x-demo-widget`);
    const id = String(nextIdCounter);
    nextIdCounter += 1;
    targetSetItems(prev => [...prev, { h: payload.h, i: id, w: payload.w, x: payload.x, y: payload.y }]);
    appendLog(`${label}: onOutsideDrop(x:${payload.x}, y:${payload.y}, w:${payload.w}, h:${payload.h}, payload label: ${parsed?.label ?? `none`})`);
  };

  return (
    <div className="demo-view" data-testid="view-external-drop">
      <h2>External drop</h2>
      <p className="demo-view-description">
        <code>allowOutsideDrop</code>/<code>outsideDropWidth</code>/<code>outsideDropHeight</code>/
        <code>outsideDropAccept</code>/<code>onOutsideDrop</code> — drag the chip below into either grid
        using the browser&apos;s own native HTML5 drag-and-drop. Both grids also keep{' '}
        <code>allowCrossGridDrag</code> on, so an already-added item can additionally move between them.
      </p>

      <div className="demo-controls">
        <fieldset className="demo-control-group">
          <legend>Outside-drop chip</legend>
          <div className="demo-control">
            <div
              className="demo-drag-chip"
              data-testid="drag-chip"
              draggable
              onDragStart={e => {
                e.dataTransfer.setData(`application/x-demo-widget`, JSON.stringify({ label: `New widget` }));
                e.dataTransfer.effectAllowed = `copy`;
              }}
            >
              Drag me into a grid
            </div>
          </div>
          <div className="demo-control">
            <input
              checked={rejectDrops}
              data-testid="toggle-rejectDrops"
              id="rejectDrops"
              onChange={e => setRejectDrops(e.target.checked)}
              type="checkbox"
            />
            <label htmlFor="rejectDrops">outsideDropAccept: reject drags without the demo MIME type</label>
          </div>
          <div className="demo-control">
            <label htmlFor="outsideDropWidth">outsideDropWidth</label>
            <input data-testid="input-outsideDropWidth" id="outsideDropWidth" min={1} onChange={e => setOutsideDropWidth(Number(e.target.value))} type="number" value={outsideDropWidth} />
          </div>
          <div className="demo-control">
            <label htmlFor="outsideDropHeight">outsideDropHeight</label>
            <input data-testid="input-outsideDropHeight" id="outsideDropHeight" min={1} onChange={e => setOutsideDropHeight(Number(e.target.value))} type="number" value={outsideDropHeight} />
          </div>
        </fieldset>
      </div>

      <div className="demo-view-body">
        <div className="demo-view-main">
          <div className="demo-cross-grid-row">
            <div className="demo-cross-grid-item">
              <p className="demo-status">Left grid (layoutId: &quot;left&quot;)</p>
              <div className="demo-grid-area">
                <GridLayout
                  allowCrossGridDrag
                  allowOutsideDrop
                  layout={leftItems}
                  layoutId="left"
                  onCrossGridItemDropped={payload => appendLog(`left: onCrossGridItemDropped(item: ${payload.item.i}, from: ${payload.sourceLayoutId})`)}
                  onLayoutChange={setLeftItems}
                  onOutsideDrop={handleOutsideDrop(setLeftItems, `left`)}
                  outsideDropAccept={outsideDropAccept}
                  outsideDropHeight={outsideDropHeight}
                  outsideDropWidth={outsideDropWidth}
                  rowHeight={80}
                >
                  {leftItems.map(item => (
                    <GridItem i={item.i} key={item.i}>
                      <div className="demo-item-content">{`Item ${item.i}`}</div>
                    </GridItem>
                  ))}
                </GridLayout>
              </div>
            </div>

            <div className="demo-cross-grid-item">
              <p className="demo-status">Right grid (layoutId: &quot;right&quot;)</p>
              <div className="demo-grid-area">
                <GridLayout
                  allowCrossGridDrag
                  allowOutsideDrop
                  layout={rightItems}
                  layoutId="right"
                  onCrossGridItemDropped={payload => appendLog(`right: onCrossGridItemDropped(item: ${payload.item.i}, from: ${payload.sourceLayoutId})`)}
                  onLayoutChange={setRightItems}
                  onOutsideDrop={handleOutsideDrop(setRightItems, `right`)}
                  outsideDropAccept={outsideDropAccept}
                  outsideDropHeight={outsideDropHeight}
                  outsideDropWidth={outsideDropWidth}
                  rowHeight={80}
                >
                  {rightItems.map(item => (
                    <GridItem i={item.i} key={item.i}>
                      <div className="demo-item-content">{`Item ${item.i}`}</div>
                    </GridItem>
                  ))}
                </GridLayout>
              </div>
            </div>
          </div>
        </div>

        <div className="demo-view-log-column">
          <div className="demo-event-log" data-testid="event-log">
            {log.map((entry, index) => (
              // eslint-disable-next-line react/no-array-index-key -- log entries have no stable identity of their own, same rationale as GridLayout.tsx's own alignment-guide keys.
              <div className="demo-event-log-entry" key={index}>{entry}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
