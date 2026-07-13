<script setup lang="ts">
import { BusFront } from '@lucide/vue';
import type { Prediction } from '../domain/types';

defineProps<{
  predictions: Prediction[];
  selectedPredictionId?: string | null;
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
</script>

<template>
  <section class="prediction-section">
    <p v-if="predictions.length === 0" class="muted empty-state">Nenhuma previsão carregada.</p>

    <ul v-else class="prediction-cards">
      <li
        v-for="(prediction, index) in predictions"
        :key="prediction.id"
        class="prediction-card"
        :class="{
          'is-next': index === 0 && !selectedPredictionId,
          'is-selected': prediction.id === selectedPredictionId,
        }"
        tabindex="0"
        role="button"
        @click="emit('selectPrediction', prediction)"
        @keydown.enter.prevent="emit('selectPrediction', prediction)"
        @keydown.space.prevent="emit('selectPrediction', prediction)"
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
      </li>
    </ul>
  </section>
</template>
