<script setup lang="ts">
import { BellRing, Minus, Plus, Star } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { formatStopDescription } from './stopPresentation';
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

const selectedStopPresentation = computed(() => (
  props.selectedStop ? formatStopDescription(props.selectedStop.description) : null
));
const isEditingSettings = ref(false);
const visibleStatusMessage = computed(() => (
  props.statusMessage === 'Monitoramento pausado.' ? '' : props.statusMessage
));

const emit = defineEmits<{
  update: [settings: AlertSettings];
  selectPrediction: [prediction: Prediction];
  createAlert: [request: PredictionAlertRequest];
  toggleSelectedStopFavorite: [];
  requestPermission: [];
  startMonitoring: [];
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

watch(
  () => props.selectedStop?.code ?? null,
  () => {
    isEditingSettings.value = false;
  },
);

function normalizeMinutes(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(60, Math.max(1, Math.trunc(value)));
}

function updateMinutes(value: number) {
  update('minutesBefore', normalizeMinutes(value));
}
</script>

<template>
  <aside class="monitoring-panel alert-setup-panel tw:grid tw:content-start tw:gap-4 tw:overflow-y-auto tw:border-r tw:border-bh-border tw:bg-white tw:p-[18px] tw:dark:border-[#1f4a47] tw:dark:bg-bh-surface-2 tw:dark:text-[#e5e7eb] tw:max-[920px]:gap-3 tw:max-[920px]:border-r-0 tw:max-[920px]:p-[14px_12px_82px]">
    <header class="alert-setup-header tw:grid tw:grid-cols-[minmax(0,1fr)_auto] tw:items-start tw:gap-3">
      <div>
        <h2 class="tw:m-0 tw:text-bh-text tw:text-[1.18rem] tw:leading-[1.25] tw:dark:text-[#f9fafb] tw:max-[920px]:text-[1rem]">
          Receba um aviso antes do ônibus chegar
        </h2>
        <p class="tw:m-0 tw:mt-1.5 tw:text-bh-muted tw:text-[0.84rem] tw:leading-[1.4] tw:dark:text-[#9eb7b4] tw:max-[920px]:text-[0.74rem]">
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
      class="alert-stop-summary tw:relative tw:grid tw:gap-1.5 tw:rounded-[10px] tw:border tw:border-bh-border-accent tw:bg-bh-surface tw:p-[14px_60px_14px_14px] tw:dark:border-[#28514d] tw:dark:bg-bh-surface-inset tw:max-[920px]:p-[10px_60px_10px_10px]"
    >
      <div>
        <span class="alert-field-label tw:text-bh-primary tw:text-[0.72rem] tw:font-black tw:tracking-normal tw:uppercase">
          Parada selecionada
        </span>
        <h3 class="tw:m-0 tw:pr-2 tw:text-bh-title tw:text-[0.98rem] tw:leading-[1.35] tw:dark:text-[#f9fafb]">{{ selectedStopPresentation?.name }}</h3>
        <p v-if="selectedStopPresentation?.addressNumber" class="tw:m-0 tw:text-[#475467] tw:text-[0.8rem] tw:font-medium tw:dark:text-[#c7d7d4]">
          Nº {{ selectedStopPresentation.addressNumber }}
        </p>
        <p class="tw:m-0 tw:text-bh-primary-hover tw:text-[0.84rem] tw:font-bold tw:dark:text-[#5eead4]">
          Ponto {{ selectedStop.publicCode || selectedStop.code }}
        </p>
      </div>
      <button
        type="button"
        class="favorite-stop-button tw:absolute tw:right-2 tw:top-2 tw:grid tw:size-11 tw:min-h-11 tw:min-w-11 tw:place-items-center tw:rounded-full tw:border tw:border-[var(--bh-accent-16)] tw:bg-[var(--bh-accent-08)] tw:p-0 tw:text-bh-accent tw:transition-colors tw:duration-[160ms] tw:hover:bg-[var(--bh-accent-16)] tw:dark:border-[var(--bh-focus-16)] tw:dark:bg-[var(--bh-mint-08)] tw:dark:text-[#5eead4] tw:dark:hover:bg-[var(--bh-mint-16)]"
        :class="isSelectedStopFavorite ? 'tw:border-[#d97706] tw:bg-[#fff7ed] tw:text-[#d97706] tw:dark:border-[#fbbf24] tw:dark:bg-[#3b2410] tw:dark:text-[#fbbf24]' : ''"
        :aria-label="isSelectedStopFavorite ? 'Remover dos favoritos' : 'Salvar parada'"
        :title="isSelectedStopFavorite ? 'Remover dos favoritos' : 'Salvar parada'"
        :data-active="isSelectedStopFavorite"
        @click="emit('toggleSelectedStopFavorite')"
      >
        <Star class="tw:size-4" :class="isSelectedStopFavorite ? 'tw:fill-current' : ''" aria-hidden="true" />
      </button>
    </section>

    <section
      v-else
      class="alert-empty-state tw:grid tw:gap-[5px] tw:rounded-[10px] tw:border tw:border-dashed tw:border-bh-border-accent tw:bg-bh-surface tw:p-4 tw:text-bh-primary-hover tw:dark:border-[#28514d] tw:dark:bg-[#134e4a] tw:dark:text-[#99f6e4] tw:max-[920px]:p-2.5"
      role="status"
    >
      <strong>Escolha uma parada no Mapa</strong>
      <p class="tw:m-0 tw:text-bh-copy tw:text-[0.82rem] tw:leading-[1.4] tw:dark:text-[#9eb7b4]">
        Depois que você selecionar um ponto, o alerta poderá ser configurado aqui.
      </p>
    </section>

    <div
      v-if="selectedStop"
      class="alert-permission tw:flex tw:items-center tw:gap-2 tw:rounded-[8px] tw:bg-[#f0fdfa] tw:px-3 tw:py-2 tw:text-[#0f766e] tw:text-[0.76rem] tw:leading-[1.35] tw:dark:bg-[#134e4a] tw:dark:text-[#99f6e4]"
      :class="[
        `is-${permission}`,
        permission === 'denied' ? 'tw:bg-[#fff7ed] tw:text-[#9a3412] tw:dark:bg-[#431f13] tw:dark:text-[#fdba74]' : '',
        permission === 'unsupported' ? 'tw:bg-[#f2f4f7] tw:text-[#475467] tw:dark:bg-bh-surface-inset tw:dark:text-[#c7d7d4]' : '',
      ]"
      role="group"
      aria-label="Permissão para notificações"
    >
      <span
        class="tw:size-2 tw:flex-none tw:rounded-full tw:bg-current"
        :class="permission === 'granted' ? 'tw:animate-pulse tw:motion-reduce:animate-none' : ''"
        aria-hidden="true"
      ></span>
      <p class="tw:m-0 tw:min-w-0 tw:flex-1" role="status" aria-live="polite">
        <template v-if="permission === 'granted'">Notificações permitidas.</template>
        <template v-else-if="permission === 'denied'">Bloqueadas. No ícone ao lado do endereço, abra as permissões do site e ative notificações.</template>
        <template v-else-if="permission === 'unsupported'">Este navegador não oferece notificações do sistema.</template>
        <template v-else>Ative notificações para receber avisos fora do app.</template>
      </p>
      <button
        v-if="permission === 'default'"
        type="button"
        class="tw:min-h-10 tw:shrink-0 tw:rounded-md tw:border-0 tw:bg-transparent tw:px-2 tw:font-extrabold tw:text-[#0f766e] tw:underline tw:underline-offset-2 tw:hover:text-[#115e59] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-bh-accent tw:dark:focus-visible:outline-[#5eead4] tw:dark:text-[#99f6e4] tw:dark:hover:text-white"
        @click="emit('requestPermission')"
      >
        Permitir
      </button>
    </div>

    <section
      v-if="selectedStop"
      class="alert-settings-summary tw:grid tw:grid-cols-[minmax(0,1fr)_auto] tw:items-center tw:gap-2 tw:rounded-[10px] tw:border tw:border-bh-border tw:bg-white tw:px-3 tw:py-2.5 tw:dark:border-[#1f4a47] tw:dark:bg-bh-surface-2"
    >
      <p class="tw:m-0 tw:min-w-0 tw:text-[0.88rem] tw:leading-[1.35] tw:text-bh-text tw:dark:text-[#e5e7eb]">
        <strong class="tw:font-extrabold">Linha {{ settings.lineCode.trim() || '—' }}</strong>
        <span class="tw:text-bh-muted tw:dark:text-[#c7d7d4]"> · avisar com {{ settings.minutesBefore }} min</span>
        <span v-if="is8350 && settings.variantFilter !== 'qualquer'" class="tw:text-bh-muted tw:dark:text-[#c7d7d4]"> · {{ settings.variantFilter === 'direto' ? 'Direto' : 'Não direto' }}</span>
      </p>
      <button
        type="button"
        class="tw:min-h-10 tw:rounded-md tw:border-0 tw:bg-transparent tw:px-2.5 tw:font-bold tw:text-bh-primary-hover tw:underline tw:underline-offset-2 tw:hover:text-bh-primary tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-bh-accent tw:dark:focus-visible:outline-[#5eead4] tw:dark:text-[#5eead4] tw:dark:hover:text-white"
        :aria-expanded="isEditingSettings"
        aria-controls="alert-settings-form"
        @click="isEditingSettings = !isEditingSettings"
      >
        {{ isEditingSettings ? 'Concluído' : 'Editar' }}
      </button>
    </section>

    <form
      v-if="selectedStop"
      v-show="isEditingSettings"
      id="alert-settings-form"
      class="alert-setup-form tw:grid tw:gap-3.5 tw:rounded-[10px] tw:border tw:border-bh-border tw:bg-white tw:p-4 tw:shadow-[0_10px_30px_var(--bh-shadow-08)] tw:dark:border-[#1f4a47] tw:dark:bg-bh-surface-2 tw:max-[920px]:p-2.5"
      @submit.prevent
    >
      <label class="tw:gap-1.5">
        <span class="alert-field-label tw:text-bh-primary tw:text-[0.72rem] tw:font-black tw:tracking-normal tw:uppercase tw:dark:text-[#5eead4]">
          Linha
        </span>
        <input
          class="tw:dark:border-[#28514d] tw:dark:bg-bh-surface-inset tw:dark:text-[#e5e7eb]"
          :value="settings.lineCode"
          placeholder="Ex.: 8350"
          inputmode="numeric"
          @input="updateLineCode"
        />
      </label>

      <fieldset class="tw:grid tw:gap-1.5 tw:border-0 tw:p-0">
        <legend class="alert-field-label tw:text-bh-primary tw:text-[0.72rem] tw:font-black tw:tracking-normal tw:uppercase tw:dark:text-[#5eead4]">
          Avisar quando faltar
        </legend>
        <div class="minutes-stepper tw:inline-grid tw:w-fit tw:grid-cols-[44px_64px_44px] tw:items-center tw:overflow-hidden tw:rounded-lg tw:border tw:border-[#d0d5dd] tw:bg-white tw:dark:border-[#28514d] tw:dark:bg-bh-surface-inset" role="group" aria-label="Antecedência do alerta">
          <button
            type="button"
            class="tw:grid tw:size-11 tw:place-items-center tw:border-0 tw:bg-[#f9fafb] tw:text-bh-primary-hover tw:transition-colors tw:hover:bg-bh-highlight tw:focus-visible:z-[1] tw:focus-visible:outline-2 tw:focus-visible:outline-inset tw:focus-visible:outline-bh-accent tw:dark:focus-visible:outline-[#5eead4] tw:disabled:cursor-not-allowed tw:disabled:bg-bh-disabled-bg tw:disabled:text-bh-disabled-text tw:dark:bg-bh-surface-2 tw:dark:text-[#5eead4] tw:dark:hover:bg-[#134e4a] tw:dark:disabled:bg-bh-disabled-dark-bg tw:dark:disabled:text-bh-disabled-dark-text"
            aria-label="Diminuir antecedência"
            :disabled="settings.minutesBefore <= 1"
            @click="updateMinutes(settings.minutesBefore - 1)"
          >
            <Minus class="tw:size-4" aria-hidden="true" />
          </button>
          <span class="tw:grid tw:justify-items-center tw:leading-tight" aria-live="polite" aria-atomic="true">
            <strong class="tw:text-[1rem] tw:tabular-nums tw:text-bh-text tw:dark:text-[#f9fafb]">{{ settings.minutesBefore }}</strong>
            <small class="tw:text-[0.65rem] tw:font-bold tw:text-bh-muted tw:dark:text-[#c7d7d4]">min</small>
          </span>
          <button
            type="button"
            class="tw:grid tw:size-11 tw:place-items-center tw:border-0 tw:bg-[#f9fafb] tw:text-bh-primary-hover tw:transition-colors tw:hover:bg-bh-highlight tw:focus-visible:z-[1] tw:focus-visible:outline-2 tw:focus-visible:outline-inset tw:focus-visible:outline-bh-accent tw:dark:focus-visible:outline-[#5eead4] tw:disabled:cursor-not-allowed tw:disabled:bg-bh-disabled-bg tw:disabled:text-bh-disabled-text tw:dark:bg-bh-surface-2 tw:dark:text-[#5eead4] tw:dark:hover:bg-[#134e4a] tw:dark:disabled:bg-bh-disabled-dark-bg tw:dark:disabled:text-bh-disabled-dark-text"
            aria-label="Aumentar antecedência"
            :disabled="settings.minutesBefore >= 60"
            @click="updateMinutes(settings.minutesBefore + 1)"
          >
            <Plus class="tw:size-4" aria-hidden="true" />
          </button>
        </div>
      </fieldset>

      <label v-if="is8350" class="tw:gap-1.5">
        <span class="alert-field-label tw:text-bh-primary tw:text-[0.72rem] tw:font-black tw:tracking-normal tw:uppercase tw:dark:text-[#5eead4]">
          Tipo de trajeto
          <small class="tw:text-bh-muted tw:text-[0.76rem] tw:font-bold tw:normal-case tw:dark:text-[#9eb7b4]">opcional</small>
        </span>
        <select
          class="tw:dark:border-[#28514d] tw:dark:bg-bh-surface-inset tw:dark:text-[#e5e7eb]"
          :value="settings.variantFilter"
          @change="update('variantFilter', ($event.target as HTMLSelectElement).value as BusVariantFilter)"
        >
          <option value="qualquer">Qualquer 8350</option>
          <option value="direto">Direto</option>
          <option value="nao-direto">Não direto</option>
        </select>
      </label>
    </form>

    <button
      v-if="selectedStop"
      type="button"
      class="primary alert-submit tw:inline-flex tw:min-h-12 tw:w-full tw:items-center tw:justify-center tw:gap-2 tw:rounded-[9px] tw:border-bh-primary tw:bg-bh-primary tw:text-white tw:font-extrabold tw:shadow-[0_5px_14px_var(--bh-accent-16)] tw:transition-colors tw:hover:border-bh-primary-hover tw:hover:bg-bh-primary-hover tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-bh-accent tw:dark:focus-visible:outline-[#5eead4] tw:dark:border-[#2dd4bf] tw:dark:bg-[#2dd4bf] tw:dark:text-[#082f2b] tw:dark:hover:bg-[#5eead4]"
      @click="settings.enabled ? update('enabled', false) : permission === 'granted' ? update('enabled', true) : emit('startMonitoring')"
    >
      <BellRing class="tw:size-[17px]" aria-hidden="true" />
      {{ settings.enabled ? 'Pausar monitoramento' : 'Iniciar monitoramento' }}
    </button>

    <p
      v-if="selectedStop && (isLoading || visibleStatusMessage)"
      class="alert-feedback tw:m-0 tw:text-bh-muted tw:text-[0.78rem] tw:leading-[1.35] tw:dark:text-[#c7d7d4]"
      role="status"
      aria-live="polite"
    >
      {{ isLoading ? 'Atualizando previsões…' : visibleStatusMessage }}
    </p>

    <section
      v-if="selectedStop"
      class="alert-predictions tw:grid tw:gap-2 tw:border-t tw:border-bh-border tw:pt-3.5 tw:dark:border-[#1f4a47]"
    >
      <div class="alert-section-heading tw:flex tw:items-baseline tw:justify-between tw:gap-2.5">
        <h3 class="tw:m-0 tw:text-bh-text tw:text-[0.98rem] tw:dark:text-[#f9fafb]">Próximos ônibus</h3>
        <span v-if="lastUpdated" class="tw:m-0 tw:whitespace-nowrap tw:text-[#475467] tw:text-[0.8rem] tw:dark:text-[#c7d7d4] tw:max-[920px]:text-[0.75rem] tw:[font-variant-numeric:tabular-nums]">
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
