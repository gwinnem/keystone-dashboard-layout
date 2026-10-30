import { Component, inject } from '@angular/core';
import { GridLayoutComponent, GridItemComponent, GridLayoutAsyncStorageService } from 'keystone-dashboard-layout-angular';
import { createMemoryAsyncStorage } from 'keystone-dashboard-layout-core';
import type { IAsyncLayoutStorage, TLayout } from 'keystone-dashboard-layout-core';

const STORAGE_KEY = 'keystone-dashboard-layout-example-56-layout';

const defaultLayout = (): TLayout => [
  { h: 2, i: 'A', w: 4, x: 0, y: 0 },
  { h: 2, i: 'B', w: 4, x: 4, y: 0 },
  { h: 2, i: 'C', w: 4, x: 8, y: 0 },
];

@Component({
  selector: 'app-async-persistence-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent],
  template: `
    <div class="demo-controls">
      <button class="demo-btn" type="button" [disabled]="saving > 0" (click)="onSave()">Save to server</button>
      <button class="demo-btn demo-btn--ghost" type="button" [disabled]="loading" (click)="onLoad()">Load from server</button>
      <button class="demo-btn demo-btn--ghost" type="button" (click)="onClear()">Delete from server</button>
      <button class="demo-btn demo-btn--ghost" type="button" (click)="reset()">Reset to default</button>
    </div>

    <div class="demo-controls">
      <label>
        Server latency
        <select [value]="latency" (change)="latency = +$any($event.target).value">
          <option value="0">none</option>
          <option value="600">600 ms</option>
          <option value="2000">2 s</option>
        </select>
      </label>
      <label>
        <input type="checkbox" [checked]="serverDown" (change)="serverDown = $any($event.target).checked" />
        Server is down
      </label>
    </div>

    <kdl-grid-layout [colNum]="12" [layout]="layout" (layoutChange)="layout = $event" [rowHeight]="60" [showGridLines]="true">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
          <div class="example-item">{{ item.i }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>

    <p class="demo-status">{{ statusText() }}</p>
  `,
  styles: [`
    .demo-controls {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px 20px;
      margin-bottom: 16px;
    }

    .demo-btn {
      background: var(--kg-blueprint);
      border: none;
      border-radius: 6px;
      color: white;
      cursor: pointer;
      font-family: var(--kg-font-mono);
      font-size: 12px;
      padding: 6px 12px;
    }

    .demo-btn:disabled {
      cursor: progress;
      opacity: 0.6;
    }

    .demo-btn--ghost {
      background: transparent;
      border: 1px solid var(--kg-line-light);
      color: var(--kg-text-hi-light);
    }

    .demo-status {
      color: var(--kg-text-lo-light);
      font-size: 12px;
      font-style: italic;
    }

    .example-item {
      align-items: center;
      background: var(--kg-panel);
      border: 1px solid var(--kg-line-light);
      border-radius: 8px;
      color: var(--kg-text-hi-light);
      display: flex;
      font-family: var(--kg-font-mono);
      height: 100%;
      justify-content: center;
      width: 100%;
    }
  `],
})
export class AsyncPersistenceDemoComponent {
  private readonly persistence = inject(GridLayoutAsyncStorageService);

  layout: TLayout = defaultLayout();
  latency = 600;
  serverDown = false;
  loading = false;
  saving = 0;
  status = '';
  errorMessage = '';

  // A stand-in for a real backend: an in-memory store that answers after a delay, or fails
  // while "down". In an app this would be createHttpStorage({ baseUrl: '/api/layouts' }),
  // createIndexedDbStorage(), or your own IAsyncLayoutStorage. Created once, so the service's
  // write queue for it is kept; the delay and "down" flag are read live.
  private readonly server: IAsyncLayoutStorage = (() => {
    const memory = createMemoryAsyncStorage();
    const guard = async (): Promise<void> => {
      await new Promise<void>(resolve => setTimeout(resolve, this.latency));
      if (this.serverDown) {
        throw new Error('503 Service Unavailable');
      }
    };
    return {
      getItem: async key => { await guard(); return memory.getItem(key); },
      removeItem: async key => { await guard(); return memory.removeItem(key); },
      setItem: async (key, value) => { await guard(); return memory.setItem(key, value); },
    };
  })();

  constructor() {
    // Failures never reject: they arrive here instead.
    this.persistence.errors$.subscribe(({ error }) => {
      this.errorMessage = error instanceof Error ? error.message : String(error);
    });
  }

  async onSave(): Promise<void> {
    this.errorMessage = '';
    this.saving++;
    const saved = await this.persistence.save(STORAGE_KEY, this.layout, this.server);
    this.saving--;
    this.status = saved ? `Saved at ${new Date().toLocaleTimeString()}` : '';
  }

  async onLoad(): Promise<void> {
    this.errorMessage = '';
    this.loading = true;
    const loaded = await this.persistence.load(STORAGE_KEY, this.server);
    this.loading = false;
    if (loaded) {
      this.layout = loaded;
      this.status = 'Loaded the layout from the server.';
    } else {
      this.status = this.errorMessage ? '' : 'Nothing saved on the server yet.';
    }
  }

  async onClear(): Promise<void> {
    this.errorMessage = '';
    const cleared = await this.persistence.clear(STORAGE_KEY, this.server);
    this.status = cleared ? 'Deleted the saved layout from the server.' : '';
  }

  reset(): void {
    this.layout = defaultLayout();
    this.status = 'Reset to default layout.';
  }

  statusText(): string {
    if (this.saving > 0) {
      return 'Saving…';
    }
    if (this.loading) {
      return 'Loading…';
    }
    if (this.errorMessage) {
      return `Server error: ${this.errorMessage}`;
    }
    return this.status || 'Drag or resize items, then save. Nothing is stored until you do.';
  }
}
