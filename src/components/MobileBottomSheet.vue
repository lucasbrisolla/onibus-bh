<script setup lang="ts">
import MonitoringPanel from './MonitoringPanel.vue';
import type { AlertSettings, NearbyStop, Prediction } from '../domain/types';
import type { PermissionState } from '../services/notificationService';

defineProps<{
  settings: AlertSettings;
  predictions: Prediction[];
  statusMessage: string;
  isLoading: boolean;
  permission: PermissionState;
  lastUpdated: string | null;
  selectedStop: NearbyStop | null;
}>();

defineEmits<{
  update: [settings: AlertSettings];
  requestPermission: [];
  useCurrentLocation: [];
}>();
</script>

<template>
  <div class="mobile-bottom-sheet">
    <div class="sheet-handle"></div>
    <MonitoringPanel
      :settings="settings"
      :predictions="predictions"
      :status-message="statusMessage"
      :is-loading="isLoading"
      :permission="permission"
      :last-updated="lastUpdated"
      :selected-stop="selectedStop"
      @update="$emit('update', $event)"
      @request-permission="$emit('requestPermission')"
      @use-current-location="$emit('useCurrentLocation')"
    />
  </div>
</template>
