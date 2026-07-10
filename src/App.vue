<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AppShell from './components/AppShell.vue';
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

const settings = ref<AlertSettings>(loadSettings());
const predictions = ref<Prediction[]>([]);
const lastUpdated = ref<string | null>(null);
const statusMessage = ref('Configure uma parada e ative o monitoramento.');
const isLoading = ref(false);
const nearbyStops = ref<NearbyStop[]>([]);
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

async function useCurrentLocation() {
  if (!navigator.geolocation) {
    statusMessage.value = 'Seu navegador não informou suporte a localização.';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      void loadNearbyStops(position.coords.latitude, position.coords.longitude);
    },
    () => {
      statusMessage.value = 'Não foi possível acessar sua localização.';
    },
    { enableHighAccuracy: true, timeout: 10_000 },
  );
}

async function loadNearbyStops(latitude: number, longitude: number) {
  try {
    nearbyStops.value = await fetchNearbyStops(latitude, longitude);
  } catch (error) {
    statusMessage.value =
      error instanceof Error ? error.message : 'Erro ao consultar paradas próximas.';
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
  <AppShell :last-updated="lastUpdated" :is-loading="isLoading">
    <section class="dashboard-grid">
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
  </AppShell>
</template>
