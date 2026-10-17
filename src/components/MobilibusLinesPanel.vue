<script setup lang="ts">
import { Clock3, ChevronDown, ChevronUp, Star } from '@lucide/vue';
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import type {
  MobilibusDeparture,
  MobilibusDeparturesStatus,
  MobilibusMapTile,
  MobilibusStop,
  MobilibusStopsStatus,
  MobilibusStopDepartures,
} from '../domain/mobilibusTypes';
import MobilibusMap from './MobilibusMap.vue';
import MobilePanelSheet from './MobilePanelSheet.vue';

interface DepartureGroup {
  key: string;
  shortName: string;
  lineColor: string | null;
  lineName: string;
  headsign: string;
  departures: MobilibusDeparture[];
}

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

const departureFilter = ref('');
const currentTime = ref(Date.now());
let currentTimeInterval: number | null = null;
const openSections = reactive({
  departures: true,
});

const emit = defineEmits<{
  requestMapTiles: [tiles: MobilibusMapTile[]];
  retryMap: [];
  selectStop: [stop: MobilibusStop];
  retryDepartures: [];
  toggleSelectedStopFavorite: [];
  toggleTheme: [];
}>();

onMounted(() => {
  currentTimeInterval = window.setInterval(() => {
    currentTime.value = Date.now();
  }, 30_000);
});

onBeforeUnmount(() => {
  if (currentTimeInterval !== null) {
    window.clearInterval(currentTimeInterval);
  }
});

function formatDepartureTime(departure: MobilibusDeparture): string {
  return departure.nextDay ? `${departure.scheduledTime} (+1)` : departure.scheduledTime;
}

function normalizeLineColor(color: string | null): string | null {
  const value = color?.trim() ?? '';
  return /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value) ? value : null;
}

function readableTextColor(background: string): '#000000' | '#FFFFFF' {
  const hex = background.slice(1);
  const expanded = hex.length === 3
    ? [...hex].map(channel => channel + channel).join('')
    : hex;
  const channels = [0, 2, 4].map(index => Number.parseInt(expanded.slice(index, index + 2), 16) / 255);
  const luminance = channels
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);

  return luminance > 0.179 ? '#000000' : '#FFFFFF';
}

function compareDepartureTimes(left: MobilibusDeparture, right: MobilibusDeparture): number {
  if (left.nextDay !== right.nextDay) {
    return left.nextDay ? 1 : -1;
  }

  return left.scheduledTime.localeCompare(right.scheduledTime);
}

function relativeDepartureText(departure: MobilibusDeparture): string | null {
  const rawReferenceTime = props.departures?.referenceTime;
  const scheduleMatch = departure.scheduledTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (rawReferenceTime === null || rawReferenceTime === undefined || !scheduleMatch) {
    return null;
  }

  const referenceTime = rawReferenceTime < 1_000_000_000_000 ? rawReferenceTime * 1000 : rawReferenceTime;
  if (!Number.isFinite(referenceTime)) {
    return null;
  }

  const age = currentTime.value - referenceTime;
  if (age < -30_000 || age > 120_000) {
    return null;
  }

  const referenceDate = new Date(referenceTime);
  const hour = Number(scheduleMatch[1]);
  const minute = Number(scheduleMatch[2]);
  const second = Number(scheduleMatch[3] ?? 0);
  if (hour > 23 || minute > 59 || second > 59) {
    return null;
  }

  const scheduledDate = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate() + (departure.nextDay ? 1 : 0),
    hour,
    minute,
    second,
  );
  const remaining = scheduledDate.getTime() - currentTime.value;
  if (remaining <= 0 || remaining > 48 * 60 * 60 * 1000) {
    return null;
  }

  return `em ${Math.max(1, Math.ceil(remaining / 60_000))} min`;
}

function formatDepartureDetails(departure: MobilibusDeparture): string | null {
  const details = [
    departure.vehicleId ? `Ônibus ${departure.vehicleId}` : null,
    formatPositionAge(departure.positionAge),
    formatDelay(departure.delay),
  ].filter((value): value is string => value !== null);

  return details.length > 0 ? details.join(' · ') : null;
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

const filteredDepartureGroups = computed<DepartureGroup[]>(() => {
  const departures = props.departures?.departures ?? [];
  const query = departureFilter.value.trim().toLocaleLowerCase('pt-BR');
  const groups = new Map<string, DepartureGroup>();

  for (const departure of departures) {
    const key = `${departure.routeId}:${departure.headsign.trim().toLocaleLowerCase('pt-BR')}`;
    const group = groups.get(key);
    if (group) {
      group.departures.push(departure);
      group.lineColor ??= normalizeLineColor(departure.color);
      continue;
    }

    groups.set(key, {
      key,
      shortName: departure.shortName,
      lineColor: normalizeLineColor(departure.color),
      lineName: departure.lineName,
      headsign: departure.headsign,
      departures: [departure],
    });
  }

  return [...groups.values()]
    .map(group => {
      const groupMatches = [group.shortName, group.lineName, group.headsign]
        .some(value => value.toLocaleLowerCase('pt-BR').includes(query));
      const matchingDepartures = groupMatches || !query
        ? group.departures
        : group.departures.filter(departure => departure.vehicleId?.toLocaleLowerCase('pt-BR').includes(query));

      return {
        ...group,
        departures: [...matchingDepartures].sort(compareDepartureTimes),
      };
    })
    .filter(group => group.departures.length > 0)
    .sort((left, right) => compareDepartureTimes(left.departures[0], right.departures[0]));
});

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
    class="section-page mobilibus-page mobilibus-lines-page tw:grid tw:min-h-[calc(100vh-79px)] tw:content-start tw:gap-5 tw:overflow-hidden tw:bg-white tw:p-0 tw:dark:bg-bh-surface-2 tw:dark:text-[#e5e7eb] tw:max-[920px]:min-h-[calc(100vh-62px)]"
    aria-label="Mapa e pontos do Ótimo"
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

      <MobilePanelSheet
        class="mobilibus-mobile-bottom-sheet"
        panel-name="do Ótimo"
        placement="map"
        :theme-mode="themeMode"
      >
        <aside
          class="mobilibus-lines-control-panel tw:relative tw:z-[1] tw:col-start-1 tw:row-start-1 tw:grid tw:min-h-[calc(100vh-79px)] tw:min-w-0 tw:max-h-[calc(100vh-79px)] tw:gap-3 tw:overflow-y-auto tw:rounded-none tw:border-r tw:border-bh-border tw:bg-white tw:p-[18px] tw:shadow-none tw:backdrop-blur-none tw:dark:border-[#1f4a47] tw:dark:bg-bh-surface-2 tw:dark:text-[#e5e7eb] tw:max-[920px]:z-auto tw:max-[920px]:col-auto tw:max-[920px]:row-auto tw:max-[920px]:min-h-0 tw:max-[920px]:flex-1 tw:max-[920px]:h-[calc(100%-34px)] tw:max-[920px]:max-h-[calc(100%-34px)] tw:max-[920px]:border-0! tw:max-[920px]:bg-transparent! tw:max-[920px]:p-[6px_8px_10px]"
          aria-label="Detalhes do ponto do Ótimo"
        >
        <section
          v-if="selectedStop"
          class="control-card tw:grid tw:gap-3 tw:rounded-[8px] tw:border tw:border-bh-border tw:bg-white tw:p-4 tw:shadow-[0_10px_30px_var(--bh-shadow-08)] tw:dark:border-[#1f4a47] tw:dark:bg-bh-surface-2 tw:dark:text-[#e5e7eb]"
          aria-labelledby="selected-mobilibus-stop"
        >
          <article
            class="selected-stop-card mobilibus-selected-stop-card tw:relative tw:grid tw:gap-1.5 tw:rounded-[8px] tw:border tw:border-bh-border-accent tw:bg-bh-surface tw:p-[12px_54px_12px_12px] tw:dark:border-[#134e4a] tw:dark:bg-[#134e4a] tw:max-[920px]:gap-1 tw:max-[920px]:p-[8px_44px_8px_8px]"
          >
            <button
              type="button"
              class="favorite-stop-button tw:absolute tw:right-2.5 tw:top-2.5 tw:grid tw:size-[34px] tw:place-items-center tw:rounded-full tw:border tw:border-[var(--bh-accent-16)] tw:bg-[var(--bh-accent-08)] tw:p-0 tw:text-bh-accent tw:transition-colors tw:duration-[160ms] tw:hover:bg-[var(--bh-accent-16)] tw:dark:border-[var(--bh-focus-16)] tw:dark:bg-[var(--bh-mint-08)] tw:dark:text-[#5eead4] tw:dark:hover:bg-[var(--bh-mint-16)] tw:max-[920px]:size-[30px]"
              :class="isSelectedStopFavorite ? 'tw:border-[#d97706] tw:bg-[#fff7ed] tw:text-[#d97706] tw:dark:border-[#fbbf24] tw:dark:bg-[#3b2410] tw:dark:text-[#fbbf24]' : ''"
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
            class="collapse-toggle tw:flex tw:items-center tw:justify-between tw:rounded-[8px] tw:border tw:border-[#d0d5dd] tw:bg-[#f9fafb] tw:px-3.5 tw:py-3 tw:text-[.92rem] tw:font-extrabold tw:text-bh-text tw:shadow-[0_8px_24px_var(--bh-shadow-08)] tw:transition-colors tw:duration-[160ms] tw:hover:bg-[#f2f4f7] tw:dark:border-[#1f4a47] tw:dark:bg-bh-surface-2 tw:dark:text-[#e5e7eb] tw:dark:hover:bg-bh-surface-3 tw:max-[920px]:min-h-[34px] tw:max-[920px]:px-2.5 tw:max-[920px]:py-2"
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
              class="mobilibus-stop-departures control-card tw:grid tw:gap-3.5 tw:rounded-[8px] tw:border tw:border-bh-border tw:bg-white tw:p-4 tw:shadow-[0_10px_30px_var(--bh-shadow-08)] tw:dark:border-[#1f4a47] tw:dark:bg-bh-surface-2 tw:dark:text-[#e5e7eb]"
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
                    class="tw:min-w-0 tw:dark:border-[#28514d] tw:dark:bg-bh-surface-inset tw:dark:text-[#e5e7eb]"
                  />
                </label>
              </div>

              <div
                v-if="departuresStatus === 'loading'"
                class="mobilibus-state tw:grid tw:gap-2.5 tw:rounded-xl tw:border tw:border-dashed tw:border-[#d0d5dd] tw:bg-white tw:p-3 tw:dark:border-[#28514d] tw:dark:bg-bh-surface-inset"
                role="status"
                aria-live="polite"
              >
                <span class="tw:sr-only">Carregando partidas do ponto</span>
                <span v-for="placeholder in 3" :key="placeholder" class="tw:grid tw:gap-2 tw:rounded-[10px] tw:border tw:border-[#e4e7ec] tw:p-3 tw:dark:border-[#28514d]" aria-hidden="true">
                  <span class="tw:h-3.5 tw:w-16 tw:animate-pulse tw:rounded tw:bg-[#e4e7ec] tw:dark:bg-[#28514d]"></span>
                  <span class="tw:h-3 tw:w-4/5 tw:animate-pulse tw:rounded tw:bg-[#f2f4f7] tw:dark:bg-[#1f4a47]"></span>
                  <span class="tw:h-7 tw:w-24 tw:animate-pulse tw:rounded-lg tw:bg-[#f2f4f7] tw:dark:bg-[#1f4a47]"></span>
                </span>
              </div>
              <div
                v-else-if="departuresStatus === 'empty'"
                class="mobilibus-state tw:flex tw:items-center tw:justify-between tw:gap-4 tw:rounded-xl tw:border tw:border-dashed tw:border-[#d0d5dd] tw:bg-white tw:p-4 tw:text-[#344054] tw:leading-[1.45] tw:dark:border-[#28514d] tw:dark:bg-bh-surface-inset tw:dark:text-[#c7d7d4] tw:max-[920px]:items-stretch tw:max-[920px]:flex-col"
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
                v-else-if="departures && filteredDepartureGroups.length === 0"
                class="mobilibus-state tw:flex tw:items-center tw:justify-between tw:gap-4 tw:rounded-xl tw:border tw:border-dashed tw:border-[#d0d5dd] tw:bg-white tw:p-4 tw:text-[#344054] tw:leading-[1.45] tw:dark:border-[#28514d] tw:dark:bg-bh-surface-inset tw:dark:text-[#c7d7d4] tw:max-[920px]:items-stretch tw:max-[920px]:flex-col"
                role="status"
              >
                Nenhum ônibus corresponde ao número informado.
              </div>
              <div v-else-if="departures" class="mobilibus-departure-list tw:grid tw:gap-2.5" aria-live="polite">
                <article
                  v-for="group in filteredDepartureGroups"
                  :key="group.key"
                  class="mobilibus-departure-group tw:grid tw:gap-3 tw:rounded-[10px] tw:border tw:border-[#d0d5dd] tw:bg-bh-surface-1 tw:p-3 tw:dark:border-[#28514d] tw:dark:bg-[var(--bh-glass-inset-soft)]"
                >
                  <div class="mobilibus-departure-main tw:grid tw:min-w-0 tw:gap-1">
                    <div class="tw:flex tw:items-baseline tw:justify-between tw:gap-2">
                      <strong
                        class="tw:inline-flex tw:items-center tw:rounded-md tw:px-1.5 tw:py-0.5 tw:text-[1.08rem] tw:font-extrabold tw:leading-none tw:dark:text-[#5eead4]"
                        :class="group.lineColor ? 'tw:dark:text-white' : 'tw:text-bh-primary-hover tw:dark:bg-bh-surface-3'"
                        :style="group.lineColor
                          ? { backgroundColor: group.lineColor, color: readableTextColor(group.lineColor) }
                          : undefined"
                      >{{ group.shortName }}</strong>
                      <small class="tw:shrink-0 tw:text-[.68rem] tw:font-semibold tw:text-bh-muted tw:dark:text-[#9eb7b4]">{{ group.departures.length }} {{ group.departures.length === 1 ? 'horário' : 'horários' }}</small>
                    </div>
                    <span class="tw:break-words tw:text-[.88rem] tw:font-bold tw:leading-[1.35] tw:text-[#344054] tw:dark:text-[#c7d7d4]">
                      {{ group.headsign }}
                    </span>
                    <small v-if="group.lineName && group.lineName !== group.shortName" class="tw:break-words tw:text-[.72rem] tw:leading-[1.35] tw:text-bh-muted tw:dark:text-[#9eb7b4]">{{ group.lineName }}</small>
                  </div>

                  <ul class="mobilibus-departure-times tw:m-0 tw:flex tw:list-none tw:flex-wrap tw:gap-2 tw:p-0">
                    <li
                      v-for="(departure, departureIndex) in group.departures"
                      :key="`${departure.routeId}-${departure.scheduledTime}-${departure.vehicleId ?? departureIndex}`"
                      class="mobilibus-departure-chip tw:grid tw:min-w-[106px] tw:gap-1.5 tw:rounded-lg tw:border tw:px-2.5 tw:py-2"
                      :class="departure.realtime
                        ? 'tw:border-[#a7f3d0] tw:bg-[#f0fdf4] tw:dark:border-[#1f6651] tw:dark:bg-[#153a2c]'
                        : 'tw:border-[#d0d5dd] tw:bg-[#f2f4f7] tw:dark:border-[#28514d] tw:dark:bg-bh-surface-inset'"
                      :aria-label="`${departure.realtime ? 'Em tempo real' : 'Programado'}, às ${formatDepartureTime(departure)}${relativeDepartureText(departure) ? `, ${relativeDepartureText(departure)} pelo horário informado` : ''}`"
                      :title="formatDepartureDetails(departure) ?? (relativeDepartureText(departure) ? 'Tempo calculado a partir do horário informado na consulta.' : '')"
                    >
                      <time class="tw:text-[.98rem] tw:font-black tw:leading-none tw:tabular-nums" :class="departure.realtime ? 'tw:text-[#166534] tw:dark:text-[#86efac]' : 'tw:text-[#475467] tw:dark:text-[#c7d7d4]'">{{ formatDepartureTime(departure) }}</time>
                      <span class="tw:flex tw:items-center tw:gap-1 tw:text-[.66rem] tw:font-bold tw:leading-tight" :class="departure.realtime ? 'tw:text-[#166534] tw:dark:text-[#86efac]' : 'tw:text-[#475467] tw:dark:text-[#c7d7d4]'">
                        <span v-if="departure.realtime" class="tw:size-1.5 tw:animate-pulse tw:rounded-full tw:bg-[#16a34a] tw:dark:bg-[#4ade80]" aria-hidden="true"></span>
                        <Clock3 v-else class="tw:size-3.5 tw:shrink-0" aria-hidden="true" />
                        {{ departure.realtime ? 'Em tempo real' : 'Programado' }}
                      </span>
                      <span v-if="relativeDepartureText(departure)" class="tw:text-[.72rem] tw:font-semibold tw:leading-tight" :class="departure.realtime ? 'tw:text-[#166534] tw:dark:text-[#86efac]' : 'tw:text-[#475467] tw:dark:text-[#c7d7d4]'">{{ relativeDepartureText(departure) }}</span>
                      <small v-if="formatDepartureDetails(departure)" class="tw:max-w-[160px] tw:truncate tw:text-[.62rem] tw:leading-tight tw:text-bh-muted tw:dark:text-[#c7d7d4]">{{ formatDepartureDetails(departure) }}</small>
                    </li>
                  </ul>
                  <small v-if="group.departures.some(departure => relativeDepartureText(departure))" class="tw:text-[.67rem] tw:leading-[1.35] tw:text-bh-muted tw:dark:text-[#9eb7b4]">Tempo calculado a partir do horário informado na consulta.</small>
                </article>
              </div>
            </section>
          </div>
        </section>

        <div
          v-else
          class="mobilibus-stop-empty control-card tw:grid tw:gap-3 tw:rounded-[8px] tw:border tw:border-bh-border tw:bg-white tw:p-4 tw:text-bh-text tw:shadow-[0_10px_30px_var(--bh-shadow-08)] tw:dark:border-[#1f4a47] tw:dark:bg-bh-surface-2 tw:dark:text-[#e5e7eb]"
          role="status"
        >
          <strong>Selecione um ponto no mapa</strong>
          <span class="tw:text-bh-muted tw:text-[0.82rem] tw:dark:text-[#9eb7b4]">Os detalhes das partidas aparecerão aqui.</span>
        </div>

        </aside>
      </MobilePanelSheet>
    </div>
  </section>
</template>
