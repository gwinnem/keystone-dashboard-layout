<template>
  <div class="demo-controls">
    <ExampleToggle
      v-model="sourceEnabled"
      label="Source grid: allow cross-grid drag" />
    <ExampleToggle
      v-model="targetEnabled"
      label="Target grid: allow cross-grid drag" />
    <ExampleToggle
      v-model="preventCollision"
      label="preventCollision" />
  </div>

  <div class="grids-row">
    <div class="grid-column">
      <p class="grid-label">Source</p>
      <GridLayout
        v-model:layout="sourceLayout"
        :allow-cross-grid-drag="sourceEnabled"
        :col-num="4"
        layout-id="cross-grid-drag-drop-source"
        :prevent-collision="preventCollision"
        :row-height="60"
        show-grid-lines>
        <GridItem
          v-for="item in sourceLayout"
          :key="item.i"
          :h="item.h"
          :i="item.i"
          :is-static="item.isStatic"
          :w="item.w"
          :x="item.x"
          :y="item.y">
          <div :class="item.isStatic ? 'example-item example-item--static' : 'example-item'">
            {{ item.i }}<small v-if="item.isStatic">locked</small>
          </div>
        </GridItem>
      </GridLayout>
    </div>
    <div class="grid-column">
      <p class="grid-label">Target</p>
      <GridLayout
        v-model:layout="targetLayout"
        :allow-cross-grid-drag="targetEnabled"
        :col-num="4"
        layout-id="cross-grid-drag-drop-target"
        :prevent-collision="preventCollision"
        :row-height="60"
        show-grid-lines>
        <GridItem
          v-for="item in targetLayout"
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

  <LayoutJsonViewer label="Source" :layout="sourceLayout" />
  <LayoutJsonViewer label="Target" :layout="targetLayout" />
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';
  import ExampleToggle from '../harness/ExampleToggle.vue';
  import LayoutJsonViewer from '../harness/LayoutJsonViewer.vue';

  const sourceEnabled = ref(true);
  const targetEnabled = ref(true);
  const preventCollision = ref(false);

  // `allowCrossGridDrag` needs to be set on *both* grids — toggling it
  // off on either one confines dragging back to within that grid only,
  // silently, with no error or event of any kind (a grid without this
  // prop was never part of the cross-grid system in the first place).
  // The target starts completely empty — given a min-height via CSS so
  // there's still a reasonable drop target to aim for, since an
  // actually-empty grid's own height would otherwise collapse to
  // almost nothing.
  const sourceLayout = ref<TLayout>([
    { h: 2, i: 'a', w: 3, x: 0, y: 0 },
    { h: 2, i: 'b', w: 3, x: 0, y: 2 },
    { h: 2, i: 'locked', isStatic: true, w: 3, x: 0, y: 4 },
  ]);
  const targetLayout = ref<TLayout>([]);
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
  grid-template-columns: 1fr 1fr;
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
  flex-direction: column;
  font-family: var(--kg-font-mono);
  height: 100%;
  justify-content: center;
  width: 100%;
}

.example-item--static {
  background: var(--kg-paper-3);
  border-style: dashed;
}

.example-item small {
  color: var(--kg-text-lo-light);
  font-size: 10px;
}
</style>
