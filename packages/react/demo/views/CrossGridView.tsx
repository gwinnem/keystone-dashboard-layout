import { useState } from 'react';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { GridItem, GridLayout } from '../../src/index';

function leftLayout(): TLayout {
  return [
    { h: 2, i: `left-0`, w: 3, x: 0, y: 0 },
    { h: 2, i: `left-1`, w: 3, x: 3, y: 0 },
  ];
}

function rightLayout(): TLayout {
  return [
    { h: 2, i: `right-0`, w: 3, x: 0, y: 0 },
  ];
}

/**
 * Two independently-toggleable `GridLayout` instances side by side —
 * `allowCrossGridDrag`/`disableExternalDrop`/`layoutId`/
 * `onCrossGridItemDropped`/`onCrossGridDropRejected`. Drag an item from
 * either grid across into the other one; toggling `disableExternalDrop`
 * on the right grid demonstrates a rejected drop.
 */
export default function CrossGridView(): React.JSX.Element {
  const [leftItems, setLeftItems] = useState<TLayout>(leftLayout);
  const [rightItems, setRightItems] = useState<TLayout>(rightLayout);
  const [rightDisabled, setRightDisabled] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const appendLog = (entry: string): void => {
    setLog(prev => [...prev.slice(-49), entry]);
  };

  return (
    <div className="demo-view" data-testid="view-cross-grid">
      <h2>Cross-grid drag</h2>
      <p className="demo-view-description">
        <code>allowCrossGridDrag</code>/<code>disableExternalDrop</code>/<code>layoutId</code>/
        <code>onCrossGridItemDropped</code>/<code>onCrossGridDropRejected</code> — drag an item from either
        grid across into the other. Both grids keep <code>allowCrossGridDrag</code> on permanently here;
        toggle the right grid&apos;s own <code>disableExternalDrop</code> below to see a rejected drop
        instead.
      </p>

      <div className="demo-controls">
        <fieldset className="demo-control-group">
          <legend>Right grid</legend>
          <div className="demo-control">
            <input
              checked={rightDisabled}
              data-testid="toggle-rightDisableExternalDrop"
              id="rightDisableExternalDrop"
              onChange={e => setRightDisabled(e.target.checked)}
              type="checkbox"
            />
            <label htmlFor="rightDisableExternalDrop">disableExternalDrop</label>
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
                  layout={leftItems}
                  layoutId="left"
                  onCrossGridDropRejected={payload => appendLog(`left: onCrossGridDropRejected(itemId: ${payload.itemId}, from: ${payload.sourceLayoutId})`)}
                  onCrossGridItemDropped={payload => appendLog(`left: onCrossGridItemDropped(item: ${payload.item.i}, from: ${payload.sourceLayoutId})`)}
                  onLayoutChange={setLeftItems}
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
                  disableExternalDrop={rightDisabled}
                  layout={rightItems}
                  layoutId="right"
                  onCrossGridDropRejected={payload => appendLog(`right: onCrossGridDropRejected(itemId: ${payload.itemId}, from: ${payload.sourceLayoutId})`)}
                  onCrossGridItemDropped={payload => appendLog(`right: onCrossGridItemDropped(item: ${payload.item.i}, from: ${payload.sourceLayoutId})`)}
                  onLayoutChange={setRightItems}
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
          <div className="demo-event-log demo-event-log--label-offset" data-testid="event-log">
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
