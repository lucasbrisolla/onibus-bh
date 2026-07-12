<script setup lang="ts">
import { BellRing, ChevronDown, ChevronUp, MapPinned, Star } from '@lucide/vue';
import { reactive, watch } from 'vue';
import PredictionCards from './PredictionCards.vue';
import type { AlertSettings, BusVariantFilter, NearbyStop, Prediction } from '../domain/types';
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
  toggleSelectedStopFavorite: [];
}>();

const collapsedSections = reactive({
  predictions: false,
  settings: false,
  controls: false,
  status: false,
});

function update<K extends keyof AlertSettings>(key: K, value: AlertSettings[K]) {
  emit('update', { ...props.settings, [key]: value });
}

function toggleSection(section: keyof typeof collapsedSections) {
  collapsedSections[section] = !collapsedSections[section];
}

function normalizeMinutes(value: string): number {
  const parsed = Math.trunc(Number(value));

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.min(60, Math.max(1, parsed));
}

function updateMinutes(event: Event) {
  const input = event.target as HTMLInputElement;
  const minutes = normalizeMinutes(input.value);
  input.value = String(minutes);
  update('minutesBefore', minutes);
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
  <aside class="monitoring-panel">
    <section v-if="selectedStop" class="control-card">
      <article class="selected-stop-card">
        <div class="selected-stop-header">
          <div class="selected-stop-heading">
            <span class="selected-stop-icon" aria-hidden="true">
              <MapPinned />
            </span>
            <span class="section-kicker">Ponto selecionado</span>
          </div>
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
        </div>
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
        <span>Próximos ônibus</span>
        <component :is="collapsedSections.predictions ? ChevronUp : ChevronDown" aria-hidden="true" />
      </button>
      <div v-show="collapsedSections.predictions" class="collapse-body">
        <PredictionCards
          :predictions="predictions"
          :selected-prediction-id="selectedPredictionId"
          @select-prediction="emit('selectPrediction', $event)"
        />
      </div>
    </section>

    <section v-if="displayMode !== 'predictions-only'" class="collapse-section">
      <button
        type="button"
        class="collapse-toggle"
        :aria-expanded="collapsedSections.settings"
        @click="toggleSection('settings')"
      >
        <span>Configuração do monitoramento</span>
        <component :is="collapsedSections.settings ? ChevronUp : ChevronDown" aria-hidden="true" />
      </button>
      <div v-show="collapsedSections.settings" class="collapse-body">
        <section class="control-card">
          <label>
            <span>Parada monitorada</span>
            <small>Código da parada</small>
            <input
              :value="settings.stopCode"
              inputmode="numeric"
              placeholder="Ex: 1234"
              @input="update('stopCode', ($event.target as HTMLInputElement).value)"
            />
          </label>

          <label>
            <span>Linha monitorada</span>
            <input
              :value="settings.lineCode"
              placeholder="Ex: 8350"
              @input="update('lineCode', ($event.target as HTMLInputElement).value)"
            />
          </label>

          <label>
            <span>Variante da 8350</span>
            <select
              :value="settings.variantFilter"
              @change="update('variantFilter', ($event.target as HTMLSelectElement).value as BusVariantFilter)"
            >
              <option value="qualquer">Qualquer 8350</option>
              <option value="direto">Somente Direto</option>
              <option value="nao-direto">Somente Não Direto</option>
            </select>
          </label>

          <label>
            <span>Avisar quando faltar até</span>
            <input
              :value="settings.minutesBefore"
              type="number"
              min="1"
              max="60"
              step="1"
              @input="updateMinutes"
            />
          </label>
        </section>
      </div>
    </section>

    <section v-if="displayMode !== 'predictions-only'" class="collapse-section">
      <button
        type="button"
        class="collapse-toggle"
        :aria-expanded="collapsedSections.controls"
        @click="toggleSection('controls')"
      >
        <span>Controles do monitoramento</span>
        <component :is="collapsedSections.controls ? ChevronUp : ChevronDown" aria-hidden="true" />
      </button>
      <div v-show="collapsedSections.controls" class="collapse-body">
        <div class="active-indicator" :class="{ 'is-paused': !settings.enabled }">
          <span></span>
          {{ settings.enabled ? 'Monitoramento ativo' : 'Monitoramento pausado' }}
        </div>

        <section class="toggle-card">
          <span class="bell-icon" aria-hidden="true">
            <BellRing />
          </span>
          <div class="toggle-copy">
            <strong>Monitoramento</strong>
            <span>{{ settings.enabled ? 'Ativo no momento' : 'Pausado no momento' }}</span>
          </div>
          <button type="button" class="switch-button" @click="update('enabled', !settings.enabled)">
            {{ settings.enabled ? 'Pausar monitoramento' : 'Ativar monitoramento' }}
          </button>
        </section>

      </div>
    </section>

    <section v-if="displayMode !== 'predictions-only'" class="collapse-section">
      <button
        type="button"
        class="collapse-toggle"
        :aria-expanded="collapsedSections.status"
        @click="toggleSection('status')"
      >
        <span>Status do monitoramento</span>
        <component :is="collapsedSections.status ? ChevronUp : ChevronDown" aria-hidden="true" />
      </button>
      <div v-show="collapsedSections.status" class="collapse-body">
        <section class="status-card">
          <span class="section-kicker">Status</span>
          <p>{{ isLoading ? 'Consultando previsões...' : statusMessage }}</p>
          <div class="status-meta">
            <span>Notificações: {{ permission }}</span>
            <span>Última atualização: {{ lastUpdated ?? 'Ainda não consultou' }}</span>
          </div>
        </section>
      </div>
    </section>
  </aside>
</template>
