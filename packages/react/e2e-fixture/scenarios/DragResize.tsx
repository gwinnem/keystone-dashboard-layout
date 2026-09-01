import { useState } from 'react';
import { GridItem, GridLayout } from '../../src/index';
import { ECompactType } from 'keystone-dashboard-layout-core';
import type { TLayout } from 'keystone-dashboard-layout-core';

export default function DragResize(): React.JSX.Element {
  const [layout, setLayout] = useState<TLayout>([
    { h: 2, i: `0`, w: 4, x: 0, y: 0 },
    { h: 2, i: `1`, w: 3, x: 4, y: 0 },
  ]);
  const [compactType, setCompactType] = useState<ECompactType>(ECompactType.VERTICAL);
  const [marginH, setMarginH] = useState(10);
  const [marginV, setMarginV] = useState(10);
  const [showCloseButton, setShowCloseButton] = useState(false);
  const [eventLog, setEventLog] = useState<string[]>([]);

  const logEvent = (label: string) => (): void => {
    setEventLog(current => [...current, label]);
  };

  return (
    <div data-testid="drag-resize-wrap">
      <label>
        compactType
        <select
          data-testid="select-compact-type"
          onChange={event => setCompactType(event.target.value as ECompactType)}
          value={compactType}
        >
          <option value={ECompactType.VERTICAL}>vertical</option>
          <option value={ECompactType.NONE}>none</option>
          <option value={ECompactType.HORIZONTAL}>horizontal</option>
        </select>
      </label>
      <label>
        marginH
        <input
          data-testid="input-margin-h"
          onChange={event => setMarginH(Number(event.target.value))}
          value={marginH}
        />
      </label>
      <label>
        marginV
        <input
          data-testid="input-margin-v"
          onChange={event => setMarginV(Number(event.target.value))}
          value={marginV}
        />
      </label>
      <label>
        showCloseButton
        <input
          checked={showCloseButton}
          data-testid="toggle-close-button"
          onChange={event => setShowCloseButton(event.target.checked)}
          type="checkbox"
        />
      </label>
      <button data-testid="clear-log" onClick={() => setEventLog([])} type="button">Clear log</button>
      <div data-testid="event-log">{eventLog.join(` `)}</div>

      <GridLayout
        colNum={12}
        compactType={compactType}
        layout={layout}
        margin={[marginH, marginV]}
        onDragEnd={logEvent(`dragend`)}
        onDragStart={logEvent(`dragstart`)}
        onItemClose={id => setLayout(current => current.filter(item => item.i !== id))}
        onLayoutChange={setLayout}
        rowHeight={80}
        showCloseButton={showCloseButton}
      >
        {layout.map(item => (
          <GridItem i={item.i} key={item.i}>
            <div className="fixture-item-content">
              {`Item ${item.i}`}
            </div>
          </GridItem>
        ))}
      </GridLayout>
    </div>
  );
}
