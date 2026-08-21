import { useState } from 'react';
import BasicGrid from './scenarios/BasicGrid';
import DragResize from './scenarios/DragResize';
import DynamicItems from './scenarios/DynamicItems';
import Responsive from './scenarios/Responsive';
import KeyboardAccessibility from './scenarios/KeyboardAccessibility';
import MultiSelect from './scenarios/MultiSelect';
import CrossGrid from './scenarios/CrossGrid';
import Rtl from './scenarios/Rtl';
import ItemOverrides from './scenarios/ItemOverrides';
import ExternalDrop from './scenarios/ExternalDrop';
import AdvancedFeatures from './scenarios/AdvancedFeatures';

const scenarios = [
  { id: `basic`, component: BasicGrid },
  { id: `drag-resize`, component: DragResize },
  { id: `dynamic`, component: DynamicItems },
  { id: `responsive`, component: Responsive },
  { id: `keyboard`, component: KeyboardAccessibility },
  { id: `multi-select`, component: MultiSelect },
  { id: `cross-grid`, component: CrossGrid },
  { id: `rtl`, component: Rtl },
  { id: `item-overrides`, component: ItemOverrides },
  { id: `external-drop`, component: ExternalDrop },
  { id: `advanced-features`, component: AdvancedFeatures },
] as const;

/**
 * Minimal scenario switcher for the e2e test fixture — deliberately
 * not a showcase/demo app (no descriptive copy, no styling beyond
 * what's needed for items to have a visible bounding box). Just
 * enough routing between scenarios for Playwright to reach each one
 * via a `data-testid` nav button, mirroring the mechanism (not the
 * presentation) of the Vue package's own demo app nav.
 */
export default function App(): React.JSX.Element {
  const [activeId, setActiveId] = useState<(typeof scenarios)[number]['id']>(`basic`);
  const Active = scenarios.find(scenario => scenario.id === activeId)!.component;

  return (
    <div>
      <nav className="fixture-nav">
        {scenarios.map(scenario => (
          <button
            data-testid={`nav-${scenario.id}`}
            key={scenario.id}
            onClick={() => setActiveId(scenario.id)}
            type="button"
          >
            {scenario.id}
          </button>
        ))}
      </nav>
      <main className="fixture-main">
        <Active />
      </main>
    </div>
  );
}
