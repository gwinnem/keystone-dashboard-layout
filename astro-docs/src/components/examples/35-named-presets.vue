<template>
  <div class="demo-controls">
    <input
      v-model="presetName"
      class="demo-input"
      placeholder="preset name">
    <button
      class="demo-btn"
      @click="save">Save preset</button>
    <button
      v-for="name in presetNames"
      :key="name"
      class="demo-btn demo-btn--ghost"
      @click="load(name)">Load "{{ name }}"</button>
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

  <p class="demo-description">
    Saved presets: {{ presetNames.length ? presetNames.join(', ') : 'none yet' }}
  </p>

  <LayoutJsonViewer :layout="layout" />
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, useLayoutPresets, type TLayout } from 'keystone-dashboard-layout-vue';
  import 'keystone-dashboard-layout-vue/style.css';
  import LayoutJsonViewer from '../harness/LayoutJsonViewer.vue';

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 3, x: 0, y: 0 },
    { h: 2, i: '1', w: 3, x: 3, y: 0 },
    { h: 2, i: '2', w: 3, x: 6, y: 0 },
  ]);

  const presetName = ref('compact');
  const { savePreset, loadPreset, listPresets } = useLayoutPresets('example-35-presets', layout);
  const presetNames = ref<string[]>(listPresets());

  function save(): void {
    if (!presetName.value) return;
    savePreset(presetName.value);
    presetNames.value = listPresets();
  }

  function load(name: string): void {
    loadPreset(name);
  }
</script>

<style scoped>
.demo-controls {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin-bottom: 16px;
}

.demo-input {
  border: 1px solid var(--kg-line-light);
  border-radius: 6px;
  font-family: var(--kg-font-mono);
  font-size: 12px;
  padding: 5px 8px;
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

.demo-btn--ghost {
  background: transparent;
  border: 1px solid var(--kg-line-light);
  color: var(--kg-text-hi-light);
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
