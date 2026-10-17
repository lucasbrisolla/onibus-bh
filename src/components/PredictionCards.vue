<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { BusFront } from '@lucide/vue';
import type { Prediction, PredictionAlertRequest, PredictionAlertScope } from '../domain/types';

const props = defineProps<{
  predictions: Prediction[];
  selectedPredictionId?: string | null;
  isLoading?: boolean;
  themeMode?: 'light' | 'dark';
}>();

const emit = defineEmits<{
  selectPrediction: [prediction: Prediction];
  createAlert: [request: PredictionAlertRequest];
}>();

const contextMenu = ref<{ prediction: Prediction; x: number; y: number } | null>(null);
const lineCodeCollator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
const nextPredictionId = computed(() => {
  const nextPrediction = props.predictions
    .filter(prediction => Number.isFinite(prediction.minutes))
    .reduce<Prediction | null>((nearest, prediction) => (
      nearest === null || prediction.minutes < nearest.minutes ? prediction : nearest
    ), null);

  return nextPrediction?.id ?? null;
});
const orderedPredictions = computed(() => (
  props.predictions
    .map((prediction, originalIndex) => ({ prediction, originalIndex }))
    .sort((left, right) => {
      const lineComparison = lineCodeCollator.compare(
        left.prediction.lineCode,
        right.prediction.lineCode,
      );
      if (lineComparison !== 0) {
        return lineComparison;
      }

      const leftMinutes = Number.isFinite(left.prediction.minutes) ? left.prediction.minutes : Number.POSITIVE_INFINITY;
      const rightMinutes = Number.isFinite(right.prediction.minutes) ? right.prediction.minutes : Number.POSITIVE_INFINITY;

      return leftMinutes - rightMinutes || left.originalIndex - right.originalIndex;
    })
    .map(({ prediction }) => prediction)
));

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

function describePredictionForScreenReader(prediction: Prediction, isNext = false): string {
  const destination = formatDisplayText(prediction.destination);
  const variant = describeVariant(prediction.variant);
  const time = describePredictionTime(prediction);

  return `${isNext ? 'Próximo ônibus: ' : ''}${prediction.lineCode} para ${destination}${variant ? `, ${variant}` : ''}, ${time}`;
}
</script>

<template>
  <section
    class="prediction-section tw:grid tw:gap-2 tw:min-[921px]:sticky tw:min-[921px]:top-0 tw:min-[921px]:z-[2] tw:min-[921px]:mb-0.5 tw:min-[921px]:bg-[linear-gradient(180deg,#ffffff_78%,transparent)] tw:min-[921px]:px-0 tw:min-[921px]:py-2.5 tw:dark:min-[921px]:bg-[linear-gradient(180deg,#132f2d_78%,#132f2d)]"
    :aria-busy="isLoading"
  >
    <ul
      v-if="orderedPredictions.length > 0"
      class="prediction-cards tw:m-0 tw:grid tw:list-none tw:gap-2 tw:p-0"
    >
      <li v-for="(prediction, index) in orderedPredictions" :key="prediction.id">
        <button
          type="button"
          class="prediction-card tw:grid tw:w-full tw:grid-cols-[auto_minmax(0,1fr)_auto] tw:items-center tw:gap-2.5 tw:rounded-[10px] tw:border tw:border-bh-border tw:bg-white tw:p-[10px_12px] tw:text-left tw:text-bh-text tw:shadow-[0_8px_24px_var(--bh-shadow-08)] tw:transition-colors tw:duration-[160ms] tw:hover:border-bh-border-accent tw:hover:bg-bh-surface tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-bh-accent tw:dark:focus-visible:outline-[#5eead4] tw:dark:border-[#1f4a47] tw:dark:bg-bh-surface-2 tw:dark:text-[#e5e7eb] tw:dark:hover:border-[#2dd4bf] tw:dark:hover:bg-bh-surface-inset tw:max-[920px]:gap-2 tw:max-[920px]:p-[8px_9px]"
          :class="[
            {
              'is-next': prediction.id === nextPredictionId,
              'is-selected': prediction.id === selectedPredictionId,
            },
            prediction.id === nextPredictionId
              ? 'tw:border-[#0d9488] tw:bg-[#f0fdfa] tw:p-[12px_14px] tw:shadow-[0_6px_18px_var(--bh-accent-08)] tw:dark:border-[#2dd4bf] tw:dark:bg-[#134e4a] tw:max-[920px]:p-[10px_11px]'
              : prediction.id === selectedPredictionId
                ? 'tw:border-bh-primary tw:bg-bh-surface tw:shadow-[0_0_0_3px_var(--bh-accent-16)] tw:dark:border-[#2dd4bf] tw:dark:bg-bh-surface-inset'
                : '',
          ]"
          :aria-pressed="prediction.id === selectedPredictionId"
          :aria-label="describePredictionForScreenReader(prediction, prediction.id === nextPredictionId)"
          title="Clique com o botão direito para criar um alerta"
          @click="selectPrediction(prediction)"
          @contextmenu="openContextMenu($event, prediction)"
          @keydown="handlePredictionKeydown($event, prediction)"
        >
          <div
            class="bus-token tw:grid tw:size-[26px] tw:place-items-center tw:rounded-lg tw:bg-bh-highlight tw:text-bh-primary-hover tw:max-[920px]:size-[30px]"
            :class="prediction.id === nextPredictionId ? 'tw:bg-bh-primary tw:text-white tw:dark:bg-[#2dd4bf] tw:dark:text-[#082f2b] tw:min-[921px]:size-[30px]' : ''"
            aria-hidden="true"
          >
            <BusFront class="tw:size-[18px] tw:stroke-[2.2]" />
          </div>
          <div class="prediction-main tw:grid tw:min-w-0 tw:gap-0.5">
            <div class="prediction-line tw:flex tw:min-w-0 tw:items-center tw:gap-2">
              <strong class="tw:text-[0.98rem] tw:dark:text-[#f9fafb] tw:max-[920px]:text-[0.95rem]" :class="index === 0 ? 'tw:text-[#0f766e] tw:dark:text-[#99f6e4]' : ''">{{ prediction.lineCode }}</strong>
              <span
                v-if="prediction.variant === 'nao-direto'"
                class="variant-pill variant-pill--nao-direto tw:rounded-full tw:bg-[#fff7ed] tw:px-[7px] tw:py-[2px] tw:text-[0.68rem] tw:font-black tw:uppercase tw:text-[#c2410c] tw:dark:bg-[#431f13] tw:dark:text-[#fdba74]"
              >
                {{ describeVariant(prediction.variant) }}
              </span>
            </div>
            <span class="prediction-destination tw:line-clamp-2 tw:text-bh-muted tw:text-[0.8rem] tw:dark:text-[#c7d7d4] tw:max-[920px]:text-[0.78rem]">
              {{ formatDisplayText(prediction.destination) }}
            </span>
          </div>
          <div class="prediction-time tw:grid tw:justify-items-end tw:gap-0.5 tw:whitespace-nowrap">
            <span v-if="prediction.id === nextPredictionId" class="tw:text-[0.64rem] tw:font-extrabold tw:uppercase tw:tracking-[0.04em] tw:text-[#0f766e] tw:dark:text-[#99f6e4]">Próximo</span>
            <strong
              class="tw:text-[#0f766e] tw:text-[1rem] tw:text-right tw:transition-colors tw:duration-200 tw:dark:text-[#5eead4] tw:max-[920px]:text-[0.92rem]"
              :class="[
                prediction.id === nextPredictionId ? 'tw:text-[1.12rem]! tw:font-black' : '',
                Boolean(prediction.departureLabel)
                  ? 'is-departure tw:max-w-[86px] tw:whitespace-normal tw:text-[0.88rem] tw:leading-[1.15]'
                  : '',
              ]"
            >
              {{ describePredictionTime(prediction) }}
            </strong>
          </div>
        </button>
      </li>
    </ul>
    <div
      v-else-if="isLoading"
      class="prediction-skeleton-state tw:grid tw:gap-2"
      role="status"
      aria-live="polite"
    >
      <span class="tw:sr-only">Buscando próximos ônibus.</span>
      <ul class="tw:m-0 tw:grid tw:list-none tw:gap-2 tw:p-0" aria-hidden="true">
        <li
          v-for="placeholder in 3"
          :key="placeholder"
          class="tw:grid tw:grid-cols-[30px_minmax(0,1fr)_54px] tw:items-center tw:gap-2.5 tw:rounded-[10px] tw:border tw:border-[#e4e7ec] tw:bg-white tw:p-3 tw:dark:border-[#28514d] tw:dark:bg-bh-surface-2"
        >
          <span class="tw:size-[30px] tw:animate-pulse tw:rounded-lg tw:bg-[#e4e7ec] tw:dark:bg-[#28514d]"></span>
          <span class="tw:grid tw:gap-2">
            <span class="tw:h-3.5 tw:w-16 tw:animate-pulse tw:rounded tw:bg-[#e4e7ec] tw:dark:bg-[#28514d]"></span>
            <span class="tw:h-3 tw:w-4/5 tw:animate-pulse tw:rounded tw:bg-[#f2f4f7] tw:dark:bg-[#1f4a47]"></span>
          </span>
          <span class="tw:h-5 tw:w-12 tw:animate-pulse tw:rounded tw:bg-[#f2f4f7] tw:dark:bg-[#1f4a47]"></span>
        </li>
      </ul>
    </div>
    <p
      v-else
      class="empty-state tw:m-0 tw:rounded-[8px] tw:border tw:border-dashed tw:border-[#d0d5dd] tw:p-[18px] tw:text-bh-muted tw:text-[0.8rem] tw:dark:border-[#28514d] tw:dark:text-[#9eb7b4]"
      role="status"
    >
      Nenhuma previsão carregada.
    </p>

    <Teleport to="body">
      <div
        v-if="contextMenu"
        class="prediction-context-menu tw:fixed tw:z-[1600] tw:grid tw:min-w-[248px] tw:gap-1 tw:rounded-[10px] tw:border tw:border-[#d0d5dd] tw:bg-white tw:p-1.5 tw:shadow-[0_18px_48px_var(--bh-shadow-16)]"
        :class="props.themeMode === 'dark' ? 'tw:border-[#28514d]! tw:bg-[#132f2d]!' : ''"
        :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
        role="menu"
        @pointerdown.stop
      >
        <p class="tw:m-[2px_8px_4px] tw:text-[#667085] tw:text-[0.72rem] tw:font-extrabold" :class="props.themeMode === 'dark' ? 'tw:text-[#9eb7b4]!' : ''">
          Opções para a linha {{ contextMenu.prediction.lineCode }}
        </p>
        <button
          type="button"
          class="tw:rounded-[7px] tw:border-0 tw:bg-transparent tw:px-2.5 tw:py-[9px] tw:text-left tw:text-[0.82rem] tw:font-bold tw:text-bh-text tw:hover:bg-bh-surface tw:hover:text-bh-primary-hover"
          :class="props.themeMode === 'dark' ? 'tw:text-[#e5e7eb]! tw:hover:bg-[#0f2423]! tw:hover:text-[#5eead4]! tw:focus-visible:bg-[#0f2423]! tw:focus-visible:text-[#5eead4]!' : ''"
          role="menuitem"
          @click="createAlert('line')"
        >
          Notificar esta linha
        </button>
        <button
          v-if="contextMenu.prediction.variant !== 'not-applicable'"
          type="button"
          class="tw:rounded-[7px] tw:border-0 tw:bg-transparent tw:px-2.5 tw:py-[9px] tw:text-left tw:text-[0.82rem] tw:font-bold tw:text-bh-text tw:hover:bg-bh-surface tw:hover:text-bh-primary-hover"
          :class="props.themeMode === 'dark' ? 'tw:text-[#e5e7eb]! tw:hover:bg-[#0f2423]! tw:hover:text-[#5eead4]! tw:focus-visible:bg-[#0f2423]! tw:focus-visible:text-[#5eead4]!' : ''"
          role="menuitem"
          @click="createAlert('variant')"
        >
          Notificar somente {{ describeVariant(contextMenu.prediction.variant) }}
        </button>
        <button
          type="button"
          class="tw:rounded-[7px] tw:border-0 tw:bg-transparent tw:px-2.5 tw:py-[9px] tw:text-left tw:text-[0.82rem] tw:font-bold tw:text-bh-text tw:hover:bg-bh-surface tw:hover:text-bh-primary-hover"
          :class="props.themeMode === 'dark' ? 'tw:text-[#e5e7eb]! tw:hover:bg-[#0f2423]! tw:hover:text-[#5eead4]! tw:focus-visible:bg-[#0f2423]! tw:focus-visible:text-[#5eead4]!' : ''"
          role="menuitem"
          @click="selectPrediction(contextMenu.prediction)"
        >
          Selecionar este ônibus
        </button>
      </div>
    </Teleport>
  </section>
</template>
