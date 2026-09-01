import { useRef, useState } from 'react';
import { GridItem, GridLayout } from '../../src/index';
import type { IGridLayoutHandle } from '../../src/index';
import { ECompactType } from 'keystone-dashboard-layout-core';
import type { TLayout } from 'keystone-dashboard-layout-core';

/**
 * Real-browser coverage for `multiSelect` — click/Ctrl+click selection
 * and the resulting group move, exercising the actual native
 * pointer-driven drag engine and real DOM click events, neither of
 * which the unit-test suite's own mocked `__nativeDragHandler`
 * backdoor or synthetic `dispatchEvent` calls can stand in for. See
 * `packages/react/e2e/multi-select.spec.ts` for what this drives.
 */
export default function MultiSelect(): React.JSX.Element {
  const [layout, setLayout] = useState<TLayout>([
    { h: 2, i: `0`, w: 3, x: 0, y: 0 },
    { h: 2, i: `1`, w: 3, x: 4, y: 0 },
    { h: 2, i: `2`, w: 3, x: 8, y: 0 },
  ]);
  const gridRef = useRef<IGridLayoutHandle>(null);
  // Tracked separately in real component state, not read directly off
  // `gridRef.current?.selectedItems` in the render body — the latter
  // wouldn't reliably update this component's own rendered output at
  // all, since a child's internal state change (selecting an item)
  // doesn't by itself cause *this* parent component to re-render; only
  // `onSelectionChanged` firing (or the layout prop itself changing)
  // would.
  const [selectedCount, setSelectedCount] = useState(0);

  return (
    <div data-testid="multi-select-wrap">
      <div data-testid="selected-count">{selectedCount}</div>
      <GridLayout colNum={12} compactType={ECompactType.NONE} layout={layout} multiSelect onLayoutChange={setLayout} onSelectionChanged={ids => setSelectedCount(ids.length)} ref={gridRef} rowHeight={80}>
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
