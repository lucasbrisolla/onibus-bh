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
  <aside class="monitoring-panel alert-setup-panel tw:gap-4!">
    <header class="alert-setup-header tw:grid tw:grid-cols-[minmax(0,1fr)_auto] tw:items-start tw:gap-3">
      <div>
        <h2 class="tw:m-0 tw:text-bh-text tw:text-[1.18rem] tw:leading-[1.25]">
          Receba um aviso antes do ônibus chegar
        </h2>
        <p class="tw:m-0 tw:mt-1.5 tw:text-bh-muted tw:text-[0.84rem] tw:leading-[1.4]">
          Escolha uma parada e configure somente o que importa para você.
        </p>
      </div>
      <span
        class="tw:grid tw:size-[42px] tw:place-items-center tw:rounded-[12px] tw:bg-bh-highlight tw:text-bh-primary-hover"
        aria-hidden="true"
      >
        <BellRing class="tw:size-[21px]" />
      </span>
    </header>

    <section
      v-if="selectedStop"
      class="alert-stop-summary tw:relative tw:grid tw:gap-1.5 tw:rounded-[10px] tw:border tw:border-bh-border-accent tw:bg-bh-surface tw:p-[14px_54px_14px_14px]"
    >
      <div>
        <span class="alert-field-label tw:text-bh-primary tw:text-[0.72rem] tw:font-black tw:tracking-normal tw:uppercase">
          Parada selecionada
        </span>
        <h3 class="tw:m-0 tw:text-bh-title tw:text-[0.98rem] tw:leading-[1.35]">{{ selectedStop.description }}</h3>
        <p class="tw:m-0 tw:text-bh-primary-hover tw:text-[0.84rem] tw:font-bold">
          Ponto {{ selectedStop.publicCode || selectedStop.code }}
        </p>
      </div>
      <button
        type="button"
        class="favorite-stop-button tw:absolute tw:right-2.5 tw:top-2.5 tw:grid tw:size-[34px] tw:place-items-center tw:rounded-full tw:border tw:border-[rgba(13,148,136,0.18)] tw:bg-[rgba(13,148,136,0.08)] tw:p-0 tw:text-bh-primary tw:transition-colors tw:duration-[160ms]"
        :aria-label="isSelectedStopFavorite ? 'Remover dos favoritos' : 'Salvar parada'"
        :title="isSelectedStopFavorite ? 'Remover dos favoritos' : 'Salvar parada'"
        :data-active="isSelectedStopFavorite"
        @click="emit('toggleSelectedStopFavorite')"
      >
        <Star aria-hidden="true" />
      </button>
    </section>

    <section
      v-else
      class="alert-empty-state tw:grid tw:gap-[5px] tw:rounded-[10px] tw:border tw:border-dashed tw:border-bh-border-accent tw:bg-bh-surface tw:p-4 tw:text-bh-primary-hover"
      role="status"
    >
      <strong>Escolha uma parada no Mapa</strong>
      <p class="tw:m-0 tw:text-bh-copy tw:text-[0.82rem] tw:leading-[1.4]">
        Depois que você selecionar um ponto, o alerta poderá ser configurado aqui.
      </p>
    </section>

    <form
      v-if="selectedStop"
      class="alert-setup-form tw:grid tw:gap-3.5 tw:rounded-[10px] tw:border tw:border-bh-border tw:bg-white tw:p-4 tw:shadow-[0_10px_30px_rgba(16,24,40,0.05)]"
      @submit.prevent
    >
      <label class="tw:gap-1.5">
        <span class="alert-field-label tw:text-bh-primary tw:text-[0.72rem] tw:font-black tw:tracking-normal tw:uppercase">
          Linha
        </span>
        <input
          :value="settings.lineCode"
          placeholder="Ex: 8350"
          inputmode="numeric"
          @input="updateLineCode"
        />
      </label>

      <label class="tw:gap-1.5">
        <span class="alert-field-label tw:text-bh-primary tw:text-[0.72rem] tw:font-black tw:tracking-normal tw:uppercase">
          Avisar quando faltar até
        </span>
        <span class="minutes-input tw:grid tw:grid-cols-[minmax(0,120px)_auto] tw:items-center tw:gap-2.5 tw:text-[#344054] tw:text-[0.88rem] tw:font-bold">
          <input
            class="tw:w-[120px]!"
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

      <label v-if="is8350" class="tw:gap-1.5">
        <span class="alert-field-label tw:text-bh-primary tw:text-[0.72rem] tw:font-black tw:tracking-normal tw:uppercase">
          Tipo de trajeto
          <small class="tw:text-bh-muted tw:text-[0.76rem] tw:font-bold tw:normal-case">opcional</small>
        </span>
        <select
          :value="settings.variantFilter"
          @change="update('variantFilter', ($event.target as HTMLSelectElement).value as BusVariantFilter)"
        >
          <option value="qualquer">Qualquer 8350</option>
          <option value="direto">Direto</option>
          <option value="nao-direto">Não direto</option>
        </select>
      </label>

      <div
        class="alert-permission tw:grid tw:gap-[3px] tw:rounded-[8px] tw:bg-bh-surface tw:p-[10px_12px] tw:text-bh-primary-hover tw:text-[0.78rem] tw:leading-[1.35]"
        :class="`is-${permission}`"
        role="status"
      >
        <template v-if="permission === 'granted'">
          <strong class="tw:text-[0.82rem]">Notificações permitidas</strong>
          <span class="tw:text-bh-copy">O navegador poderá mostrar o aviso mesmo com outra aba aberta.</span>
        </template>
        <template v-else-if="permission === 'denied'">
          <strong class="tw:text-[0.82rem]">Notificações bloqueadas</strong>
          <span class="tw:text-bh-copy">Libere a permissão nas configurações do navegador para receber o aviso.</span>
        </template>
        <template v-else-if="permission === 'unsupported'">
          <strong class="tw:text-[0.82rem]">Notificações indisponíveis</strong>
          <span class="tw:text-bh-copy">Este navegador não permite alertas do sistema.</span>
        </template>
        <template v-else>
          <strong class="tw:text-[0.82rem]">Permita as notificações para receber o aviso</strong>
          <button
            type="button"
            class="tw:justify-self-start tw:mt-1"
            @click="emit('requestPermission')"
          >
            Permitir notificações
          </button>
        </template>
      </div>

      <button
        v-if="permission === 'granted'"
        type="button"
        class="primary alert-submit tw:inline-flex tw:w-full tw:items-center tw:justify-center tw:gap-2"
        @click="update('enabled', !settings.enabled)"
      >
        <BellRing class="tw:size-[17px]" aria-hidden="true" />
        {{ settings.enabled ? 'Pausar alerta' : 'Ativar alerta' }}
      </button>

      <p class="alert-feedback tw:m-0 tw:text-bh-muted tw:text-[0.78rem] tw:leading-[1.35]" role="status">
        {{ isLoading ? 'Atualizando previsões...' : statusMessage }}
      </p>
    </form>

    <section
      v-if="selectedStop"
      class="alert-predictions tw:grid tw:gap-2 tw:border-t tw:border-bh-border tw:pt-3.5"
    >
      <div class="alert-section-heading tw:flex tw:items-baseline tw:justify-between tw:gap-2.5">
        <h3 class="tw:m-0 tw:text-bh-text tw:text-[0.98rem]">Próximos ônibus</h3>
        <span v-if="lastUpdated" class="tw:m-0 tw:whitespace-nowrap tw:text-bh-muted tw:text-[0.72rem]">
          Atualizado às {{ lastUpdated }}
        </span>
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
