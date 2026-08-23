import { reactive } from 'vue';
import { findAlertMatch } from '../domain/alertRules';
import type { AlertMatch, AlertSettings, Prediction, StopIdentity } from '../domain/types';

export const PREDICTION_POLL_INTERVAL_MS = 10_000;

const INITIAL_STATUS = 'Configure uma parada e ative o monitoramento.';
const REQUEST_STATUS = 'Consultando previsões...';

export interface ArrivalNotification {
  id: string;
  lineCode: string;
  minutes: number;
  destination: string;
}

export interface PredictionMonitorClock {
  now(): Date;
}

export interface PredictionMonitorScheduler {
  schedule(task: () => void, delayMs: number): unknown;
  cancel(handle: unknown): void;
}

export interface PredictionMonitorContext {
  predictions: Prediction[];
  selectedPrediction: Prediction | null;
  settings: AlertSettings;
}

export interface PredictionMonitorState {
  settings: AlertSettings;
  predictions: Prediction[];
  selectedPredictionId: string | null;
  lastUpdated: string | null;
  statusMessage: string;
  isLoading: boolean;
}

export interface PredictionMonitorDependencies {
  initialSettings: AlertSettings;
  fetchPredictions: (stopCode: string) => Promise<Prediction[]>;
  notifyArrival: (input: ArrivalNotification) => boolean;
  clock?: PredictionMonitorClock;
  scheduler?: PredictionMonitorScheduler;
  pollIntervalMs?: number;
  onContextChange?: (context: PredictionMonitorContext) => void;
}

export interface PredictionMonitor {
  state: PredictionMonitorState;
  start(): void;
  stop(): void;
  refresh(): Promise<void>;
  resume(): void;
  updateSettings(nextSettings: AlertSettings): void;
  selectStop(stop: StopIdentity): void;
  selectPrediction(predictionId: string): void;
}

const defaultClock: PredictionMonitorClock = {
  now: () => new Date(),
};

const defaultScheduler: PredictionMonitorScheduler = {
  schedule: (task, delayMs) => globalThis.setTimeout(task, delayMs),
  cancel: handle => globalThis.clearTimeout(handle as number),
};

function describeAlertMatch(reason: AlertMatch['reason']): string {
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

function formatUpdatedAt(date: Date): string {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function hasSameAlertSettings(left: AlertSettings, right: AlertSettings): boolean {
  return (
    left.enabled === right.enabled &&
    left.stopCode === right.stopCode &&
    left.lineCode === right.lineCode &&
    left.variantFilter === right.variantFilter &&
    left.minutesBefore === right.minutesBefore
  );
}

function cloneSettings(settings: AlertSettings): AlertSettings {
  return { ...settings };
}

function findSelectedPrediction(
  candidates: Prediction[],
  selectedPrediction: Prediction | null,
): Prediction | null {
  if (!selectedPrediction) {
    return null;
  }

  const selectedById = candidates.find(candidate => candidate.id === selectedPrediction.id);
  if (selectedById) {
    return selectedById;
  }

  if (selectedPrediction.vehicleId) {
    const sameVehicleAndService = candidates.find(
      candidate =>
        candidate.vehicleId === selectedPrediction.vehicleId &&
        candidate.serviceId === selectedPrediction.serviceId,
    );
    if (sameVehicleAndService) {
      return sameVehicleAndService;
    }
  }

  return (
    candidates.find(
      candidate =>
        candidate.serviceId === selectedPrediction.serviceId &&
        candidate.lineCode === selectedPrediction.lineCode &&
        candidate.destination === selectedPrediction.destination,
    ) ?? null
  );
}

export function createPredictionMonitor(
  dependencies: PredictionMonitorDependencies,
): PredictionMonitor {
  const clock = dependencies.clock ?? defaultClock;
  const scheduler = dependencies.scheduler ?? defaultScheduler;
  const pollIntervalMs = dependencies.pollIntervalMs ?? PREDICTION_POLL_INTERVAL_MS;
  const state = reactive<PredictionMonitorState>({
    settings: cloneSettings(dependencies.initialSettings),
    predictions: [],
    selectedPredictionId: null,
    lastUpdated: null,
    statusMessage: INITIAL_STATUS,
    isLoading: false,
  });

  let isStarted = false;
  let scheduledPoll: unknown = null;
  let activeRequest: Promise<void> | null = null;
  let refreshRequested = false;
  let settingsVersion = 0;

  function selectedPrediction(): Prediction | null {
    return state.predictions.find(item => item.id === state.selectedPredictionId) ?? null;
  }

  function emitContext(): void {
    dependencies.onContextChange?.({
      predictions: [...state.predictions],
      selectedPrediction: selectedPrediction(),
      settings: cloneSettings(state.settings),
    });
  }

  function clearScheduledPoll(): void {
    if (scheduledPoll === null) {
      return;
    }

    scheduler.cancel(scheduledPoll);
    scheduledPoll = null;
  }

  function scheduleNextPoll(): void {
    if (!isStarted) {
      return;
    }

    clearScheduledPoll();
    scheduledPoll = scheduler.schedule(() => {
      scheduledPoll = null;
      void refresh();
    }, pollIntervalMs);
  }

  function isCurrentRequest(snapshot: AlertSettings, version: number): boolean {
    return version === settingsVersion && hasSameAlertSettings(state.settings, snapshot);
  }

  function completeRequestCycle(): void {
    if (refreshRequested) {
      refreshRequested = false;
      void executeRequest();
      return;
    }

    state.isLoading = false;
    scheduleNextPoll();
  }

  function executeRequest(): Promise<void> {
    const settingsSnapshot = cloneSettings(state.settings);
    const stopCode = settingsSnapshot.stopCode.trim();

    if (!stopCode) {
      state.isLoading = false;
      scheduleNextPoll();
      return Promise.resolve();
    }

    const requestVersion = settingsVersion;
    state.isLoading = true;
    state.statusMessage = REQUEST_STATUS;

    let request: Promise<void> | null = null;
    request = (async () => {
      try {
        const nextPredictions = await dependencies.fetchPredictions(stopCode);

        if (!isCurrentRequest(settingsSnapshot, requestVersion)) {
          return;
        }

        const previousSelectedPrediction = selectedPrediction();
        const selectedPredictionMatch =
          findSelectedPrediction(nextPredictions, previousSelectedPrediction) ??
          nextPredictions[0] ??
          null;

        state.predictions = nextPredictions;
        state.selectedPredictionId = selectedPredictionMatch?.id ?? null;
        state.lastUpdated = formatUpdatedAt(clock.now());

        const alertMatch = findAlertMatch(settingsSnapshot, nextPredictions);
        state.statusMessage = describeAlertMatch(alertMatch.reason);

        if (alertMatch.shouldNotify && alertMatch.prediction) {
          let didNotify = false;
          try {
            didNotify = dependencies.notifyArrival({
              id: alertMatch.prediction.id,
              lineCode: alertMatch.prediction.lineCode,
              minutes: alertMatch.prediction.minutes,
              destination: alertMatch.prediction.destination,
            });
          } catch {
            didNotify = false;
          }

          if (didNotify) {
            state.settings = {
              ...state.settings,
              lastNotifiedPredictionId: alertMatch.prediction.id,
            };
          }
        }

        emitContext();
      } catch (error) {
        if (!isCurrentRequest(settingsSnapshot, requestVersion)) {
          return;
        }

        state.predictions = [];
        state.selectedPredictionId = null;
        state.lastUpdated = null;
        state.statusMessage = error instanceof Error ? error.message : 'Erro ao consultar previsões.';
        emitContext();
      } finally {
        if (request !== null && activeRequest === request) {
          activeRequest = null;
          completeRequestCycle();
        }
      }
    })();

    activeRequest = request;
    return request as Promise<void>;
  }

  function refresh(): Promise<void> {
    clearScheduledPoll();

    if (activeRequest) {
      refreshRequested = true;
      return activeRequest;
    }

    return executeRequest();
  }

  function start(): void {
    if (isStarted) {
      return;
    }

    isStarted = true;
    void refresh();
  }

  function stop(): void {
    isStarted = false;
    settingsVersion += 1;
    refreshRequested = false;
    clearScheduledPoll();
    state.isLoading = false;
  }

  function resume(): void {
    if (!isStarted) {
      start();
      return;
    }

    void refresh();
  }

  function updateSettings(nextSettings: AlertSettings): void {
    const previousSettings = state.settings;
    const querySettingsChanged = !hasSameAlertSettings(previousSettings, nextSettings);
    const stopChanged = previousSettings.stopCode !== nextSettings.stopCode;
    state.settings = cloneSettings(nextSettings);

    if (!querySettingsChanged) {
      return;
    }

    settingsVersion += 1;

    if (stopChanged) {
      state.predictions = [];
      state.selectedPredictionId = null;
      state.lastUpdated = null;
      state.statusMessage = INITIAL_STATUS;
    } else {
      const alertMatch = findAlertMatch(state.settings, state.predictions);
      state.statusMessage = describeAlertMatch(alertMatch.reason);
    }

    emitContext();

    if (stopChanged && isStarted) {
      void refresh();
    }
  }

  function selectStop(stop: StopIdentity): void {
    const normalizedStopCode = stop.code.trim();
    const publicCode = stop.publicCode.trim() || normalizedStopCode;
    const isSameStop = state.settings.stopCode.trim() === normalizedStopCode;
    state.settings = {
      ...state.settings,
      stopCode: normalizedStopCode,
    };
    settingsVersion += 1;
    state.selectedPredictionId = null;

    if (!isSameStop) {
      state.predictions = [];
      state.lastUpdated = null;
    }

    state.statusMessage = `Parada ${publicCode || normalizedStopCode} selecionada. Buscando ônibus que passam nela...`;
    emitContext();
    void refresh();
  }

  function selectPrediction(predictionId: string): void {
    if (!state.predictions.some(prediction => prediction.id === predictionId)) {
      return;
    }

    state.selectedPredictionId = predictionId;
    emitContext();
  }

  return {
    state,
    start,
    stop,
    refresh,
    resume,
    updateSettings,
    selectStop,
    selectPrediction,
  };
}
