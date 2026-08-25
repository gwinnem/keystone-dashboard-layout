import { useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { TLayout } from '@keystone-dashboard-layout/core';

/**
 * Real-package smoke test — confirms the linked
 * @keystone-dashboard-layout/react dependency resolves and a genuine
 * GridLayout/GridItem pair renders and is draggable, before building
 * the actual ported examples on top of this. Not a permanent example;
 * safe to delete once verified.
 */
export default function RealPackageTest() {
  const [layout, setLayout] = useState<TLayout>([
    { i: '0', x: 0, y: 0, w: 2, h: 2 },
    { i: '1', x: 2, y: 0, w: 2, h: 2 },
  ]);

  return (
    <GridLayout layout={layout} onLayoutChange={setLayout} rowHeight={60}>
      <GridItem i="0">
        <div style={{ background: '#e0e0e0', height: '100%', padding: 8 }}>Item A</div>
      </GridItem>
      <GridItem i="1">
        <div style={{ background: '#e0e0e0', height: '100%', padding: 8 }}>Item B</div>
      </GridItem>
    </GridLayout>
  );
}
