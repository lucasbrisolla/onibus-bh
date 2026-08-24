<script setup lang="ts">
import { Star } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
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

const departureFilter = ref('');

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

watch(
  () => props.selectedStop?.stopId,
  () => {
    departureFilter.value = '';
  },
);
</script>

<template>
  <section class="section-page mobilibus-page mobilibus-lines-page" aria-label="Mapa e pontos Mobilibus">
    <div class="mobilibus-lines-map-layout">
      <div class="mobilibus-lines-map-stage">
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

      <aside class="mobilibus-lines-control-panel" aria-label="Detalhes do ponto Mobilibus">
        <section
          v-if="selectedStop"
          class="mobilibus-stop-departures control-card"
          aria-labelledby="selected-mobilibus-stop"
        >
          <div class="mobilibus-detail-heading">
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
            <p class="section-kicker">Ponto selecionado</p>
            <h2 id="selected-mobilibus-stop">{{ selectedStop.name }}</h2>
            <p v-if="selectedStop.address" class="mobilibus-fare">{{ selectedStop.address }}</p>
            <span v-if="selectedStop.code" class="mobilibus-stop-code">Código {{ selectedStop.code }}</span>
          </div>

          <div class="mobilibus-stop-filter-row">
            <label class="mobilibus-stop-filter" for="mobilibus-stop-filter-input">
              <span>Filtrar linha ou ônibus</span>
              <input
                id="mobilibus-stop-filter-input"
                v-model="departureFilter"
                type="search"
                inputmode="numeric"
                autocomplete="off"
                placeholder="Digite o número"
              />
            </label>
          </div>

          <div v-if="departuresStatus === 'loading'" class="mobilibus-state" role="status" aria-live="polite">
            Consultando ônibus neste ponto...
          </div>
          <div v-else-if="departuresStatus === 'empty'" class="mobilibus-state" role="status">
            Nenhuma partida foi informada para este ponto agora.
          </div>
          <div v-else-if="departuresStatus === 'error'" class="mobilibus-state mobilibus-state--error" role="alert">
            <span>{{ departuresError ?? 'Não foi possível consultar este ponto.' }}</span>
            <button type="button" class="primary" @click="emit('retryDepartures')">Tentar novamente</button>
          </div>
          <div v-else-if="departures && filteredDepartures.length === 0" class="mobilibus-state" role="status">
            Nenhum ônibus corresponde ao número informado.
          </div>
          <div v-else-if="departures" class="mobilibus-departure-list" aria-live="polite">
            <article
              v-for="(departure, departureIndex) in filteredDepartures"
              :key="`${departure.routeId}-${departure.scheduledTime}-${departureIndex}`"
              class="mobilibus-departure-card"
            >
              <div class="mobilibus-departure-main">
                <strong>{{ departure.shortName }}</strong>
                <span>{{ departure.headsign }}</span>
                <small>{{ departure.lineName }}</small>
              </div>
              <div class="mobilibus-departure-meta">
                <time>{{ formatDepartureTime(departure) }}</time>
                <span
                  class="mobilibus-realtime-badge"
                  :class="{ 'is-planned': !departure.realtime }"
                >
                  {{ departure.realtime ? 'Em tempo real' : 'Programado' }}
                </span>
                <small v-if="departure.vehicleId">Ônibus {{ departure.vehicleId }}</small>
                <small v-if="formatPositionAge(departure.positionAge)">{{ formatPositionAge(departure.positionAge) }}</small>
                <small v-if="formatDelay(departure.delay)">{{ formatDelay(departure.delay) }}</small>
              </div>
            </article>
          </div>
        </section>

        <div v-else class="mobilibus-stop-empty control-card" role="status">
          <strong>Selecione um ponto no mapa</strong>
          <span>Os detalhes das partidas aparecerão aqui.</span>
        </div>

      </aside>
    </div>
  </section>
</template>
