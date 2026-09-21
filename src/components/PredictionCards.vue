<script setup lang="ts">
import { BusFront } from '@lucide/vue';
import type { Prediction } from '../domain/types';

defineProps<{
  predictions: Prediction[];
  selectedPredictionId?: string | null;
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  selectPrediction: [prediction: Prediction];
}>();

function describePredictionTime(prediction: Prediction): string {
  if (prediction.departureLabel) {
    return prediction.departureLabel;
  }

  return Number.isFinite(prediction.minutes) ? `${prediction.minutes} min` : 'Sem previsão';
}

function describeVariant(prediction: Prediction): string | null {
  if (prediction.variant === 'direto') {
    return 'Direto';
  }

  if (prediction.variant === 'nao-direto') {
    return 'Não Direto';
  }

  return null;
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
  const variant = describeVariant(prediction);
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
          @click="emit('selectPrediction', prediction)"
        >
          <div class="bus-token" aria-hidden="true">
            <BusFront />
          </div>
          <div class="prediction-main">
            <div class="prediction-line">
              <strong>{{ prediction.lineCode }}</strong>
              <span
                v-if="describeVariant(prediction)"
                class="variant-pill"
                :class="`variant-pill--${prediction.variant}`"
              >
                {{ describeVariant(prediction) }}
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
  </section>
</template>
