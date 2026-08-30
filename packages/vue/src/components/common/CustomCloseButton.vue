<!--
  The default close button rendered inside a `GridItem` when
  `showCloseButton` is true. Also exported standalone from the package's
  public entry point in case a consumer wants to render the same button
  (e.g. in a custom header) and wire it to the same `remove-grid-item`
  event manually.
-->
<template>
  <button
    aria-label="Close"
    class="btn-close"
    type="button"
    @click="removeItem">
    <span
      aria-hidden="true"
      class="icon-cross"></span>
  </button>
</template>

<script lang="ts" setup>
  import { EGridItemEvent } from '@/core/griditem/enums/EGridItemEvents';

  export interface ICustomCloseButtonProps {
    /** The id of the `GridItem` this button removes when clicked. `-1` (the default) is treated as "no item" and the click is a no-op. */
    i?: string | number;
  }

  const props = withDefaults(defineProps<ICustomCloseButtonProps>(), {
    i: -1,
  });

  // Runtime-array form, not the generic/type-argument form this used to
  // use — a deliberate, confirmed-necessary workaround, not a stylistic
  // choice: `defineEmits<{ (e: EGridItemEvent.REMOVE_ITEM, ...): void }>()`
  // requires `@vue/compiler-sfc`'s own compile-time type resolution to
  // read `EGridItemEvent`'s actual definition from its import source
  // (`@/core/griditem/enums/EGridItemEvents`) — a completely separate
  // resolution path from Vite's own bundler-level `resolve.alias` (which
  // already works correctly everywhere else in this file/package, and
  // for every plain runtime import). That separate path was confirmed,
  // via a real, reproduced failure (not assumed), to break specifically
  // when this package is copied into a temp sandbox — as Stryker's own
  // mutation-testing tooling does — with '[@vue/compiler-sfc] Failed to
  // resolve import source "@/core/griditem/enums/EGridItemEvents"', even
  // though the exact same file, same alias, same coverage flags, run
  // correctly from this package's own real directory (confirmed via a
  // direct, side-by-side `npx vitest run` comparison). Root cause not
  // fully pinned down — several config-level fixes (`resolve.
  // preserveSymlinks`, an explicit `vitest.config.js` `root`, excluding
  // the monorepo's own root tsconfig.json from the sandbox) were tried
  // and ruled out along the way, each fixing a real but separate issue,
  // none touching this one. This runtime-array form needs no compile-
  // time type resolution at all (the array itself is the runtime
  // validation Vue needs), sidestepping the problem entirely rather than
  // working around it. Trade-off, accepted deliberately: TypeScript now
  // only checks the emitted *event name* against this array, not the
  // payload's own shape (previously, `emit(EGridItemEvent.REMOVE_ITEM,
  // props.i)`'s second argument was checked against `string | number`)
  // — a real loss of compile-time safety on the call site below, not a
  // behavioral change at runtime.
  const emit = defineEmits([EGridItemEvent.REMOVE_ITEM]);

  /** Emits `EGridItemEvent.REMOVE_ITEM` with the configured `i`, unless `i` is the default `-1` sentinel. */
  const removeItem = (): void => {
    if(Number(props.i) === -1) {
      return;
    }
    emit(EGridItemEvent.REMOVE_ITEM, props.i);
  };
</script>

<style lang="scss" scoped>
// Display a cross with CSS only.
// $size  : px or em
// $color : color
// $thickness : px
@mixin cross($size: 20px, $color: currentColor, $thickness: 1px) {
  background: none;
  border: 0;
  height: $size;
  margin: 0;
  padding: 0;
  position: relative;
  width: $size;

  &::before,
  &::after {
    background: $color;
    border-radius: $thickness;
    content: '';
    height: $thickness;
    left: 0;
    position: absolute;
    right: 0;
    top: calc(($size - $thickness) / 2);
  }

  &::before {
    transform: rotate(45deg);
  }

  &::after {
    transform: rotate(-45deg);
  }

  span {
    display: block;
  }
}

.btn-close {
  align-items: center;
  background: #464548;
  border: 0;
  border-radius: 50%;
  cursor: pointer !important;
  display: flex;
  flex-flow: column nowrap;
  height: 40px;
  justify-content: center;
  margin: 0;
  padding: 0;
  transition: all 150ms;
  width: 40px;

  .icon-cross {
    @include cross(20px, #fff, 6px);
  }

  &:hover,
  &:focus {
    transform: rotateZ(90deg);

    // background: hsl(216, 100, 40%);
  }
}
</style>
