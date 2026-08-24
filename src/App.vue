<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRef, watch } from 'vue';
import AppShell from './components/AppShell.vue';
import type { DashboardSection } from './components/AppShell.vue';
import MapView from './components/MapView.vue';
import type { UserLocation } from './components/MapView.vue';
import MobileBottomSheet from './components/MobileBottomSheet.vue';
import MobilibusLinesPanel from './components/MobilibusLinesPanel.vue';
import MonitoringPanel from './components/MonitoringPanel.vue';
import type {
  AlertSettings,
  NearbyStop,
  Prediction,
  RoutePoint,
  Vehicle,
} from './domain/types';
import type {
  MobilibusMapTile,
  MobilibusDeparturesStatus,
  MobilibusStop,
  MobilibusStopsStatus,
  MobilibusStopDepartures,
} from './domain/mobilibusTypes';
import { OTIMO_RMBH_PROJECT_ID } from './domain/mobilibusTypes';
import {
  fetchMobilibusDepartures,
  fetchMobilibusStops,
  fetchNearbyStops,
  fetchRoutePoints,
  fetchStopPredictions,
  fetchVehicles,
} from './services/apiClient';
import {
  createMapDataLoader,
  describeSelectedVehicleApproach,
  selectMapServiceId,
} from './services/mapDataService';
import { createNotificationService } from './services/notificationService';
import { createPredictionMonitor } from './services/predictionMonitor';
import {
  loadFavoriteStops,
  loadSettings,
  loadThemeMode,
  saveFavoriteStops,
  saveSettings,
  saveThemeMode,
} from './services/settingsStore';
import { createStopSelection, type SelectableStop } from './services/stopSelection';

const DEFAULT_NEARBY_STOPS: NearbyStop[] = [
  {
    code: '11073',
    publicCode: '40135',
    latitude: -19.914713,
    longitude: -43.993678,
    description: 'ROD ANEL RODOVIARIO CELSO MELLO AZEVEDO, 11950',
    color: 4,
  },
  {
    code: '14276',
    publicCode: '40170',
    latitude: -19.916051,
    longitude: -43.991969,
    description: 'PCA CAPELA NOVA, 20',
    color: 4,
  },
  {
    code: '13566',
    publicCode: '40134',
    latitude: -19.916136,
    longitude: -43.99563,
    description: 'ROD ANEL RODOVIARIO CELSO MELLO AZEVEDO, 11749',
    color: 4,
  },
  {
    code: '10024',
    publicCode: '40899',
    latitude: -19.913937,
    longitude: -43.994929,
    description: 'AVE IVAI, 158',
    color: 4,
  },
  {
    code: '6623',
    publicCode: '40900',
    latitude: -19.914441,
    longitude: -43.996139,
    description: 'AVE IVAI, 235',
    color: 4,
  },
  {
    code: '3443',
    publicCode: '40600',
    latitude: -19.914044,
    longitude: -43.990867,
    description: 'RUA PARA DE MINAS, 1005',
    color: 4,
  },
];

const isLocating = ref(false);
const locationStatus = ref('Use sua localização para encontrar pontos por perto.');
const userLocation = ref<UserLocation | null>(null);
const activeSection = ref<DashboardSection>('monitoramento');
const mobilibusStops = ref<MobilibusStop[]>([]);
const mobilibusStopsStatus = ref<MobilibusStopsStatus>('initial');
const mobilibusStopsError = ref<string | null>(null);
const selectedMobilibusStop = ref<MobilibusStop | null>(null);
const mobilibusDeparturesStatus = ref<MobilibusDeparturesStatus>('initial');
const mobilibusDepartures = ref<MobilibusStopDepartures | null>(null);
const mobilibusDeparturesError = ref<string | null>(null);
const route = ref<RoutePoint[]>([]);
const vehicles = ref<Vehicle[]>([]);
const activeMapServiceId = ref<string | null>(null);
const themeMode = ref(loadThemeMode());
const showNearbyStops = ref(true);
const notificationService = createNotificationService();
const permission = ref(notificationService.getPermission());
const mapDataLoader = createMapDataLoader({ fetchRoutePoints, fetchVehicles });
const predictionMonitor = createPredictionMonitor({
  initialSettings: loadSettings(),
  fetchPredictions: fetchStopPredictions,
  notifyArrival: input => notificationService.notifyArrival(input),
  onContextChange: context => {
    void refreshMapData(context.predictions, context.settings.lineCode, context.selectedPrediction);
  },
});
const stopSelection = createStopSelection({
  initialNearbyStops: DEFAULT_NEARBY_STOPS,
  initialSelectedStopCode: predictionMonitor.state.settings.stopCode,
  favorites: {
    load: loadFavoriteStops,
    save: saveFavoriteStops,
  },
  effects: {
    onStopSelected: stop => {
      activeSection.value = 'monitoramento';
      predictionMonitor.selectStop(stop);
    },
  },
});
const settings = toRef(predictionMonitor.state, 'settings');
const predictions = toRef(predictionMonitor.state, 'predictions');
const lastUpdated = toRef(predictionMonitor.state, 'lastUpdated');
const statusMessage = toRef(predictionMonitor.state, 'statusMessage');
const isLoading = toRef(predictionMonitor.state, 'isLoading');
const selectedPredictionId = toRef(predictionMonitor.state, 'selectedPredictionId');
const nearbyStops = toRef(stopSelection.state, 'nearbyStops');
const searchQuery = toRef(stopSelection.state, 'searchQuery');
const searchResults = toRef(stopSelection.state, 'searchResults');
const favoriteStops = toRef(stopSelection.state, 'favoriteStops');
const monitoredStop = toRef(stopSelection.state, 'monitoredStop');
const selectedStop = monitoredStop;
let mobilibusStopsRequestVersion = 0;
let mobilibusDeparturesRequestVersion = 0;
let mobilibusVisibleTiles: MobilibusMapTile[] = [];
const mobilibusStopsByTile = new Map<string, MobilibusStop[]>();
const mobilibusStopRequests = new Map<string, Promise<MobilibusStop[]>>();
const isSelectedStopFavorite = computed(
  () => !!selectedStop.value && favoriteStops.value.some(stop => stop.code === selectedStop.value?.code),
);
const selectedPrediction = computed(
  () => predictions.value.find(item => item.id === selectedPredictionId.value) ?? null,
);
const selectedVehicleStatus = computed(() =>
  describeSelectedVehicleApproach({
    prediction: selectedPrediction.value,
    monitoredStop: monitoredStop.value,
    route: route.value,
    vehicles: vehicles.value,
  }),
);

watch(
  settings,
  value => {
    saveSettings(value);
  },
  { deep: true },
);

watch(themeMode, value => {
  saveThemeMode(value);
});

async function requestPermission() {
  permission.value = await notificationService.requestPermission();
}

function updateSettings(next: AlertSettings) {
  stopSelection.syncSelectedStopCode(next.stopCode);
  predictionMonitor.updateSettings(next);
}

function navigate(section: DashboardSection) {
  activeSection.value = section;
}

function mobilibusErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function mobilibusTileKey(tile: MobilibusMapTile): string {
  return `${tile.x},${tile.y},${tile.zoom}`;
}

function rebuildMobilibusStops(tiles: MobilibusMapTile[]) {
  const byId = new Map<number, MobilibusStop>();
  for (const tile of tiles) {
    for (const stop of mobilibusStopsByTile.get(mobilibusTileKey(tile)) ?? []) {
      byId.set(stop.stopId, stop);
    }
  }

  mobilibusStops.value = [...byId.values()];
}

async function requestMobilibusTile(projectId: number, tile: MobilibusMapTile) {
  const key = mobilibusTileKey(tile);
  const pending = mobilibusStopRequests.get(key);
  if (pending) {
    return pending;
  }

  const request = fetchMobilibusStops(projectId, tile);
  mobilibusStopRequests.set(key, request);
  try {
    return await request;
  } finally {
    if (mobilibusStopRequests.get(key) === request) {
      mobilibusStopRequests.delete(key);
    }
  }
}

async function loadMobilibusStops(tiles: MobilibusMapTile[]) {
  const uniqueTiles = [...new Map(tiles.map(tile => [mobilibusTileKey(tile), tile])).values()];
  mobilibusVisibleTiles = uniqueTiles;
  if (uniqueTiles.length === 0) {
    mobilibusStopsRequestVersion += 1;
    mobilibusStops.value = [];
    mobilibusStopsStatus.value = 'initial';
    return;
  }

  const requestVersion = ++mobilibusStopsRequestVersion;
  const pendingTiles = uniqueTiles.filter(tile => !mobilibusStopsByTile.has(mobilibusTileKey(tile)));
  rebuildMobilibusStops(uniqueTiles);
  if (pendingTiles.length === 0) {
    mobilibusStopsStatus.value = mobilibusStops.value.length > 0 ? 'content' : 'empty';
    return;
  }

  mobilibusStopsError.value = null;
  mobilibusStopsStatus.value = 'loading';
  const results = await Promise.allSettled(
    pendingTiles.map(tile => requestMobilibusTile(OTIMO_RMBH_PROJECT_ID, tile)),
  );

  if (requestVersion !== mobilibusStopsRequestVersion) {
    return;
  }

  let firstError: unknown = null;
  for (const [index, result] of results.entries()) {
    if (result.status === 'fulfilled') {
      mobilibusStopsByTile.set(mobilibusTileKey(pendingTiles[index]), result.value);
    } else if (firstError === null) {
      firstError = result.reason;
    }
  }

  rebuildMobilibusStops(uniqueTiles);

  if (firstError !== null) {
    mobilibusStopsError.value = mobilibusErrorMessage(
      firstError,
      'Não foi possível carregar os pontos Mobilibus.',
    );
    mobilibusStopsStatus.value = 'error';
    return;
  }

  mobilibusStopsStatus.value = mobilibusStops.value.length > 0 ? 'content' : 'empty';
}

function retryMobilibusStops() {
  if (mobilibusVisibleTiles.length === 0) {
    return;
  }

  for (const tile of mobilibusVisibleTiles) {
    mobilibusStopsByTile.delete(mobilibusTileKey(tile));
  }
  mobilibusStopsError.value = null;
  void loadMobilibusStops(mobilibusVisibleTiles);
}

async function runMobilibusDepartures(stop: MobilibusStop, requestVersion: number) {
  try {
    const departures = await fetchMobilibusDepartures(stop);
    if (
      requestVersion !== mobilibusDeparturesRequestVersion ||
      selectedMobilibusStop.value?.projectId !== stop.projectId ||
      selectedMobilibusStop.value?.stopId !== stop.stopId
    ) {
      return;
    }

    mobilibusDepartures.value = departures;
    mobilibusDeparturesStatus.value = departures.departures.length > 0 ? 'content' : 'empty';
  } catch (error) {
    if (
      requestVersion !== mobilibusDeparturesRequestVersion ||
      selectedMobilibusStop.value?.projectId !== stop.projectId ||
      selectedMobilibusStop.value?.stopId !== stop.stopId
    ) {
      return;
    }

    mobilibusDepartures.value = null;
    mobilibusDeparturesError.value = mobilibusErrorMessage(
      error,
      'Não foi possível consultar os ônibus deste ponto.',
    );
    mobilibusDeparturesStatus.value = 'error';
  }
}

function selectMobilibusStop(stop: MobilibusStop) {
  selectedMobilibusStop.value = stop;
  mobilibusDepartures.value = null;
  mobilibusDeparturesError.value = null;
  const requestVersion = ++mobilibusDeparturesRequestVersion;
  mobilibusDeparturesStatus.value = 'loading';
  void runMobilibusDepartures(stop, requestVersion);
}

function retryMobilibusDepartures() {
  const stop = selectedMobilibusStop.value;
  if (!stop) {
    return;
  }

  mobilibusDeparturesError.value = null;
  const requestVersion = ++mobilibusDeparturesRequestVersion;
  mobilibusDeparturesStatus.value = 'loading';
  void runMobilibusDepartures(stop, requestVersion);
}

function updateSearch(query: string) {
  stopSelection.updateSearch(query);
}

function toggleTheme() {
  themeMode.value = themeMode.value === 'dark' ? 'light' : 'dark';
}

function toggleNearbyStops(nextValue: boolean) {
  showNearbyStops.value = nextValue;
}

function selectStop(stop: SelectableStop) {
  stopSelection.selectStop(stop);
}

function selectPrediction(prediction: Prediction) {
  predictionMonitor.selectPrediction(prediction.id);
}

function toggleSelectedStopFavorite() {
  stopSelection.toggleFavorite();
}

function removeFavoriteStop(stopCode: string) {
  stopSelection.removeFavorite(stopCode);
}

async function useCurrentLocation() {
  if (!navigator.geolocation) {
    statusMessage.value = 'Seu navegador não informou suporte a localização.';
    locationStatus.value = 'Geolocalização indisponível neste navegador.';
    return;
  }

  isLocating.value = true;
  locationStatus.value = 'Localizando...';

  navigator.geolocation.getCurrentPosition(
    position => {
      userLocation.value = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      void loadNearbyStops(position.coords.latitude, position.coords.longitude).finally(() => {
        isLocating.value = false;
      });
    },
    () => {
      statusMessage.value = 'Não foi possível acessar sua localização.';
      locationStatus.value = 'Não foi possível acessar sua localização.';
      isLocating.value = false;
    },
    { enableHighAccuracy: true, timeout: 10_000 },
  );
}

async function loadNearbyStops(
  latitude: number,
  longitude: number,
  source: 'user-location' | 'map-area' = 'user-location',
) {
  try {
    stopSelection.setNearbyStops(await fetchNearbyStops(latitude, longitude));
    if (source === 'user-location') {
      locationStatus.value = 'Você está aqui. Pontos próximos atualizados pelo GPS.';
      return;
    }

    locationStatus.value = 'Pontos desta área atualizados pelo mapa.';
  } catch (error) {
    statusMessage.value =
      error instanceof Error ? error.message : 'Erro ao consultar paradas próximas.';
    locationStatus.value =
      source === 'user-location'
        ? 'Erro ao consultar pontos próximos.'
        : 'Erro ao atualizar pontos desta área.';
  }
}

function updateNearbyStopsFromMap(center: UserLocation) {
  void loadNearbyStops(center.latitude, center.longitude, 'map-area');
}

async function refreshMapData(
  nextPredictions: Prediction[],
  lineCode: string,
  preferredPrediction: Prediction | null = null,
) {
  const serviceId =
    preferredPrediction?.serviceId && Number.isFinite(preferredPrediction.minutes)
      ? preferredPrediction.serviceId
      : selectMapServiceId(nextPredictions, lineCode);

  if (!serviceId) {
    activeMapServiceId.value = null;
    route.value = [];
    vehicles.value = [];
    return;
  }

  activeMapServiceId.value = serviceId;

  try {
    const data = await mapDataLoader.load(serviceId);
    if (!data || data.serviceId !== activeMapServiceId.value) {
      return;
    }

    route.value = data.route;
    vehicles.value = data.vehicles;
  } catch {
    route.value = [];
    vehicles.value = [];
  }
}

function handlePollingResume() {
  predictionMonitor.resume();
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    handlePollingResume();
  }
}

onMounted(() => {
  predictionMonitor.start();
  window.addEventListener('focus', handlePollingResume);
  window.addEventListener('pageshow', handlePollingResume);
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onBeforeUnmount(() => {
  mobilibusStopsRequestVersion += 1;
  mobilibusDeparturesRequestVersion += 1;
  predictionMonitor.stop();
  window.removeEventListener('focus', handlePollingResume);
  window.removeEventListener('pageshow', handlePollingResume);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});
</script>

<template>
  <div class="app-theme" :data-theme="themeMode">
    <AppShell
      :last-updated="lastUpdated"
      :is-loading="isLoading"
      :active-section="activeSection"
      :search-query="searchQuery"
      :search-results="searchResults"
      :theme-mode="themeMode"
      @navigate="navigate"
      @update-search="updateSearch"
      @select-stop="selectStop"
      @toggle-theme="toggleTheme"
    >
    <section v-if="activeSection === 'monitoramento'" class="dashboard-grid">
      <MonitoringPanel
        display-mode="predictions-only"
        :settings="settings"
        :predictions="predictions"
        :selected-prediction-id="selectedPredictionId"
        :status-message="statusMessage"
        :is-loading="isLoading"
        :permission="permission"
        :last-updated="lastUpdated"
        :selected-stop="selectedStop"
        :is-selected-stop-favorite="isSelectedStopFavorite"
        @update="updateSettings"
        @select-prediction="selectPrediction"
        @toggle-selected-stop-favorite="toggleSelectedStopFavorite"
      />

      <section class="map-stage">
        <MapView
          :monitored-stop="monitoredStop"
          :nearby-stops="nearbyStops"
          :route="route"
          :vehicles="vehicles"
          :theme-mode="themeMode"
          :selected-vehicle-id="selectedPrediction?.vehicleId ?? null"
          :selected-vehicle-status="selectedVehicleStatus"
          :user-location="userLocation"
          :is-locating="isLocating"
          :location-status="locationStatus"
          :show-nearby-stops="showNearbyStops"
          @use-current-location="useCurrentLocation"
          @move-map-area="updateNearbyStopsFromMap"
          @select-stop="selectStop"
          @toggle-nearby-stops="toggleNearbyStops"
          @toggle-theme="toggleTheme"
        />
      </section>

      <MobileBottomSheet
        display-mode="predictions-only"
        :settings="settings"
        :predictions="predictions"
        :selected-prediction-id="selectedPredictionId"
        :status-message="statusMessage"
        :is-loading="isLoading"
        :permission="permission"
        :last-updated="lastUpdated"
        :selected-stop="selectedStop"
        :is-selected-stop-favorite="isSelectedStopFavorite"
        @update="updateSettings"
        @select-prediction="selectPrediction"
        @toggle-selected-stop-favorite="toggleSelectedStopFavorite"
      />
    </section>

    <section v-else-if="activeSection === 'mapa'" class="dashboard-grid">
      <MonitoringPanel
        :settings="settings"
        :predictions="predictions"
        :selected-prediction-id="selectedPredictionId"
        :status-message="statusMessage"
        :is-loading="isLoading"
        :permission="permission"
        :last-updated="lastUpdated"
        :selected-stop="selectedStop"
        :is-selected-stop-favorite="isSelectedStopFavorite"
        @update="updateSettings"
        @select-prediction="selectPrediction"
        @toggle-selected-stop-favorite="toggleSelectedStopFavorite"
      />

      <section class="map-stage">
        <MapView
          :monitored-stop="monitoredStop"
          :nearby-stops="nearbyStops"
          :route="route"
          :vehicles="vehicles"
          :theme-mode="themeMode"
          :selected-vehicle-id="selectedPrediction?.vehicleId ?? null"
          :selected-vehicle-status="selectedVehicleStatus"
          :user-location="userLocation"
          :is-locating="isLocating"
          :location-status="locationStatus"
          :show-nearby-stops="showNearbyStops"
          @use-current-location="useCurrentLocation"
          @move-map-area="updateNearbyStopsFromMap"
          @select-stop="selectStop"
          @toggle-nearby-stops="toggleNearbyStops"
          @toggle-theme="toggleTheme"
        />
      </section>

      <MobileBottomSheet
        :settings="settings"
        :predictions="predictions"
        :selected-prediction-id="selectedPredictionId"
        :status-message="statusMessage"
        :is-loading="isLoading"
        :permission="permission"
        :last-updated="lastUpdated"
        :selected-stop="selectedStop"
        :is-selected-stop-favorite="isSelectedStopFavorite"
        @update="updateSettings"
        @select-prediction="selectPrediction"
        @toggle-selected-stop-favorite="toggleSelectedStopFavorite"
      />
    </section>

    <MobilibusLinesPanel
      v-else-if="activeSection === 'linhas'"
      :stops="mobilibusStops"
      :stops-status="mobilibusStopsStatus"
      :stops-error="mobilibusStopsError"
      :selected-stop="selectedMobilibusStop"
      :departures-status="mobilibusDeparturesStatus"
      :departures="mobilibusDepartures"
      :departures-error="mobilibusDeparturesError"
      :theme-mode="themeMode"
      @request-map-tiles="loadMobilibusStops"
      @retry-map="retryMobilibusStops"
      @select-stop="selectMobilibusStop"
      @retry-departures="retryMobilibusDepartures"
      @toggle-theme="toggleTheme"
    />

    <section v-else-if="activeSection === 'favoritos'" class="section-page">
      <div class="section-page-header">
        <p class="section-kicker">Favoritos</p>
        <h1>Favoritos salvos</h1>
        <p>Suas paradas mais usadas ficam aqui, com o endereço em destaque.</p>
      </div>
      <div v-if="favoriteStops.length > 0" class="placeholder-grid favorites-grid">
        <article v-for="favorite in favoriteStops" :key="favorite.code" class="control-card favorite-stop-card">
          <span class="section-kicker">Parada favorita</span>
          <h3>{{ favorite.description }}</h3>
          <p>Ponto {{ favorite.publicCode || favorite.code }}</p>
          <div class="favorite-stop-actions">
            <button type="button" class="primary" @click="selectStop(favorite)">Abrir parada</button>
            <button type="button" @click="removeFavoriteStop(favorite.code)">Remover</button>
          </div>
        </article>
      </div>
      <div v-else class="placeholder-grid">
        <article class="control-card">
          <strong>Nenhuma parada salva</strong>
          <span>Use a estrela no card de Ponto selecionado para guardar endereços frequentes.</span>
        </article>
      </div>
    </section>

    <section v-else-if="activeSection === 'historico'" class="section-page">
      <div class="section-page-header">
        <p class="section-kicker">Histórico</p>
        <h1>Histórico de alertas</h1>
        <p>Os próximos alertas enviados poderão ser listados aqui para auditoria rápida.</p>
      </div>
      <article class="control-card">
        <strong>Última atualização</strong>
        <span>{{ lastUpdated ?? 'Ainda sem consultas nesta sessão.' }}</span>
      </article>
    </section>

    <section v-else class="section-page">
      <div class="section-page-header">
        <p class="section-kicker">Configurações</p>
        <h1>Configurações do app</h1>
        <p>Ajustes de notificação, permissões e comportamento do PWA entram aqui nas próximas etapas.</p>
      </div>
      <div class="placeholder-grid">
        <article class="control-card">
          <strong>Permissão de notificação</strong>
          <span>{{ permission }}</span>
          <button type="button" class="primary" @click="requestPermission">
            Permitir notificações
          </button>
        </article>
        <article class="control-card">
          <strong>Atualização automática</strong>
          <span>Consultando a cada 10 segundos quando o monitoramento estiver ativo.</span>
        </article>
      </div>
    </section>
    </AppShell>
  </div>
</template>
