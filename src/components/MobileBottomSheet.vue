<script setup lang="ts">
import { ref } from 'vue';
import MonitoringPanel from './MonitoringPanel.vue';
import type { AlertSettings, NearbyStop, Prediction, PredictionAlertRequest } from '../domain/types';
import type { PermissionState } from '../services/notificationService';

const SHEET_GESTURE_ZONE_HEIGHT = 108;
const SWIPE_THRESHOLD_PX = 56;
type SheetState = 'peek' | 'half' | 'full';

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

const sheetState = ref<SheetState>('half');
const sheetElement = ref<HTMLElement | null>(null);
let touchStartY: number | null = null;
let isTrackingGesture = false;

function toggleSheet() {
  sheetState.value = sheetState.value === 'peek' ? 'half' : 'peek';
}

function moveSheet(direction: 'up' | 'down') {
  const states: SheetState[] = ['peek', 'half', 'full'];
  const currentIndex = states.indexOf(sheetState.value);
  const nextIndex = direction === 'up'
    ? Math.min(states.length - 1, currentIndex + 1)
    : Math.max(0, currentIndex - 1);
  sheetState.value = states[nextIndex];
}

function onTouchStart(event: TouchEvent) {
  const firstTouch = event.touches[0];
  if (!firstTouch) {
    return;
  }

  const sheetTop = sheetElement.value?.getBoundingClientRect().top ?? 0;
  const canStartGesture =
    sheetState.value === 'peek' || firstTouch.clientY <= sheetTop + SHEET_GESTURE_ZONE_HEIGHT;

  if (!canStartGesture) {
    touchStartY = null;
    isTrackingGesture = false;
    return;
  }

  isTrackingGesture = true;
  touchStartY = event.touches[0]?.clientY ?? null;
}

function onTouchEnd(event: TouchEvent) {
  if (!isTrackingGesture || touchStartY === null) {
    return;
  }

  const touchEndY = event.changedTouches[0]?.clientY ?? touchStartY;
  const deltaY = touchEndY - touchStartY;
  touchStartY = null;
  isTrackingGesture = false;

  if (deltaY > SWIPE_THRESHOLD_PX) {
    moveSheet('down');
    return;
  }

  if (deltaY < -SWIPE_THRESHOLD_PX) {
    moveSheet('up');
  }
}
</script>

<template>
  <div
    ref="sheetElement"
    class="mobile-bottom-sheet tw:fixed tw:inset-x-2.5 tw:bottom-[68px] tw:z-[1000] tw:hidden tw:overflow-hidden tw:rounded-[18px_18px_8px_8px] tw:bg-white/[.97] tw:shadow-[0_24px_60px_rgba(16,24,40,0.3)] tw:backdrop-blur-[16px] tw:dark:border tw:dark:border-[#1f4a47] tw:dark:bg-[rgba(15,36,35,0.98)] tw:dark:shadow-[0_24px_60px_rgba(0,0,0,0.46)] tw:transition-[height,transform,box-shadow] tw:duration-[180ms] tw:will-change-[height,transform] tw:max-[920px]:block tw:max-[920px]:h-[min(42vh,340px)]"
    :class="[
      `is-${sheetState}`,
      themeMode === 'dark' ? 'tw:border-[#1f4a47]! tw:bg-[rgba(15,36,35,0.98)]!' : '',
      sheetState === 'peek' ? 'tw:max-[920px]:h-11 tw:max-[920px]:translate-y-[calc(100%-34px)] tw:max-[920px]:shadow-[0_14px_32px_rgba(16,24,40,0.22)]' : '',
      sheetState === 'half' ? 'tw:max-[920px]:h-[min(42vh,340px)]' : '',
      sheetState === 'full' ? 'tw:max-[920px]:h-[calc(100vh-104px)]' : '',
    ]"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <button
      type="button"
      class="sheet-toggle tw:grid tw:min-h-[34px] tw:w-full tw:place-items-center tw:border-0! tw:bg-transparent! tw:px-0! tw:py-[9px_0_6px]!"
      :aria-expanded="sheetState !== 'peek'"
      :aria-label="sheetState === 'peek' ? 'Expandir painel de monitoramento' : 'Recolher painel de monitoramento'"
      @click="toggleSheet"
    >
      <div class="sheet-handle tw:h-[5px] tw:w-12 tw:rounded-full tw:bg-[#d0d5dd] tw:dark:bg-[#9eb7b4]"></div>
    </button>
    <MonitoringPanel
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
