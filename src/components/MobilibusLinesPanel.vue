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
    class="section-page mobilibus-page mobilibus-lines-page tw:grid tw:min-h-[calc(100vh-79px)] tw:content-start tw:gap-5 tw:overflow-hidden tw:p-0"
    aria-label="Mapa e pontos Mobilibus"
  >
    <div class="mobilibus-lines-map-layout tw:relative tw:grid tw:min-h-[calc(100vh-79px)] tw:grid-cols-[360px_minmax(0,1fr)]">
      <div class="mobilibus-lines-map-stage tw:relative tw:col-start-2 tw:row-start-1 tw:min-w-0">
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
        class="mobilibus-mobile-bottom-sheet tw:contents"
        :class="`is-${sheetState}`"
        @touchstart.passive="onTouchStart"
        @touchend.passive="onTouchEnd"
      >
        <button
          type="button"
          class="sheet-toggle mobilibus-sheet-toggle tw:hidden tw:min-h-[34px] tw:w-full tw:place-items-center tw:border-0! tw:bg-transparent! tw:px-0! tw:py-[9px_0_6px]!"
          :aria-expanded="sheetState !== 'peek'"
          :aria-label="sheetState === 'peek' ? 'Expandir painel do Ótimo' : 'Recolher painel do Ótimo'"
          @click="toggleSheet"
        >
          <div class="sheet-handle tw:h-[5px] tw:w-12 tw:rounded-full tw:bg-[#d0d5dd]"></div>
        </button>

        <aside
          class="mobilibus-lines-control-panel tw:relative tw:z-[1] tw:col-start-1 tw:row-start-1 tw:grid tw:min-h-[calc(100vh-79px)] tw:min-w-0 tw:max-h-[calc(100vh-79px)] tw:gap-3 tw:overflow-y-auto tw:border-r tw:border-bh-border tw:bg-white tw:p-[18px]"
          aria-label="Detalhes do ponto Mobilibus"
        >
        <section
          v-if="selectedStop"
          class="control-card tw:grid tw:gap-3 tw:rounded-[8px] tw:border tw:border-bh-border tw:bg-white tw:p-4 tw:shadow-[0_10px_30px_rgba(16,24,40,0.05)]"
          aria-labelledby="selected-mobilibus-stop"
        >
          <article
            class="selected-stop-card mobilibus-selected-stop-card tw:relative tw:grid tw:gap-1.5 tw:rounded-[8px] tw:border tw:border-bh-border-accent tw:bg-bh-surface tw:p-[12px_54px_12px_12px]"
          >
            <button
              type="button"
              class="favorite-stop-button"
              :aria-label="isSelectedStopFavorite ? 'Remover ponto Ótimo dos favoritos' : 'Salvar ponto Ótimo'"
              :title="isSelectedStopFavorite ? 'Remover ponto Ótimo dos favoritos' : 'Salvar ponto Ótimo'"
              :data-active="isSelectedStopFavorite"
              @click="emit('toggleSelectedStopFavorite')"
            >
              <Star aria-hidden="true" />
            </button>
            <h3 id="selected-mobilibus-stop" class="tw:m-0 tw:text-bh-title tw:text-[1rem] tw:leading-[1.35]">
              {{ selectedStop.name }}
            </h3>
            <p v-if="selectedStop.address" class="mobilibus-selected-stop-address tw:m-0">{{ selectedStop.address }}</p>
            <p v-if="selectedStop.code" class="mobilibus-selected-stop-code tw:m-0">Código {{ selectedStop.code }}</p>
          </article>
        </section>

        <section
          v-if="selectedStop"
          class="collapse-section mobilibus-stop-departures-section tw:grid tw:gap-2"
          aria-labelledby="mobilibus-departures-heading"
        >
          <button
            type="button"
            class="collapse-toggle tw:flex tw:items-center tw:justify-between tw:rounded-[8px] tw:border tw:border-[#dbe4ee] tw:bg-[#f8fafc] tw:px-3.5 tw:py-3 tw:text-[.92rem] tw:font-extrabold tw:text-bh-text tw:shadow-[0_8px_24px_rgba(16,24,40,0.04)] tw:transition-colors tw:duration-[160ms]"
            :aria-expanded="openSections.departures"
            @click="openSections.departures = !openSections.departures"
          >
            <span id="mobilibus-departures-heading">Ônibus neste ponto</span>
            <component
              :is="openSections.departures ? ChevronUp : ChevronDown"
              class="tw:shrink-0"
              aria-hidden="true"
            />
          </button>
          <div v-show="openSections.departures" class="collapse-body tw:grid tw:gap-2.5">
            <section
              class="mobilibus-stop-departures control-card tw:grid tw:gap-3.5 tw:rounded-[8px] tw:border tw:border-bh-border tw:bg-white tw:p-4 tw:shadow-[0_10px_30px_rgba(16,24,40,0.05)]"
            >
              <div class="mobilibus-stop-filter-row tw:flex tw:items-end tw:justify-between tw:gap-3 tw:border-t tw:border-bh-border tw:pt-3.5">
                <label class="mobilibus-stop-filter tw:grid tw:flex-1 tw:gap-1.5" for="mobilibus-stop-filter-input">
                  <span class="tw:text-[.78rem] tw:font-extrabold tw:text-[#344054]">Filtrar linha ou ônibus</span>
                  <input
                    id="mobilibus-stop-filter-input"
                    v-model="departureFilter"
                    type="search"
                    inputmode="numeric"
                    autocomplete="off"
                    placeholder="Digite o número"
                    class="tw:min-w-0"
                  />
                </label>
              </div>

              <div
                v-if="departuresStatus === 'loading'"
                class="mobilibus-state tw:flex tw:items-center tw:justify-between tw:gap-4 tw:rounded-xl tw:border tw:border-dashed tw:border-[#d0d5dd] tw:bg-white tw:p-4 tw:text-[#344054] tw:leading-[1.45]"
                role="status"
                aria-live="polite"
              >
                Consultando ônibus neste ponto...
              </div>
              <div
                v-else-if="departuresStatus === 'empty'"
                class="mobilibus-state tw:flex tw:items-center tw:justify-between tw:gap-4 tw:rounded-xl tw:border tw:border-dashed tw:border-[#d0d5dd] tw:bg-white tw:p-4 tw:text-[#344054] tw:leading-[1.45]"
                role="status"
              >
                Nenhuma partida foi informada para este ponto agora.
              </div>
              <div
                v-else-if="departuresStatus === 'error'"
                class="mobilibus-state mobilibus-state--error tw:flex tw:items-center tw:justify-between tw:gap-4 tw:rounded-xl tw:border tw:border-[#fda29b] tw:bg-[#fff5f5] tw:p-4 tw:text-[#b42318] tw:leading-[1.45]"
                role="alert"
              >
                <span>{{ departuresError ?? 'Não foi possível consultar este ponto.' }}</span>
                <button type="button" class="primary tw:shrink-0 tw:px-2.5 tw:py-2 tw:text-[.76rem]" @click="emit('retryDepartures')">
                  Tentar novamente
                </button>
              </div>
              <div
                v-else-if="departures && filteredDepartures.length === 0"
                class="mobilibus-state tw:flex tw:items-center tw:justify-between tw:gap-4 tw:rounded-xl tw:border tw:border-dashed tw:border-[#d0d5dd] tw:bg-white tw:p-4 tw:text-[#344054] tw:leading-[1.45]"
                role="status"
              >
                Nenhum ônibus corresponde ao número informado.
              </div>
              <div v-else-if="departures" class="mobilibus-departure-list tw:grid tw:gap-2" aria-live="polite">
                <article
                  v-for="(departure, departureIndex) in filteredDepartures"
                  :key="`${departure.routeId}-${departure.scheduledTime}-${departureIndex}`"
                  class="mobilibus-departure-card tw:grid tw:grid-cols-[minmax(0,1fr)_auto] tw:gap-2.5 tw:rounded-[10px] tw:border tw:border-[#dbe4ee] tw:bg-slate-50/[.82] tw:p-2.5"
                >
                  <div class="mobilibus-departure-main tw:grid tw:min-w-0 tw:content-start tw:gap-[3px]">
                    <strong class="tw:text-bh-primary-hover tw:text-[1.08rem]">{{ departure.shortName }}</strong>
                    <span class="tw:overflow-hidden tw:text-ellipsis tw:whitespace-nowrap tw:text-[.82rem] tw:font-extrabold tw:text-[#344054]">
                      {{ departure.headsign }}
                    </span>
                    <small class="tw:text-[.7rem] tw:leading-[1.35] tw:text-bh-muted">{{ departure.lineName }}</small>
                  </div>
                  <div class="mobilibus-departure-meta tw:grid tw:justify-items-end tw:gap-[3px] tw:text-right">
                    <time class="tw:text-[1rem] tw:font-black tw:tabular-nums tw:text-bh-text">{{ formatDepartureTime(departure) }}</time>
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
          class="mobilibus-stop-empty control-card tw:grid tw:gap-3 tw:rounded-[8px] tw:border tw:border-bh-border tw:bg-white tw:p-4 tw:shadow-[0_10px_30px_rgba(16,24,40,0.05)]"
          role="status"
        >
          <strong>Selecione um ponto no mapa</strong>
          <span>Os detalhes das partidas aparecerão aqui.</span>
        </div>

        </aside>
      </div>
    </div>
  </section>
</template>
