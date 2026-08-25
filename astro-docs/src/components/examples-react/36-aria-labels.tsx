import { useState } from 'react';
import { GridLayout, GridItem } from '@keystone-dashboard-layout/react';
import '@keystone-dashboard-layout/react/style.css';
import type { IGridAriaLabels, TLayout } from '@keystone-dashboard-layout/core';
import '../examples-react/shared-example-item.css';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
];

const gridAriaLabels: IGridAriaLabels = {
  closeButton: 'Supprimer cet élément',
  itemRoleDescription: 'Élément déplaçable et redimensionnable',
  moveInstruction: 'Appuyez sur les flèches pour déplacer.',
  resizeInstruction: 'Appuyez sur Maj plus les flèches pour redimensionner.',
};

export default function AriaLabels() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);

  return (
    <GridLayout ariaLabels={gridAriaLabels} colNum={12} layout={layout} onLayoutChange={setLayout} rowHeight={60} showCloseButton showGridLines>
      {layout.map((item) => (
        <GridItem i={item.i} key={item.i}>
          <div className="example-item">{item.i}</div>
        </GridItem>
      ))}
    </GridLayout>
  );
}
