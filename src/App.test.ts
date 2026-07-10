import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App.vue';
import type { Prediction } from './domain/types';

const notifyArrival = vi.fn();
const requestPermission = vi.fn(async () => 'granted' as const);

vi.mock('./services/notificationService', () => ({
  createNotificationService: () => ({
    getPermission: () => 'granted',
    requestPermission,
    notifyArrival,
  }),
}));

function response(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const prediction: Prediction = {
  id: '8350-direto-5',
  lineCode: '8350',
  description: 'Estacao Barreiro / Estacao Sao Gabriel',
  destination: 'Estacao Sao Gabriel',
  minutes: 5,
  queryTime: null,
  serviceId: null,
  variant: 'direto',
};

describe('App', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    notifyArrival.mockReset();
    notifyArrival.mockReturnValue(true);
    requestPermission.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders alert controls and initial status', () => {
    const wrapper = mount(App);

    expect(wrapper.text()).toContain('Alerta pessoal de chegada');
    expect(wrapper.text()).toContain('Código da parada');
    expect(wrapper.text()).toContain('Variante da 8350');
    expect(wrapper.text()).toContain('Ativar monitoramento');
    expect(wrapper.text()).toContain('Monitoramento');
    expect(wrapper.text()).toContain('Nenhuma previsão carregada.');
  });

  it('polls enabled settings, renders predictions, and stores the notified prediction id', async () => {
    localStorage.setItem(
      'onibus-bh-alert-settings',
      JSON.stringify({
        stopCode: '1034',
        lineCode: '8350',
        variantFilter: 'direto',
        minutesBefore: 7,
        enabled: true,
        lastNotifiedPredictionId: null,
      }),
    );

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ predictions: [prediction] })),
    );

    const wrapper = mount(App);
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(fetch).toHaveBeenCalledWith('/api/paradas/1034/previsoes');
    expect(wrapper.text()).toContain('Estacao Sao Gabriel');
    expect(wrapper.text()).toContain('Direto');
    expect(wrapper.text()).toContain('5 min');
    expect(notifyArrival).toHaveBeenCalledWith({
      id: prediction.id,
      lineCode: prediction.lineCode,
      minutes: prediction.minutes,
      destination: prediction.destination,
    });

    const stored = JSON.parse(localStorage.getItem('onibus-bh-alert-settings') ?? '{}') as {
      lastNotifiedPredictionId?: string;
    };
    expect(stored.lastNotifiedPredictionId).toBe(prediction.id);

    await vi.advanceTimersByTimeAsync(45_000);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
