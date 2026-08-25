<template>
  <div class="demo-controls">
    <div
      class="outside-source outside-source--accepted"
      draggable="true"
      @dragstart="onDragStart(true, $event)">
      widget (accepted)
    </div>
    <div
      class="outside-source outside-source--rejected"
      draggable="true"
      @dragstart="onDragStart(false, $event)">
      not-a-widget (rejected)
    </div>
  </div>

  <GridLayout
    v-model:layout="layout"
    allow-outside-drop
    :col-num="12"
    :outside-drop-accept="outsideDropAccept"
    :row-height="60"
    show-grid-lines
    @item-dropped-from-outside="onDropped">
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

  <p class="demo-description">Last payload: {{ lastPayload ?? 'none yet' }}</p>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, readOutsideDropPayload, type TLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';

  interface IWidgetPayload {
    kind: string;
    label: string;
  }

  const layout = ref<TLayout>([]);
  const lastPayload = ref<string | null>(null);
  let nextId = 0;

  function onDragStart(isWidget: boolean, event?: DragEvent): void {
    const payload: IWidgetPayload = isWidget
      ? { kind: 'widget', label: 'A real widget' }
      : { kind: 'not-a-widget', label: 'Should be rejected' };
    event?.dataTransfer?.setData('application/json', JSON.stringify(payload));
  }

  function outsideDropAccept(dataTransfer: DataTransfer | null): boolean {
    const payload = readOutsideDropPayload<IWidgetPayload>(dataTransfer, 'application/json');
    return payload?.kind === 'widget';
  }

  function onDropped({ x, y, w, h, dataTransfer }: { x: number; y: number; w: number; h: number; dataTransfer: DataTransfer }): void {
    const payload = readOutsideDropPayload<IWidgetPayload>(dataTransfer, 'application/json');
    lastPayload.value = JSON.stringify(payload);
    layout.value.push({ h, i: String(nextId), w, x, y });
    nextId += 1;
  }
</script>

<style scoped>
.demo-controls {
  margin-bottom: 16px;
}

.outside-source {
  border-radius: 6px;
  cursor: grab;
  display: inline-block;
  font-family: var(--kg-font-mono);
  font-size: 12px;
  padding: 6px 12px;
}

.outside-source--accepted {
  background: var(--kg-amber);
  color: #2b1b02;
}

.outside-source--rejected {
  background: var(--kg-paper-3);
  border: 1px dashed var(--kg-line-light);
  color: var(--kg-text-lo-light);
  margin-left: 8px;
}

.demo-description {
  color: var(--kg-text-lo-light);
  font-size: 12.5px;
  font-family: var(--kg-font-mono);
  margin-top: 12px;
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
