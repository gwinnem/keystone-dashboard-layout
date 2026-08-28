import { useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';
import ExampleToggle from '../harness-react/ExampleToggle';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';
import '../examples-react/shared-example-item.css';
import './21-edit-mode-toggle.css';

const initialLayout: (TLayout[number] & { label: string })[] = [
  { h: 1, i: '0', label: 'Revenue', w: 4, x: 0, y: 0 },
  { h: 1, i: '1', label: 'Active users', w: 4, x: 4, y: 0 },
  { h: 1, i: '2', label: 'Signups', w: 4, x: 8, y: 0 },
  { h: 3, i: '3', label: 'Traffic over time', w: 8, x: 0, y: 1 },
  { h: 3, i: '4', label: 'Top referrers', w: 4, x: 8, y: 1 },
];

export default function EditModeToggle() {
  const [editMode, setEditMode] = useState(false);
  const [layout, setLayout] = useState(initialLayout);

  // Bug fix (ported from the same fix applied to the Vue/React examples
  // earlier in this same session): this used to render a fully-working,
  // clickable close button once edit mode was on, but nothing was
  // listening for onItemClose at all — the click handler fired every
  // time, correctly gated on edit mode being on, but the item was never
  // actually removed from layout, since there was no listener to do
  // that removal.
  function removeItem(id: string | number): void {
    setLayout((current) => current.filter((item) => item.i !== id));
  }

  // onLayoutChange emits a plain TLayout — the library itself never
  // reads or writes consumer-defined extra fields like `label`, so a
  // plain setLayout(next) here would lose them type-wise. Merging the
  // incoming x/y/w/h back onto the existing, label-carrying items is
  // what keeps both in sync.
  function handleLayoutChange(next: TLayout): void {
    setLayout((current) => next.map((item) => ({ ...item, label: current.find((existing) => existing.i === item.i)?.label ?? String(item.i) })));
  }

  return (
    <>
      <div className="demo-controls">
        <ExampleToggle checked={editMode} label="Edit mode" onChange={setEditMode} />
      </div>

      <GridLayout
        colNum={12}
        enableEditMode={editMode}
        layout={layout}
        onItemClose={removeItem}
        onLayoutChange={handleLayoutChange}
        rowHeight={60}
        showCloseButton={editMode}
        showGridLines
      >
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className={editMode ? 'example-item' : 'example-item example-item--static'}>{item.label}</div>
          </GridItem>
        ))}
      </GridLayout>

      <LayoutJsonViewer layout={layout} />
    </>
  );
}
