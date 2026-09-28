<script setup lang="ts">
import MonitoringPanel from './MonitoringPanel.vue';
import type { AlertSettings, NearbyStop, Prediction, PredictionAlertRequest } from '../domain/types';
import type { PermissionState } from '../services/notificationService';
import { useBottomSheet } from '../composables/useBottomSheet';

defineProps<{
  settings: AlertSettings;
  predictions: Prediction[];
  selectedPredictionId: string | null;
  statusMessage: string;
  isLoading: boolean;
  permission: PermissionState;
  lastUpdated: string | null;
  selectedStop: NearbyStop | null;
  isSelectedStopFavorite: boolean;
  themeMode?: 'light' | 'dark';
  displayMode?: 'full' | 'predictions-only';
}>();

defineEmits<{
  update: [settings: AlertSettings];
  selectPrediction: [prediction: Prediction];
  createAlert: [request: PredictionAlertRequest];
  toggleSelectedStopFavorite: [];
  requestPermission: [];
}>();

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
    class="mobile-bottom-sheet tw:fixed tw:inset-x-2.5 tw:z-[1000] tw:hidden tw:select-none tw:overflow-hidden tw:overscroll-contain tw:rounded-[18px_18px_8px_8px] tw:bg-white/[.97] tw:shadow-[0_24px_60px_rgba(16,24,40,0.3)] tw:dark:border tw:dark:border-[#1f4a47] tw:dark:bg-[rgba(15,36,35,0.98)] tw:dark:shadow-[0_24px_60px_rgba(0,0,0,0.46)] tw:transition-[height,transform] tw:duration-[180ms] tw:will-change-transform tw:max-[920px]:block tw:max-[920px]:bottom-[calc(68px_+_env(safe-area-inset-bottom))] tw:max-[920px]:h-[min(42vh,340px)]"
    :style="dragStyle"
    :class="[
      `is-${sheetState}`,
      isDragging ? 'is-dragging tw:shadow-none! tw:transition-none!' : '',
      isSettling ? 'is-settling tw:shadow-none!' : '',
      themeMode === 'dark' ? 'tw:border-[#1f4a47]! tw:bg-[rgba(15,36,35,0.98)]!' : '',
      sheetState === 'peek' ? 'tw:max-[920px]:h-11 tw:max-[920px]:translate-y-[calc(100%-34px)] tw:max-[920px]:shadow-[0_14px_32px_rgba(16,24,40,0.22)]' : '',
      sheetState === 'half' ? 'tw:max-[920px]:h-[min(42vh,340px)]' : '',
      sheetState === 'full' ? 'tw:max-[920px]:h-[calc(100dvh_-_76px_-_env(safe-area-inset-bottom))]! tw:max-[920px]:max-h-[calc(100dvh_-_76px_-_env(safe-area-inset-bottom))]!' : '',
    ]"
    @touchstart.passive="onTouchStart"
    @touchmove="onTouchMove"
    @touchend.passive="onTouchEnd"
    @touchcancel.passive="onTouchCancel"
    @transitionend="onTransitionEnd"
  >
    <button
      type="button"
      class="sheet-toggle tw:grid tw:min-h-[34px] tw:w-full tw:cursor-grab tw:place-items-center tw:border-0! tw:bg-transparent! tw:px-0! tw:py-[9px_0_6px]! tw:active:cursor-grabbing"
      :aria-expanded="sheetState !== 'peek'"
      :aria-label="sheetState === 'peek' ? 'Expandir painel de monitoramento' : 'Recolher painel de monitoramento para o mapa'"
      @click="toggleSheet"
    >
      <div class="sheet-handle tw:h-[5px] tw:w-12 tw:rounded-full tw:bg-[#d0d5dd] tw:dark:bg-[#9eb7b4]"></div>
    </button>
    <MonitoringPanel
      class="tw:max-[920px]:min-h-0"
      :display-mode="displayMode"
      :settings="settings"
      :predictions="predictions"
      :selected-prediction-id="selectedPredictionId"
      :status-message="statusMessage"
      :is-loading="isLoading"
      :permission="permission"
      :last-updated="lastUpdated"
      :selected-stop="selectedStop"
      :is-selected-stop-favorite="isSelectedStopFavorite"
      @update="$emit('update', $event)"
      @select-prediction="$emit('selectPrediction', $event)"
      @create-alert="$emit('createAlert', $event)"
      @toggle-selected-stop-favorite="$emit('toggleSelectedStopFavorite')"
      @request-permission="$emit('requestPermission')"
    />
  </div>
</template>
