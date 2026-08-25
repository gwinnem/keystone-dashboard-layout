<template>
  <div class="demo-controls">
    <button
      class="demo-btn"
      @click="exportSvg">Export as SVG</button>
  </div>

  <GridLayout
    v-model:layout="layout"
    :col-num="12"
    :row-height="60"
    show-grid-lines>
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

  <div
    v-if="svgMarkup"
    class="svg-preview"
    v-html="svgMarkup"></div>
  <p
    v-else
    class="demo-description">Click "Export as SVG" to see the output rendered here.</p>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, exportLayoutAsSvg, type TLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 3, x: 0, y: 0 },
    { h: 2, i: '1', w: 3, x: 3, y: 0 },
    { h: 2, i: '2', w: 3, x: 6, y: 0 },
  ]);

  const svgMarkup = ref('');

  function exportSvg(): void {
    svgMarkup.value = exportLayoutAsSvg(layout.value, { colNum: 12, rowHeight: 60 });
  }
</script>

<style scoped>
.demo-controls {
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

.demo-description {
  color: var(--kg-text-lo-light);
  font-size: 13px;
  font-style: italic;
  margin-top: 16px;
}

.svg-preview {
  background: var(--kg-paper-2);
  border: 1px solid var(--kg-line-light);
  border-radius: 8px;
  margin-top: 16px;
  padding: 12px;
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
