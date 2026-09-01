<template>
  <div class="demo-controls">
    <ExampleToggle
      v-model="maxRowsEnabled"
      label="maxRows: 3" />
    <ExampleToggle
      v-model="restoreOnDrag"
      label="restoreOnDrag" />
    <ExampleToggle
      v-model="distributeEvenly"
      label="distributeEvenly" />
    <ExampleNumberField
      v-model="transformScale"
      label="transformScale"
      :max="2"
      :min="0.5" />
    <ExampleToggle
      v-model="useCssTransforms"
      label="useCssTransforms" />
  </div>

  <div
    class="demo-scale-wrap"
    :style="{ transform: `scale(${transformScale})`, transformOrigin: 'top left' }">
    <GridLayout
      ref="gridRef"
      v-model:layout="layout"
      :col-num="12"
      :distribute-evenly="distributeEvenly"
      :max-rows="maxRowsEnabled ? 3 : Infinity"
      :restore-on-drag="restoreOnDrag"
      :row-height="60"
      show-grid-lines
      :transform-scale="transformScale"
      :use-css-transforms="useCssTransforms">
      <GridItem
        v-for="item in layout"
        :key="item.i"
        ref="itemRefs"
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
  </div>

  <p class="demo-description">
    Item "0"'s own positioning right now: <strong>{{ positioningMechanism }}</strong>
  </p>
  <div class="demo-controls">
    <button class="demo-btn" type="button" @click="runCalcXY">Read item "0"'s own calcXY(50, 50)</button>
    <span v-if="calcXyResult" class="demo-description"> → x: {{ calcXyResult.x }}, y: {{ calcXyResult.y }}</span>
  </div>

  <LayoutJsonViewer :layout="layout" />
</template>

<script lang="ts" setup>
  import { nextTick, onMounted, ref, watch } from 'vue';
  import { GridLayout, GridItem, type TLayout } from 'keystone-dashboard-layout-vue';
  import 'keystone-dashboard-layout-vue/style.css';
  import ExampleToggle from '../harness/ExampleToggle.vue';
  import ExampleNumberField from '../harness/ExampleNumberField.vue';
  import LayoutJsonViewer from '../harness/LayoutJsonViewer.vue';

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 4, x: 0, y: 0 },
    { h: 2, i: '1', w: 4, x: 4, y: 0 },
    { h: 2, i: '2', w: 4, x: 8, y: 0 },
  ]);

  const maxRowsEnabled = ref(false);
  const restoreOnDrag = ref(false);
  const distributeEvenly = ref(false);
  const transformScale = ref(1);
  const useCssTransforms = ref(true);
  const gridRef = ref<InstanceType<typeof GridLayout>>();

  // `useCssTransforms` toggles between two mechanisms that render
  // visually identically (transform: translate3d(...) vs plain
  // top/left), so there'd be no way to actually see the toggle do
  // anything without opening devtools. Reading the real, current
  // inline style back out of the rendered DOM (not duplicating the
  // toggle's own state, which would just echo the control rather than
  // confirm the grid itself changed) makes the effect visible here.
  const positioningMechanism = ref('');

  async function refreshPositioningReadout(): Promise<void> {
    await nextTick();
    const el = gridRef.value?.$el?.querySelector<HTMLElement>('[data-grid-item-id="0"]');
    if (!el) {
      return;
    }
    positioningMechanism.value = el.style.transform
      ? `transform: ${el.style.transform}`
      : `top: ${el.style.top}, left: ${el.style.left}`;
  }

  // `immediate: true` alone isn't enough here: it runs synchronously
  // during setup, before this component has actually mounted, so
  // `gridRef.value` is still undefined at that point and
  // refreshPositioningReadout() returns early without populating
  // anything. onMounted (which fires strictly after the template ref
  // is populated) is what actually gets the first, correct read.
  watch(useCssTransforms, refreshPositioningReadout);
  onMounted(refreshPositioningReadout);

  // GridItem's own exposed calcXY(top, left) — converts a pixel
  // position to the equivalent grid-unit x/y, using this item's own
  // current colWidth/rowHeight/margin. A low-level utility; rarely
  // needed directly since drag/resize already handle this internally,
  // but useful for e.g. snapping an externally-dropped element's raw
  // pixel coordinates to the grid yourself. Vue collects same-named
  // refs inside a v-for into an array, in render order — itemRefs[0]
  // is item "0" here since it's rendered first.
  const itemRefs = ref<InstanceType<typeof GridItem>[]>([]);
  const calcXyResult = ref<{ x: number; y: number } | null>(null);

  function runCalcXY(): void {
    calcXyResult.value = itemRefs.value[0]?.calcXY(50, 50) ?? null;
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
