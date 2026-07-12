<script setup lang="ts">
import { ref } from 'vue';
import MonitoringPanel from './MonitoringPanel.vue';
import type { AlertSettings, NearbyStop, Prediction } from '../domain/types';
import type { PermissionState } from '../services/notificationService';

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
let touchStartY: number | null = null;

function toggleSheet() {
  isCollapsed.value = !isCollapsed.value;
}

function onTouchStart(event: TouchEvent) {
  touchStartY = event.touches[0]?.clientY ?? null;
}

function onTouchEnd(event: TouchEvent) {
  if (touchStartY === null) {
    return;
  }

  const touchEndY = event.changedTouches[0]?.clientY ?? touchStartY;
  const deltaY = touchEndY - touchStartY;
  touchStartY = null;

  if (deltaY > 40) {
    isCollapsed.value = true;
    return;
  }

  if (deltaY < -40) {
    isCollapsed.value = false;
  }
}
</script>

<template>
  <div
    class="mobile-bottom-sheet"
    :class="{ 'is-collapsed': isCollapsed }"
  >
    <button
      type="button"
      class="sheet-toggle"
      :aria-expanded="!isCollapsed"
      :aria-label="isCollapsed ? 'Expandir painel de monitoramento' : 'Recolher painel de monitoramento'"
      @click="toggleSheet"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
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
