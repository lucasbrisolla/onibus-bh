<script setup lang="ts">
import { useEventListener, useStorage } from '@vueuse/core';
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
  PredictionAlertRequest,
  RoutePoint,
  Vehicle,
} from './domain/types';
import type {
  MobilibusMapTile,
  MobilibusStop,
} from './domain/mobilibusTypes';
import {
  fetchMobilibusDepartures,
  fetchMobilibusStops,
  fetchNearbyStops,
  fetchRoutePoints,
  fetchVehicles,
} from './services/apiClient';
import {
  createMapDataLoader,
  describeSelectedVehicleApproach,
  selectMapServiceId,
} from './services/mapDataService';
import { createNotificationService, type PermissionState } from './services/notificationService';
import { createMobilibusCatalog } from './services/mobilibusCatalog';
import { createPredictionMonitor } from './services/predictionMonitor';
import { queryClient } from './services/queryClient';
import { createQueryScope, stopPredictionsQueryOptions } from './services/queryOptions';
import {
  loadFavoriteStops,
  loadMobilibusFavoriteStops,
  loadSettings,
  loadThemeMode,
  saveFavoriteStops,
  saveMobilibusFavoriteStops,
  saveSettings,
} from './services/settingsStore';
import type { ThemeMode } from './services/settingsStore';
import { createStopSelection, type SelectableStop } from './services/stopSelection';
import { useCurrentLocation as useCurrentLocationComposable } from './composables/useCurrentLocation';

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
const activeSection = ref<DashboardSection>('mapa');
const mobilibusCatalog = createMobilibusCatalog({
  fetchStops: fetchMobilibusStops,
  fetchDepartures: fetchMobilibusDepartures,
  favorites: {
    load: loadMobilibusFavoriteStops,
    save: saveMobilibusFavoriteStops,
  },
});
const mobilibusStops = toRef(mobilibusCatalog.state, 'stops');
const mobilibusStopsStatus = toRef(mobilibusCatalog.state, 'stopsStatus');
const mobilibusStopsError = toRef(mobilibusCatalog.state, 'stopsError');
const selectedMobilibusStop = toRef(mobilibusCatalog.state, 'selectedStop');
const mobilibusFavoriteStops = toRef(mobilibusCatalog.state, 'favoriteStops');
const mobilibusDeparturesStatus = toRef(mobilibusCatalog.state, 'departuresStatus');
const mobilibusDepartures = toRef(mobilibusCatalog.state, 'departures');
const mobilibusDeparturesError = toRef(mobilibusCatalog.state, 'departuresError');
const isSelectedMobilibusStopFavorite = toRef(
  mobilibusCatalog.state,
  'isSelectedStopFavorite',
);
const route = ref<RoutePoint[]>([]);
const vehicles = ref<Vehicle[]>([]);
const activeMapServiceId = ref<string | null>(null);
const themeMode = useStorage<ThemeMode>('onibus-bh-theme', loadThemeMode(), undefined, {
  writeDefaults: false,
  serializer: {
    read: value => (value === 'dark' ? 'dark' : 'light'),
    write: value => value,
  },
  onError: () => {
    // O tema continua funcionando em memória quando o storage não está disponível.
  },
});
const currentLocation = useCurrentLocationComposable({
  enableHighAccuracy: true,
  timeout: 10_000,
});
const showNearbyStops = ref(true);
const notificationService = createNotificationService();
const permission = ref(notificationService.getPermission());
const mapDataLoader = createMapDataLoader({ fetchRoutePoints, fetchVehicles });
const predictionQueryScope = createQueryScope();
const predictionMonitor = createPredictionMonitor({
  initialSettings: loadSettings(),
  fetchPredictions: stopCode =>
    queryClient.fetchQuery(stopPredictionsQueryOptions(stopCode, predictionQueryScope)),
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
      activeSection.value = 'mapa';
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

async function requestPermission(): Promise<PermissionState> {
  permission.value = await notificationService.requestPermission();
  return permission.value;
}

function updateSettings(next: AlertSettings) {
  stopSelection.syncSelectedStopCode(next.stopCode);
  predictionMonitor.updateSettings(next);
}

function navigate(section: DashboardSection) {
  activeSection.value = section;
}

function loadMobilibusStops(tiles: MobilibusMapTile[]) {
  void mobilibusCatalog.loadVisibleTiles(tiles);
}

function retryMobilibusStops() {
  void mobilibusCatalog.retryVisibleTiles();
}

function selectMobilibusStop(stop: MobilibusStop) {
  void mobilibusCatalog.selectStop(stop);
}

function retryMobilibusDepartures() {
  void mobilibusCatalog.retryDepartures();
}

function toggleSelectedMobilibusStopFavorite() {
  mobilibusCatalog.toggleSelectedStopFavorite();
}

function removeMobilibusFavoriteStop(stop: MobilibusStop) {
  mobilibusCatalog.removeFavoriteStop(stop);
}

function openMobilibusFavoriteStop(stop: MobilibusStop) {
  activeSection.value = 'linhas';
  void mobilibusCatalog.openFavoriteStop(stop);
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

async function createAlertFromPrediction({ prediction, scope }: PredictionAlertRequest) {
  const nextPermission = permission.value === 'granted' ? permission.value : await requestPermission();
  const variantFilter =
    scope === 'variant' && (prediction.variant === 'direto' || prediction.variant === 'nao-direto')
      ? prediction.variant
      : 'qualquer';

  predictionMonitor.updateSettings({
    ...predictionMonitor.state.settings,
    lineCode: prediction.lineCode,
    variantFilter,
    enabled: nextPermission === 'granted',
    lastNotifiedPredictionId: null,
  });
  activeSection.value = 'monitoramento';
}

function toggleSelectedStopFavorite() {
  stopSelection.toggleFavorite();
}

function removeFavoriteStop(stopCode: string) {
  stopSelection.removeFavorite(stopCode);
}

async function useCurrentLocation() {
  if (!currentLocation.isSupported.value) {
    statusMessage.value = 'Seu navegador não informou suporte a localização.';
    locationStatus.value = 'Geolocalização indisponível neste navegador.';
    return;
  }

  isLocating.value = true;
  locationStatus.value = 'Localizando...';

  try {
    const location = await currentLocation.request();
    userLocation.value = location;
    await loadNearbyStops(location.latitude, location.longitude);
  } catch {
    statusMessage.value = 'Não foi possível acessar sua localização.';
    locationStatus.value = 'Não foi possível acessar sua localização.';
  } finally {
    isLocating.value = false;
  }
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

useEventListener(window, 'focus', handlePollingResume);
useEventListener(window, 'pageshow', handlePollingResume);
useEventListener(document, 'visibilitychange', handleVisibilityChange);

onMounted(() => {
  predictionMonitor.start();
});

onBeforeUnmount(() => {
  mobilibusCatalog.dispose();
  predictionMonitor.stop();
});
</script>

<template>
  <div class="app-theme tw:min-h-screen tw:bg-[#eef2f7] tw:text-bh-text tw:dark:bg-[#081b1a] tw:dark:text-[#e5e7eb]" :data-theme="themeMode">
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
    <section
      v-if="activeSection === 'mapa'"
      class="dashboard-grid tw:relative tw:grid tw:min-h-0 tw:grid-cols-[360px_minmax(0,1fr)] tw:max-[920px]:grid-cols-1"
    >
      <MonitoringPanel
        class="desktop-monitoring-panel tw:max-[920px]:hidden"
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
        @create-alert="createAlertFromPrediction"
        @toggle-selected-stop-favorite="toggleSelectedStopFavorite"
        @request-permission="requestPermission"
      />

      <section class="map-stage tw:relative tw:min-w-0 tw:min-h-[calc(100vh-79px)] tw:max-[920px]:min-h-[calc(100vh-62px)]">
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
        :theme-mode="themeMode"
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
        @create-alert="createAlertFromPrediction"
        @toggle-selected-stop-favorite="toggleSelectedStopFavorite"
        @request-permission="requestPermission"
      />
    </section>

    <section
      v-else-if="activeSection === 'monitoramento'"
      class="dashboard-grid tw:relative tw:grid tw:min-h-0 tw:grid-cols-[360px_minmax(0,1fr)] tw:max-[920px]:grid-cols-1"
    >
      <MonitoringPanel
        class="desktop-monitoring-panel tw:max-[920px]:hidden"
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
        @create-alert="createAlertFromPrediction"
        @toggle-selected-stop-favorite="toggleSelectedStopFavorite"
        @request-permission="requestPermission"
      />

      <section class="map-stage tw:relative tw:min-w-0 tw:min-h-[calc(100vh-79px)] tw:max-[920px]:min-h-[calc(100vh-62px)]">
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
        :theme-mode="themeMode"
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
        @create-alert="createAlertFromPrediction"
        @toggle-selected-stop-favorite="toggleSelectedStopFavorite"
        @request-permission="requestPermission"
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
      :is-selected-stop-favorite="isSelectedMobilibusStopFavorite"
      :theme-mode="themeMode"
      @request-map-tiles="loadMobilibusStops"
      @retry-map="retryMobilibusStops"
      @select-stop="selectMobilibusStop"
      @retry-departures="retryMobilibusDepartures"
      @toggle-selected-stop-favorite="toggleSelectedMobilibusStopFavorite"
      @toggle-theme="toggleTheme"
    />

    <section
      v-else-if="activeSection === 'favoritos'"
      class="section-page tw:grid tw:min-h-[calc(100vh-79px)] tw:content-start tw:gap-5 tw:overflow-y-auto tw:bg-white tw:p-7 tw:dark:bg-[#132f2d] tw:dark:text-[#e5e7eb]"
    >
      <div class="section-page-header tw:grid tw:max-w-[720px] tw:gap-2">
        <p class="section-kicker tw:m-0 tw:text-bh-primary tw:text-[.72rem] tw:font-black tw:uppercase tw:dark:text-[#5eead4]">Favoritos</p>
        <h1 class="tw:m-0 tw:text-bh-text tw:text-[clamp(1.6rem,3vw,2.35rem)] tw:leading-[1.15] tw:dark:text-[#f9fafb]">Favoritos salvos</h1>
        <p class="tw:m-0 tw:text-bh-muted tw:leading-[1.55] tw:dark:text-[#9eb7b4]">Suas paradas mais usadas ficam aqui, com o endereço em destaque.</p>
      </div>
      <div
        v-if="favoriteStops.length > 0 || mobilibusFavoriteStops.length > 0"
        class="placeholder-grid favorites-grid tw:grid tw:grid-cols-[repeat(auto-fit,minmax(240px,1fr))] tw:gap-4"
      >
        <article
          v-for="favorite in favoriteStops"
          :key="favorite.code"
          class="control-card favorite-stop-card tw:grid tw:gap-3 tw:rounded-[8px] tw:border tw:border-bh-border tw:bg-white tw:p-4 tw:text-bh-text tw:shadow-[0_10px_30px_rgba(16,24,40,0.05)] tw:dark:border-[#1f4a47] tw:dark:bg-[#132f2d] tw:dark:text-[#e5e7eb]"
        >
          <span class="section-kicker tw:text-bh-primary tw:text-[.72rem] tw:font-black tw:uppercase tw:dark:text-[#5eead4]">Parada favorita</span>
          <h3 class="tw:m-0 tw:text-bh-title tw:text-[1rem] tw:leading-[1.35] tw:dark:text-[#f9fafb]">{{ favorite.description }}</h3>
          <p class="tw:m-0 tw:text-bh-primary-hover tw:text-[0.9rem] tw:font-bold tw:dark:text-[#5eead4]">
            Ponto {{ favorite.publicCode || favorite.code }}
          </p>
          <div class="favorite-stop-actions tw:flex tw:flex-wrap tw:gap-2.5">
            <button
              type="button"
              class="primary tw:border-bh-primary tw:bg-bh-primary tw:text-white tw:dark:border-[#2dd4bf] tw:dark:bg-[#2dd4bf] tw:dark:text-[#082f2b]"
              @click="selectStop(favorite)"
            >Abrir parada</button>
            <button type="button" class="tw:dark:border-[#28514d] tw:dark:bg-[#0f2423] tw:dark:text-[#e5e7eb]" @click="removeFavoriteStop(favorite.code)">Remover</button>
          </div>
        </article>
        <article
          v-for="favorite in mobilibusFavoriteStops"
          :key="`mobilibus-${favorite.projectId}-${favorite.stopId}`"
          class="control-card favorite-stop-card tw:grid tw:gap-3 tw:rounded-[8px] tw:border tw:border-bh-border tw:bg-white tw:p-4 tw:text-bh-text tw:shadow-[0_10px_30px_rgba(16,24,40,0.05)] tw:dark:border-[#1f4a47] tw:dark:bg-[#132f2d] tw:dark:text-[#e5e7eb]"
        >
          <span class="section-kicker tw:text-bh-primary tw:text-[.72rem] tw:font-black tw:uppercase tw:dark:text-[#5eead4]">Ponto Ótimo favorito</span>
          <h3 class="tw:m-0 tw:text-bh-title tw:text-[1rem] tw:leading-[1.35] tw:dark:text-[#f9fafb]">{{ favorite.name }}</h3>
          <p class="tw:m-0 tw:text-bh-primary-hover tw:text-[0.9rem] tw:font-bold tw:dark:text-[#5eead4]">
            Ponto {{ favorite.code || favorite.stopId }}
          </p>
          <div class="favorite-stop-actions tw:flex tw:flex-wrap tw:gap-2.5">
            <button
              type="button"
              class="primary tw:border-bh-primary tw:bg-bh-primary tw:text-white tw:dark:border-[#2dd4bf] tw:dark:bg-[#2dd4bf] tw:dark:text-[#082f2b]"
              @click="openMobilibusFavoriteStop(favorite)"
            >
              Abrir no Ótimo
            </button>
            <button type="button" class="tw:dark:border-[#28514d] tw:dark:bg-[#0f2423] tw:dark:text-[#e5e7eb]" @click="removeMobilibusFavoriteStop(favorite)">Remover</button>
          </div>
        </article>
      </div>
      <div v-else class="placeholder-grid tw:grid tw:grid-cols-[repeat(auto-fit,minmax(240px,1fr))] tw:gap-4">
        <article class="control-card tw:grid tw:gap-3 tw:rounded-[8px] tw:border tw:border-bh-border tw:bg-white tw:p-4 tw:text-bh-text tw:shadow-[0_10px_30px_rgba(16,24,40,0.05)] tw:dark:border-[#1f4a47] tw:dark:bg-[#132f2d] tw:dark:text-[#e5e7eb]">
          <strong class="tw:text-bh-title tw:dark:text-[#f9fafb]">Nenhuma parada salva</strong>
          <span class="tw:text-bh-copy tw:leading-[1.4] tw:dark:text-[#9eb7b4]">Use a estrela no card de Ponto selecionado para guardar endereços frequentes.</span>
        </article>
      </div>
    </section>

    <section
      v-else-if="activeSection === 'historico'"
      class="section-page tw:grid tw:min-h-[calc(100vh-79px)] tw:content-start tw:gap-5 tw:overflow-y-auto tw:bg-white tw:p-7 tw:dark:bg-[#132f2d] tw:dark:text-[#e5e7eb]"
    >
      <div class="section-page-header tw:grid tw:max-w-[720px] tw:gap-2">
        <p class="section-kicker tw:m-0 tw:text-bh-primary tw:text-[.72rem] tw:font-black tw:uppercase tw:dark:text-[#5eead4]">Histórico</p>
        <h1 class="tw:m-0 tw:text-bh-text tw:text-[clamp(1.6rem,3vw,2.35rem)] tw:leading-[1.15] tw:dark:text-[#f9fafb]">Histórico de alertas</h1>
        <p class="tw:m-0 tw:text-bh-muted tw:leading-[1.55] tw:dark:text-[#9eb7b4]">Os próximos alertas enviados poderão ser listados aqui para auditoria rápida.</p>
      </div>
      <article class="control-card tw:grid tw:gap-3 tw:rounded-[8px] tw:border tw:border-bh-border tw:bg-white tw:p-4 tw:text-bh-text tw:shadow-[0_10px_30px_rgba(16,24,40,0.05)] tw:dark:border-[#1f4a47] tw:dark:bg-[#132f2d] tw:dark:text-[#e5e7eb]">
        <strong class="tw:text-bh-title tw:dark:text-[#f9fafb]">Última atualização</strong>
        <span class="tw:text-bh-copy tw:dark:text-[#9eb7b4]">{{ lastUpdated ?? 'Ainda sem consultas nesta sessão.' }}</span>
      </article>
    </section>

    <section
      v-else
      class="section-page tw:grid tw:min-h-[calc(100vh-79px)] tw:content-start tw:gap-5 tw:overflow-y-auto tw:bg-white tw:p-7 tw:dark:bg-[#132f2d] tw:dark:text-[#e5e7eb]"
    >
      <div class="section-page-header tw:grid tw:max-w-[720px] tw:gap-2">
        <p class="section-kicker tw:m-0 tw:text-bh-primary tw:text-[.72rem] tw:font-black tw:uppercase tw:dark:text-[#5eead4]">Configurações</p>
        <h1 class="tw:m-0 tw:text-bh-text tw:text-[clamp(1.6rem,3vw,2.35rem)] tw:leading-[1.15] tw:dark:text-[#f9fafb]">Configurações do app</h1>
        <p class="tw:m-0 tw:text-bh-muted tw:leading-[1.55] tw:dark:text-[#9eb7b4]">Ajustes de notificação, permissões e comportamento do PWA entram aqui nas próximas etapas.</p>
      </div>
      <div class="placeholder-grid tw:grid tw:grid-cols-[repeat(auto-fit,minmax(240px,1fr))] tw:gap-4">
        <article class="control-card tw:grid tw:gap-3 tw:rounded-[8px] tw:border tw:border-bh-border tw:bg-white tw:p-4 tw:text-bh-text tw:shadow-[0_10px_30px_rgba(16,24,40,0.05)] tw:dark:border-[#1f4a47] tw:dark:bg-[#132f2d] tw:dark:text-[#e5e7eb]">
          <strong class="tw:text-bh-title">Permissão de notificação</strong>
          <span class="tw:text-bh-copy">{{ permission }}</span>
          <button type="button" class="primary tw:border-bh-primary tw:bg-bh-primary tw:text-white tw:dark:border-[#2dd4bf] tw:dark:bg-[#2dd4bf] tw:dark:text-[#082f2b]" @click="requestPermission">
            Permitir notificações
          </button>
        </article>
        <article class="control-card tw:grid tw:gap-3 tw:rounded-[8px] tw:border tw:border-bh-border tw:bg-white tw:p-4 tw:shadow-[0_10px_30px_rgba(16,24,40,0.05)] tw:dark:border-[#1f4a47] tw:dark:bg-[#132f2d] tw:dark:text-[#e5e7eb]">
          <strong class="tw:text-bh-title tw:dark:text-[#f9fafb]">Atualização automática</strong>
          <span class="tw:text-bh-copy tw:leading-[1.4] tw:dark:text-[#9eb7b4]">Consultando a cada 10 segundos quando o monitoramento estiver ativo.</span>
        </article>
      </div>
    </section>
    </AppShell>
  </div>
</template>
