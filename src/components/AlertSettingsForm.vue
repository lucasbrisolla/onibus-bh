<script setup lang="ts">
import type { AlertSettings, BusVariantFilter } from '../domain/types';

const props = defineProps<{ settings: AlertSettings }>();
const emit = defineEmits<{ update: [settings: AlertSettings]; requestPermission: [] }>();

function update<K extends keyof AlertSettings>(key: K, value: AlertSettings[K]) {
  emit('update', { ...props.settings, [key]: value });
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
        @input="update('minutesBefore', Number(($event.target as HTMLInputElement).value))"
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
