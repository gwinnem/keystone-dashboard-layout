<template>
  <GridLayout
    v-model:layout="layout"
    :col-num="12"
    :row-height="60"
    show-grid-lines
    @breakpoint-changed="log('breakpoint-changed')"
    @update:layout="log('update:layout')">
    <GridItem
      v-for="item in layout"
      :key="item.i"
      :h="item.h"
      :i="item.i"
      :w="item.w"
      :x="item.x"
      :y="item.y"
      @item-move="log(`moving: ${item.i} -> (${item.x},${item.y})`)"
      @item-moved="log(`moved: ${item.i} -> (${item.x},${item.y})`)"
      @resized="log(`resized: ${item.i} -> ${item.w}x${item.h}`)">
      <div class="example-item">
        {{ item.i }}
      </div>
    </GridItem>
  </GridLayout>

  <div class="event-log-panel">
    <p class="event-log__label">EVENT LOG</p>
    <ul class="event-log">
      <li
        v-if="events.length === 0"
        class="event-log__empty">
        Drag or resize an item to see events appear here.
      </li>
      <li
        v-for="(entry, index) in events"
        :key="index"
        class="event-log__entry">
        {{ entry }}
      </li>
    </ul>
  </div>

  <LayoutJsonViewer :layout="layout" />
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from 'keystone-dashboard-layout-vue';
  import 'keystone-dashboard-layout-vue/style.css';
  import LayoutJsonViewer from '../harness/LayoutJsonViewer.vue';

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 2, x: 0, y: 0 },
    { h: 2, i: '1', w: 2, x: 2, y: 0 },
    { h: 2, i: '2', w: 2, x: 4, y: 0 },
  ]);

  const events = ref<string[]>([]);

  function log(message: string): void {
    events.value = [`${new Date().toLocaleTimeString()} — ${message}`, ...events.value].slice(0, 8);
  }
</script>

<style scoped>
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

.event-log-panel {
  background: var(--kg-paper-2);
  border: 1px solid var(--kg-line-light);
  border-radius: 8px;
  margin-top: 16px;
  padding: 12px 14px;
}

.event-log__label {
  color: var(--kg-text-lo-light);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  margin: 0 0 6px;
  text-transform: uppercase;
}

.event-log {
  display: flex;
  flex-direction: column;
  gap: 4px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.event-log__entry {
  color: var(--kg-text-hi-light);
  font-family: var(--kg-font-mono);
  font-size: 12.5px;
}

.event-log__empty {
  color: var(--kg-text-lo-light);
  font-size: 12.5px;
  font-style: italic;
}
</style>
