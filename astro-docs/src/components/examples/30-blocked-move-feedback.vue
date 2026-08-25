<template>
  <div class="demo-controls">
    <span
      class="demo-status"
      :class="{ 'demo-status--active': flashing }">{{ flashing ? 'Blocked!' : 'Try dragging item 0 onto the static item' }}</span>
  </div>

  <GridLayout
    v-model:layout="layout"
    :col-num="12"
    prevent-collision
    :row-height="60"
    show-grid-lines
    @move-blocked-by-collision="onBlocked">
    <GridItem
      v-for="item in layout"
      :key="item.i"
      :h="item.h"
      :i="item.i"
      :is-static="item.i === 'anchor'"
      :w="item.w"
      :x="item.x"
      :y="item.y">
      <div
        class="example-item"
        :class="{ 'example-item--static': item.i === 'anchor' }">
        {{ item.i === 'anchor' ? 'static' : item.i }}
      </div>
    </GridItem>
  </GridLayout>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 3, x: 0, y: 0 },
    { h: 2, i: 'anchor', w: 3, x: 3, y: 0 },
  ]);

  const flashing = ref(false);
  let timeout: ReturnType<typeof setTimeout> | undefined;

  function onBlocked(): void {
    flashing.value = true;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      flashing.value = false;
    }, 900);
  }
</script>

<style scoped>
.demo-controls {
  margin-bottom: 16px;
}

.demo-status {
  color: var(--kg-text-lo-light);
  font-size: 13px;
  transition: color 0.15s ease;
}

.demo-status--active {
  color: var(--kg-amber-deep);
  font-weight: 600;
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

.example-item--static {
  background: var(--kg-paper-3);
  border-color: var(--kg-blueprint-deep);
  color: var(--kg-blueprint-deep);
}
</style>
