<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { BusFront } from '@lucide/vue';
import type { Prediction, PredictionAlertRequest, PredictionAlertScope } from '../domain/types';

defineProps<{
  predictions: Prediction[];
  selectedPredictionId?: string | null;
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  selectPrediction: [prediction: Prediction];
  createAlert: [request: PredictionAlertRequest];
}>();

const contextMenu = ref<{ prediction: Prediction; x: number; y: number } | null>(null);

function closeContextMenu() {
  contextMenu.value = null;
  document.removeEventListener('pointerdown', closeContextMenu);
  document.removeEventListener('keydown', handleContextMenuKeydown);
}

function handleContextMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeContextMenu();
  }
}

function openContextMenu(event: MouseEvent | KeyboardEvent, prediction: Prediction) {
  event.preventDefault();

  const target = event.currentTarget as HTMLElement | null;
  const targetRect = target?.getBoundingClientRect();
  const rawX = 'clientX' in event && event.clientX > 0 ? event.clientX : targetRect?.left ?? 0;
  const rawY = 'clientY' in event && event.clientY > 0 ? event.clientY : targetRect?.bottom ?? 0;
  const menuWidth = 248;
  const menuHeight = prediction.variant === 'not-applicable' ? 116 : 156;

  contextMenu.value = {
    prediction,
    x: Math.max(8, Math.min(rawX, window.innerWidth - menuWidth - 8)),
    y: Math.max(8, Math.min(rawY, window.innerHeight - menuHeight - 8)),
  };

  document.addEventListener('pointerdown', closeContextMenu);
  document.addEventListener('keydown', handleContextMenuKeydown);
}

function selectPrediction(prediction: Prediction) {
  closeContextMenu();
  emit('selectPrediction', prediction);
}

function createAlert(scope: PredictionAlertScope) {
  const request = contextMenu.value;
  if (!request) {
    return;
  }

  closeContextMenu();
  emit('createAlert', { prediction: request.prediction, scope });
}

function describeVariant(variant: Prediction['variant']): string | null {
  if (variant === 'direto') {
    return 'Direto';
  }

  if (variant === 'nao-direto') {
    return 'Não direto';
  }

  return null;
}

function handlePredictionKeydown(event: KeyboardEvent, prediction: Prediction) {
  if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
    openContextMenu(event, prediction);
  }
}

onBeforeUnmount(closeContextMenu);

function describePredictionTime(prediction: Prediction): string {
  if (prediction.departureLabel) {
    return prediction.departureLabel;
  }

  return Number.isFinite(prediction.minutes) ? `${prediction.minutes} min` : 'Sem previsão';
}

function formatDisplayText(value: string): string {
  const hasLetters = /\p{L}/u.test(value);
  const isAllCaps = hasLetters && value === value.toLocaleUpperCase('pt-BR');

  if (!isAllCaps) {
    return value;
  }

  return value.toLocaleLowerCase('pt-BR').replace(/\p{L}[\p{L}\p{M}]*/gu, word =>
    word.charAt(0).toLocaleUpperCase('pt-BR') + word.slice(1),
  );
}

function describePredictionForScreenReader(prediction: Prediction): string {
  const destination = formatDisplayText(prediction.destination);
  const variant = describeVariant(prediction.variant);
  const time = describePredictionTime(prediction);

  return `${prediction.lineCode} para ${destination}${variant ? `, ${variant}` : ''}, ${time}`;
}
</script>

<template>
  <section class="prediction-section tw:grid tw:gap-2" :aria-busy="isLoading">
    <p
      v-if="isLoading && predictions.length === 0"
      class="prediction-state prediction-state--loading tw:m-0 tw:flex tw:min-h-[52px] tw:items-center tw:gap-[9px] tw:rounded-[8px] tw:border tw:border-bh-border-accent tw:bg-bh-surface tw:p-3 tw:text-bh-primary-hover tw:text-[0.84rem] tw:font-bold"
      role="status"
      aria-live="polite"
    >
      <span
        class="prediction-state-indicator tw:size-[14px] tw:flex-none tw:rounded-full tw:border-2 tw:border-bh-border-accent tw:border-t-bh-primary tw:animate-[prediction-state-spin_700ms_linear_infinite]"
        aria-hidden="true"
      ></span>
      Buscando próximos ônibus…
    </p>
    <p
      v-else-if="predictions.length === 0"
      class="muted empty-state tw:m-0 tw:rounded-[8px] tw:border tw:border-dashed tw:border-[#d0d5dd] tw:p-[18px] tw:text-bh-muted tw:text-[0.8rem]"
      role="status"
    >
      Nenhuma previsão carregada.
    </p>

    <ul v-else class="prediction-cards tw:m-0 tw:grid tw:list-none tw:gap-2 tw:p-0">
      <li v-for="(prediction, index) in predictions" :key="prediction.id">
        <button
          type="button"
          class="prediction-card tw:grid tw:w-full tw:grid-cols-[auto_minmax(0,1fr)_auto] tw:items-center tw:gap-2.5 tw:text-left"
          :class="{
            'is-next': index === 0 && !selectedPredictionId,
            'is-selected': prediction.id === selectedPredictionId,
          }"
          :aria-pressed="prediction.id === selectedPredictionId"
          :aria-label="describePredictionForScreenReader(prediction)"
          title="Clique com o botão direito para criar um alerta"
          @click="selectPrediction(prediction)"
          @contextmenu="openContextMenu($event, prediction)"
          @keydown="handlePredictionKeydown($event, prediction)"
        >
          <div class="bus-token" aria-hidden="true">
            <BusFront />
          </div>
          <div class="prediction-main tw:grid tw:min-w-0 tw:gap-0.5">
            <div class="prediction-line tw:flex tw:min-w-0 tw:items-center tw:gap-2">
              <strong class="tw:text-[0.98rem]">{{ prediction.lineCode }}</strong>
              <span
                v-if="describeVariant(prediction.variant)"
                class="variant-pill tw:rounded-full tw:px-[7px] tw:py-[2px] tw:text-[0.68rem] tw:font-black tw:uppercase"
                :class="`variant-pill--${prediction.variant}`"
              >
                {{ describeVariant(prediction.variant) }}
              </span>
            </div>
            <span class="prediction-destination tw:text-bh-muted tw:text-[0.8rem]">
              {{ formatDisplayText(prediction.destination) }}
            </span>
          </div>
          <div class="prediction-time tw:grid tw:justify-items-end tw:gap-0.5 tw:whitespace-nowrap">
            <strong
              class="tw:text-[#16a34a] tw:text-[1rem] tw:text-right"
              :class="{ 'is-departure': Boolean(prediction.departureLabel) }"
            >
              {{ describePredictionTime(prediction) }}
            </strong>
          </div>
        </button>
      </li>
    </ul>

    <Teleport to="body">
      <div
        v-if="contextMenu"
        class="prediction-context-menu tw:fixed tw:z-[1600] tw:grid tw:min-w-[248px] tw:gap-1 tw:rounded-[10px] tw:border tw:border-[#d0d5dd] tw:bg-white tw:p-1.5 tw:shadow-[0_18px_48px_rgba(16,24,40,0.2)]"
        :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
        role="menu"
        @pointerdown.stop
      >
        <p class="tw:m-[2px_8px_4px] tw:text-[#667085] tw:text-[0.72rem] tw:font-extrabold">
          Opções para a linha {{ contextMenu.prediction.lineCode }}
        </p>
        <button type="button" role="menuitem" @click="createAlert('line')">
          Notificar esta linha
        </button>
        <button
          v-if="contextMenu.prediction.variant !== 'not-applicable'"
          type="button"
          role="menuitem"
          @click="createAlert('variant')"
        >
          Notificar somente {{ describeVariant(contextMenu.prediction.variant) }}
        </button>
        <button type="button" role="menuitem" @click="selectPrediction(contextMenu.prediction)">
          Selecionar este ônibus
        </button>
      </div>
    </Teleport>
  </section>
</template>
