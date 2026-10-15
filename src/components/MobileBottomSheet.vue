<script setup lang="ts">
import MonitoringPanel from './MonitoringPanel.vue';
import type { AlertSettings, NearbyStop, Prediction, PredictionAlertRequest } from '../domain/types';
import type { PermissionState } from '../services/notificationService';
import MobilePanelSheet from './MobilePanelSheet.vue';

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
</script>

<template>
  <MobilePanelSheet class="mobile-bottom-sheet" panel-name="de monitoramento" :theme-mode="themeMode">
    <MonitoringPanel
      class="tw:max-[920px]:min-h-0"
      :theme-mode="themeMode"
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
  </MobilePanelSheet>
</template>
