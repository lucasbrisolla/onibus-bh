<script setup lang="ts">
import type { Prediction } from '../domain/types';

defineProps<{ predictions: Prediction[] }>();
</script>

<template>
  <section class="panel">
    <h2>Próximas previsões</h2>
    <p v-if="predictions.length === 0" class="muted">Nenhuma previsão carregada.</p>
    <ul v-else class="prediction-list">
      <li v-for="prediction in predictions" :key="prediction.id">
        <strong>{{ prediction.lineCode }}</strong>
        <span>{{ prediction.destination }}</span>
        <span v-if="prediction.variant !== 'not-applicable'" class="badge">
          {{ prediction.variant === 'direto' ? 'Direto' : 'Não Direto' }}
        </span>
        <span class="minutes">{{ prediction.minutes }} min</span>
      </li>
    </ul>
  </section>
</template>
