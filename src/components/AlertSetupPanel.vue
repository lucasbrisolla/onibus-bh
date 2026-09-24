<script setup lang="ts">
import { BellRing, Star } from '@lucide/vue';
import { computed } from 'vue';
import PredictionCards from './PredictionCards.vue';
import type {
  AlertSettings,
  BusVariantFilter,
  NearbyStop,
  Prediction,
  PredictionAlertRequest,
} from '../domain/types';
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
}>();

const emit = defineEmits<{
  update: [settings: AlertSettings];
  selectPrediction: [prediction: Prediction];
  createAlert: [request: PredictionAlertRequest];
  toggleSelectedStopFavorite: [];
  requestPermission: [];
}>();

const is8350 = computed(() => props.settings.lineCode.trim() === '8350');

function update<K extends keyof AlertSettings>(key: K, value: AlertSettings[K]) {
  emit('update', { ...props.settings, [key]: value });
}

function updateLineCode(event: Event) {
  const lineCode = (event.target as HTMLInputElement).value;
  emit('update', {
    ...props.settings,
    lineCode,
    variantFilter: lineCode.trim() === '8350' ? props.settings.variantFilter : 'qualquer',
  });
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
</script>

<template>
  <aside class="monitoring-panel alert-setup-panel">
    <header class="alert-setup-header">
      <div>
        <h2>Receba um aviso antes do ônibus chegar</h2>
        <p>Escolha uma parada e configure somente o que importa para você.</p>
      </div>
      <span class="alert-setup-icon" aria-hidden="true">
        <BellRing />
      </span>
    </header>

    <section v-if="selectedStop" class="alert-stop-summary">
      <div>
        <span class="alert-field-label">Parada selecionada</span>
        <h3>{{ selectedStop.description }}</h3>
        <p>Ponto {{ selectedStop.publicCode || selectedStop.code }}</p>
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
    </section>

    <section v-else class="alert-empty-state" role="status">
      <strong>Escolha uma parada no Mapa</strong>
      <p>Depois que você selecionar um ponto, o alerta poderá ser configurado aqui.</p>
    </section>

    <form v-if="selectedStop" class="alert-setup-form" @submit.prevent>
      <label>
        <span class="alert-field-label">Linha</span>
        <input
          :value="settings.lineCode"
          placeholder="Ex: 8350"
          inputmode="numeric"
          @input="updateLineCode"
        />
      </label>

      <label>
        <span class="alert-field-label">Avisar quando faltar até</span>
        <span class="minutes-input">
          <input
            :value="settings.minutesBefore"
            type="number"
            min="1"
            max="60"
            step="1"
            @input="updateMinutes"
          />
          <span>minutos</span>
        </span>
      </label>

      <label v-if="is8350">
        <span class="alert-field-label">Tipo de trajeto <small>opcional</small></span>
        <select
          :value="settings.variantFilter"
          @change="update('variantFilter', ($event.target as HTMLSelectElement).value as BusVariantFilter)"
        >
          <option value="qualquer">Qualquer 8350</option>
          <option value="direto">Direto</option>
          <option value="nao-direto">Não direto</option>
        </select>
      </label>

      <div class="alert-permission" :class="`is-${permission}`" role="status">
        <template v-if="permission === 'granted'">
          <strong>Notificações permitidas</strong>
          <span>O navegador poderá mostrar o aviso mesmo com outra aba aberta.</span>
        </template>
        <template v-else-if="permission === 'denied'">
          <strong>Notificações bloqueadas</strong>
          <span>Libere a permissão nas configurações do navegador para receber o aviso.</span>
        </template>
        <template v-else-if="permission === 'unsupported'">
          <strong>Notificações indisponíveis</strong>
          <span>Este navegador não permite alertas do sistema.</span>
        </template>
        <template v-else>
          <strong>Permita as notificações para receber o aviso</strong>
          <button type="button" @click="emit('requestPermission')">Permitir notificações</button>
        </template>
      </div>

      <button
        v-if="permission === 'granted'"
        type="button"
        class="primary alert-submit"
        @click="update('enabled', !settings.enabled)"
      >
        <BellRing aria-hidden="true" />
        {{ settings.enabled ? 'Pausar alerta' : 'Ativar alerta' }}
      </button>

      <p class="alert-feedback" role="status">
        {{ isLoading ? 'Atualizando previsões...' : statusMessage }}
      </p>
    </form>

    <section v-if="selectedStop" class="alert-predictions">
      <div class="alert-section-heading">
        <h3>Próximos ônibus</h3>
        <span v-if="lastUpdated">Atualizado às {{ lastUpdated }}</span>
      </div>
      <PredictionCards
        :predictions="predictions"
        :selected-prediction-id="selectedPredictionId"
        :is-loading="isLoading"
        @select-prediction="emit('selectPrediction', $event)"
        @create-alert="emit('createAlert', $event)"
      />
    </section>
  </aside>
</template>
