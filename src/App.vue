<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRef, watch } from 'vue';
import AppShell from './components/AppShell.vue';
import type { DashboardSection } from './components/AppShell.vue';
import MapView from './components/MapView.vue';
import type { UserLocation } from './components/MapView.vue';
import MobileBottomSheet from './components/MobileBottomSheet.vue';
import MonitoringPanel from './components/MonitoringPanel.vue';
import type {
  AlertSettings,
  FavoriteStop,
  NearbyStop,
  Prediction,
  RoutePoint,
  Vehicle,
} from './domain/types';
import { fetchNearbyStops, fetchRoutePoints, fetchStopPredictions, fetchVehicles } from './services/apiClient';
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
const searchQuery = ref('');
const nearbyStops = ref<NearbyStop[]>(DEFAULT_NEARBY_STOPS);
const route = ref<RoutePoint[]>([]);
const vehicles = ref<Vehicle[]>([]);
const activeMapServiceId = ref<string | null>(null);
const themeMode = ref(loadThemeMode());
const showNearbyStops = ref(true);
const favoriteStops = ref<FavoriteStop[]>(loadFavoriteStops());
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
const settings = toRef(predictionMonitor.state, 'settings');
const predictions = toRef(predictionMonitor.state, 'predictions');
const lastUpdated = toRef(predictionMonitor.state, 'lastUpdated');
const statusMessage = toRef(predictionMonitor.state, 'statusMessage');
const isLoading = toRef(predictionMonitor.state, 'isLoading');
const selectedPredictionId = toRef(predictionMonitor.state, 'selectedPredictionId');
const selectedStopSnapshot = ref<NearbyStop | FavoriteStop | null>(
  favoriteStops.value.find(stop => stop.code === settings.value.stopCode.trim()) ?? null,
);

const monitoredStop = computed(() => {
  const stopCode = settings.value.stopCode.trim();
  if (!stopCode) {
    return null;
  }

  return (
    nearbyStops.value.find(stop => stop.code === stopCode) ??
    (selectedStopSnapshot.value?.code === stopCode ? selectedStopSnapshot.value : null)
  );
});
const selectedStop = computed(() => monitoredStop.value);
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
const searchResults = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase('pt-BR');

  if (!query) {
    return [];
  }

  return nearbyStops.value
    .filter(stop => {
      const searchable = [stop.code, stop.publicCode, stop.description]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('pt-BR');
      return searchable.includes(query);
    })
    .slice(0, 6);
});

watch(
  [nearbyStops, () => settings.value.stopCode],
  ([stops, stopCode]) => {
    const normalizedStopCode = stopCode.trim();
    if (!normalizedStopCode) {
      selectedStopSnapshot.value = null;
      return;
    }

    const matchingStop = stops.find(stop => stop.code === normalizedStopCode);
    if (matchingStop) {
      selectedStopSnapshot.value = matchingStop;
      return;
    }

    if (selectedStopSnapshot.value?.code === normalizedStopCode) {
      return;
    }

    selectedStopSnapshot.value =
      favoriteStops.value.find(stop => stop.code === normalizedStopCode) ?? null;
  },
  { immediate: true },
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

watch(
  favoriteStops,
  value => {
    saveFavoriteStops(value);
  },
  { deep: true },
);

async function requestPermission() {
  permission.value = await notificationService.requestPermission();
}

function updateSettings(next: AlertSettings) {
  predictionMonitor.updateSettings(next);
}

function navigate(section: DashboardSection) {
  activeSection.value = section;
}

function updateSearch(query: string) {
  searchQuery.value = query;
}

function toggleTheme() {
  themeMode.value = themeMode.value === 'dark' ? 'light' : 'dark';
}

function toggleNearbyStops(nextValue: boolean) {
  showNearbyStops.value = nextValue;
}

function selectStop(stop: NearbyStop) {
  selectedStopSnapshot.value = stop;
  searchQuery.value = '';
  activeSection.value = 'monitoramento';
  predictionMonitor.selectStop(stop.code, stop.publicCode || stop.code);
}

function selectPrediction(prediction: Prediction) {
  predictionMonitor.selectPrediction(prediction.id);
}

function toggleSelectedStopFavorite() {
  if (!selectedStop.value) {
    return;
  }

  const currentStop = selectedStop.value;
  const isFavorite = favoriteStops.value.some(stop => stop.code === currentStop.code);

  favoriteStops.value = isFavorite
    ? favoriteStops.value.filter(stop => stop.code !== currentStop.code)
    : [
        {
          code: currentStop.code,
          publicCode: currentStop.publicCode,
          latitude: currentStop.latitude,
          longitude: currentStop.longitude,
          description: currentStop.description,
          color: currentStop.color,
        },
        ...favoriteStops.value,
      ];
}

function removeFavoriteStop(stopCode: string) {
  favoriteStops.value = favoriteStops.value.filter(stop => stop.code !== stopCode);
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
    nearbyStops.value = await fetchNearbyStops(latitude, longitude);
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
