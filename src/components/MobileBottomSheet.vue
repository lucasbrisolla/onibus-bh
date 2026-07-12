<script setup lang="ts">
import { ref } from 'vue';
import MonitoringPanel from './MonitoringPanel.vue';
import type { AlertSettings, NearbyStop, Prediction } from '../domain/types';
import type { PermissionState } from '../services/notificationService';

const SHEET_GESTURE_ZONE_HEIGHT = 108;
const SWIPE_THRESHOLD_PX = 56;

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
  displayMode?: 'full' | 'predictions-only';
}>();

defineEmits<{
  update: [settings: AlertSettings];
  selectPrediction: [prediction: Prediction];
  toggleSelectedStopFavorite: [];
}>();

const isCollapsed = ref(false);
const sheetElement = ref<HTMLElement | null>(null);
let touchStartY: number | null = null;
let isTrackingGesture = false;

function toggleSheet() {
  isCollapsed.value = !isCollapsed.value;
}

function onTouchStart(event: TouchEvent) {
  const firstTouch = event.touches[0];
  if (!firstTouch) {
    return;
  }

  const sheetTop = sheetElement.value?.getBoundingClientRect().top ?? 0;
  const canStartGesture =
    isCollapsed.value || firstTouch.clientY <= sheetTop + SHEET_GESTURE_ZONE_HEIGHT;

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
    isCollapsed.value = true;
    return;
  }

  if (deltaY < -SWIPE_THRESHOLD_PX) {
    isCollapsed.value = false;
  }
}
</script>

<template>
  <div
    ref="sheetElement"
    class="mobile-bottom-sheet"
    :class="{ 'is-collapsed': isCollapsed }"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <button
      type="button"
      class="sheet-toggle"
      :aria-expanded="!isCollapsed"
      :aria-label="isCollapsed ? 'Expandir painel de monitoramento' : 'Recolher painel de monitoramento'"
      @click="toggleSheet"
    >
      <div class="sheet-handle"></div>
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
      @toggle-selected-stop-favorite="$emit('toggleSelectedStopFavorite')"
    />
  </div>
</template>
