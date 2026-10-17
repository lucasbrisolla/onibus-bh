<script setup lang="ts">
import { useBottomSheet } from '../composables/useBottomSheet';

withDefaults(defineProps<{
  panelName: string;
  placement?: 'viewport' | 'map';
  themeMode?: 'light' | 'dark';
}>(), {
  placement: 'viewport',
  themeMode: 'light',
});

const {
  sheetState,
  setSheetElement,
  dragStyle,
  isDragging,
  isSettling,
  toggleSheet,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTouchCancel,
  onTransitionEnd,
} = useBottomSheet();
</script>

<template>
  <div
    :ref="setSheetElement"
    class="mobile-panel-sheet tw:select-none tw:overflow-hidden tw:overscroll-contain tw:rounded-[18px_18px_8px_8px] tw:border tw:border-[var(--bh-border-28)] tw:bg-[var(--bh-glass-white)] tw:shadow-[0_24px_60px_var(--bh-shadow-28)] tw:transition-[height,transform] tw:duration-[180ms] tw:will-change-transform tw:max-[920px]:flex tw:max-[920px]:flex-col tw:dark:border-[#1f4a47] tw:dark:bg-[var(--bh-glass-inset)] tw:dark:shadow-[0_24px_60px_var(--bh-shadow-16)]"
    :class="[
      placement === 'viewport'
        ? 'tw:fixed tw:inset-x-2.5 tw:z-[1000] tw:hidden tw:max-[920px]:flex tw:max-[920px]:flex-col tw:max-[920px]:bottom-[calc(68px_+_env(safe-area-inset-bottom))]'
        : 'tw:dark:text-[#e5e7eb] tw:min-[921px]:contents tw:max-[920px]:absolute tw:max-[920px]:right-2.5 tw:max-[920px]:bottom-0 tw:max-[920px]:left-2.5 tw:max-[920px]:z-[800] tw:max-[920px]:flex tw:max-[920px]:flex-col',
      `is-${sheetState}`,
      isDragging ? 'is-dragging tw:shadow-none tw:transition-none' : '',
      isSettling ? 'is-settling tw:shadow-none' : '',
      themeMode === 'dark' ? 'tw:border-[#1f4a47] tw:bg-[var(--bh-glass-inset)]' : '',
      sheetState === 'peek' ? 'tw:max-[920px]:h-[25vh] tw:max-[920px]:min-h-[160px] tw:max-[920px]:max-h-[240px] tw:max-[920px]:translate-y-0 tw:max-[920px]:shadow-[0_14px_32px_var(--bh-shadow-16)]' : '',
      sheetState === 'half' ? 'tw:max-[920px]:h-[min(42vh,340px)]' : '',
      sheetState === 'full' ? 'tw:max-[920px]:h-[calc(100dvh_-_76px_-_env(safe-area-inset-bottom))] tw:max-[920px]:max-h-[calc(100dvh_-_76px_-_env(safe-area-inset-bottom))]' : '',
    ]"
    :style="dragStyle"
    @touchstart.passive="onTouchStart"
    @touchmove="onTouchMove"
    @touchend.passive="onTouchEnd"
    @touchcancel.passive="onTouchCancel"
    @transitionend="onTransitionEnd"
  >
    <button
      type="button"
      class="sheet-toggle mobilibus-sheet-toggle tw:hidden tw:min-h-[34px] tw:w-full tw:cursor-grab tw:place-items-center tw:border-0 tw:bg-transparent tw:px-0 tw:py-[9px_0_6px] tw:active:cursor-grabbing tw:max-[920px]:grid tw:max-[920px]:shrink-0"
      :aria-expanded="sheetState !== 'peek'"
      :aria-label="sheetState === 'peek' ? `Expandir painel ${panelName}` : `Recolher painel ${panelName} para o mapa`"
      @click="toggleSheet"
    >
      <div class="sheet-handle tw:h-[5px] tw:w-12 tw:rounded-full tw:bg-[#d0d5dd] tw:dark:bg-[#9eb7b4]"></div>
    </button>
    <slot />
  </div>
</template>
