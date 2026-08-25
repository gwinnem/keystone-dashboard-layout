<template>
  <div class="demo-controls">
    <span class="demo-description">Last event: <strong>{{ lastEvent }}</strong></span>
  </div>

  <div class="grids-row">
    <div class="grid-column">
      <p class="grid-label">Grid A</p>
      <GridLayout
        v-model:layout="layoutA"
        allow-cross-grid-drag
        :col-num="6"
        layout-id="grid-a"
        :row-height="60"
        show-grid-lines>
        <GridItem
          v-for="item in layoutA"
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
      <p class="grid-label">Grid B (rejects incoming drops)</p>
      <GridLayout
        v-model:layout="layoutB"
        allow-cross-grid-drag
        :col-num="6"
        disable-external-drop
        layout-id="grid-b"
        :row-height="60"
        show-grid-lines
        @cross-grid-drop-rejected="onRejected">
        <GridItem
          v-for="item in layoutB"
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
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';

  const layoutA = ref<TLayout>([
    { h: 2, i: 'a0', w: 3, x: 0, y: 0 },
  ]);

  const layoutB = ref<TLayout>([
    { h: 2, i: 'b0', w: 3, x: 0, y: 0 },
  ]);

  const lastEvent = ref('none yet');

  function onRejected({ itemId, sourceLayoutId }: { itemId: string | number; sourceLayoutId: string }): void {
    lastEvent.value = `rejected ${itemId} from ${sourceLayoutId}`;
  }
</script>

<style scoped>
.demo-controls {
  margin-bottom: 16px;
}

.grids-row {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr 1fr;
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

.demo-description {
  color: var(--kg-text-lo-light);
  font-size: 13px;
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
