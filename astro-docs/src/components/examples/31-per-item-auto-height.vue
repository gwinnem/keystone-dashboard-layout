<template>
  <div class="demo-controls">
    <button
      class="demo-btn"
      @click="addLine">Add a line of text</button>
  </div>

  <GridLayout
    v-model:layout="layout"
    :col-num="12"
    :row-height="30"
    show-grid-lines>
    <GridItem
      v-for="item in layout"
      :key="item.i"
      auto-height
      :h="item.h"
      :i="item.i"
      :w="item.w"
      :x="item.x"
      :y="item.y">
      <div class="example-item">
        <p
          v-for="(line, index) in lines"
          :key="index">{{ line }}</p>
      </div>
    </GridItem>
  </GridLayout>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 4, x: 0, y: 0 },
  ]);

  const lines = ref(['One line of content.']);

  function addLine(): void {
    lines.value = [...lines.value, `Line ${lines.value.length + 1} of content.`];
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

.example-item {
  background: var(--kg-panel);
  border: 1px solid var(--kg-line-light);
  border-radius: 8px;
  color: var(--kg-text-hi-light);
  font-family: var(--kg-font-mono);
  font-size: 12px;
  padding: 10px 12px;
  width: 100%;
}

.example-item p {
  margin: 0 0 4px;
}
</style>
