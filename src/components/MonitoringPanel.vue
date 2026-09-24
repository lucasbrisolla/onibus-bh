<script setup lang="ts">
import { ChevronDown, ChevronUp, Star } from '@lucide/vue';
import { reactive, watch } from 'vue';
import AlertSetupPanel from './AlertSetupPanel.vue';
import PredictionCards from './PredictionCards.vue';
import type { AlertSettings, NearbyStop, Prediction, PredictionAlertRequest } from '../domain/types';
import type { PermissionState } from '../services/notificationService';

const props = defineProps<{
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

const emit = defineEmits<{
  update: [settings: AlertSettings];
  selectPrediction: [prediction: Prediction];
  createAlert: [request: PredictionAlertRequest];
  toggleSelectedStopFavorite: [];
  requestPermission: [];
}>();

const collapsedSections = reactive({
  predictions: false,
});

function toggleSection(section: keyof typeof collapsedSections) {
  collapsedSections[section] = !collapsedSections[section];
}

watch(
  () => [props.selectedStop?.code ?? null, props.predictions.length] as const,
  ([stopCode, predictionCount], [previousStopCode, previousPredictionCount]) => {
    const hasNewStop = stopCode !== null && stopCode !== previousStopCode;
    const hasFreshPredictions = predictionCount > 0 && previousPredictionCount === 0;

    if (hasNewStop || hasFreshPredictions) {
      collapsedSections.predictions = true;
    }
  },
);
</script>

<template>
  <AlertSetupPanel
    v-if="displayMode !== 'predictions-only'"
    :settings="settings"
    :predictions="predictions"
    :selected-prediction-id="selectedPredictionId"
    :status-message="statusMessage"
    :is-loading="isLoading"
    :permission="permission"
    :last-updated="lastUpdated"
    :selected-stop="selectedStop"
    :is-selected-stop-favorite="isSelectedStopFavorite"
    @update="emit('update', $event)"
    @select-prediction="emit('selectPrediction', $event)"
    @create-alert="emit('createAlert', $event)"
    @toggle-selected-stop-favorite="emit('toggleSelectedStopFavorite')"
    @request-permission="emit('requestPermission')"
  />

  <aside v-else class="monitoring-panel">
    <section v-if="selectedStop" class="control-card">
      <article class="selected-stop-card">
        <button
          type="button"
          class="favorite-stop-button"
          :aria-label="isSelectedStopFavorite ? 'Remover dos favoritos' : 'Salvar parada'"
          :title="isSelectedStopFavorite ? 'Remover dos favoritos' : 'Salvar parada'"
          :data-active="isSelectedStopFavorite"
          @click="emit('toggleSelectedStopFavorite')"
        >
          <Star aria-hidden="true" />
        </button>
        <h3>{{ selectedStop.description }}</h3>
        <p>Ponto {{ selectedStop.publicCode || selectedStop.code }}</p>
      </article>
    </section>

    <section class="collapse-section">
      <button
        type="button"
        class="collapse-toggle"
        :aria-expanded="collapsedSections.predictions"
        @click="toggleSection('predictions')"
      >
        <span class="collapse-toggle-label">
          <span>Próximos ônibus</span>
          <span v-if="predictions.length > 0" class="prediction-count">
            {{ predictions.length }}
          </span>
        </span>
        <component :is="collapsedSections.predictions ? ChevronUp : ChevronDown" aria-hidden="true" />
      </button>
      <div v-show="collapsedSections.predictions" class="collapse-body">
        <PredictionCards
          :predictions="predictions"
          :selected-prediction-id="selectedPredictionId"
          :is-loading="isLoading"
          @select-prediction="emit('selectPrediction', $event)"
          @create-alert="emit('createAlert', $event)"
        />
      </div>
    </section>

  </aside>
</template>
