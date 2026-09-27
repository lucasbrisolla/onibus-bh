<script setup lang="ts">
import { ChevronDown, ChevronUp, Star } from '@lucide/vue';
import { computed, reactive, ref, watch } from 'vue';
import type {
  MobilibusDeparture,
  MobilibusDeparturesStatus,
  MobilibusMapTile,
  MobilibusStop,
  MobilibusStopsStatus,
  MobilibusStopDepartures,
} from '../domain/mobilibusTypes';
import MobilibusMap from './MobilibusMap.vue';

const props = defineProps<{
  stops: MobilibusStop[];
  stopsStatus: MobilibusStopsStatus;
  stopsError: string | null;
  selectedStop: MobilibusStop | null;
  departuresStatus: MobilibusDeparturesStatus;
  departures: MobilibusStopDepartures | null;
  departuresError: string | null;
  isSelectedStopFavorite: boolean;
  themeMode: 'light' | 'dark';
}>();

const SHEET_GESTURE_ZONE_HEIGHT = 108;
const SWIPE_THRESHOLD_PX = 56;
type SheetState = 'peek' | 'half' | 'full';

const departureFilter = ref('');
const openSections = reactive({
  departures: true,
});
const sheetState = ref<SheetState>('half');
const sheetElement = ref<HTMLElement | null>(null);
let touchStartY: number | null = null;
let isTrackingGesture = false;

const emit = defineEmits<{
  requestMapTiles: [tiles: MobilibusMapTile[]];
  retryMap: [];
  selectStop: [stop: MobilibusStop];
  retryDepartures: [];
  toggleSelectedStopFavorite: [];
  toggleTheme: [];
}>();

function formatDepartureTime(departure: MobilibusDeparture): string {
  return departure.nextDay ? `${departure.scheduledTime} (+1)` : departure.scheduledTime;
}

function formatPositionAge(positionAge: number | null): string | null {
  if (positionAge === null) {
    return null;
  }

  if (positionAge < 60) {
    return `Atualização há ${Math.round(positionAge)}s`;
  }

  return `Atualização há ${Math.round(positionAge / 60)}min`;
}

function formatDelay(delay: number | null): string | null {
  if (delay === null || delay === 0) {
    return null;
  }

  const value = Math.abs(Math.round(delay));
  const unit = value < 60 ? `${value}s` : `${Math.round(value / 60)}min`;
  return delay > 0 ? `Atraso informado: ${unit}` : `Adiantado: ${unit}`;
}

const filteredDepartures = computed(() => {
  const departures = props.departures?.departures ?? [];
  const query = departureFilter.value.trim().toLocaleLowerCase('pt-BR');

  if (!query) {
    return departures;
  }

  return departures.filter(departure =>
    [departure.shortName, departure.vehicleId, departure.headsign]
      .filter((value): value is string => value !== null)
      .some(value => value.toLocaleLowerCase('pt-BR').includes(query)),
  );
});

function toggleSheet() {
  sheetState.value = sheetState.value === 'peek' ? 'half' : 'peek';
}

function moveSheet(direction: 'up' | 'down') {
  const states: SheetState[] = ['peek', 'half', 'full'];
  const currentIndex = states.indexOf(sheetState.value);
  const nextIndex = direction === 'up'
    ? Math.min(states.length - 1, currentIndex + 1)
    : Math.max(0, currentIndex - 1);
  sheetState.value = states[nextIndex];
}

function onTouchStart(event: TouchEvent) {
  const firstTouch = event.touches[0];
  if (!firstTouch) {
    return;
  }

  const sheetTop = sheetElement.value?.getBoundingClientRect().top ?? 0;
  const canStartGesture =
    sheetState.value === 'peek' || firstTouch.clientY <= sheetTop + SHEET_GESTURE_ZONE_HEIGHT;

  if (!canStartGesture) {
    touchStartY = null;
    isTrackingGesture = false;
    return;
  }

  isTrackingGesture = true;
  touchStartY = firstTouch.clientY;
}

function onTouchEnd(event: TouchEvent) {
  if (!isTrackingGesture || touchStartY === null) {
    return;
  }

  const touchEndY = event.changedTouches[0]?.clientY ?? touchStartY;
  const deltaY = touchEndY - touchStartY;
  touchStartY = null;
  isTrackingGesture = false;

  if (deltaY > SWIPE_THRESHOLD_PX) {
    moveSheet('down');
    return;
  }

  if (deltaY < -SWIPE_THRESHOLD_PX) {
    moveSheet('up');
  }
}

watch(
  () => props.selectedStop?.stopId,
  () => {
    departureFilter.value = '';
    openSections.departures = true;
  },
);
</script>

<template>
  <section
    class="section-page mobilibus-page mobilibus-lines-page tw:grid tw:min-h-[calc(100vh-79px)] tw:content-start tw:gap-5 tw:overflow-hidden tw:bg-white tw:p-0 tw:dark:bg-[#132f2d] tw:dark:text-[#e5e7eb] tw:max-[920px]:min-h-[calc(100vh-62px)]"
    aria-label="Mapa e pontos Mobilibus"
  >
    <div class="mobilibus-lines-map-layout tw:relative tw:grid tw:min-h-[calc(100vh-79px)] tw:grid-cols-[360px_minmax(0,1fr)] tw:max-[920px]:min-h-[calc(100vh-62px)] tw:max-[920px]:grid-cols-1">
      <div class="mobilibus-lines-map-stage tw:relative tw:col-start-2 tw:row-start-1 tw:min-w-0 tw:max-[920px]:col-start-1 tw:max-[920px]:row-start-1">
        <MobilibusMap
          :stops="stops"
          :status="stopsStatus"
          :error="stopsError"
          :theme-mode="themeMode"
          :selected-stop-id="selectedStop?.stopId ?? null"
          @request-tiles="emit('requestMapTiles', $event)"
          @retry="emit('retryMap')"
          @select-stop="emit('selectStop', $event)"
          @toggle-theme="emit('toggleTheme')"
        />
      </div>

      <div
        ref="sheetElement"
        class="mobilibus-mobile-bottom-sheet tw:contents tw:dark:text-[#e5e7eb] tw:max-[920px]:absolute tw:max-[920px]:right-2.5 tw:max-[920px]:bottom-[74px] tw:max-[920px]:left-2.5 tw:max-[920px]:z-[800] tw:max-[920px]:block tw:max-[920px]:h-[min(42vh,340px)] tw:max-[920px]:overflow-hidden tw:max-[920px]:rounded-[14px] tw:max-[920px]:border tw:max-[920px]:border-[rgba(208,213,221,0.9)] tw:max-[920px]:bg-white/[.94] tw:max-[920px]:shadow-[0_24px_60px_rgba(16,24,40,0.3)] tw:max-[920px]:backdrop-blur-[16px] tw:max-[920px]:transition-[height,transform,box-shadow] tw:max-[920px]:duration-[180ms]"
        :class="[
          `is-${sheetState}`,
          themeMode === 'dark' ? 'tw:max-[920px]:border-[#28514d]! tw:max-[920px]:bg-[rgba(15,36,35,0.96)]!' : '',
          sheetState === 'peek' ? 'tw:max-[920px]:h-11 tw:max-[920px]:translate-y-[calc(100%-34px)] tw:max-[920px]:shadow-[0_14px_32px_rgba(16,24,40,0.22)]' : '',
          sheetState === 'half' ? 'tw:max-[920px]:h-[min(42vh,340px)]' : '',
          sheetState === 'full' ? 'tw:max-[920px]:h-[calc(100vh-104px)]' : '',
        ]"
        @touchstart.passive="onTouchStart"
        @touchend.passive="onTouchEnd"
      >
        <button
          type="button"
          class="sheet-toggle mobilibus-sheet-toggle tw:hidden tw:min-h-[34px] tw:w-full tw:place-items-center tw:border-0! tw:bg-transparent! tw:px-0! tw:py-[9px_0_6px]! tw:max-[920px]:grid"
          :aria-expanded="sheetState !== 'peek'"
          :aria-label="sheetState === 'peek' ? 'Expandir painel do Ótimo' : 'Recolher painel do Ótimo'"
          @click="toggleSheet"
        >
          <div class="sheet-handle tw:h-[5px] tw:w-12 tw:rounded-full tw:bg-[#d0d5dd] tw:dark:bg-[#9eb7b4]"></div>
        </button>

        <aside
          class="mobilibus-lines-control-panel tw:relative tw:z-[1] tw:col-start-1 tw:row-start-1 tw:grid tw:min-h-[calc(100vh-79px)] tw:min-w-0 tw:max-h-[calc(100vh-79px)] tw:gap-3 tw:overflow-y-auto tw:rounded-none tw:border-r tw:border-bh-border tw:bg-white tw:p-[18px] tw:shadow-none tw:backdrop-blur-none tw:dark:border-[#1f4a47] tw:dark:bg-[#132f2d] tw:dark:text-[#e5e7eb] tw:max-[920px]:z-auto tw:max-[920px]:col-auto tw:max-[920px]:row-auto tw:max-[920px]:min-h-0 tw:max-[920px]:h-[calc(100%-34px)] tw:max-[920px]:max-h-[calc(100%-34px)] tw:max-[920px]:border-0! tw:max-[920px]:bg-transparent! tw:max-[920px]:p-[6px_8px_10px]"
          aria-label="Detalhes do ponto Mobilibus"
        >
        <section
          v-if="selectedStop"
          class="control-card tw:grid tw:gap-3 tw:rounded-[8px] tw:border tw:border-bh-border tw:bg-white tw:p-4 tw:shadow-[0_10px_30px_rgba(16,24,40,0.05)] tw:dark:border-[#1f4a47] tw:dark:bg-[#132f2d] tw:dark:text-[#e5e7eb]"
          aria-labelledby="selected-mobilibus-stop"
        >
          <article
            class="selected-stop-card mobilibus-selected-stop-card tw:relative tw:grid tw:gap-1.5 tw:rounded-[8px] tw:border tw:border-bh-border-accent tw:bg-bh-surface tw:p-[12px_54px_12px_12px] tw:dark:border-[#134e4a] tw:dark:bg-[#134e4a] tw:max-[920px]:gap-1 tw:max-[920px]:p-[8px_44px_8px_8px]"
          >
            <button
              type="button"
              class="favorite-stop-button tw:absolute tw:right-2.5 tw:top-2.5 tw:grid tw:size-[34px] tw:place-items-center tw:rounded-full tw:border tw:border-[rgba(13,148,136,0.18)] tw:bg-[rgba(13,148,136,0.08)] tw:p-0 tw:text-bh-primary tw:transition-colors tw:duration-[160ms] tw:hover:bg-[rgba(13,148,136,0.14)] tw:dark:border-[rgba(94,234,212,0.18)] tw:dark:bg-[rgba(45,212,191,0.08)] tw:dark:text-[#5eead4] tw:dark:hover:bg-[rgba(45,212,191,0.14)] tw:max-[920px]:size-[30px]"
              :class="isSelectedStopFavorite ? 'tw:border-[rgba(245,158,11,0.28)] tw:bg-[rgba(245,158,11,0.14)] tw:text-[#d97706] tw:dark:border-[rgba(251,191,36,0.28)] tw:dark:bg-[rgba(245,158,11,0.16)] tw:dark:text-[#fbbf24]' : ''"
              :aria-label="isSelectedStopFavorite ? 'Remover ponto Ótimo dos favoritos' : 'Salvar ponto Ótimo'"
              :title="isSelectedStopFavorite ? 'Remover ponto Ótimo dos favoritos' : 'Salvar ponto Ótimo'"
              :data-active="isSelectedStopFavorite"
              @click="emit('toggleSelectedStopFavorite')"
            >
              <Star class="tw:size-4" :class="isSelectedStopFavorite ? 'tw:fill-current' : ''" aria-hidden="true" />
            </button>
            <h3 id="selected-mobilibus-stop" class="tw:m-0 tw:text-bh-title tw:text-[1rem] tw:leading-[1.35] tw:dark:text-[#f9fafb] tw:max-[920px]:text-[0.92rem] tw:max-[920px]:leading-[1.28]">
              {{ selectedStop.name }}
            </h3>
            <p v-if="selectedStop.address" class="mobilibus-selected-stop-address tw:m-0 tw:text-bh-muted tw:text-[0.78rem] tw:font-semibold tw:leading-[1.35] tw:dark:text-[#9eb7b4] tw:max-[920px]:text-[0.76rem]">{{ selectedStop.address }}</p>
            <p v-if="selectedStop.code" class="mobilibus-selected-stop-code tw:m-0 tw:text-bh-muted tw:text-[0.78rem] tw:font-semibold tw:leading-[1.35] tw:dark:text-[#9eb7b4] tw:max-[920px]:text-[0.76rem]">Código {{ selectedStop.code }}</p>
          </article>
        </section>

        <section
          v-if="selectedStop"
          class="collapse-section mobilibus-stop-departures-section tw:grid tw:gap-2"
          aria-labelledby="mobilibus-departures-heading"
        >
          <button
            type="button"
            class="collapse-toggle tw:flex tw:items-center tw:justify-between tw:rounded-[8px] tw:border tw:border-[#dbe4ee] tw:bg-[#f8fafc] tw:px-3.5 tw:py-3 tw:text-[.92rem] tw:font-extrabold tw:text-bh-text tw:shadow-[0_8px_24px_rgba(16,24,40,0.04)] tw:transition-colors tw:duration-[160ms] tw:hover:bg-[#f2f4f7] tw:dark:border-[#1f4a47] tw:dark:bg-[#132f2d] tw:dark:text-[#e5e7eb] tw:dark:hover:bg-[#163735] tw:max-[920px]:min-h-[34px] tw:max-[920px]:px-2.5 tw:max-[920px]:py-2"
            :aria-expanded="openSections.departures"
            @click="openSections.departures = !openSections.departures"
          >
            <span id="mobilibus-departures-heading">Ônibus neste ponto</span>
            <component
              :is="openSections.departures ? ChevronUp : ChevronDown"
              class="tw:size-[18px] tw:shrink-0 tw:stroke-[2.2]"
              aria-hidden="true"
            />
          </button>
          <div v-show="openSections.departures" class="collapse-body tw:grid tw:gap-2.5">
            <section
              class="mobilibus-stop-departures control-card tw:grid tw:gap-3.5 tw:rounded-[8px] tw:border tw:border-bh-border tw:bg-white tw:p-4 tw:shadow-[0_10px_30px_rgba(16,24,40,0.05)] tw:dark:border-[#1f4a47] tw:dark:bg-[#132f2d] tw:dark:text-[#e5e7eb]"
            >
              <div class="mobilibus-stop-filter-row tw:flex tw:items-end tw:justify-between tw:gap-3 tw:border-t tw:border-bh-border tw:pt-3.5 tw:dark:border-[#1f4a47] tw:max-[920px]:items-stretch tw:max-[920px]:flex-col">
                <label class="mobilibus-stop-filter tw:grid tw:flex-1 tw:gap-1.5" for="mobilibus-stop-filter-input">
                  <span class="tw:text-[.78rem] tw:font-extrabold tw:text-[#344054] tw:dark:text-[#c7d7d4]">Filtrar linha ou ônibus</span>
                  <input
                    id="mobilibus-stop-filter-input"
                    v-model="departureFilter"
                    type="search"
                    inputmode="numeric"
                    autocomplete="off"
                    placeholder="Digite o número"
                    class="tw:min-w-0 tw:dark:border-[#28514d] tw:dark:bg-[#0f2423] tw:dark:text-[#e5e7eb]"
                  />
                </label>
              </div>

              <div
                v-if="departuresStatus === 'loading'"
                class="mobilibus-state tw:flex tw:items-center tw:justify-between tw:gap-4 tw:rounded-xl tw:border tw:border-dashed tw:border-[#d0d5dd] tw:bg-white tw:p-4 tw:text-[#344054] tw:leading-[1.45] tw:dark:border-[#28514d] tw:dark:bg-[#0f2423] tw:dark:text-[#c7d7d4] tw:max-[920px]:items-stretch tw:max-[920px]:flex-col"
                role="status"
                aria-live="polite"
              >
                Consultando ônibus neste ponto...
              </div>
              <div
                v-else-if="departuresStatus === 'empty'"
                class="mobilibus-state tw:flex tw:items-center tw:justify-between tw:gap-4 tw:rounded-xl tw:border tw:border-dashed tw:border-[#d0d5dd] tw:bg-white tw:p-4 tw:text-[#344054] tw:leading-[1.45] tw:dark:border-[#28514d] tw:dark:bg-[#0f2423] tw:dark:text-[#c7d7d4] tw:max-[920px]:items-stretch tw:max-[920px]:flex-col"
                role="status"
              >
                Nenhuma partida foi informada para este ponto agora.
              </div>
              <div
                v-else-if="departuresStatus === 'error'"
                class="mobilibus-state mobilibus-state--error tw:flex tw:items-center tw:justify-between tw:gap-4 tw:rounded-xl tw:border tw:border-[#fda29b] tw:bg-[#fff5f5] tw:p-4 tw:text-[#b42318] tw:leading-[1.45] tw:dark:border-[#7f1d1d] tw:dark:bg-[#3b1717] tw:dark:text-[#fecaca] tw:max-[920px]:items-stretch tw:max-[920px]:flex-col"
                role="alert"
              >
                <span>{{ departuresError ?? 'Não foi possível consultar este ponto.' }}</span>
                <button type="button" class="primary tw:shrink-0 tw:border-bh-primary tw:bg-bh-primary tw:px-2.5 tw:py-2 tw:text-[.76rem] tw:text-white tw:dark:border-[#2dd4bf] tw:dark:bg-[#2dd4bf] tw:dark:text-[#082f2b]" @click="emit('retryDepartures')">
                  Tentar novamente
                </button>
              </div>
              <div
                v-else-if="departures && filteredDepartures.length === 0"
                class="mobilibus-state tw:flex tw:items-center tw:justify-between tw:gap-4 tw:rounded-xl tw:border tw:border-dashed tw:border-[#d0d5dd] tw:bg-white tw:p-4 tw:text-[#344054] tw:leading-[1.45] tw:dark:border-[#28514d] tw:dark:bg-[#0f2423] tw:dark:text-[#c7d7d4] tw:max-[920px]:items-stretch tw:max-[920px]:flex-col"
                role="status"
              >
                Nenhum ônibus corresponde ao número informado.
              </div>
              <div v-else-if="departures" class="mobilibus-departure-list tw:grid tw:gap-2" aria-live="polite">
                <article
                  v-for="(departure, departureIndex) in filteredDepartures"
                  :key="`${departure.routeId}-${departure.scheduledTime}-${departureIndex}`"
                  class="mobilibus-departure-card tw:grid tw:grid-cols-[minmax(0,1fr)_auto] tw:gap-2.5 tw:rounded-[10px] tw:border tw:border-[#dbe4ee] tw:bg-slate-50/[.82] tw:p-2.5 tw:dark:border-[#28514d] tw:dark:bg-[rgba(15,36,35,0.72)] tw:max-[920px]:grid-cols-1"
                >
                  <div class="mobilibus-departure-main tw:grid tw:min-w-0 tw:content-start tw:gap-[3px]">
                    <strong class="tw:text-bh-primary-hover tw:text-[1.08rem]">{{ departure.shortName }}</strong>
                    <span class="tw:overflow-hidden tw:text-ellipsis tw:whitespace-nowrap tw:text-[.82rem] tw:font-extrabold tw:text-[#344054] tw:dark:text-[#c7d7d4]">
                      {{ departure.headsign }}
                    </span>
                    <small class="tw:text-[.7rem] tw:leading-[1.35] tw:text-bh-muted">{{ departure.lineName }}</small>
                  </div>
                  <div class="mobilibus-departure-meta tw:grid tw:justify-items-end tw:gap-[3px] tw:text-right tw:max-[920px]:justify-items-start tw:max-[920px]:text-left">
                    <time class="tw:text-[1rem] tw:font-black tw:tabular-nums tw:text-bh-text tw:dark:text-[#e5e7eb]">{{ formatDepartureTime(departure) }}</time>
                    <span
                      class="mobilibus-realtime-badge tw:rounded-full tw:bg-[#dcfce7] tw:px-1.5 tw:py-[3px] tw:text-[.64rem] tw:font-black tw:text-[#166534] tw:whitespace-nowrap"
                      :class="{ 'is-planned': !departure.realtime }"
                    >
                      {{ departure.realtime ? 'Em tempo real' : 'Programado' }}
                    </span>
                    <small v-if="departure.vehicleId" class="tw:text-[.7rem] tw:leading-[1.35] tw:text-bh-muted">Ônibus {{ departure.vehicleId }}</small>
                    <small v-if="formatPositionAge(departure.positionAge)" class="tw:text-[.7rem] tw:leading-[1.35] tw:text-bh-muted">{{ formatPositionAge(departure.positionAge) }}</small>
                    <small v-if="formatDelay(departure.delay)" class="tw:text-[.7rem] tw:leading-[1.35] tw:text-bh-muted">{{ formatDelay(departure.delay) }}</small>
                  </div>
                </article>
              </div>
            </section>
          </div>
        </section>

        <div
          v-else
          class="mobilibus-stop-empty control-card tw:grid tw:gap-3 tw:rounded-[8px] tw:border tw:border-bh-border tw:bg-white tw:p-4 tw:text-bh-text tw:shadow-[0_10px_30px_rgba(16,24,40,0.05)] tw:dark:border-[#1f4a47] tw:dark:bg-[#132f2d] tw:dark:text-[#e5e7eb]"
          role="status"
        >
          <strong>Selecione um ponto no mapa</strong>
          <span class="tw:text-bh-muted tw:text-[0.82rem] tw:dark:text-[#9eb7b4]">Os detalhes das partidas aparecerão aqui.</span>
        </div>

        </aside>
      </div>
    </div>
  </section>
</template>
