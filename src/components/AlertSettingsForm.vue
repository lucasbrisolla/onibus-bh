<script setup lang="ts">
import type { AlertSettings, BusVariantFilter } from '../domain/types';

const props = defineProps<{ settings: AlertSettings }>();
const emit = defineEmits<{ update: [settings: AlertSettings]; requestPermission: [] }>();

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
  <form class="panel form-grid" @submit.prevent>
    <label>
      Código da parada
      <input
        :value="settings.stopCode"
        inputmode="numeric"
        placeholder="Ex: 1234"
        @input="update('stopCode', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <label>
      Linha
      <input
        :value="settings.lineCode"
        placeholder="Ex: 8350"
        @input="update('lineCode', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <label>
      Variante da 8350
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
      Avisar quando faltar até
      <input
        :value="settings.minutesBefore"
        type="number"
        min="1"
        max="60"
        step="1"
        @input="updateMinutes"
      />
    </label>

    <div class="actions">
      <button type="button" class="primary" @click="update('enabled', !settings.enabled)">
        {{ settings.enabled ? 'Pausar monitoramento' : 'Ativar monitoramento' }}
      </button>
      <button type="button" @click="emit('requestPermission')">Permitir notificações</button>
    </div>
  </form>
</template>
