<template>
  <div class="demo-controls">
    <button class="demo-btn" :disabled="maximizedItem === null" type="button" @click="restore">Restore</button>
    <button class="demo-btn demo-btn--ghost" type="button" @click="addItem">Add item</button>
    <button class="demo-btn demo-btn--ghost" type="button" @click="reset">Reset</button>
  </div>

  <div class="stage">
    <GridLayout
      v-model:layout="layout"
      v-model:maximized-item="maximizedItem"
      :col-num="12"
      height-mode="fit"
      :row-height="60"
      show-grid-lines
      show-maximize-button>
      <GridItem
        v-for="item in layout"
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

  <p class="demo-status">
    <span v-if="maximizedItem !== null">Item {{ maximizedItem }} is maximized. Press Escape, or the button again, to restore it.</span>
    <span v-else>Use the button in an item's corner to maximize it. The layout is never changed.</span>
  </p>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from 'keystone-dashboard-layout-vue';
  import 'keystone-dashboard-layout-vue/style.css';

  const defaultLayout = (): TLayout => [
    { h: 3, i: 'A', w: 4, x: 0, y: 0 },
    { h: 3, i: 'B', w: 4, x: 4, y: 0 },
    { h: 3, i: 'C', w: 4, x: 8, y: 0 },
    { h: 3, i: 'D', w: 4, x: 0, y: 3 },
    { h: 3, i: 'E', w: 4, x: 4, y: 3 },
  ];

  const layout = ref<TLayout>(defaultLayout());
  const maximizedItem = ref<string | number | null>(null);
  let counter = 0;

  function restore(): void {
    maximizedItem.value = null;
  }

  // Added at `y: Infinity`: while an item is maximized the grid does not compact, so the new
  // card is placed when you restore — try it.
  function addItem(): void {
    counter += 1;
    layout.value.push({ h: 3, i: `N${counter}`, w: 4, x: 8, y: Infinity });
  }

  function reset(): void {
    maximizedItem.value = null;
    layout.value = defaultLayout();
  }
</script>

<style scoped>
.stage {
  height: 420px;
}

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
  cursor: not-allowed;
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
</style>
