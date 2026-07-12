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
</script>

<template>
  <section class="prediction-section">
    <div class="section-title">
      <span class="section-kicker">Próximos ônibus</span>
    </div>

    <p v-if="predictions.length === 0" class="muted empty-state">Nenhuma previsão carregada.</p>

    <ul v-else class="prediction-cards">
      <li
        v-for="(prediction, index) in predictions"
        :key="prediction.id"
        class="prediction-card"
        :class="{
          'is-next': index === 0,
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
            <span v-if="describeVariant(prediction)" class="variant-pill">
              {{ describeVariant(prediction) }}
            </span>
          </div>
          <span class="prediction-destination">{{ prediction.destination }}</span>
          <span v-if="prediction.vehicleId" class="prediction-vehicle">
            Veículo {{ prediction.vehicleId }}
          </span>
        </div>
        <div class="prediction-time">
          <strong :class="{ 'is-departure': Boolean(prediction.departureLabel) }">
            {{ describePredictionTime(prediction) }}
          </strong>
          <span v-if="index === 0 && Number.isFinite(prediction.minutes) && !prediction.departureLabel">Chegando</span>
        </div>
      </li>
    </ul>
  </section>
</template>
