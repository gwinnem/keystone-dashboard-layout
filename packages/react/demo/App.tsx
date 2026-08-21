import { useState } from 'react';
import BasicGridView from './views/BasicGridView';
import DragResizeView from './views/DragResizeView';
import DynamicItemsView from './views/DynamicItemsView';
import ResponsiveView from './views/ResponsiveView';
import ItemOverridesView from './views/ItemOverridesView';
import SelectionAndHistoryView from './views/SelectionAndHistoryView';
import CrossGridView from './views/CrossGridView';
import ExternalDropView from './views/ExternalDropView';
import AdvancedFeaturesView from './views/AdvancedFeaturesView';

/**
 * Each entry's own `component` renders a full, self-contained view —
 * no shared state between them, matching the Vue package's own
 * `demo/App.vue` view-switcher shape. Views are added here in the
 * order `docs/DEMO_APP_IMPLEMENTATION_PLAN.md`'s own build-phasing
 * section lays out. All nine views now complete:
 * `ExternalDropView`/`AdvancedFeaturesView` join the seven from
 * Phases 1-4.
 */
const views = [
  { id: `basic-grid`, label: `Basic grid`, component: BasicGridView },
  { id: `drag-resize`, label: `Drag & resize`, component: DragResizeView },
  { id: `dynamic-items`, label: `Dynamic items`, component: DynamicItemsView },
  { id: `responsive`, label: `Responsive`, component: ResponsiveView },
  { id: `item-overrides`, label: `Item overrides`, component: ItemOverridesView },
  { id: `selection-history`, label: `Selection & history`, component: SelectionAndHistoryView },
  { id: `cross-grid`, label: `Cross-grid drag`, component: CrossGridView },
  { id: `external-drop`, label: `External drop`, component: ExternalDropView },
  { id: `advanced-features`, label: `Advanced features`, component: AdvancedFeaturesView },
] as const;

/**
 * Left-sidebar nav + view switcher for the showcase/manual-testing
 * demo app — see `docs/DEMO_APP_IMPLEMENTATION_PLAN.md` for the full
 * rationale and view-by-view feature breakdown. Every nav button
 * carries a `data-testid` (`nav-{id}`), matching `e2e-fixture/App.tsx`'s
 * own established naming — this is what makes the running app
 * directly drivable via Chrome/Playwright without inventing selectors
 * per session (see the plan's own "Testability" section).
 */
export default function App(): React.JSX.Element {
  const [activeId, setActiveId] = useState<(typeof views)[number]['id']>(`basic-grid`);
  const active = views.find(view => view.id === activeId)!;
  const ActiveView = active.component;

  return (
    <div className="demo-app">
      <aside className="demo-sidebar">
        <h1>keystone-dashboard-layout</h1>
        <p className="demo-subtitle">
          React demo — see <code>docs/DEMO_APP_IMPLEMENTATION_PLAN.md</code> for the full breakdown.
        </p>
        <nav className="demo-nav" aria-label="Demo views">
          {views.map(view => (
            <button
              className={view.id === activeId ? `demo-nav-button demo-nav-button--active` : `demo-nav-button`}
              data-testid={`nav-${view.id}`}
              key={view.id}
              onClick={() => setActiveId(view.id)}
              type="button"
            >
              {view.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="demo-main">
        <ActiveView />
      </main>
    </div>
  );
}
