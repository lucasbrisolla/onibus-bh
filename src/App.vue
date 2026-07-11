<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AppShell from './components/AppShell.vue';
import type { DashboardSection } from './components/AppShell.vue';
import MapView from './components/MapView.vue';
import MobileBottomSheet from './components/MobileBottomSheet.vue';
import MonitoringPanel from './components/MonitoringPanel.vue';
import { findAlertMatch } from './domain/alertRules';
import type { AlertMatch, AlertSettings, NearbyStop, Prediction, RoutePoint, Vehicle } from './domain/types';
import { fetchNearbyStops, fetchRoutePoints, fetchStopPredictions, fetchVehicles } from './services/apiClient';
import { createMapDataLoader, selectMapServiceId } from './services/mapDataService';
import { createNotificationService } from './services/notificationService';
import { loadSettings, saveSettings } from './services/settingsStore';

const POLL_INTERVAL_MS = 45_000;
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

const settings = ref<AlertSettings>(loadSettings());
const predictions = ref<Prediction[]>([]);
const lastUpdated = ref<string | null>(null);
const statusMessage = ref('Configure uma parada e ative o monitoramento.');
const isLoading = ref(false);
const isLocating = ref(false);
const locationStatus = ref('Use sua localização para encontrar pontos por perto.');
const activeSection = ref<DashboardSection>('monitoramento');
const searchQuery = ref('');
const nearbyStops = ref<NearbyStop[]>(DEFAULT_NEARBY_STOPS);
const route = ref<RoutePoint[]>([]);
const vehicles = ref<Vehicle[]>([]);
const activeMapServiceId = ref<string | null>(null);
const notificationService = createNotificationService();
const permission = ref(notificationService.getPermission());
const mapDataLoader = createMapDataLoader({ fetchRoutePoints, fetchVehicles });
let intervalId: number | undefined;
let isPolling = false;

const canPoll = computed(() => settings.value.enabled && settings.value.stopCode.trim().length > 0);
const monitoredStop = computed(
  () => nearbyStops.value.find(stop => stop.code === settings.value.stopCode.trim()) ?? null,
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
  settings,
  value => {
    saveSettings(value);
  },
  { deep: true },
);

async function requestPermission() {
  permission.value = await notificationService.requestPermission();
}

function updateSettings(next: AlertSettings) {
  settings.value = next;
}

function navigate(section: DashboardSection) {
  activeSection.value = section;
}

function updateSearch(query: string) {
  searchQuery.value = query;
}

function selectStop(stop: NearbyStop) {
  settings.value = {
    ...settings.value,
    stopCode: stop.code,
  };
  searchQuery.value = '';
  activeSection.value = 'monitoramento';
  statusMessage.value = `Parada ${stop.publicCode || stop.code} selecionada para monitoramento.`;
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

async function loadNearbyStops(latitude: number, longitude: number) {
  try {
    nearbyStops.value = await fetchNearbyStops(latitude, longitude);
    locationStatus.value = 'Pontos próximos atualizados pelo GPS.';
  } catch (error) {
    statusMessage.value =
      error instanceof Error ? error.message : 'Erro ao consultar paradas próximas.';
    locationStatus.value = 'Erro ao consultar pontos próximos.';
  }
}

function hasCurrentAlertSettings(snapshot: AlertSettings): boolean {
  return (
    settings.value.enabled === snapshot.enabled &&
    settings.value.stopCode === snapshot.stopCode &&
    settings.value.lineCode === snapshot.lineCode &&
    settings.value.variantFilter === snapshot.variantFilter &&
    settings.value.minutesBefore === snapshot.minutesBefore
  );
}

async function pollPredictions() {
  if (!canPoll.value) {
    return;
  }

  if (isPolling) {
    return;
  }

  const settingsSnapshot = { ...settings.value };
  const stopCode = settingsSnapshot.stopCode.trim();
  isPolling = true;
  isLoading.value = true;
  statusMessage.value = 'Consultando previsões...';

  try {
    const nextPredictions = await fetchStopPredictions(stopCode);

    if (!hasCurrentAlertSettings(settingsSnapshot)) {
      return;
    }

    predictions.value = nextPredictions;
    lastUpdated.value = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const finitePredictions = nextPredictions.filter(prediction =>
      Number.isFinite(prediction.minutes),
    );
    const match = findAlertMatch(settingsSnapshot, finitePredictions);
    statusMessage.value = describeMatch(match.reason);

    if (match.shouldNotify && match.prediction) {
      const didNotify = notificationService.notifyArrival({
        id: match.prediction.id,
        lineCode: match.prediction.lineCode,
        minutes: match.prediction.minutes,
        destination: match.prediction.destination,
      });

      if (didNotify) {
        settings.value = { ...settings.value, lastNotifiedPredictionId: match.prediction.id };
      }
    }

    void refreshMapData(nextPredictions, settingsSnapshot.lineCode);
  } catch (error) {
    if (!hasCurrentAlertSettings(settingsSnapshot)) {
      return;
    }

    predictions.value = [];
    lastUpdated.value = null;
    statusMessage.value = error instanceof Error ? error.message : 'Erro ao consultar previsões.';
  } finally {
    isLoading.value = false;
    isPolling = false;
  }
}

async function refreshMapData(nextPredictions: Prediction[], lineCode: string) {
  const serviceId = selectMapServiceId(nextPredictions, lineCode);

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

function describeMatch(reason: AlertMatch['reason']): string {
  const messages: Record<AlertMatch['reason'], string> = {
    matched: 'Ônibus dentro do limite configurado.',
    disabled: 'Monitoramento pausado.',
    'missing-settings': 'Informe uma parada e uma linha.',
    'no-matching-line': 'Nenhuma previsão bate com a linha/variante configurada.',
    'above-threshold': 'Há previsão, mas ainda acima do limite configurado.',
    'already-notified': 'Previsão já notificada.',
  };

  return messages[reason];
}

onMounted(() => {
  void pollPredictions();
  intervalId = window.setInterval(() => void pollPredictions(), POLL_INTERVAL_MS);
});

onBeforeUnmount(() => {
  if (intervalId) {
    window.clearInterval(intervalId);
  }
});
</script>

<template>
  <AppShell
    :last-updated="lastUpdated"
    :is-loading="isLoading"
    :active-section="activeSection"
    :search-query="searchQuery"
    :search-results="searchResults"
    @navigate="navigate"
    @update-search="updateSearch"
    @select-stop="selectStop"
  >
    <section v-if="activeSection === 'monitoramento'" class="dashboard-grid">
      <MonitoringPanel
        :settings="settings"
        :predictions="predictions"
        :status-message="statusMessage"
        :is-loading="isLoading"
        :permission="permission"
        :last-updated="lastUpdated"
        @update="updateSettings"
        @request-permission="requestPermission"
        @use-current-location="useCurrentLocation"
      />

      <section class="map-stage">
        <div class="map-toolbar">
          <span class="active-indicator">
            <span></span>
            {{ settings.enabled ? 'Monitoramento ativo' : 'Monitoramento pausado' }}
          </span>
          <span class="map-mode">Mapa</span>
        </div>
        <MapView
          :monitored-stop="monitoredStop"
          :nearby-stops="nearbyStops"
          :route="route"
          :vehicles="vehicles"
          :is-locating="isLocating"
          :location-status="locationStatus"
          @use-current-location="useCurrentLocation"
        />
      </section>

      <MobileBottomSheet
        :settings="settings"
        :predictions="predictions"
        :status-message="statusMessage"
        :is-loading="isLoading"
        :permission="permission"
        :last-updated="lastUpdated"
        @update="updateSettings"
        @request-permission="requestPermission"
        @use-current-location="useCurrentLocation"
      />
    </section>

    <section v-else-if="activeSection === 'mapa'" class="section-page map-page">
      <div class="section-page-header">
        <p class="section-kicker">Mapa</p>
        <h1>Mapa em tela cheia</h1>
        <p>Veja os pontos carregados, a parada monitorada, a rota e os ônibus em operação.</p>
      </div>
      <section class="map-stage is-full">
        <MapView
          :monitored-stop="monitoredStop"
          :nearby-stops="nearbyStops"
          :route="route"
          :vehicles="vehicles"
          :is-locating="isLocating"
          :location-status="locationStatus"
          @use-current-location="useCurrentLocation"
        />
      </section>
    </section>

    <section v-else-if="activeSection === 'favoritos'" class="section-page">
      <div class="section-page-header">
        <p class="section-kicker">Favoritos</p>
        <h1>Favoritos salvos</h1>
        <p>Suas linhas e paradas fixadas vão aparecer aqui.</p>
      </div>
      <div class="placeholder-grid">
        <article class="control-card">
          <strong>Parada atual</strong>
          <span>{{ monitoredStop?.publicCode || settings.stopCode || 'Nenhuma parada selecionada' }}</span>
        </article>
        <article class="control-card">
          <strong>Linha preferida</strong>
          <span>{{ settings.lineCode }}</span>
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
          <span>Consultando a cada 45 segundos quando o monitoramento estiver ativo.</span>
        </article>
      </div>
    </section>
  </AppShell>
</template>
