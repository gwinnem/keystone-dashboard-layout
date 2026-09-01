import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from 'keystone-dashboard-layout-angular';
import type { TLayout } from 'keystone-dashboard-layout-core';
import type { ICrossGridDropRejected, ICrossGridItemDropped } from 'keystone-dashboard-layout-core/gridlayout/interfaces/cross-grid.interfaces';
import { ExampleToggleComponent } from '../harness/example-toggle.component';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

interface ILogEntry {
  kind: 'dropped' | 'rejected';
  message: string;
}

@Component({
  selector: 'app-cross-grid-drop-restrictions-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, ExampleToggleComponent, LayoutJsonViewerComponent],
  template: `
    <div class="demo-controls">
      <example-toggle [checked]="teamAEnabled" (checkedChange)="teamAEnabled = $event" label="Team A: allow cross-grid drag"></example-toggle>
      <example-toggle [checked]="teamBEnabled" (checkedChange)="teamBEnabled = $event" label="Team B: allow cross-grid drag"></example-toggle>
      <example-toggle [checked]="archiveEnabled" (checkedChange)="archiveEnabled = $event" label="Archive: allow cross-grid drag"></example-toggle>
      <example-toggle [checked]="archiveRejects" (checkedChange)="archiveRejects = $event" label="Archive: reject external drops"></example-toggle>
      <example-toggle [checked]="preventCollision" (checkedChange)="preventCollision = $event" label="preventCollision"></example-toggle>
    </div>

    <div class="grids-row grids-row--triple">
      <div class="grid-column">
        <p class="grid-label">Team A</p>
        <kdl-grid-layout
          [allowCrossGridDrag]="teamAEnabled"
          [colNum]="4"
          [layout]="teamA"
          layoutId="cross-grid-drop-restrictions-team-a"
          (layoutChange)="teamA = $event"
          [preventCollision]="preventCollision"
          [rowHeight]="60"
          [showGridLines]="true"
          (crossGridItemDropped)="onDropped('Team A', $event)"
          (crossGridDropRejected)="onRejected('Team A', $event)"
        >
          @for (item of teamA; track item.i) {
            <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
              <div class="example-item">{{ item.i }}</div>
            </kdl-grid-item>
          }
        </kdl-grid-layout>
      </div>
      <div class="grid-column">
        <p class="grid-label">Team B</p>
        <kdl-grid-layout
          [allowCrossGridDrag]="teamBEnabled"
          [colNum]="4"
          [layout]="teamB"
          layoutId="cross-grid-drop-restrictions-team-b"
          (layoutChange)="teamB = $event"
          [preventCollision]="preventCollision"
          [rowHeight]="60"
          [showGridLines]="true"
          (crossGridItemDropped)="onDropped('Team B', $event)"
          (crossGridDropRejected)="onRejected('Team B', $event)"
        >
          @for (item of teamB; track item.i) {
            <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
              <div class="example-item">{{ item.i }}</div>
            </kdl-grid-item>
          }
        </kdl-grid-layout>
      </div>
      <div class="grid-column">
        <p class="grid-label">Archive (read-only)</p>
        <kdl-grid-layout
          [allowCrossGridDrag]="archiveEnabled"
          [colNum]="4"
          [disableExternalDrop]="archiveRejects"
          [layout]="archive"
          layoutId="cross-grid-drop-restrictions-archive"
          (layoutChange)="archive = $event"
          [preventCollision]="preventCollision"
          [rowHeight]="60"
          [showGridLines]="true"
          (crossGridItemDropped)="onDropped('Archive', $event)"
          (crossGridDropRejected)="onRejected('Archive', $event)"
        >
          @for (item of archive; track item.i) {
            <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h" [isStatic]="item.isStatic ?? false">
              <div class="example-item">{{ item.i }}</div>
            </kdl-grid-item>
          }
        </kdl-grid-layout>
      </div>
    </div>

    <div class="drop-log">
      <p class="grid-label">Log</p>
      @if (log.length === 0) {
        <div class="drop-log__empty">Drag an item between grids to see events here.</div>
      } @else {
        @for (entry of log; track $index) {
          <div class="drop-log__entry" [class]="'drop-log__entry--' + entry.kind">{{ entry.message }}</div>
        }
      }
    </div>

    <layout-json-viewer label="Team A" [layout]="teamA" />
    <layout-json-viewer label="Team B" [layout]="teamB" />
    <layout-json-viewer label="Archive" [layout]="archive" />
  `,
  styles: [`
    .grid-column kdl-grid-layout {
      min-height: 140px;
    }
    .grids-row--triple {
      grid-template-columns: repeat(3, 1fr);
    }
    .drop-log {
      border-top: 1px solid var(--kg-line-light);
      margin-top: 20px;
      padding-top: 16px;
    }
    .drop-log__empty {
      color: var(--kg-text-lo-light);
      font-size: 13px;
    }
    .drop-log__entry {
      border-radius: 4px;
      font-family: var(--kg-font-mono);
      font-size: 13px;
      margin-bottom: 4px;
      padding: 6px 10px;
    }
    .drop-log__entry--dropped {
      background-color: var(--kg-panel);
    }
    .drop-log__entry--rejected {
      background-color: rgb(220 38 38 / 12%);
      color: rgb(220 38 38);
    }
  `],
})
export class CrossGridDropRestrictionsDemoComponent {
  teamAEnabled = true;
  teamBEnabled = true;
  archiveEnabled = true;
  archiveRejects = true;
  preventCollision = false;

  teamA: TLayout = [
    { h: 2, i: 'A1', w: 2, x: 0, y: 0 },
    { h: 2, i: 'A2', w: 2, x: 0, y: 2 },
  ];
  teamB: TLayout = [{ h: 2, i: 'B1', w: 2, x: 0, y: 0 }];
  archive: TLayout = [{ h: 2, i: 'Locked', isStatic: true, w: 2, x: 0, y: 0 }];

  log: ILogEntry[] = [];

  private addLogEntry(kind: ILogEntry['kind'], message: string): void {
    this.log = [{ kind, message }, ...this.log].slice(0, 6);
  }

  onDropped(targetName: string, payload: ICrossGridItemDropped): void {
    this.addLogEntry('dropped', `"${payload.item.i}" moved into ${targetName} (from ${payload.sourceLayoutId}).`);
  }

  onRejected(targetName: string, payload: ICrossGridDropRejected): void {
    this.addLogEntry('rejected', `${targetName} rejected "${payload.itemId}" from ${payload.sourceLayoutId} — this grid doesn't accept drops.`);
  }
}
