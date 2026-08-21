import { useState } from 'react';
import type { ILayoutItem, TLayout, TResizeHandle } from '@keystone-dashboard-layout/core';
import { GridItem, GridLayout } from '../../src/index';
import MinMaxWidthDemo from './MinMaxWidthDemo';

const ALL_RESIZE_HANDLES: TResizeHandle[] = [`n`, `s`, `e`, `w`, `ne`, `nw`, `se`, `sw`];

/** Three-way inherit/true/false selector, matching Vue's own convention for a per-item override of a grid-wide boolean default. */
type TTriState = `inherit` | `true` | `false`;

function triStateToValue(state: TTriState): boolean | undefined {
  if(state === `inherit`) {
    return undefined;
  }
  return state === `true`;
}

function valueToTriState(value: boolean | undefined | null): TTriState {
  if(value === undefined || value === null) {
    return `inherit`;
  }
  return value ? `true` : `false`;
}

function initialLayout(): TLayout {
  return [
    { h: 3, i: `0`, w: 4, x: 0, y: 0 },
    { h: 3, i: `1`, w: 4, x: 4, y: 0 },
    { h: 3, i: `2`, w: 4, x: 8, y: 0 },
  ];
}

/**
 * Every per-item (`ILayoutItem`) field not otherwise exercised by
 * default-generated items elsewhere — a control panel bound to one
 * selected item at a time. See
 * `docs/DEMO_APP_IMPLEMENTATION_PLAN.md`'s own section 8 for the full,
 * confirmed field list this covers.
 *
 * Deliberately single-item only, with no "apply to all items" control
 * or logic of any kind: for every field here that also has a grid-wide
 * equivalent (`isDraggable`/`isResizable`/`isBounded`/`enableEditMode`/
 * `resizeHandles`/`showResizeHandles`/`resizeHandleColor`/
 * `showCloseButton`/`autoScroll`/`preserveAspectRatio`/`borderRadiusPx`/
 * `useBorderRadius`/`ariaLabels`/`isMirrored` — see `DragResizeView`),
 * the correct way to affect every item at once is that grid-wide prop
 * on `<GridLayout>` itself, not a per-item loop written in application
 * code. An earlier version of this view added exactly that kind of
 * loop (an "all items" mode looping over `layout` to patch every entry)
 * — removed entirely, since it was solving a problem the library
 * already solves with a single prop; keeping it would have taught the
 * wrong pattern. What's left here is only per-item *overrides* (this
 * one item deviating from whatever the grid-wide default is) plus the
 * handful of fields with no grid-wide equivalent at all (`isStatic`,
 * `minW`/`maxW`/`minH`/`maxH`, `zIndex`, `dragAllowFrom`/
 * `dragIgnoreFrom`/`resizeIgnoreFrom`/`dragActivationDistance`,
 * `autoHeight`) — those are genuinely per-item only, so there's no
 * simpler grid-wide equivalent to point to instead.
 */
export default function ItemOverridesView(): React.JSX.Element {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const [selectedId, setSelectedId] = useState<string | number>(`0`);

  const selectedItem = layout.find(item => item.i === selectedId);

  const updateSelected = (patch: Partial<ILayoutItem>): void => {
    setLayout(prev => prev.map(item => (item.i === selectedId ? { ...item, ...patch } : item)));
  };

  const toggleSelectedResizeHandle = (handle: TResizeHandle): void => {
    if(!selectedItem) {
      return;
    }
    const current = selectedItem.resizeHandles ?? null;
    if(current === null) {
      // Not overridden yet — starting an override from an empty set,
      // adding just this one handle.
      updateSelected({ resizeHandles: [handle] });
      return;
    }
    updateSelected({
      resizeHandles: current.includes(handle) ? current.filter(h => h !== handle) : [...current, handle],
    });
  };

  if(!selectedItem) {
    // Every item was closed via `onItemClose` below — no "add item"
    // control exists in this view (that's `DynamicItemsView`'s own
    // job), so this is a real, reachable state, not a defensive-only
    // guard: every control further down assumes `selectedItem` exists.
    return (
      <div className="demo-view" data-testid="view-item-overrides">
        <h2>Per-item overrides</h2>
        <p className="demo-view-description" data-testid="empty-state">
          Every item has been closed. Switch to another view and back to reset this one.
        </p>
      </div>
    );
  }

  return (
    <div className="demo-view" data-testid="view-item-overrides">
      <h2>Per-item overrides</h2>
      <p className="demo-view-description">
        Every <code>ILayoutItem</code> field not otherwise exercised elsewhere in this demo — pick an item
        below, then every control edits that one item&apos;s own layout-data entry directly. Want the same
        setting applied to every item instead of just one? Most of these fields also have a grid-wide
        equivalent, set once on <code>&lt;GridLayout&gt;</code> itself — see the <code>Drag &amp; resize</code>
        {' '}view.
      </p>

      <div className="demo-controls">
        <fieldset className="demo-control-group">
          <legend>Selected item</legend>
          <div className="demo-control">
            <label htmlFor="selectedId">Editing</label>
            <select data-testid="select-selectedItem" id="selectedId" onChange={e => setSelectedId(e.target.value)} value={String(selectedId)}>
              {layout.map(item => <option key={item.i} value={item.i}>{`Item ${item.i}`}</option>)}
            </select>
          </div>
        </fieldset>

        <fieldset className="demo-control-group">
          <legend>Interactivity</legend>
          <div className="demo-control">
            <input
              checked={selectedItem.isStatic ?? false}
              data-testid="toggle-isStatic"
              id="isStatic"
              onChange={e => updateSelected({ isStatic: e.target.checked })}
              type="checkbox"
            />
            <label htmlFor="isStatic">isStatic</label>
          </div>
          {([`isDraggable`, `isResizable`, `isBounded`] as const).map(field => (
            <div className="demo-control" key={field}>
              <label htmlFor={field}>{field}</label>
              <select
                data-testid={`select-${field}`}
                id={field}
                onChange={e => updateSelected({ [field]: triStateToValue(e.target.value as TTriState) })}
                value={valueToTriState(selectedItem[field])}
              >
                <option value="inherit">inherit</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
          ))}
          <div className="demo-control">
            <label htmlFor="enableEditMode">enableEditMode</label>
            <select
              data-testid="select-enableEditMode"
              id="enableEditMode"
              onChange={e => updateSelected({ enableEditMode: triStateToValue(e.target.value as TTriState) })}
              value={valueToTriState(selectedItem.enableEditMode)}
            >
              <option value="inherit">inherit</option>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>
        </fieldset>

        <fieldset className="demo-control-group">
          <legend>Size constraints</legend>
          {([`minW`, `maxW`, `minH`, `maxH`] as const).map(field => (
            <div className="demo-control" key={field}>
              <label htmlFor={field}>{field}</label>
              <input
                data-testid={`input-${field}`}
                id={field}
                onChange={e => updateSelected({ [field]: e.target.value === `` ? undefined : Number(e.target.value) })}
                type="number"
                value={selectedItem[field] ?? ``}
              />
            </div>
          ))}
          <div className="demo-control">
            <input
              checked={selectedItem.preserveAspectRatio ?? false}
              data-testid="toggle-preserveAspectRatio"
              id="preserveAspectRatio"
              onChange={e => updateSelected({ preserveAspectRatio: e.target.checked })}
              type="checkbox"
            />
            <label htmlFor="preserveAspectRatio">preserveAspectRatio</label>
          </div>
        </fieldset>

        <fieldset className="demo-control-group">
          <legend>Drag / resize restriction</legend>
          <div className="demo-control">
            <label htmlFor="dragAllowFrom">dragAllowFrom</label>
            <input
              data-testid="input-dragAllowFrom"
              id="dragAllowFrom"
              onChange={e => updateSelected({ dragAllowFrom: e.target.value || null })}
              placeholder="CSS selector"
              type="text"
              value={selectedItem.dragAllowFrom ?? ``}
            />
          </div>
          <div className="demo-control">
            <label htmlFor="dragIgnoreFrom">dragIgnoreFrom</label>
            <input
              data-testid="input-dragIgnoreFrom"
              id="dragIgnoreFrom"
              onChange={e => updateSelected({ dragIgnoreFrom: e.target.value || undefined })}
              placeholder="CSS selector"
              type="text"
              value={selectedItem.dragIgnoreFrom ?? ``}
            />
          </div>
          <div className="demo-control">
            <label htmlFor="resizeIgnoreFrom">resizeIgnoreFrom</label>
            <input
              data-testid="input-resizeIgnoreFrom"
              id="resizeIgnoreFrom"
              onChange={e => updateSelected({ resizeIgnoreFrom: e.target.value || null })}
              placeholder="CSS selector"
              type="text"
              value={selectedItem.resizeIgnoreFrom ?? ``}
            />
          </div>
          <div className="demo-control">
            <label htmlFor="dragActivationDistance">dragActivationDistance</label>
            <input
              data-testid="input-dragActivationDistance"
              id="dragActivationDistance"
              onChange={e => updateSelected({ dragActivationDistance: e.target.value === `` ? null : Number(e.target.value) })}
              placeholder="default: 3px"
              type="number"
              value={typeof selectedItem.dragActivationDistance === `number` ? selectedItem.dragActivationDistance : ``}
            />
          </div>
        </fieldset>

        <fieldset className="demo-control-group">
          <legend>resizeHandles (per-item override)</legend>
          <div className="demo-control">
            <input
              checked={selectedItem.resizeHandles !== undefined && selectedItem.resizeHandles !== null}
              data-testid="toggle-overrideResizeHandles"
              id="overrideResizeHandles"
              onChange={e => updateSelected({ resizeHandles: e.target.checked ? [] : null })}
              type="checkbox"
            />
            <label htmlFor="overrideResizeHandles">Override for this item (empty = no handle-driven resize)</label>
          </div>
          {selectedItem.resizeHandles !== undefined && selectedItem.resizeHandles !== null && (
            <div className="demo-control demo-control--wrap">
              {ALL_RESIZE_HANDLES.map(handle => (
                <label key={handle}>
                  <input
                    checked={selectedItem.resizeHandles!.includes(handle)}
                    data-testid={`toggle-itemResizeHandle-${handle}`}
                    onChange={() => toggleSelectedResizeHandle(handle)}
                    type="checkbox"
                  />
                  {handle}
                </label>
              ))}
            </div>
          )}
          <div className="demo-control">
            <input
              checked={selectedItem.showResizeHandles ?? false}
              data-testid="toggle-itemShowResizeHandles"
              id="itemShowResizeHandles"
              onChange={e => updateSelected({ showResizeHandles: e.target.checked })}
              type="checkbox"
            />
            <label htmlFor="itemShowResizeHandles">showResizeHandles</label>
          </div>
          <div className="demo-control">
            <label htmlFor="itemResizeHandleColor">resizeHandleColor</label>
            <input
              data-testid="input-itemResizeHandleColor"
              id="itemResizeHandleColor"
              onChange={e => updateSelected({ resizeHandleColor: e.target.value || undefined })}
              type="text"
              value={selectedItem.resizeHandleColor ?? ``}
            />
          </div>
        </fieldset>

        <fieldset className="demo-control-group">
          <legend>Visual &amp; misc</legend>
          <div className="demo-control">
            <label htmlFor="zIndex">zIndex</label>
            <input
              data-testid="input-zIndex"
              id="zIndex"
              onChange={e => updateSelected({ zIndex: e.target.value === `` ? null : Number(e.target.value) })}
              type="number"
              value={selectedItem.zIndex ?? ``}
            />
          </div>
          <div className="demo-control">
            <input
              checked={selectedItem.useBorderRadius ?? false}
              data-testid="toggle-itemUseBorderRadius"
              id="itemUseBorderRadius"
              onChange={e => updateSelected({ useBorderRadius: e.target.checked })}
              type="checkbox"
            />
            <label htmlFor="itemUseBorderRadius">useBorderRadius</label>
          </div>
          <div className="demo-control">
            <label htmlFor="itemBorderRadiusPx">borderRadiusPx {!selectedItem.useBorderRadius && `(requires useBorderRadius above)`}</label>
            <input
              data-testid="input-itemBorderRadiusPx"
              disabled={!selectedItem.useBorderRadius}
              id="itemBorderRadiusPx"
              onChange={e => updateSelected({ borderRadiusPx: e.target.value === `` ? undefined : Number(e.target.value) })}
              type="number"
              value={selectedItem.borderRadiusPx ?? ``}
            />
          </div>
          <div className="demo-control">
            <input
              checked={selectedItem.showCloseButton ?? false}
              data-testid="toggle-itemShowCloseButton"
              id="itemShowCloseButton"
              onChange={e => updateSelected({ showCloseButton: e.target.checked })}
              type="checkbox"
            />
            <label htmlFor="itemShowCloseButton">showCloseButton</label>
          </div>
          <div className="demo-control">
            <input
              checked={selectedItem.autoScroll ?? false}
              data-testid="toggle-itemAutoScroll"
              id="itemAutoScroll"
              onChange={e => updateSelected({ autoScroll: e.target.checked })}
              type="checkbox"
            />
            <label htmlFor="itemAutoScroll">autoScroll</label>
          </div>
          <div className="demo-control">
            <input
              checked={selectedItem.autoHeight ?? false}
              data-testid="toggle-itemAutoHeight"
              id="itemAutoHeight"
              onChange={e => updateSelected({ autoHeight: e.target.checked })}
              type="checkbox"
            />
            <label htmlFor="itemAutoHeight">autoHeight</label>
          </div>
          <div className="demo-control">
            <input
              checked={selectedItem.isMirrored ?? true}
              data-testid="toggle-itemIsMirrored"
              id="itemIsMirrored"
              onChange={e => updateSelected({ isMirrored: e.target.checked })}
              type="checkbox"
            />
            <label htmlFor="itemIsMirrored">isMirrored (opt out of grid-wide RTL — only visible when the grid itself is mirrored, see Advanced features)</label>
          </div>
        </fieldset>

        <fieldset className="demo-control-group">
          <legend>ariaLabels (per-item merge)</legend>
          <div className="demo-control">
            <label htmlFor="ariaCloseButton">closeButton</label>
            <input
              data-testid="input-ariaCloseButton"
              id="ariaCloseButton"
              onChange={e => updateSelected({ ariaLabels: { ...selectedItem.ariaLabels, closeButton: e.target.value || undefined } })}
              placeholder="default: Close"
              type="text"
              value={selectedItem.ariaLabels?.closeButton ?? ``}
            />
          </div>
        </fieldset>
      </div>

      <div className="demo-grid-area">
        <GridLayout
          layout={layout}
          onItemClose={id => setLayout(prev => {
            const next = prev.filter(item => item.i !== id);
            // Guards against a real crash risk: `selectedItem` above is
            // a non-null `.find()` assertion — if the closed item was
            // the one currently selected, fall back to whatever remains
            // so the next render doesn't dereference `undefined`.
            if(id === selectedId && next.length > 0) {
              setSelectedId(next[0].i);
            }
            return next;
          })}
          onLayoutChange={setLayout}
          rowHeight={80}
        >
          {layout.map(item => (
            <GridItem i={item.i} key={item.i}>
              <div
                className={item.isStatic ? `demo-item-content is-static` : `demo-item-content`}
                style={item.useBorderRadius ? { borderRadius: `${item.borderRadiusPx ?? 10}px` } : undefined}
              >
                {`Item ${item.i}`}
              </div>
            </GridItem>
          ))}
        </GridLayout>
      </div>

      <MinMaxWidthDemo />
    </div>
  );
}
