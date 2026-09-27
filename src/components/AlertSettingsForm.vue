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
  <form class="panel form-grid tw:grid tw:gap-3.5 tw:rounded-[10px] tw:border tw:border-bh-border tw:bg-white tw:p-4 tw:shadow-[0_10px_30px_rgba(16,24,40,0.05)] tw:dark:border-[#1f4a47] tw:dark:bg-[#132f2d] tw:dark:text-[#e5e7eb]" @submit.prevent>
    <label class="tw:gap-1.5 tw:dark:text-[#9eb7b4]">
      Código da parada
        <input
          class="tw:dark:border-[#28514d] tw:dark:bg-[#0f2423] tw:dark:text-[#e5e7eb]"
        :value="settings.stopCode"
        inputmode="numeric"
        placeholder="Ex: 1234"
        @input="update('stopCode', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <label class="tw:gap-1.5 tw:dark:text-[#9eb7b4]">
      Linha
        <input
          class="tw:dark:border-[#28514d] tw:dark:bg-[#0f2423] tw:dark:text-[#e5e7eb]"
        :value="settings.lineCode"
        placeholder="Ex: 8350"
        @input="update('lineCode', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <label class="tw:gap-1.5 tw:dark:text-[#9eb7b4]">
      Variante da 8350
      <select
        class="tw:dark:border-[#28514d] tw:dark:bg-[#0f2423] tw:dark:text-[#e5e7eb]"
        :value="settings.variantFilter"
        @change="update('variantFilter', ($event.target as HTMLSelectElement).value as BusVariantFilter)"
      >
        <option value="qualquer">Qualquer 8350</option>
        <option value="direto">Somente Direto</option>
        <option value="nao-direto">Somente Não Direto</option>
      </select>
    </label>

    <label class="tw:gap-1.5 tw:dark:text-[#9eb7b4]">
      Avisar quando faltar até
        <input
          class="tw:dark:border-[#28514d] tw:dark:bg-[#0f2423] tw:dark:text-[#e5e7eb]"
        :value="settings.minutesBefore"
        type="number"
        min="1"
        max="60"
        step="1"
        @input="updateMinutes"
      />
    </label>

    <div class="actions tw:flex tw:flex-wrap tw:gap-2">
      <button type="button" class="primary tw:border-bh-primary tw:bg-bh-primary tw:text-white tw:dark:border-[#2dd4bf] tw:dark:bg-[#2dd4bf] tw:dark:text-[#082f2b]" @click="update('enabled', !settings.enabled)">
        {{ settings.enabled ? 'Pausar monitoramento' : 'Ativar monitoramento' }}
      </button>
      <button type="button" class="tw:dark:border-[#28514d] tw:dark:bg-[#0f2423] tw:dark:text-[#e5e7eb]" @click="emit('requestPermission')">Permitir notificações</button>
    </div>
  </form>
</template>
