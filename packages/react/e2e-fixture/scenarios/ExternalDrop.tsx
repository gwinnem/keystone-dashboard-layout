import { useState } from 'react';
import { GridItem, GridLayout } from '../../src/index';
import { ECompactType, getCompactor, readOutsideDropPayload } from 'keystone-dashboard-layout-core';
import type { TLayout } from 'keystone-dashboard-layout-core';

interface IWidgetPayload {
  label: string;
}

/**
 * Real-browser coverage for `allowOutsideDrop` — the React port has zero
 * e2e coverage for native HTML5 drag-and-drop from outside the grid
 * system, despite full feature parity with Vue (same prop, same
 * `readOutsideDropPayload` helper from the shared core package). Two
 * palette widgets (plain `draggable="true"` elements, not GridItems) can
 * be dropped onto either of two grids; both grids also set
 * `allowCrossGridDrag` so an *existing* item can move between them too,
 * a separate mechanism from outside-drop. See
 * `packages/react/e2e/external-drop.spec.ts` and the Vue package's own
 * `e2e/external-drop.spec.ts`, which this mirrors.
 */
export default function ExternalDrop(): React.JSX.Element {
  const [layoutLeft, setLayoutLeft] = useState<TLayout>([
    { h: 2, i: `left-0`, w: 3, x: 0, y: 0 },
  ]);
  const [layoutRight, setLayoutRight] = useState<TLayout>([]);
  const [verticalCompact, setVerticalCompact] = useState(true);

  const handleDragStart = (label: string) => (event: React.DragEvent<HTMLDivElement>): void => {
    event.dataTransfer.setData(`text/plain`, JSON.stringify({ label } satisfies IWidgetPayload));
  };

  const makeOutsideDropHandler = (setLayout: React.Dispatch<React.SetStateAction<TLayout>>) => (payload: { x: number; y: number; w: number; h: number; dataTransfer: DataTransfer | null }): void => {
    const parsed = readOutsideDropPayload<IWidgetPayload>(payload.dataTransfer);
    if(!parsed) {
      return;
    }
    // GridLayout is a fully controlled component — confirmed directly,
    // not assumed: it only ever compacts as a side effect of its own
    // internal drag/resize gestures (`commitLayout`), never in response
    // to an externally-driven `layout` prop change on its own. Applying
    // the current compactType here, matching this fixture's own
    // `verticalCompact` toggle, is this handler's own responsibility to
    // get right — the same as any real consumer adding an item from
    // outside the grid would need to.
    const compactType = verticalCompact ? ECompactType.VERTICAL : ECompactType.NONE;
    setLayout(current => {
      const next = [...current, { h: payload.h, i: parsed.label, w: payload.w, x: payload.x, y: payload.y }];
      return getCompactor(compactType).compact(next, 6, { compactType });
    });
  };

  const reset = (): void => {
    setLayoutLeft([{ h: 2, i: `left-0`, w: 3, x: 0, y: 0 }]);
    setLayoutRight([]);
  };

  return (
    <div>
      <div
        data-testid="drop-widget-a"
        draggable
        onDragStart={handleDragStart(`A`)}
        style={{ background: `#fef3c7`, border: `1px solid #d97706`, display: `inline-block`, margin: `4px`, padding: `8px 16px` }}
      >
        Widget A
      </div>
      <div
        data-testid="drop-widget-b"
        draggable
        onDragStart={handleDragStart(`B`)}
        style={{ background: `#fef3c7`, border: `1px solid #d97706`, display: `inline-block`, margin: `4px`, padding: `8px 16px` }}
      >
        Widget B
      </div>
      <label>
        vertical compact
        <input
          checked={verticalCompact}
          data-testid="toggle-vertical-compact"
          onChange={event => setVerticalCompact(event.target.checked)}
          type="checkbox"
        />
      </label>
      <button data-testid="reset-grids" onClick={reset} type="button">Reset</button>

      <div style={{ display: `flex`, gap: `16px` }}>
        <div data-testid="drop-grid-left" style={{ border: `1px solid #ccc`, minHeight: `200px`, width: `50%` }}>
          <GridLayout
            allowCrossGridDrag
            allowOutsideDrop
            className="cross-grid-empty-target"
            colNum={6}
            compactType={verticalCompact ? ECompactType.VERTICAL : ECompactType.NONE}
            layout={layoutLeft}
            layoutId="drop-grid-left"
            onLayoutChange={setLayoutLeft}
            onOutsideDrop={makeOutsideDropHandler(setLayoutLeft)}
            rowHeight={80}
          >
            {layoutLeft.map(item => (
              <GridItem i={item.i} key={item.i}>
                <div className="fixture-item-content demo-item">
                  {item.i}
                </div>
              </GridItem>
            ))}
          </GridLayout>
        </div>
        <div data-testid="drop-grid-right" style={{ border: `1px solid #ccc`, minHeight: `200px`, width: `50%` }}>
          <GridLayout
            allowCrossGridDrag
            allowOutsideDrop
            className="cross-grid-empty-target"
            colNum={6}
            compactType={verticalCompact ? ECompactType.VERTICAL : ECompactType.NONE}
            layout={layoutRight}
            layoutId="drop-grid-right"
            onLayoutChange={setLayoutRight}
            onOutsideDrop={makeOutsideDropHandler(setLayoutRight)}
            rowHeight={80}
          >
            {layoutRight.map(item => (
              <GridItem i={item.i} key={item.i}>
                <div className="fixture-item-content demo-item">
                  {item.i}
                </div>
              </GridItem>
            ))}
          </GridLayout>
        </div>
      </div>
    </div>
  );
}
