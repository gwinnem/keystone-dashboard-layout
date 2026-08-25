<!--
  Ported from vitepress-docs/.vitepress/theme/components/LayoutJsonViewer.vue
  — compact "current layout state" readout showing live x/y/w/h for
  every item. Only --vp-c-*/--vp-code-block-bg/--vp-font-family-mono
  tokens replaced with this project's own; markup/behavior unchanged.
-->
<template>
  <div class="layout-json">
    <p
      v-if="label"
      class="layout-json__label">
      {{ label }}
    </p>
    <div class="layout-json__grid">
      <div
        v-for="item in layout"
        :key="item.i"
        class="layout-json__item">
        <strong>{{ item.i }}</strong>
        <span class="layout-json__coords">x:{{ item.x }} y:{{ item.y }} w:{{ item.w }} h:{{ item.h }}</span>
      </div>
      <p
        v-if="layout.length === 0"
        class="layout-json__empty">
        empty
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
  defineProps<{
    layout: { i: string | number; x: number; y: number; w: number; h: number }[];
    label?: string;
  }>();
</script>

<style scoped>
.layout-json + .layout-json {
  margin-top: 10px;
}

.layout-json__label {
  color: var(--kg-text-lo-light);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  margin: 0 0 6px;
  text-transform: uppercase;
}

.layout-json__grid {
  background: var(--kg-ink);
  border-radius: 8px;
  display: grid;
  font-family: var(--kg-font-mono);
  font-size: 12.5px;
  gap: 6px 16px;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  padding: 12px 14px;
}

.layout-json__item {
  color: var(--kg-text-lo-dark);
  display: flex;
  gap: 8px;
  justify-content: space-between;
}

.layout-json__item strong {
  color: var(--kg-amber);
}

.layout-json__empty {
  color: var(--kg-text-lo-dark);
  font-style: italic;
  margin: 0;
}
</style>
