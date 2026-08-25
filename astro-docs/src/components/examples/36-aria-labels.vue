<template>
  <GridLayout
    v-model:layout="layout"
    :aria-labels="gridAriaLabels"
    :col-num="12"
    :row-height="60"
    show-close-button
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
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout, type IGridAriaLabels } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 3, x: 0, y: 0 },
    { h: 2, i: '1', w: 3, x: 3, y: 0 },
  ]);

  const gridAriaLabels: IGridAriaLabels = {
    closeButton: 'Supprimer cet élément',
    itemRoleDescription: 'Élément déplaçable et redimensionnable',
    moveInstruction: 'Appuyez sur les flèches pour déplacer.',
    resizeInstruction: 'Appuyez sur Maj plus les flèches pour redimensionner.',
  };
</script>

<style scoped>
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
