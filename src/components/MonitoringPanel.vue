<script setup lang="ts">
import PredictionCards from './PredictionCards.vue';
import type { AlertSettings, BusVariantFilter, Prediction } from '../domain/types';
import type { PermissionState } from '../services/notificationService';

const props = defineProps<{
  settings: AlertSettings;
  predictions: Prediction[];
  statusMessage: string;
  isLoading: boolean;
  permission: PermissionState;
  lastUpdated: string | null;
}>();

const emit = defineEmits<{
  update: [settings: AlertSettings];
  requestPermission: [];
  useCurrentLocation: [];
}>();

function update<K extends keyof AlertSettings>(key: K, value: AlertSettings[K]) {
  emit('update', { ...props.settings, [key]: value });
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
  <aside class="monitoring-panel">
    <div class="panel-heading">
      <p class="section-kicker">Ônibus BH</p>
      <h1>Alerta pessoal de chegada</h1>
    </div>

    <div class="active-indicator" :class="{ 'is-paused': !settings.enabled }">
      <span></span>
      {{ settings.enabled ? 'Monitoramento ativo' : 'Monitoramento pausado' }}
    </div>

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

    <section class="toggle-card">
      <span class="bell-icon">⌁</span>
      <strong>Monitoramento ativo</strong>
      <button type="button" class="switch-button" @click="update('enabled', !settings.enabled)">
        {{ settings.enabled ? 'Pausar monitoramento' : 'Ativar monitoramento' }}
      </button>
    </section>

    <div class="panel-actions">
      <button type="button" class="primary" @click="emit('requestPermission')">
        Permitir notificações
      </button>
      <button type="button" @click="emit('useCurrentLocation')">Usar localização</button>
    </div>

    <section class="status-card">
      <span class="section-kicker">Status</span>
      <p>{{ isLoading ? 'Consultando previsões...' : statusMessage }}</p>
      <div class="status-meta">
        <span>Notificações: {{ permission }}</span>
        <span>Última atualização: {{ lastUpdated ?? 'Ainda não consultou' }}</span>
      </div>
    </section>

    <PredictionCards :predictions="predictions" />
  </aside>
</template>
