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

  <aside
    v-else
    class="monitoring-panel tw:grid tw:content-start tw:gap-3 tw:overflow-y-auto tw:border-r tw:border-bh-border tw:bg-white tw:p-[18px] tw:dark:border-[#1f4a47] tw:dark:bg-[#132f2d] tw:dark:text-[#e5e7eb] tw:max-[920px]:min-h-0 tw:max-[920px]:max-h-[calc(100%-34px)] tw:max-[920px]:border-r-0 tw:max-[920px]:p-[6px_8px_10px]"
  >
    <section
      v-if="selectedStop"
      class="control-card tw:grid tw:gap-3 tw:rounded-[8px] tw:border tw:border-bh-border tw:bg-white tw:p-4 tw:shadow-[0_10px_30px_rgba(16,24,40,0.05)] tw:dark:border-[#1f4a47] tw:dark:bg-[#132f2d] tw:dark:text-[#e5e7eb] tw:max-[920px]:gap-2 tw:max-[920px]:p-[9px]"
    >
      <article
        class="selected-stop-card tw:relative tw:grid tw:gap-1.5 tw:rounded-[8px] tw:border tw:border-bh-border-accent tw:bg-bh-surface tw:p-[12px_54px_12px_12px] tw:dark:border-[#134e4a] tw:dark:bg-[#134e4a] tw:max-[920px]:gap-1 tw:max-[920px]:p-[8px_44px_8px_8px]"
      >
        <button
          type="button"
          class="favorite-stop-button tw:absolute tw:right-2.5 tw:top-2.5 tw:grid tw:size-[34px] tw:place-items-center tw:rounded-full tw:border tw:border-[rgba(13,148,136,0.18)] tw:bg-[rgba(13,148,136,0.08)] tw:p-0 tw:text-bh-primary tw:transition-colors tw:duration-[160ms] tw:hover:bg-[rgba(13,148,136,0.14)] tw:dark:border-[rgba(94,234,212,0.18)] tw:dark:bg-[rgba(45,212,191,0.08)] tw:dark:text-[#5eead4] tw:dark:hover:bg-[rgba(45,212,191,0.14)] tw:max-[920px]:size-[30px]"
          :class="isSelectedStopFavorite ? 'tw:border-[rgba(245,158,11,0.28)] tw:bg-[rgba(245,158,11,0.14)] tw:text-[#d97706] tw:dark:border-[rgba(251,191,36,0.28)] tw:dark:bg-[rgba(245,158,11,0.16)] tw:dark:text-[#fbbf24]' : ''"
          :aria-label="isSelectedStopFavorite ? 'Remover dos favoritos' : 'Salvar parada'"
          :title="isSelectedStopFavorite ? 'Remover dos favoritos' : 'Salvar parada'"
          :data-active="isSelectedStopFavorite"
          @click="emit('toggleSelectedStopFavorite')"
        >
          <Star class="tw:size-4" :class="isSelectedStopFavorite ? 'tw:fill-current' : ''" aria-hidden="true" />
        </button>
        <h3 class="tw:m-0 tw:text-bh-title tw:text-[1rem] tw:leading-[1.35] tw:dark:text-[#f9fafb] tw:max-[920px]:text-[0.92rem] tw:max-[920px]:leading-[1.28]">{{ selectedStop.description }}</h3>
        <p class="tw:m-0 tw:text-bh-primary-hover tw:text-[0.9rem] tw:font-bold tw:dark:text-[#5eead4] tw:max-[920px]:text-[0.82rem]">
          Ponto {{ selectedStop.publicCode || selectedStop.code }}
        </p>
      </article>
    </section>

    <section class="collapse-section tw:grid tw:gap-2">
      <button
        type="button"
        class="collapse-toggle tw:flex tw:items-center tw:justify-between tw:rounded-[8px] tw:border tw:border-[#dbe4ee] tw:bg-[#f8fafc] tw:px-3.5 tw:py-3 tw:text-[.92rem] tw:font-extrabold tw:text-bh-text tw:shadow-[0_8px_24px_rgba(16,24,40,0.04)] tw:transition-colors tw:duration-[160ms] tw:hover:bg-[#f2f4f7] tw:dark:border-[#1f4a47] tw:dark:bg-[#132f2d] tw:dark:text-[#e5e7eb] tw:dark:hover:bg-[#163735] tw:max-[920px]:min-h-[34px] tw:max-[920px]:px-2.5 tw:max-[920px]:py-2"
        :aria-expanded="collapsedSections.predictions"
        @click="toggleSection('predictions')"
      >
        <span class="collapse-toggle-label tw:inline-flex tw:min-w-0 tw:items-center tw:gap-2">
          <span>Próximos ônibus</span>
          <span
            v-if="predictions.length > 0"
            class="prediction-count tw:inline-grid tw:size-[1.35rem] tw:min-w-[1.35rem] tw:place-items-center tw:rounded-full tw:bg-bh-highlight tw:text-bh-primary-hover tw:text-[0.72rem] tw:leading-none tw:dark:bg-[#134e4a] tw:dark:text-[#99f6e4] tw:[font-variant-numeric:tabular-nums]"
          >
            {{ predictions.length }}
          </span>
        </span>
        <component
          :is="collapsedSections.predictions ? ChevronUp : ChevronDown"
          class="tw:size-[18px] tw:shrink-0 tw:stroke-[2.2]"
          aria-hidden="true"
        />
      </button>
      <div v-show="collapsedSections.predictions" class="collapse-body tw:grid tw:gap-2.5">
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
