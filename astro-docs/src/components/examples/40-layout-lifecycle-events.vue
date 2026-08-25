<template>
  <GridLayout
    v-model:layout="layout"
    :col-num="12"
    :row-height="60"
    show-grid-lines
    @columns-changed="logEvent('columns-changed')"
    @layout-ready="logEvent('layout-ready')"
    @layout-updated="logEvent('layout-updated')">
    <GridItem
      v-for="item in layout"
      :key="item.i"
      :h="item.h"
      :i="item.i"
      :w="item.w"
      :x="item.x"
      :y="item.y">
      <div class="example-item">
        {{ item.i }}
      </div>
    </GridItem>
  </GridLayout>

  <div class="event-log-panel">
    <p class="event-log__label">LIFECYCLE LOG</p>
    <ul class="event-log">
      <li
        v-for="(entry, index) in events"
        :key="index"
        class="event-log__entry">{{ entry }}</li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';

  const events = ref<string[]>([]);

  function logEvent(name: string): void {
    events.value = [...events.value, name];
  }

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 3, x: 0, y: 0 },
    { h: 2, i: '1', w: 3, x: 3, y: 0 },
  ]);
</script>

<style scoped>
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
  max-height: 140px;
  overflow-y: auto;
  padding: 0;
}

.event-log__entry {
  color: var(--kg-text-hi-light);
  font-family: var(--kg-font-mono);
  font-size: 12.5px;
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
</style>
