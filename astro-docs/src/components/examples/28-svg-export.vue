<template>
  <div class="demo-controls">
    <button
      class="demo-btn"
      @click="showExport = !showExport">{{ showExport ? 'Hide' : 'Show' }} exported SVG</button>
  </div>

  <GridLayout
    v-model:layout="layout"
    :col-num="12"
    :row-height="80"
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

  <template v-if="showExport">
    <p class="demo-description">
      Exported SVG (rendered below as a data URL — no <code>v-html</code>
      needed, since the raw markup never touches the DOM directly):
    </p>
    <div class="svg-preview">
      <img
        alt="Exported grid layout, rendered as SVG"
        :src="dataUrl" />
    </div>
    <p class="demo-description">
      <a
        download="layout.svg"
        :href="dataUrl">Download layout.svg</a>
    </p>
  </template>
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue';
  import { GridLayout, GridItem, exportLayoutAsSvg, type TLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 3, x: 0, y: 0 },
    { h: 2, i: '1', w: 3, x: 3, y: 0 },
    { h: 2, i: '2', w: 6, x: 0, y: 2 },
  ]);

  const showExport = ref(false);

  const exportedSvg = computed(() =>
    exportLayoutAsSvg(layout.value, {
      backgroundColor: '#f8fafc',
      colNum: 12,
      containerWidth: 700,
      rowHeight: 80,
    }),
  );

  // A real data URL, not a placeholder — an <img>'s own src can safely
  // point at one directly, unlike v-html (which would inject the raw
  // SVG markup as live DOM), so this needs no rule suppression of any
  // kind, and the download link below is the exact same string, not a
  // separate mechanism.
  const dataUrl = computed(() => `data:image/svg+xml,${encodeURIComponent(exportedSvg.value)}`);
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
  margin-top: 16px;
}

.svg-preview {
  border: 1px solid var(--kg-line-light);
  border-radius: 8px;
  overflow: hidden;
}

.svg-preview img {
  display: block;
  max-width: 100%;
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
