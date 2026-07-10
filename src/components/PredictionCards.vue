<script setup lang="ts">
import type { Prediction } from '../domain/types';

defineProps<{ predictions: Prediction[] }>();

function describeMinutes(minutes: number): string {
  return Number.isFinite(minutes) ? `${minutes} min` : 'Sem previsão';
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
        :class="{ 'is-next': index === 0 }"
      >
        <div class="bus-token" aria-hidden="true">▣</div>
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
          <strong>{{ describeMinutes(prediction.minutes) }}</strong>
          <span v-if="index === 0 && Number.isFinite(prediction.minutes)">Chegando</span>
        </div>
      </li>
    </ul>
  </section>
</template>
