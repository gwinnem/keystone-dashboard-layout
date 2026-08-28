<template>
  <div class="demo-controls">
    <ExampleToggle v-model="teamAEnabled" label="Team A: allow cross-grid drag" />
    <ExampleToggle v-model="teamBEnabled" label="Team B: allow cross-grid drag" />
    <ExampleToggle v-model="archiveEnabled" label="Archive: allow cross-grid drag" />
    <ExampleToggle v-model="archiveRejects" label="Archive: reject external drops" />
    <ExampleToggle v-model="preventCollision" label="preventCollision" />
  </div>

  <div class="grids-row">
    <div class="grid-column">
      <p class="grid-label">Team A</p>
      <GridLayout
        v-model:layout="teamA"
        :allow-cross-grid-drag="teamAEnabled"
        :col-num="4"
        layout-id="cross-grid-drop-restrictions-team-a"
        :prevent-collision="preventCollision"
        :row-height="60"
        show-grid-lines
        @cross-grid-drop-rejected="onRejected('Team A', $event)"
        @cross-grid-item-dropped="onDropped('Team A', $event)">
        <GridItem
          v-for="item in teamA"
          :key="item.i"
          :h="item.h"
          :i="item.i"
          :w="item.w"
          :x="item.x"
          :y="item.y">
          <div class="example-item">{{ item.i }}</div>
        </GridItem>
      </GridLayout>
    </div>
    <div class="grid-column">
      <p class="grid-label">Team B</p>
      <GridLayout
        v-model:layout="teamB"
        :allow-cross-grid-drag="teamBEnabled"
        :col-num="4"
        layout-id="cross-grid-drop-restrictions-team-b"
        :prevent-collision="preventCollision"
        :row-height="60"
        show-grid-lines
        @cross-grid-drop-rejected="onRejected('Team B', $event)"
        @cross-grid-item-dropped="onDropped('Team B', $event)">
        <GridItem
          v-for="item in teamB"
          :key="item.i"
          :h="item.h"
          :i="item.i"
          :w="item.w"
          :x="item.x"
          :y="item.y">
          <div class="example-item">{{ item.i }}</div>
        </GridItem>
      </GridLayout>
    </div>
    <div class="grid-column">
      <p class="grid-label">Archive (read-only)</p>
      <GridLayout
        v-model:layout="archive"
        :allow-cross-grid-drag="archiveEnabled"
        :col-num="4"
        :disable-external-drop="archiveRejects"
        layout-id="cross-grid-drop-restrictions-archive"
        :prevent-collision="preventCollision"
        :row-height="60"
        show-grid-lines
        @cross-grid-drop-rejected="onRejected('Archive', $event)"
        @cross-grid-item-dropped="onDropped('Archive', $event)">
        <GridItem
          v-for="item in archive"
          :key="item.i"
          :h="item.h"
          :i="item.i"
          :w="item.w"
          :x="item.x"
          :y="item.y">
          <div class="example-item">{{ item.i }}</div>
        </GridItem>
      </GridLayout>
    </div>
  </div>

  <div class="drop-log">
    <p class="grid-label">Log</p>
    <div v-if="log.length === 0" class="drop-log__empty">Drag an item between grids to see events here.</div>
    <div
      v-for="(entry, idx) in log"
      :key="idx"
      class="drop-log__entry"
      :class="`drop-log__entry--${entry.kind}`">
      {{ entry.message }}
    </div>
  </div>

  <LayoutJsonViewer label="Team A" :layout="teamA" />
  <LayoutJsonViewer label="Team B" :layout="teamB" />
  <LayoutJsonViewer label="Archive" :layout="archive" />
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';
  import ExampleToggle from '../harness/ExampleToggle.vue';
  import LayoutJsonViewer from '../harness/LayoutJsonViewer.vue';

  const teamAEnabled = ref(true);
  const teamBEnabled = ref(true);
  const archiveEnabled = ref(true);
  const archiveRejects = ref(true);
  const preventCollision = ref(false);

  const teamA = ref<TLayout>([
    { h: 2, i: 'A1', w: 2, x: 0, y: 0 },
    { h: 2, i: 'A2', w: 2, x: 0, y: 2 },
  ]);
  const teamB = ref<TLayout>([{ h: 2, i: 'B1', w: 2, x: 0, y: 0 }]);
  const archive = ref<TLayout>([{ h: 2, i: 'Locked', w: 2, x: 0, y: 0, isStatic: true }]);

  const log = ref<{ kind: 'dropped' | 'rejected'; message: string }[]>([]);
  function addLogEntry(kind: 'dropped' | 'rejected', message: string): void {
    log.value = [{ kind, message }, ...log.value].slice(0, 6);
  }

  function onDropped(targetName: string, payload: { item: { i: string | number }; sourceLayoutId: string }): void {
    addLogEntry('dropped', `"${payload.item.i}" moved into ${targetName} (from ${payload.sourceLayoutId}).`);
  }

  function onRejected(targetName: string, payload: { itemId: string | number; sourceLayoutId: string }): void {
    addLogEntry('rejected', `${targetName} rejected "${payload.itemId}" from ${payload.sourceLayoutId} — this grid doesn't accept drops.`);
  }
</script>

<style scoped>
.demo-controls {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.grids-row {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(3, 1fr);
}

.grid-column :deep(.vue-grid-layout) {
  min-height: 140px;
}

.grid-label {
  color: var(--kg-text-lo-light);
  font-family: var(--kg-font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  margin: 0 0 8px;
  text-transform: uppercase;
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
</style>
