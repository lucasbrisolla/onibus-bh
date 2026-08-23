import { flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import type { AlertSettings, Prediction } from '../domain/types';
import {
  createPredictionMonitor,
  type PredictionMonitorScheduler,
} from './predictionMonitor';

const baseSettings: AlertSettings = {
  stopCode: '1234',
  lineCode: '8350',
  variantFilter: 'direto',
  minutesBefore: 7,
  enabled: false,
  lastNotifiedPredictionId: null,
};

const firstPrediction: Prediction = {
  id: '8350-direto-5',
  lineCode: '8350',
  description: '8350 Direto Centro',
  destination: 'Centro',
  minutes: 5,
  queryTime: null,
  serviceId: 'service-1',
  vehicleId: 'vehicle-1',
  color: null,
  accessibilityCode: null,
  variant: 'direto',
};

function createScheduler() {
  let nextHandle = 1;
  const tasks = new Map<number, () => void>();
  const scheduler: PredictionMonitorScheduler = {
    schedule: vi.fn((task: () => void) => {
      const handle = nextHandle;
      nextHandle += 1;
      tasks.set(handle, task);
      return handle;
    }),
    cancel: vi.fn((handle: unknown) => {
      tasks.delete(handle as number);
    }),
  };

  return {
    scheduler,
    runNext(): void {
      const next = tasks.entries().next().value as [number, () => void] | undefined;
      if (!next) {
        throw new Error('Nenhuma tarefa agendada.');
      }

      tasks.delete(next[0]);
      next[1]();
    },
    pendingCount(): number {
      return tasks.size;
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

function createMonitor(
  fetchPredictions: (stopCode: string) => Promise<Prediction[]>,
  overrides: Partial<Parameters<typeof createPredictionMonitor>[0]> = {},
) {
  return createPredictionMonitor({
    initialSettings: baseSettings,
    fetchPredictions,
    notifyArrival: vi.fn(() => true),
    clock: { now: () => new Date('2026-08-23T15:04:05.000Z') },
    ...overrides,
  });
}

describe('createPredictionMonitor', () => {
  it('consulta imediatamente e continua a cada 10 segundos mesmo com alertas pausados', async () => {
    const fetchPredictions = vi.fn(async () => [firstPrediction]);
    const fakeScheduler = createScheduler();
    const monitor = createMonitor(fetchPredictions, { scheduler: fakeScheduler.scheduler });

    monitor.start();
    await flushPromises();

    expect(fetchPredictions).toHaveBeenCalledWith('1234');
    expect(fakeScheduler.scheduler.schedule).toHaveBeenCalledWith(expect.any(Function), 10_000);
    expect(monitor.state.isLoading).toBe(false);

    fakeScheduler.runNext();
    await flushPromises();

    expect(fetchPredictions).toHaveBeenCalledTimes(2);
  });

  it('retoma uma consulta imediatamente quando o ciclo é retomado', async () => {
    const fetchPredictions = vi.fn(async () => [firstPrediction]);
    const fakeScheduler = createScheduler();
    const monitor = createMonitor(fetchPredictions, { scheduler: fakeScheduler.scheduler });

    monitor.start();
    await flushPromises();
    monitor.resume();
    await flushPromises();

    expect(fetchPredictions).toHaveBeenCalledTimes(2);
    expect(fakeScheduler.pendingCount()).toBe(1);
  });

  it('impede sobreposição e descarta resposta de uma configuração obsoleta', async () => {
    const firstRequest = deferred<Prediction[]>();
    const fetchPredictions = vi.fn(() => firstRequest.promise);
    const notifyArrival = vi.fn(() => true);
    const monitor = createMonitor(fetchPredictions, { notifyArrival });

    monitor.start();

    expect(fetchPredictions).toHaveBeenCalledTimes(1);

    monitor.updateSettings({ ...baseSettings, lineCode: '9200', enabled: true });
    firstRequest.resolve([firstPrediction]);
    await flushPromises();

    expect(monitor.state.predictions).toEqual([]);
    expect(monitor.state.lastUpdated).toBeNull();
    expect(notifyArrival).not.toHaveBeenCalled();
    expect(fetchPredictions).toHaveBeenCalledTimes(1);
  });

  it('faz a seleção de uma nova parada imediatamente após uma consulta em andamento', async () => {
    const firstRequest = deferred<Prediction[]>();
    const secondRequest = deferred<Prediction[]>();
    const fetchPredictions = vi
      .fn<(_: string) => Promise<Prediction[]>>()
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);
    const monitor = createMonitor(fetchPredictions);

    monitor.start();
    monitor.selectStop('5678', '40199');

    expect(fetchPredictions).toHaveBeenCalledTimes(1);

    firstRequest.resolve([firstPrediction]);
    await flushPromises();

    expect(fetchPredictions).toHaveBeenNthCalledWith(2, '5678');

    const secondPrediction = { ...firstPrediction, id: '9200-2', lineCode: '9200' };
    secondRequest.resolve([secondPrediction]);
    await flushPromises();

    expect(monitor.state.predictions).toEqual([secondPrediction]);
    expect(monitor.state.settings.stopCode).toBe('5678');
  });

  it('limpa dados obsoletos após uma falha e mantém o próximo ciclo agendado', async () => {
    const fetchPredictions = vi
      .fn<(_: string) => Promise<Prediction[]>>()
      .mockResolvedValueOnce([firstPrediction])
      .mockRejectedValueOnce(new Error('Falha temporária'));
    const fakeScheduler = createScheduler();
    const monitor = createMonitor(fetchPredictions, { scheduler: fakeScheduler.scheduler });

    monitor.start();
    await flushPromises();
    expect(monitor.state.predictions).toEqual([firstPrediction]);
    expect(monitor.state.lastUpdated).not.toBeNull();

    fakeScheduler.runNext();
    await flushPromises();

    expect(monitor.state.predictions).toEqual([]);
    expect(monitor.state.selectedPredictionId).toBeNull();
    expect(monitor.state.lastUpdated).toBeNull();
    expect(monitor.state.statusMessage).toBe('Falha temporária');
    expect(fakeScheduler.pendingCount()).toBe(1);
  });

  it('preserva a previsão por id, veículo e serviço, ou por serviço, linha e destino', async () => {
    const sameVehicle = { ...firstPrediction, id: 'id-renovado', minutes: 4 };
    const sameService = {
      ...firstPrediction,
      id: 'servico-renovado',
      vehicleId: 'vehicle-other',
      minutes: 3,
    };
    const fallback = { ...firstPrediction, id: 'fallback', serviceId: 'service-other' };
    const fetchPredictions = vi
      .fn<(_: string) => Promise<Prediction[]>>()
      .mockResolvedValueOnce([firstPrediction])
      .mockResolvedValueOnce([sameVehicle])
      .mockResolvedValueOnce([sameService])
      .mockResolvedValueOnce([fallback]);
    const monitor = createMonitor(fetchPredictions);

    monitor.start();
    await flushPromises();
    expect(monitor.state.selectedPredictionId).toBe(firstPrediction.id);

    await monitor.refresh();
    expect(monitor.state.selectedPredictionId).toBe(sameVehicle.id);

    await monitor.refresh();
    expect(monitor.state.selectedPredictionId).toBe(sameService.id);

    await monitor.refresh();
    expect(monitor.state.selectedPredictionId).toBe(fallback.id);
  });

  it('considera apenas minutos finitos e persiste a previsão notificada', async () => {
    const notifyArrival = vi.fn(() => true);
    const finitePrediction = { ...firstPrediction, id: 'finite-5' };
    const scheduledPrediction = { ...firstPrediction, id: 'scheduled', minutes: Infinity };
    const fetchPredictions = vi
      .fn<(_: string) => Promise<Prediction[]>>()
      .mockResolvedValueOnce([scheduledPrediction])
      .mockResolvedValueOnce([finitePrediction])
      .mockResolvedValueOnce([finitePrediction]);
    const monitor = createMonitor(fetchPredictions, {
      initialSettings: { ...baseSettings, enabled: true },
      notifyArrival,
    });

    monitor.start();
    await flushPromises();
    expect(notifyArrival).not.toHaveBeenCalled();

    await monitor.refresh();
    expect(notifyArrival).toHaveBeenCalledOnce();
    expect(monitor.state.settings.lastNotifiedPredictionId).toBe(finitePrediction.id);

    await monitor.refresh();
    expect(notifyArrival).toHaveBeenCalledOnce();
  });

  it('emite o contexto da previsão aceita e da seleção explícita', async () => {
    const selectedPrediction = { ...firstPrediction, id: 'selected-2' };
    const onContextChange = vi.fn();
    const monitor = createMonitor(vi.fn(async () => [firstPrediction, selectedPrediction]), {
      onContextChange,
    });

    monitor.start();
    await flushPromises();
    monitor.selectPrediction(selectedPrediction.id);

    expect(onContextChange).toHaveBeenLastCalledWith({
      predictions: [firstPrediction, selectedPrediction],
      selectedPrediction,
      settings: baseSettings,
    });
  });
});
