<script setup lang="ts">
import { useEventListener, useStorage } from '@vueuse/core';
import { History, MapPinned, MoonStar, Sun, Trash2 } from '@lucide/vue';
import { computed, onBeforeUnmount, onMounted, ref, toRef, watch } from 'vue';
import AppShell from './components/AppShell.vue';
import type { DashboardSection } from './components/AppShell.vue';
import MapView from './components/MapView.vue';
import type { UserLocation } from './components/MapView.vue';
import MapStylePreview from './components/MapStylePreview.vue';
import MobileBottomSheet from './components/MobileBottomSheet.vue';
import MobilibusLinesPanel from './components/MobilibusLinesPanel.vue';
import MonitoringPanel from './components/MonitoringPanel.vue';
import type {
  AlertSettings,
  FavoriteStop,
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
  defaultSettings,
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
const mapStylePreview = ref<'colorido' | 'monocromatico' | null>(null);

function hideMapStylePreviewOnPointerLeave(event: MouseEvent) {
  const group = event.currentTarget as HTMLElement;

  if (!group.contains(document.activeElement)) {
    mapStylePreview.value = null;
  }
}

function hideMapStylePreviewOnFocusLeave(event: FocusEvent) {
  const group = event.currentTarget as HTMLElement;

  if (!group.contains(event.relatedTarget as Node | null)) {
    mapStylePreview.value = null;
  }
}
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
const darkThemeTokenClasses = [
  'tw:dark:[--tw-color-bh-border:#1f4a47]',
  'tw:dark:[--tw-color-bh-border-accent:#2dd4bf]',
  'tw:dark:[--tw-color-bh-copy:#c7d7d4]',
  'tw:dark:[--tw-color-bh-primary:#2dd4bf]',
  'tw:dark:[--tw-color-bh-primary-hover:#5eead4]',
  'tw:dark:[--tw-color-bh-on-primary:#082f2b]',
  'tw:dark:[--tw-color-bh-accent:#5eead4]',
  'tw:dark:[--tw-color-bh-highlight:#134e4a]',
  'tw:dark:[--tw-color-bh-muted:#9eb7b4]',
  'tw:dark:[--tw-color-bh-surface:#134e4a]',
  'tw:dark:[--tw-color-bh-surface-0:#081b1a]',
  'tw:dark:[--tw-color-bh-surface-1:#0c2b29]',
  'tw:dark:[--tw-color-bh-surface-2:#132f2d]',
  'tw:dark:[--tw-color-bh-surface-3:#163735]',
  'tw:dark:[--tw-color-bh-surface-inset:#0f2423]',
  'tw:dark:[--tw-color-bh-disabled-bg:#1f4a47]',
  'tw:dark:[--tw-color-bh-disabled-text:#9eb7b4]',
  'tw:dark:[--tw-color-bh-text:#e5e7eb]',
  'tw:dark:[--tw-color-bh-title:#f9fafb]',
].join(' ');
const monochromeMap = useStorage<boolean>('onibus-bh-map-monochrome', false, undefined, {
  writeDefaults: false,
  serializer: {
    read: value => value === 'true',
    write: value => (value ? 'true' : 'false'),
  },
  onError: () => {
    // A preferência continua funcionando em memória quando o storage não está disponível.
  },
});
const currentLocation = useCurrentLocationComposable({
  enableHighAccuracy: true,
  timeout: 10_000,
});
const showNearbyStops = ref(true);
const notificationService = createNotificationService();
const permission = ref(notificationService.getPermission());
const favoriteAliases = useStorage<Record<string, string>>(
  'onibus-bh-favorite-aliases',
  {},
  undefined,
  {
    writeDefaults: false,
    onError: () => {
      // Os nomes personalizados continuam disponíveis em memória.
    },
  },
);
const editingFavoriteKey = ref<string | null>(null);
const favoriteAliasDraft = ref('');
const pendingFavoriteRemovalKey = ref<string | null>(null);
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

async function startMonitoring(): Promise<void> {
  const nextPermission = permission.value === 'granted' ? permission.value : await requestPermission();
  if (nextPermission !== 'granted') {
    return;
  }

  predictionMonitor.updateSettings({
    ...predictionMonitor.state.settings,
    enabled: true,
  });
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

function siuFavoriteKey(stop: FavoriteStop): string {
  return `siu:${stop.code}`;
}

function mobilibusFavoriteKey(stop: MobilibusStop): string {
  return `otimo:${stop.projectId}:${stop.stopId}`;
}

const lowercaseAddressWords = new Set([
  'a', 'as', 'ao', 'aos', 'com', 'da', 'das', 'de', 'do', 'dos', 'e', 'em', 'na', 'nas', 'no', 'nos', 'para', 'por',
]);

function formatAddressTitle(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR')
    .split(' ')
    .map((word, index) => {
      if (index > 0 && lowercaseAddressWords.has(word)) {
        return word;
      }

      return word.replace(/(^|[-'.])([a-záàâãéêíóôõúüç])/gu, (_match, separator: string, letter: string) =>
        `${separator}${letter.toLocaleUpperCase('pt-BR')}`,
      );
    })
    .join(' ');
}

function favoriteDisplayName(key: string, address: string): string {
  return favoriteAliases.value[key] || formatAddressTitle(address);
}

function beginFavoriteRename(key: string): void {
  pendingFavoriteRemovalKey.value = null;
  editingFavoriteKey.value = key;
  favoriteAliasDraft.value = favoriteAliases.value[key] ?? '';
}

function cancelFavoriteRename(): void {
  editingFavoriteKey.value = null;
  favoriteAliasDraft.value = '';
}

function saveFavoriteAlias(key: string): void {
  const alias = favoriteAliasDraft.value.trim().slice(0, 40);
  if (alias) {
    favoriteAliases.value[key] = alias;
  } else {
    delete favoriteAliases.value[key];
  }

  cancelFavoriteRename();
}

function askToRemoveFavorite(key: string): void {
  editingFavoriteKey.value = null;
  pendingFavoriteRemovalKey.value = key;
}

function confirmRemoveFavorite(stop: FavoriteStop): void {
  removeFavoriteStop(stop.code);
  delete favoriteAliases.value[siuFavoriteKey(stop)];
  pendingFavoriteRemovalKey.value = null;
}

function confirmRemoveMobilibusFavorite(stop: MobilibusStop): void {
  removeMobilibusFavoriteStop(stop);
  delete favoriteAliases.value[mobilibusFavoriteKey(stop)];
  pendingFavoriteRemovalKey.value = null;
}

function permissionLabel(value: PermissionState): string {
  if (value === 'granted') return 'Permitida';
  if (value === 'denied') return 'Bloqueada';
  if (value === 'unsupported') return 'Indisponível';
  return 'Não solicitada';
}

function clearSavedData(): void {
  const confirmed = window.confirm(
    'Limpar alertas, favoritos, nomes e preferências salvos neste dispositivo? Essa ação não pode ser desfeita.',
  );
  if (!confirmed) return;

  stopSelection.state.favoriteStops = [];
  saveFavoriteStops([]);
  mobilibusCatalog.state.favoriteStops = [];
  saveMobilibusFavoriteStops([]);
  favoriteAliases.value = {};
  const resetSettings = { ...defaultSettings };
  predictionMonitor.updateSettings(resetSettings);
  saveSettings(resetSettings);
  try {
    window.localStorage.removeItem('onibus-bh-theme');
    window.localStorage.removeItem('onibus-bh-map-monochrome');
  } catch {
    // A página será recarregada com o tema atual se o storage não estiver acessível.
  }
  window.location.reload();
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
  <div class="app-theme tw:min-h-screen tw:font-sans tw:bg-bh-surface-0 tw:text-bh-text tw:dark:bg-bh-surface-0 tw:dark:text-[#e5e7eb]" :class="darkThemeTokenClasses" :data-theme="themeMode">
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
      <template #default="{ isSidebarOpen }">
    <section
      v-if="activeSection === 'mapa'"
      class="dashboard-grid tw:relative tw:grid tw:min-h-0 tw:grid-cols-[360px_minmax(0,1fr)] tw:max-[920px]:grid-cols-1"
      :class="{ 'tw:grid-cols-[minmax(0,1fr)]': !isSidebarOpen }"
    >
      <MonitoringPanel
        v-show="isSidebarOpen"
        class="desktop-monitoring-panel tw:max-[920px]:hidden"
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
        @start-monitoring="startMonitoring"
      />

      <section class="map-stage tw:relative tw:min-w-0 tw:min-h-[calc(100vh-79px)] tw:max-[920px]:min-h-[calc(100vh-62px)]">
        <MapView
          :monitored-stop="monitoredStop"
          :nearby-stops="nearbyStops"
          :route="route"
          :vehicles="vehicles"
          :theme-mode="themeMode"
          :monochrome-map="monochromeMap"
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
        @start-monitoring="startMonitoring"
      />
    </section>

    <section
      v-else-if="activeSection === 'monitoramento'"
      class="dashboard-grid tw:relative tw:grid tw:min-h-0 tw:grid-cols-[360px_minmax(0,1fr)] tw:max-[920px]:grid-cols-1"
      :class="{ 'tw:grid-cols-[minmax(0,1fr)]': !isSidebarOpen }"
    >
      <MonitoringPanel
        v-show="isSidebarOpen"
        class="desktop-monitoring-panel tw:max-[920px]:hidden"
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
        @start-monitoring="startMonitoring"
      />

      <section class="map-stage tw:relative tw:min-w-0 tw:min-h-[calc(100vh-79px)] tw:max-[920px]:min-h-[calc(100vh-62px)]">
        <MapView
          :monitored-stop="monitoredStop"
          :nearby-stops="nearbyStops"
          :route="route"
          :vehicles="vehicles"
          :theme-mode="themeMode"
          :monochrome-map="monochromeMap"
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
        @start-monitoring="startMonitoring"
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
      :monochrome-map="monochromeMap"
      @request-map-tiles="loadMobilibusStops"
      @retry-map="retryMobilibusStops"
      @select-stop="selectMobilibusStop"
      @retry-departures="retryMobilibusDepartures"
      @toggle-selected-stop-favorite="toggleSelectedMobilibusStopFavorite"
      @toggle-theme="toggleTheme"
    />

    <section
      v-else-if="activeSection === 'favoritos'"
      class="section-page tw:grid tw:min-h-[calc(100vh-79px)] tw:content-start tw:gap-5 tw:overflow-y-auto tw:bg-white tw:p-7 tw:dark:bg-bh-surface-2 tw:dark:text-[#e5e7eb] tw:max-[920px]:min-h-[calc(100vh-62px)] tw:max-[920px]:p-4 tw:max-[920px]:pb-24"
    >
      <div class="section-page-header tw:grid tw:max-w-[760px] tw:gap-1.5">
        <h1 class="tw:m-0 tw:text-bh-text tw:text-[clamp(1.35rem,2.3vw,1.75rem)] tw:leading-[1.2] tw:dark:text-[#f9fafb]">Favoritos salvos</h1>
        <p class="tw:m-0 tw:text-bh-muted tw:leading-[1.5] tw:dark:text-[#c7d7d4]">Acesse rapidamente os pontos que você consulta com frequência.</p>
      </div>
      <div
        v-if="favoriteStops.length > 0 || mobilibusFavoriteStops.length > 0"
        class="favorites-list tw:grid tw:max-w-[820px] tw:gap-2"
      >
        <article
          v-for="favorite in favoriteStops"
          :key="favorite.code"
          class="favorite-stop-row tw:grid tw:grid-cols-[minmax(0,1fr)_auto] tw:items-center tw:gap-4 tw:rounded-[10px] tw:border tw:border-bh-border tw:bg-white tw:px-4 tw:py-3 tw:text-bh-text tw:dark:border-[#28514d] tw:dark:bg-bh-surface-inset tw:dark:text-[#e5e7eb] tw:max-[560px]:grid-cols-1 tw:max-[560px]:gap-3"
        >
          <div class="tw:grid tw:min-w-0 tw:gap-1">
            <h2 class="tw:m-0 tw:break-words tw:text-[.98rem] tw:font-bold tw:leading-[1.35] tw:text-bh-title tw:dark:text-[#f9fafb]">{{ favoriteDisplayName(siuFavoriteKey(favorite), favorite.description) }}</h2>
            <p v-if="favoriteAliases[siuFavoriteKey(favorite)]" class="tw:m-0 tw:break-words tw:text-[.8rem] tw:leading-[1.4] tw:text-bh-muted tw:dark:text-[#c7d7d4]">{{ formatAddressTitle(favorite.description) }}</p>
            <p class="tw:m-0 tw:text-[.76rem] tw:font-semibold tw:text-bh-muted tw:dark:text-[#c7d7d4]">Ponto {{ favorite.publicCode || favorite.code }}</p>
            <form v-if="editingFavoriteKey === siuFavoriteKey(favorite)" class="tw:mt-1 tw:flex tw:flex-wrap tw:items-end tw:gap-2" @submit.prevent="saveFavoriteAlias(siuFavoriteKey(favorite))">
              <label class="tw:min-w-[180px] tw:max-w-[260px] tw:flex-1 tw:gap-1 tw:text-[.76rem] tw:dark:text-[#c7d7d4]">
                Nome do favorito
                <input v-model="favoriteAliasDraft" maxlength="40" placeholder="Casa ou Trabalho" class="tw:py-2 tw:text-[.84rem] tw:dark:border-[#28514d] tw:dark:bg-bh-surface-2 tw:dark:text-[#e5e7eb]" />
              </label>
              <button type="submit" class="tw:px-3 tw:py-2 tw:text-[.78rem] tw:font-bold tw:text-bh-primary-hover tw:dark:border-[#28514d] tw:dark:bg-bh-surface-2 tw:dark:text-[#5eead4]">Salvar</button>
              <button type="button" class="tw:px-3 tw:py-2 tw:text-[.78rem] tw:dark:border-[#28514d] tw:dark:bg-bh-surface-2 tw:dark:text-[#c7d7d4]" @click="cancelFavoriteRename">Cancelar</button>
            </form>
            <div v-if="pendingFavoriteRemovalKey === siuFavoriteKey(favorite)" class="tw:mt-1 tw:flex tw:flex-wrap tw:items-center tw:gap-2" role="status">
              <span class="tw:text-[.78rem] tw:font-semibold">Remover este ponto dos favoritos?</span>
              <button type="button" class="tw:px-3 tw:py-2 tw:text-[.76rem] tw:font-bold tw:text-[#b42318] tw:dark:border-[#7f1d1d] tw:dark:bg-[#3b1717] tw:dark:text-[#fecaca]" @click="confirmRemoveFavorite(favorite)">Confirmar remoção</button>
              <button type="button" class="tw:px-3 tw:py-2 tw:text-[.76rem] tw:dark:border-[#28514d] tw:dark:bg-bh-surface-2 tw:dark:text-[#c7d7d4]" @click="pendingFavoriteRemovalKey = null">Manter</button>
            </div>
          </div>
          <div class="favorite-stop-actions tw:flex tw:flex-wrap tw:items-center tw:justify-end tw:gap-1.5 tw:max-[560px]:justify-start">
            <button
              type="button"
              class="primary tw:border-bh-primary tw:bg-bh-primary tw:px-3 tw:py-2 tw:text-[.78rem] tw:text-bh-on-primary tw:dark:border-[#2dd4bf] tw:dark:bg-[#2dd4bf]"
              @click="selectStop(favorite)"
            >Abrir parada</button>
            <button type="button" class="tw:border-transparent tw:bg-transparent tw:px-2.5 tw:py-2 tw:text-[.76rem] tw:font-semibold tw:text-bh-muted tw:hover:bg-[#f2f4f7] tw:dark:text-[#c7d7d4] tw:dark:hover:bg-bh-surface-3" @click="beginFavoriteRename(siuFavoriteKey(favorite))"> {{ favoriteAliases[siuFavoriteKey(favorite)] ? 'Renomear' : 'Dar nome' }} </button>
            <button type="button" class="tw:border-transparent tw:bg-transparent tw:px-2 tw:py-2 tw:text-[.74rem] tw:font-medium tw:text-bh-muted tw:hover:bg-[#f2f4f7] tw:dark:text-[#9eb7b4] tw:dark:hover:bg-bh-surface-3" @click="askToRemoveFavorite(siuFavoriteKey(favorite))">Remover</button>
          </div>
        </article>
        <article
          v-for="favorite in mobilibusFavoriteStops"
          :key="`mobilibus-${favorite.projectId}-${favorite.stopId}`"
          class="favorite-stop-row tw:grid tw:grid-cols-[minmax(0,1fr)_auto] tw:items-center tw:gap-4 tw:rounded-[10px] tw:border tw:border-bh-border tw:bg-white tw:px-4 tw:py-3 tw:text-bh-text tw:dark:border-[#28514d] tw:dark:bg-bh-surface-inset tw:dark:text-[#e5e7eb] tw:max-[560px]:grid-cols-1 tw:max-[560px]:gap-3"
        >
          <div class="tw:grid tw:min-w-0 tw:gap-1">
            <h2 class="tw:m-0 tw:break-words tw:text-[.98rem] tw:font-bold tw:leading-[1.35] tw:text-bh-title tw:dark:text-[#f9fafb]">{{ favoriteDisplayName(mobilibusFavoriteKey(favorite), favorite.address || favorite.name) }}</h2>
            <p v-if="favoriteAliases[mobilibusFavoriteKey(favorite)]" class="tw:m-0 tw:break-words tw:text-[.8rem] tw:leading-[1.4] tw:text-bh-muted tw:dark:text-[#c7d7d4]">{{ formatAddressTitle(favorite.address || favorite.name) }}</p>
            <p class="tw:m-0 tw:text-[.76rem] tw:font-semibold tw:text-bh-muted tw:dark:text-[#c7d7d4]">Ponto {{ favorite.code || favorite.stopId }}</p>
            <form v-if="editingFavoriteKey === mobilibusFavoriteKey(favorite)" class="tw:mt-1 tw:flex tw:flex-wrap tw:items-end tw:gap-2" @submit.prevent="saveFavoriteAlias(mobilibusFavoriteKey(favorite))">
              <label class="tw:min-w-[180px] tw:max-w-[260px] tw:flex-1 tw:gap-1 tw:text-[.76rem] tw:dark:text-[#c7d7d4]">
                Nome do favorito
                <input v-model="favoriteAliasDraft" maxlength="40" placeholder="Casa ou Trabalho" class="tw:py-2 tw:text-[.84rem] tw:dark:border-[#28514d] tw:dark:bg-bh-surface-2 tw:dark:text-[#e5e7eb]" />
              </label>
              <button type="submit" class="tw:px-3 tw:py-2 tw:text-[.78rem] tw:font-bold tw:text-bh-primary-hover tw:dark:border-[#28514d] tw:dark:bg-bh-surface-2 tw:dark:text-[#5eead4]">Salvar</button>
              <button type="button" class="tw:px-3 tw:py-2 tw:text-[.78rem] tw:dark:border-[#28514d] tw:dark:bg-bh-surface-2 tw:dark:text-[#c7d7d4]" @click="cancelFavoriteRename">Cancelar</button>
            </form>
            <div v-if="pendingFavoriteRemovalKey === mobilibusFavoriteKey(favorite)" class="tw:mt-1 tw:flex tw:flex-wrap tw:items-center tw:gap-2" role="status">
              <span class="tw:text-[.78rem] tw:font-semibold">Remover este ponto dos favoritos?</span>
              <button type="button" class="tw:px-3 tw:py-2 tw:text-[.76rem] tw:font-bold tw:text-[#b42318] tw:dark:border-[#7f1d1d] tw:dark:bg-[#3b1717] tw:dark:text-[#fecaca]" @click="confirmRemoveMobilibusFavorite(favorite)">Confirmar remoção</button>
              <button type="button" class="tw:px-3 tw:py-2 tw:text-[.76rem] tw:dark:border-[#28514d] tw:dark:bg-bh-surface-2 tw:dark:text-[#c7d7d4]" @click="pendingFavoriteRemovalKey = null">Manter</button>
            </div>
          </div>
          <div class="favorite-stop-actions tw:flex tw:flex-wrap tw:items-center tw:justify-end tw:gap-1.5 tw:max-[560px]:justify-start">
            <button
              type="button"
              class="primary tw:border-bh-primary tw:bg-bh-primary tw:px-3 tw:py-2 tw:text-[.78rem] tw:text-bh-on-primary tw:dark:border-[#2dd4bf] tw:dark:bg-[#2dd4bf]"
              @click="openMobilibusFavoriteStop(favorite)"
            >
              Abrir no Ótimo
            </button>
            <button type="button" class="tw:border-transparent tw:bg-transparent tw:px-2.5 tw:py-2 tw:text-[.76rem] tw:font-semibold tw:text-bh-muted tw:hover:bg-[#f2f4f7] tw:dark:text-[#c7d7d4] tw:dark:hover:bg-bh-surface-3" @click="beginFavoriteRename(mobilibusFavoriteKey(favorite))"> {{ favoriteAliases[mobilibusFavoriteKey(favorite)] ? 'Renomear' : 'Dar nome' }} </button>
            <button type="button" class="tw:border-transparent tw:bg-transparent tw:px-2 tw:py-2 tw:text-[.74rem] tw:font-medium tw:text-bh-muted tw:hover:bg-[#f2f4f7] tw:dark:text-[#9eb7b4] tw:dark:hover:bg-bh-surface-3" @click="askToRemoveFavorite(mobilibusFavoriteKey(favorite))">Remover</button>
          </div>
        </article>
      </div>
      <div v-else class="empty-state tw:grid tw:max-w-[520px] tw:justify-items-start tw:gap-3 tw:rounded-[12px] tw:border tw:border-dashed tw:border-bh-border tw:bg-[#f9fafb] tw:p-5 tw:dark:border-[#28514d] tw:dark:bg-bh-surface-inset">
        <MapPinned class="tw:size-6 tw:text-bh-primary tw:dark:text-[#5eead4]" aria-hidden="true" />
        <div class="tw:grid tw:gap-1">
          <strong class="tw:text-[.98rem] tw:text-bh-title tw:dark:text-[#f9fafb]">Nenhuma parada salva</strong>
          <span class="tw:text-[.84rem] tw:leading-[1.45] tw:text-bh-muted tw:dark:text-[#c7d7d4]">Use a estrela em um ponto para encontrá-lo mais rápido na próxima vez.</span>
        </div>
        <button type="button" class="primary tw:border-bh-primary tw:bg-bh-primary tw:px-3.5 tw:py-2.5 tw:text-[.82rem] tw:text-bh-on-primary tw:dark:border-[#2dd4bf] tw:dark:bg-[#2dd4bf]" @click="navigate('mapa')">Encontrar uma parada</button>
      </div>
    </section>

    <section
      v-else-if="activeSection === 'historico'"
      class="section-page tw:grid tw:min-h-[calc(100vh-79px)] tw:content-start tw:gap-5 tw:overflow-y-auto tw:bg-white tw:p-7 tw:dark:bg-bh-surface-2 tw:dark:text-[#e5e7eb] tw:max-[920px]:min-h-[calc(100vh-62px)] tw:max-[920px]:p-4 tw:max-[920px]:pb-24"
    >
      <div class="section-page-header tw:grid tw:max-w-[760px] tw:gap-1.5">
        <h1 class="tw:m-0 tw:text-bh-text tw:text-[clamp(1.35rem,2.3vw,1.75rem)] tw:leading-[1.2] tw:dark:text-[#f9fafb]">Histórico de alertas</h1>
      </div>
      <div class="empty-state tw:grid tw:max-w-[520px] tw:justify-items-start tw:gap-3 tw:rounded-[12px] tw:border tw:border-dashed tw:border-bh-border tw:bg-[#f9fafb] tw:p-5 tw:dark:border-[#28514d] tw:dark:bg-bh-surface-inset">
        <History class="tw:size-6 tw:text-bh-primary tw:dark:text-[#5eead4]" aria-hidden="true" />
        <div class="tw:grid tw:gap-1">
          <strong class="tw:text-[.98rem] tw:text-bh-title tw:dark:text-[#f9fafb]">O app ainda não registra um histórico</strong>
          <span class="tw:text-[.84rem] tw:leading-[1.45] tw:text-bh-muted tw:dark:text-[#c7d7d4]">Os avisos enviados não ficam salvos nesta tela. Você pode consultar as partidas atuais no mapa.</span>
        </div>
        <button type="button" class="primary tw:border-bh-primary tw:bg-bh-primary tw:px-3.5 tw:py-2.5 tw:text-[.82rem] tw:text-bh-on-primary tw:dark:border-[#2dd4bf] tw:dark:bg-[#2dd4bf]" @click="navigate('monitoramento')">Criar meu primeiro alerta</button>
      </div>
    </section>

    <section
      v-else
      class="section-page tw:grid tw:min-h-[calc(100vh-79px)] tw:content-start tw:gap-5 tw:overflow-y-auto tw:bg-white tw:p-7 tw:dark:bg-bh-surface-2 tw:dark:text-[#e5e7eb] tw:max-[920px]:min-h-[calc(100vh-62px)] tw:max-[920px]:p-4 tw:max-[920px]:pb-24"
    >
      <div class="section-page-header tw:grid tw:max-w-[760px] tw:gap-1.5">
        <h1 class="tw:m-0 tw:text-bh-text tw:text-[clamp(1.35rem,2.3vw,1.75rem)] tw:leading-[1.2] tw:dark:text-[#f9fafb]">Configurações</h1>
        <p class="tw:m-0 tw:text-bh-muted tw:leading-[1.5] tw:dark:text-[#c7d7d4]">Tema, mapa, notificações e preferências de alerta deste dispositivo.</p>
      </div>
      <div class="settings-list tw:grid tw:max-w-[820px] tw:divide-y tw:divide-[#e4e7ec] tw:rounded-[12px] tw:border tw:border-[#e4e7ec] tw:bg-white tw:px-4 tw:dark:divide-[#28514d] tw:dark:border-[#28514d] tw:dark:bg-bh-surface-inset">
        <section class="settings-row tw:grid tw:grid-cols-[minmax(0,1fr)_auto] tw:items-center tw:gap-4 tw:py-4 tw:max-[560px]:grid-cols-1">
          <div class="tw:grid tw:gap-1">
            <h2 class="tw:m-0 tw:text-[.92rem] tw:font-bold tw:text-bh-title tw:dark:text-[#f9fafb]">Tema</h2>
            <p class="tw:m-0 tw:text-[.8rem] tw:leading-[1.4] tw:text-bh-muted tw:dark:text-[#c7d7d4]">Aparência atual: {{ themeMode === 'dark' ? 'escura' : 'clara' }}.</p>
          </div>
          <div class="tw:flex tw:gap-2" role="group" aria-label="Tema de cores">
            <button type="button" class="tw:flex tw:items-center tw:gap-1.5 tw:px-3 tw:py-2 tw:text-[.8rem] tw:dark:border-[#28514d] tw:dark:bg-bh-surface-2 tw:dark:text-[#c7d7d4]" :class="themeMode === 'light' ? 'tw:border-bh-primary tw:bg-bh-surface tw:text-bh-primary-hover tw:dark:border-[#2dd4bf] tw:dark:bg-[#134e4a] tw:dark:text-[#99f6e4]' : ''" :aria-pressed="themeMode === 'light'" @click="themeMode = 'light'"><Sun class="tw:size-4" aria-hidden="true" />Claro</button>
            <button type="button" class="tw:flex tw:items-center tw:gap-1.5 tw:px-3 tw:py-2 tw:text-[.8rem] tw:dark:border-[#28514d] tw:dark:bg-bh-surface-2 tw:dark:text-[#c7d7d4]" :class="themeMode === 'dark' ? 'tw:border-bh-primary tw:bg-bh-surface tw:text-bh-primary-hover tw:dark:border-[#2dd4bf] tw:dark:bg-[#134e4a] tw:dark:text-[#99f6e4]' : ''" :aria-pressed="themeMode === 'dark'" @click="themeMode = 'dark'"><MoonStar class="tw:size-4" aria-hidden="true" />Escuro</button>
          </div>
        </section>

        <section class="settings-row tw:grid tw:grid-cols-[minmax(0,1fr)_auto] tw:items-center tw:gap-4 tw:py-4 tw:max-[560px]:grid-cols-1">
          <div class="tw:grid tw:gap-1">
            <h2 class="tw:m-0 tw:text-[.92rem] tw:font-bold tw:text-bh-title tw:dark:text-[#f9fafb]">Estilo do mapa</h2>
            <p class="tw:m-0 tw:max-w-[58ch] tw:text-[.8rem] tw:leading-[1.4] tw:text-bh-muted tw:dark:text-[#c7d7d4]">O modo monocromático mostra os tiles em tons de cinza; ônibus, rotas e paradas mantêm suas cores.</p>
          </div>
          <div
            class="tw:relative tw:flex tw:flex-wrap tw:gap-2"
            role="group"
            aria-label="Estilo do mapa"
            @mouseleave="hideMapStylePreviewOnPointerLeave"
            @focusout="hideMapStylePreviewOnFocusLeave"
            @keydown.esc="mapStylePreview = null"
          >
            <button
              type="button"
              class="tw:flex tw:items-center tw:gap-1.5 tw:px-3 tw:py-2 tw:text-[.8rem] tw:dark:border-[#28514d] tw:dark:bg-bh-surface-2 tw:dark:text-[#c7d7d4]"
              :class="!monochromeMap ? 'tw:border-bh-primary tw:bg-bh-surface tw:text-bh-primary-hover tw:dark:border-[#2dd4bf] tw:dark:bg-[#134e4a] tw:dark:text-[#99f6e4]' : ''"
              :aria-pressed="!monochromeMap"
              :aria-describedby="mapStylePreview === 'colorido' ? 'map-style-preview' : undefined"
              @mouseenter="mapStylePreview = 'colorido'"
              @focus="mapStylePreview = 'colorido'"
              @click="monochromeMap = false"
            >Colorido</button>
            <button
              type="button"
              class="tw:flex tw:items-center tw:gap-1.5 tw:px-3 tw:py-2 tw:text-[.8rem] tw:dark:border-[#28514d] tw:dark:bg-bh-surface-2 tw:dark:text-[#c7d7d4]"
              :class="monochromeMap ? 'tw:border-bh-primary tw:bg-bh-surface tw:text-bh-primary-hover tw:dark:border-[#2dd4bf] tw:dark:bg-[#134e4a] tw:dark:text-[#99f6e4]' : ''"
              :aria-pressed="monochromeMap"
              :aria-describedby="mapStylePreview === 'monocromatico' ? 'map-style-preview' : undefined"
              @mouseenter="mapStylePreview = 'monocromatico'"
              @focus="mapStylePreview = 'monocromatico'"
              @click="monochromeMap = true"
            >Monocromático</button>
            <Transition
              enter-active-class="tw:transition tw:duration-150"
              enter-from-class="tw:translate-y-1 tw:opacity-0"
              enter-to-class="tw:translate-y-0 tw:opacity-100"
              leave-active-class="tw:transition tw:duration-100"
              leave-from-class="tw:translate-y-0 tw:opacity-100"
              leave-to-class="tw:translate-y-1 tw:opacity-0"
            >
              <div
                v-if="mapStylePreview"
                id="map-style-preview"
                class="tw:absolute tw:left-0 tw:top-[calc(100%+0.5rem)] tw:z-50 tw:w-[min(17rem,calc(100vw-3.5rem))] tw:rounded-[12px] tw:border tw:border-bh-border tw:bg-white tw:p-2.5 tw:shadow-[0_12px_28px_var(--bh-shadow-16)] tw:dark:border-[#28514d] tw:dark:bg-bh-surface-2"
                role="tooltip"
              >
                <p class="tw:mb-2 tw:mt-0 tw:text-[.8rem] tw:font-bold tw:text-bh-title tw:dark:text-[#f9fafb]">
                  {{ mapStylePreview === 'monocromatico' ? 'Monocromática' : 'Colorido' }}
                </p>
                <MapStylePreview :monochrome="mapStylePreview === 'monocromatico'" :dark="themeMode === 'dark'" />
                <p class="tw:mb-0 tw:mt-2 tw:text-[.72rem] tw:leading-[1.4] tw:text-bh-muted tw:dark:text-[#c7d7d4]">
                  {{ mapStylePreview === 'monocromatico' ? 'Tiles em cinza; ônibus, rota e paradas preservam suas cores.' : 'Tiles com cores naturais; ônibus, rota e paradas preservam suas cores.' }}
                </p>
              </div>
            </Transition>
          </div>
        </section>

        <section class="settings-row tw:grid tw:grid-cols-[minmax(0,1fr)_auto] tw:items-center tw:gap-4 tw:py-4 tw:max-[560px]:grid-cols-1">
          <div class="tw:grid tw:gap-1">
            <h2 class="tw:m-0 tw:text-[.92rem] tw:font-bold tw:text-bh-title tw:dark:text-[#f9fafb]">Atualização automática</h2>
            <p class="tw:m-0 tw:text-[.8rem] tw:leading-[1.4] tw:text-bh-muted tw:dark:text-[#c7d7d4]">Frequência fixa enquanto o monitoramento está ativo.</p>
          </div>
          <span class="tw:rounded-full tw:bg-[#f2f4f7] tw:px-3 tw:py-1.5 tw:text-[.8rem] tw:font-bold tw:tabular-nums tw:text-bh-title tw:dark:bg-bh-surface-3 tw:dark:text-[#c7d7d4]">A cada 10 s</span>
        </section>

        <section class="settings-row tw:grid tw:grid-cols-[minmax(0,1fr)_auto] tw:items-center tw:gap-4 tw:py-4 tw:max-[560px]:grid-cols-1">
          <div class="tw:grid tw:gap-1">
            <h2 class="tw:m-0 tw:text-[.92rem] tw:font-bold tw:text-bh-title tw:dark:text-[#f9fafb]">Antecedência do alerta</h2>
            <p class="tw:m-0 tw:text-[.8rem] tw:leading-[1.4] tw:text-bh-muted tw:dark:text-[#c7d7d4]">Os tempos e avisos são apresentados em minutos.</p>
          </div>
          <span class="tw:rounded-full tw:bg-[#f2f4f7] tw:px-3 tw:py-1.5 tw:text-[.8rem] tw:font-bold tw:tabular-nums tw:text-bh-title tw:dark:bg-bh-surface-3 tw:dark:text-[#c7d7d4]">{{ settings.minutesBefore }} min</span>
        </section>

        <section class="settings-row tw:grid tw:grid-cols-[minmax(0,1fr)_auto] tw:items-start tw:gap-4 tw:py-4 tw:max-[560px]:grid-cols-1">
          <div class="tw:grid tw:gap-1.5">
            <div class="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
              <h2 class="tw:m-0 tw:text-[.92rem] tw:font-bold tw:text-bh-title tw:dark:text-[#f9fafb]">Notificações</h2>
              <span class="tw:rounded-full tw:px-2.5 tw:py-1 tw:text-[.72rem] tw:font-bold" :class="permission === 'granted' ? 'tw:bg-[#dcfce7] tw:text-[#166534] tw:dark:bg-[#153a2c] tw:dark:text-[#86efac]' : permission === 'denied' ? 'tw:bg-[#fff7ed] tw:text-[#9a3412] tw:dark:bg-[#431f13] tw:dark:text-[#fdba74]' : 'tw:bg-[#f2f4f7] tw:text-[#475467] tw:dark:bg-bh-surface-3 tw:dark:text-[#c7d7d4]'">{{ permissionLabel(permission) }}</span>
            </div>
            <p v-if="permission === 'granted'" class="tw:m-0 tw:text-[.8rem] tw:leading-[1.4] tw:text-bh-muted tw:dark:text-[#c7d7d4]">O navegador pode exibir os avisos que você configurar.</p>
            <p v-else-if="permission === 'denied'" class="tw:m-0 tw:max-w-[62ch] tw:text-[.8rem] tw:leading-[1.45] tw:text-bh-muted tw:dark:text-[#c7d7d4]">Para liberar, abra as informações do site na barra de endereço do navegador e altere Notificações para Permitir. Depois, atualize esta página.</p>
            <p v-else-if="permission === 'unsupported'" class="tw:m-0 tw:text-[.8rem] tw:leading-[1.4] tw:text-bh-muted tw:dark:text-[#c7d7d4]">Este navegador não oferece notificações para o app.</p>
            <p v-else class="tw:m-0 tw:text-[.8rem] tw:leading-[1.4] tw:text-bh-muted tw:dark:text-[#c7d7d4]">A permissão será solicitada quando você iniciar um monitoramento.</p>
          </div>
          <button v-if="permission === 'default'" type="button" class="tw:px-3 tw:py-2 tw:text-[.78rem] tw:font-bold tw:text-bh-primary-hover tw:dark:border-[#28514d] tw:dark:bg-bh-surface-2 tw:dark:text-[#5eead4]" @click="requestPermission">Permitir notificações</button>
        </section>

        <section class="settings-row tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-4 tw:py-4">
          <div class="tw:grid tw:gap-1">
            <h2 class="tw:m-0 tw:text-[.92rem] tw:font-bold tw:text-bh-title tw:dark:text-[#f9fafb]">Dados salvos neste dispositivo</h2>
            <p class="tw:m-0 tw:text-[.8rem] tw:leading-[1.4] tw:text-bh-muted tw:dark:text-[#c7d7d4]">Limpa favoritos, nomes personalizados, tema, estilo do mapa e configuração do alerta.</p>
          </div>
          <button type="button" class="tw:flex tw:items-center tw:gap-1.5 tw:border-[#fda29b] tw:bg-white tw:px-3 tw:py-2 tw:text-[.78rem] tw:font-semibold tw:text-[#b42318] tw:dark:border-[#7f1d1d] tw:dark:bg-[#3b1717] tw:dark:text-[#fecaca]" @click="clearSavedData"><Trash2 class="tw:size-4" aria-hidden="true" />Limpar dados salvos</button>
        </section>
      </div>
    </section>
      </template>
    </AppShell>
  </div>
</template>
