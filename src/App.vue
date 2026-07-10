<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AlertSettingsForm from './components/AlertSettingsForm.vue';
import PredictionList from './components/PredictionList.vue';
import StatusPanel from './components/StatusPanel.vue';
import { findAlertMatch } from './domain/alertRules';
import type { AlertMatch, AlertSettings, Prediction } from './domain/types';
import { fetchStopPredictions } from './services/apiClient';
import { createNotificationService } from './services/notificationService';
import { loadSettings, saveSettings } from './services/settingsStore';

const POLL_INTERVAL_MS = 45_000;

const settings = ref<AlertSettings>(loadSettings());
const predictions = ref<Prediction[]>([]);
const lastUpdated = ref<string | null>(null);
const statusMessage = ref('Configure uma parada e ative o monitoramento.');
const notificationService = createNotificationService();
const permission = ref(notificationService.getPermission());
let intervalId: number | undefined;

const canPoll = computed(() => settings.value.enabled && settings.value.stopCode.trim().length > 0);

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

async function pollPredictions() {
  if (!canPoll.value) {
    return;
  }

  try {
    predictions.value = await fetchStopPredictions(settings.value.stopCode.trim());
    lastUpdated.value = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const match = findAlertMatch(settings.value, predictions.value);
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
  } catch (error) {
    statusMessage.value = error instanceof Error ? error.message : 'Erro ao consultar previsões.';
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
  <main class="app-shell">
    <section class="hero">
      <p class="eyebrow">Ônibus BH</p>
      <h1>Alerta pessoal de chegada</h1>
      <p class="summary">
        Monitore uma parada e receba aviso local quando a linha escolhida estiver perto.
      </p>
    </section>

    <section class="layout">
      <AlertSettingsForm
        :settings="settings"
        @update="updateSettings"
        @request-permission="requestPermission"
      />
      <StatusPanel
        :enabled="settings.enabled"
        :permission="permission"
        :last-updated="lastUpdated"
        :message="statusMessage"
      />
      <PredictionList :predictions="predictions" />
    </section>
  </main>
</template>
