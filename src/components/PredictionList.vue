<script setup lang="ts">
import type { Prediction } from '../domain/types';

defineProps<{ predictions: Prediction[] }>();

function describePredictionTime(prediction: Prediction): string {
  if (prediction.departureLabel) {
    return prediction.departureLabel;
  }

  return Number.isFinite(prediction.minutes) ? `${prediction.minutes} min` : 'Sem previsão';
}
</script>

<template>
  <section class="panel tw:grid tw:gap-3 tw:rounded-[10px] tw:border tw:border-bh-border tw:bg-white tw:p-4 tw:shadow-[0_10px_30px_var(--bh-shadow-08)] tw:dark:border-[#1f4a47] tw:dark:bg-bh-surface-2 tw:dark:text-[#e5e7eb]">
    <h2 class="tw:m-0 tw:text-bh-text tw:text-[1.18rem] tw:dark:text-[#f9fafb]">Próximas previsões</h2>
    <p v-if="predictions.length === 0" class="muted tw:m-0 tw:text-bh-muted tw:text-[0.8rem] tw:dark:text-[#9eb7b4]">Nenhuma previsão carregada.</p>
    <ul v-else class="prediction-list tw:m-0 tw:grid tw:list-none tw:gap-2 tw:p-0">
      <li v-for="prediction in predictions" :key="prediction.id" class="tw:grid tw:grid-cols-[auto_minmax(0,1fr)_auto] tw:items-center tw:gap-2.5 tw:rounded-[8px] tw:border tw:border-bh-border tw:bg-white tw:p-3 tw:dark:border-[#1f4a47] tw:dark:bg-bh-surface-2">
        <strong class="tw:text-bh-text tw:dark:text-[#f9fafb]">{{ prediction.lineCode }}</strong>
        <span class="tw:min-w-0 tw:text-bh-muted tw:text-[0.8rem] tw:dark:text-[#9eb7b4]">{{ prediction.destination }}</span>
        <span v-if="prediction.variant === 'nao-direto'" class="badge tw:rounded-full tw:bg-[#fff7ed] tw:px-2 tw:py-0.5 tw:text-[#c2410c] tw:text-[0.68rem] tw:font-black tw:uppercase tw:dark:bg-[#431f13] tw:dark:text-[#fdba74]">
          Não direto
        </span>
        <span class="minutes tw:whitespace-nowrap tw:text-bh-primary-hover tw:text-[0.9rem] tw:font-black tw:dark:text-[#5eead4]">{{ describePredictionTime(prediction) }}</span>
      </li>
    </ul>
  </section>
</template>
