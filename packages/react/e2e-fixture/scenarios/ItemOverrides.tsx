import { useState } from 'react';
import { GridItem, GridLayout } from '../../src/index';
import type { TLayout, TResizeHandle } from 'keystone-dashboard-layout-core';

const ALL_HANDLES: TResizeHandle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

/**
 * Real-browser coverage for per-item overrides — the React port has zero
 * e2e coverage for any of these despite full feature parity with Vue
 * (every field here lives on `ILayoutItem`, confirmed by reading
 * `layout-definition.ts` directly): `preserveAspectRatio`,
 * `isResizable`/`isDraggable` tri-state, `dragIgnoreFrom`/
 * `dragAllowFrom`, `resizeIgnoreFrom`, per-item `resizeHandles`,
 * `autoScroll`, the `header` render-prop equivalent of Vue's `#header`
 * slot, and per-item `zIndex`. See
 * `packages/react/e2e/item-overrides.spec.ts` and the Vue package's own
 * `e2e/item-overrides.spec.ts`, which this mirrors as closely as React's
 * layout-item-driven (rather than direct-GridItem-prop) architecture
 * allows.
 */
export default function ItemOverrides(): React.JSX.Element {
  const [layout, setLayout] = useState<TLayout>([
    { h: 3, i: `0`, w: 3, x: 0, y: 0 },
    { h: 2, i: `1`, w: 3, x: 4, y: 0 },
  ]);
  const [preserveAspectRatio, setPreserveAspectRatio] = useState(false);
  const [isResizable, setIsResizable] = useState<string>(``);
  const [isDraggable, setIsDraggable] = useState<string>(``);
  const [dragAllowFrom, setDragAllowFrom] = useState(``);
  const [resizeIgnoreFrom, setResizeIgnoreFrom] = useState(``);
  const [autoScroll, setAutoScroll] = useState(false);
  const [showHeader, setShowHeader] = useState(false);
  const [zIndex, setZIndex] = useState<string>(``);
  const [disabledHandles, setDisabledHandles] = useState<Set<TResizeHandle>>(new Set());

  const resolvedResizeHandles = ALL_HANDLES.filter(handle => !disabledHandles.has(handle));

  const item0 = layout.find(item => item.i === `0`)!;
  const patchItem0 = (patch: Partial<typeof item0>): void => {
    setLayout(current => current.map(item => (item.i === `0` ? { ...item, ...patch } : item)));
  };

  return (
    <div>
      <label>
        preserveAspectRatio
        <input
          checked={preserveAspectRatio}
          data-testid="toggle-preserve-aspect-ratio"
          onChange={event => {
            setPreserveAspectRatio(event.target.checked);
            patchItem0({ preserveAspectRatio: event.target.checked });
          }}
          type="checkbox"
        />
      </label>
      <label>
        isResizable
        <select
          data-testid="select-is-resizable"
          onChange={event => {
            setIsResizable(event.target.value);
            patchItem0({ isResizable: event.target.value === `` ? undefined : event.target.value === `true` });
          }}
          value={isResizable}
        >
          <option value="">(default)</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </label>
      <label>
        isDraggable
        <select
          data-testid="select-is-draggable"
          onChange={event => {
            setIsDraggable(event.target.value);
            patchItem0({ isDraggable: event.target.value === `` ? undefined : event.target.value === `true` });
          }}
          value={isDraggable}
        >
          <option value="">(default)</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </label>
      <label>
        dragAllowFrom
        <input
          data-testid="input-drag-allow-from"
          onChange={event => {
            setDragAllowFrom(event.target.value);
            patchItem0({ dragAllowFrom: event.target.value || null });
          }}
          value={dragAllowFrom}
        />
      </label>
      <label>
        resizeIgnoreFrom
        <input
          data-testid="input-resize-ignore-from"
          onChange={event => {
            setResizeIgnoreFrom(event.target.value);
            patchItem0({ resizeIgnoreFrom: event.target.value || null });
          }}
          value={resizeIgnoreFrom}
        />
      </label>
      <label>
        autoScroll
        <input
          checked={autoScroll}
          data-testid="toggle-auto-scroll"
          onChange={event => {
            setAutoScroll(event.target.checked);
            patchItem0({ autoScroll: event.target.checked });
          }}
          type="checkbox"
        />
      </label>
      <label>
        header
        <input
          checked={showHeader}
          data-testid="toggle-item-header"
          onChange={event => setShowHeader(event.target.checked)}
          type="checkbox"
        />
      </label>
      <label>
        zIndex
        <input
          data-testid="input-item-z-index"
          onChange={event => {
            setZIndex(event.target.value);
            patchItem0({ zIndex: event.target.value === `` ? null : Number(event.target.value) });
          }}
          value={zIndex}
        />
      </label>
      {ALL_HANDLES.map(handle => (
        <label key={handle}>
          {handle}
          <input
            checked={!disabledHandles.has(handle)}
            data-testid={`toggle-resize-handle-${handle}`}
            onChange={event => {
              const nextDisabled = new Set(disabledHandles);
              if(event.target.checked) {
                nextDisabled.delete(handle);
              } else {
                nextDisabled.add(handle);
              }
              setDisabledHandles(nextDisabled);
              patchItem0({ resizeHandles: ALL_HANDLES.filter(h => !nextDisabled.has(h)) });
            }}
            type="checkbox"
          />
        </label>
      ))}

      <div
        data-testid="item-overrides-scroll-area"
        style={{ height: `250px`, overflow: `auto`, position: `relative` }}
      >
        <div style={{ height: `800px` }}>
          <GridLayout colNum={12} layout={layout} onLayoutChange={setLayout} rowHeight={80}>
            {layout.map(item => (
              <GridItem
                header={item.i === `0` && showHeader ? <div>header slot</div> : undefined}
                i={item.i}
                key={item.i}
              >
                <div className="fixture-item-content">
                  {`Item ${item.i}`}
                  {item.i === `0` && (
                    <button className="item-inner-button" type="button">inner</button>
                  )}
                </div>
              </GridItem>
            ))}
          </GridLayout>
        </div>
      </div>
    </div>
  );
}
