<!--
  Ported from vitepress-docs/.vitepress/theme/components/ExampleDemo.vue
  — the shared shell every example page uses so every demo looks and
  feels consistent: a titled card, an optional control panel row, and a
  bordered stage for the actual GridLayout. Only the CSS custom
  properties changed (VitePress's --vp-c-* replaced with this project's
  own --kg-* tokens, see src/styles/tokens.css) — markup and behavior
  are unchanged from the source.
-->
<template>
  <div class="example-demo not-content">
    <div
      v-if="title || $slots.description"
      class="example-demo__header">
      <h3
        v-if="title"
        class="example-demo__title">
        {{ title }}
      </h3>
      <p
        v-if="$slots.description"
        class="example-demo__description">
        <slot name="description"></slot>
      </p>
    </div>

    <div
      v-if="$slots.controls"
      class="example-demo__controls">
      <slot name="controls"></slot>
    </div>

    <div class="example-demo__stage">
      <slot></slot>
    </div>

    <div
      v-if="$slots.footer"
      class="example-demo__footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
  defineProps<{
    title?: string;
  }>();
</script>

<style scoped>
.example-demo {
  background: var(--kg-paper-3);
  border: 1px solid var(--kg-line-light);
  border-radius: 12px;
  margin: 24px 0;
  overflow: hidden;
}

.example-demo__header {
  background: var(--kg-paper-2);
  border-bottom: 1px solid var(--kg-line-light);
  padding: 16px 20px;
}

.example-demo__title {
  align-items: center;
  border: none !important;
  color: var(--kg-text-hi-light);
  display: flex;
  font-family: var(--kg-font-display);
  font-size: 15px !important;
  font-weight: 600;
  gap: 8px;
  margin: 0 !important;
  padding: 0 !important;
}

.example-demo__title::before {
  background: var(--kg-blueprint);
  border-radius: 50%;
  content: '';
  display: inline-block;
  flex-shrink: 0;
  height: 8px;
  width: 8px;
}

.example-demo__description {
  color: var(--kg-text-lo-light);
  font-size: 13.5px;
  line-height: 1.6;
  margin: 8px 0 0;
}

.example-demo__controls {
  background: var(--kg-paper-2);
  border-bottom: 1px solid var(--kg-line-light);
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  padding: 14px 20px;
}

.example-demo__stage {
  padding: 20px;
}

.example-demo__footer {
  background: var(--kg-paper-2);
  border-top: 1px solid var(--kg-line-light);
  color: var(--kg-text-lo-light);
  font-size: 13px;
  padding: 12px 20px;
}
</style>
