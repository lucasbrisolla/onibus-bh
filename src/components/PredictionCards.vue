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
  <section class="prediction-section" :aria-busy="isLoading">
    <p
      v-if="isLoading && predictions.length === 0"
      class="prediction-state prediction-state--loading"
      role="status"
      aria-live="polite"
    >
      <span class="prediction-state-indicator" aria-hidden="true"></span>
      Buscando próximos ônibus…
    </p>
    <p v-else-if="predictions.length === 0" class="muted empty-state" role="status">
      Nenhuma previsão carregada.
    </p>

    <ul v-else class="prediction-cards">
      <li v-for="(prediction, index) in predictions" :key="prediction.id">
        <button
          type="button"
          class="prediction-card"
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
          <div class="prediction-main">
            <div class="prediction-line">
              <strong>{{ prediction.lineCode }}</strong>
              <span
                v-if="describeVariant(prediction.variant)"
                class="variant-pill"
                :class="`variant-pill--${prediction.variant}`"
              >
                {{ describeVariant(prediction.variant) }}
              </span>
            </div>
            <span class="prediction-destination">{{ formatDisplayText(prediction.destination) }}</span>
          </div>
          <div class="prediction-time">
            <strong :class="{ 'is-departure': Boolean(prediction.departureLabel) }">
              {{ describePredictionTime(prediction) }}
            </strong>
          </div>
        </button>
      </li>
    </ul>

    <Teleport to="body">
      <div
        v-if="contextMenu"
        class="prediction-context-menu"
        :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
        role="menu"
        @pointerdown.stop
      >
        <p>Opções para a linha {{ contextMenu.prediction.lineCode }}</p>
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
