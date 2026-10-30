import { useMemo, useState } from 'react';
import { GridLayout, GridItem, useAsyncLayoutStorage } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import { createMemoryAsyncStorage } from 'keystone-dashboard-layout-core';
import type { IAsyncLayoutStorage, TLayout } from 'keystone-dashboard-layout-core';
import '../examples-react/shared-example-item.css';
import './56-async-persistence.css';

const STORAGE_KEY = 'keystone-dashboard-layout-example-56-layout';

const initialLayout: TLayout = [
  { h: 2, i: 'A', w: 4, x: 0, y: 0 },
  { h: 2, i: 'B', w: 4, x: 4, y: 0 },
  { h: 2, i: 'C', w: 4, x: 8, y: 0 },
];

export default function AsyncPersistence() {
  const [layout, setLayout] = useState<TLayout>(initialLayout);
  const [status, setStatus] = useState('');
  const [latency, setLatency] = useState(600);
  const [serverDown, setServerDown] = useState(false);

  // A stand-in for a real backend: an in-memory store that answers after a delay, or fails
  // while "down". In an app this would be createHttpStorage({ baseUrl: '/api/layouts' }),
  // createIndexedDbStorage(), or your own IAsyncLayoutStorage. Created once, so the write
  // queue is not rebuilt on every render; the delay and "down" flag are read live.
  const settings = useMemo(() => ({ down: false, latency: 600 }), []);
  settings.down = serverDown;
  settings.latency = latency;
  const server = useMemo<IAsyncLayoutStorage>(() => {
    const memory = createMemoryAsyncStorage();
    const guard = async (): Promise<void> => {
      await new Promise<void>((resolve) => setTimeout(resolve, settings.latency));
      if (settings.down) {
        throw new Error('503 Service Unavailable');
      }
    };
    return {
      getItem: async (key) => { await guard(); return memory.getItem(key); },
      removeItem: async (key) => { await guard(); return memory.removeItem(key); },
      setItem: async (key, value) => { await guard(); return memory.setItem(key, value); },
    };
  }, [settings]);

  const { clear, error, isLoading, isSaving, load, save } = useAsyncLayoutStorage(STORAGE_KEY, server);

  async function handleSave(): Promise<void> {
    setStatus((await save(layout)) ? `Saved at ${new Date().toLocaleTimeString()}` : '');
  }

  async function handleLoad(): Promise<void> {
    const loaded = await load();
    if (loaded) {
      setLayout(loaded);
      setStatus('Loaded the layout from the server.');
    } else {
      setStatus('Nothing saved on the server yet.');
    }
  }

  async function handleClear(): Promise<void> {
    setStatus((await clear()) ? 'Deleted the saved layout from the server.' : '');
  }

  function statusText(): string {
    if (isSaving) {
      return 'Saving…';
    }
    if (isLoading) {
      return 'Loading…';
    }
    if (error) {
      return `Server error: ${error instanceof Error ? error.message : String(error)}`;
    }
    return status || 'Drag or resize items, then save. Nothing is stored until you do.';
  }

  return (
    <>
      <div className="demo-controls">
        <button className="demo-btn" disabled={isSaving} onClick={handleSave} type="button">Save to server</button>
        <button className="demo-btn demo-btn--ghost" disabled={isLoading} onClick={handleLoad} type="button">Load from server</button>
        <button className="demo-btn demo-btn--ghost" onClick={handleClear} type="button">Delete from server</button>
        <button
          className="demo-btn demo-btn--ghost"
          onClick={() => { setLayout(initialLayout); setStatus('Reset to default layout.'); }}
          type="button">
          Reset to default
        </button>
      </div>

      <div className="demo-controls">
        <label>
          Server latency{' '}
          <select onChange={(e) => setLatency(Number(e.target.value))} value={latency}>
            <option value={0}>none</option>
            <option value={600}>600 ms</option>
            <option value={2000}>2 s</option>
          </select>
        </label>
        <label>
          <input checked={serverDown} onChange={(e) => setServerDown(e.target.checked)} type="checkbox" /> Server is down
        </label>
      </div>

      <GridLayout colNum={12} layout={layout} onLayoutChange={setLayout} rowHeight={60} showGridLines>
        {layout.map((item) => (
          <GridItem i={item.i} key={item.i}>
            <div className="example-item">{item.i}</div>
          </GridItem>
        ))}
      </GridLayout>

      <p className="demo-status">{statusText()}</p>
    </>
  );
}
