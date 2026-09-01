import { useState } from 'react';
import { GridLayout, GridItem } from 'keystone-dashboard-layout-react';
import 'keystone-dashboard-layout-react/style.css';
import type { TLayout } from 'keystone-dashboard-layout-core';
import ExampleToggle from '../harness-react/ExampleToggle';
import LayoutJsonViewer from '../harness-react/LayoutJsonViewer';
import '../examples-react/shared-example-item.css';
import './04-multiple-grids.css';
import './12-cross-grid-drag-drop.css';
import './22-cross-grid-drop-restrictions.css';

interface ILogEntry {
  kind: 'dropped' | 'rejected';
  message: string;
}

export default function CrossGridDropRestrictions() {
  const [teamAEnabled, setTeamAEnabled] = useState(true);
  const [teamBEnabled, setTeamBEnabled] = useState(true);
  const [archiveEnabled, setArchiveEnabled] = useState(true);
  const [archiveRejects, setArchiveRejects] = useState(true);
  const [preventCollision, setPreventCollision] = useState(false);

  const [teamA, setTeamA] = useState<TLayout>([
    { h: 2, i: 'A1', w: 2, x: 0, y: 0 },
    { h: 2, i: 'A2', w: 2, x: 0, y: 2 },
  ]);
  const [teamB, setTeamB] = useState<TLayout>([{ h: 2, i: 'B1', w: 2, x: 0, y: 0 }]);
  const [archive, setArchive] = useState<TLayout>([{ h: 2, i: 'Locked', isStatic: true, w: 2, x: 0, y: 0 }]);

  const [log, setLog] = useState<ILogEntry[]>([]);

  function addLogEntry(kind: ILogEntry['kind'], message: string): void {
    setLog((current) => [{ kind, message }, ...current].slice(0, 6));
  }

  function makeDropHandlers(targetName: string) {
    return {
      onCrossGridItemDropped: (payload: { item: { i: string | number }; sourceLayoutId: string }) =>
        addLogEntry('dropped', `"${payload.item.i}" moved into ${targetName} (from ${payload.sourceLayoutId}).`),
      onCrossGridDropRejected: (payload: { itemId: string | number; sourceLayoutId: string }) =>
        addLogEntry('rejected', `${targetName} rejected "${payload.itemId}" from ${payload.sourceLayoutId} — this grid doesn't accept drops.`),
    };
  }

  return (
    <>
      <div className="demo-controls">
        <ExampleToggle checked={teamAEnabled} label="Team A: allow cross-grid drag" onChange={setTeamAEnabled} />
        <ExampleToggle checked={teamBEnabled} label="Team B: allow cross-grid drag" onChange={setTeamBEnabled} />
        <ExampleToggle checked={archiveEnabled} label="Archive: allow cross-grid drag" onChange={setArchiveEnabled} />
        <ExampleToggle checked={archiveRejects} label="Archive: reject external drops" onChange={setArchiveRejects} />
        <ExampleToggle checked={preventCollision} label="preventCollision" onChange={setPreventCollision} />
      </div>

      <div className="grids-row grids-row--triple">
        <div className="grid-column">
          <p className="grid-label">Team A</p>
          <GridLayout
            allowCrossGridDrag={teamAEnabled}
            colNum={4}
            layout={teamA}
            layoutId="cross-grid-drop-restrictions-team-a"
            onLayoutChange={setTeamA}
            preventCollision={preventCollision}
            rowHeight={60}
            showGridLines
            {...makeDropHandlers('Team A')}
          >
            {teamA.map((item) => (
              <GridItem i={item.i} key={item.i}>
                <div className="example-item">{item.i}</div>
              </GridItem>
            ))}
          </GridLayout>
        </div>
        <div className="grid-column">
          <p className="grid-label">Team B</p>
          <GridLayout
            allowCrossGridDrag={teamBEnabled}
            colNum={4}
            layout={teamB}
            layoutId="cross-grid-drop-restrictions-team-b"
            onLayoutChange={setTeamB}
            preventCollision={preventCollision}
            rowHeight={60}
            showGridLines
            {...makeDropHandlers('Team B')}
          >
            {teamB.map((item) => (
              <GridItem i={item.i} key={item.i}>
                <div className="example-item">{item.i}</div>
              </GridItem>
            ))}
          </GridLayout>
        </div>
        <div className="grid-column">
          <p className="grid-label">Archive (read-only)</p>
          <GridLayout
            allowCrossGridDrag={archiveEnabled}
            colNum={4}
            disableExternalDrop={archiveRejects}
            layout={archive}
            layoutId="cross-grid-drop-restrictions-archive"
            onLayoutChange={setArchive}
            preventCollision={preventCollision}
            rowHeight={60}
            showGridLines
            {...makeDropHandlers('Archive')}
          >
            {archive.map((item) => (
              <GridItem i={item.i} key={item.i}>
                <div className="example-item">{item.i}</div>
              </GridItem>
            ))}
          </GridLayout>
        </div>
      </div>

      <div className="drop-log">
        <p className="grid-label">Log</p>
        {log.length === 0 ? (
          <div className="drop-log__empty">Drag an item between grids to see events here.</div>
        ) : (
          log.map((entry, idx) => (
            <div className={`drop-log__entry drop-log__entry--${entry.kind}`} key={idx}>{entry.message}</div>
          ))
        )}
      </div>

      <LayoutJsonViewer label="Team A" layout={teamA} />
      <LayoutJsonViewer label="Team B" layout={teamB} />
      <LayoutJsonViewer label="Archive" layout={archive} />
    </>
  );
}
