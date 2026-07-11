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
  vehicleId: null,
  color: null,
  accessibilityCode: null,
  variant: 'direto',
};

function findClickableByText(wrapper: ReturnType<typeof mount>, text: string) {
  const target = wrapper
    .findAll('button, a')
    .find(element => element.text().includes(text));

  if (!target) {
    throw new Error(`Clickable element not found: ${text}`);
  }

  return target;
}

describe('App', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
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
    expect(wrapper.text()).toContain('Parada monitorada');
    expect(wrapper.text()).toContain('Próximos ônibus');
    expect(wrapper.text()).toContain('Mapa');
    expect(wrapper.text()).toContain('Favoritos');
    expect(wrapper.text()).toContain('Histórico');
    expect(wrapper.text()).toContain('Configurações');
    expect(wrapper.text()).toContain('Nenhuma previsão carregada.');
    expect(wrapper.find('.map-surface').exists()).toBe(true);
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

    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('clears stale predictions and shows an error when a refresh fails', async () => {
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
      vi
        .fn()
        .mockResolvedValueOnce(response({ predictions: [prediction] }))
        .mockRejectedValueOnce(new TypeError('Failed to fetch')),
    );

    const wrapper = mount(App);
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Estacao Sao Gabriel');

    await vi.advanceTimersByTimeAsync(10_000);
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).not.toContain('Estacao Sao Gabriel');
    expect(wrapper.text()).toContain('Não foi possível conectar à API');
    expect(wrapper.text()).toContain('Nenhuma previsão carregada.');
  });

  it('does not render or notify non-finite prediction minutes', async () => {
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
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ predictions: [{ ...prediction, minutes: Infinity }] }),
      })),
    );

    const wrapper = mount(App);
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).not.toContain('Infinity min');
    expect(wrapper.text()).toContain('Sem previsão');
    expect(notifyArrival).not.toHaveBeenCalled();
  });

  it('clamps alert minutes input into the supported range', async () => {
    const wrapper = mount(App);
    const minutesInput = wrapper.find('input[type="number"]');

    await minutesInput.setValue('999');
    await wrapper.vm.$nextTick();

    expect((minutesInput.element as HTMLInputElement).value).toBe('60');

    let stored = JSON.parse(localStorage.getItem('onibus-bh-alert-settings') ?? '{}') as {
      minutesBefore?: number;
    };
    expect(stored.minutesBefore).toBe(60);

    await minutesInput.setValue('');
    await wrapper.vm.$nextTick();

    expect((minutesInput.element as HTMLInputElement).value).toBe('1');

    stored = JSON.parse(localStorage.getItem('onibus-bh-alert-settings') ?? '{}') as {
      minutesBefore?: number;
    };
    expect(stored.minutesBefore).toBe(1);
  });

  it('ignores overlapping poll requests and stale responses', async () => {
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

    let resolveFetch: (value: Response) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>(resolve => {
            resolveFetch = resolve;
          }),
      ),
    );

    const wrapper = mount(App);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(fetch).toHaveBeenCalledTimes(1);

    await wrapper.find('input[placeholder="Ex: 1234"]').setValue('9999');
    resolveFetch(response({ predictions: [prediction] }));
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).not.toContain('Estacao Sao Gabriel');
    expect(notifyArrival).not.toHaveBeenCalled();
  });

  it('ignores an in-flight response when alert settings change before it resolves', async () => {
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

    let resolveFetch: (value: Response) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>(resolve => {
            resolveFetch = resolve;
          }),
      ),
    );

    const wrapper = mount(App);
    await wrapper.find('select').setValue('nao-direto');

    resolveFetch(response({ predictions: [prediction] }));
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).not.toContain('Estacao Sao Gabriel');
    expect(wrapper.text()).toContain('Nenhuma previsão carregada.');
    expect(notifyArrival).not.toHaveBeenCalled();
  });

  it('switches dashboard sections from the sidebar', async () => {
    const wrapper = mount(App);

    await findClickableByText(wrapper, 'Favoritos').trigger('click');
    expect(wrapper.text()).toContain('Favoritos salvos');
    expect(wrapper.text()).toContain('Suas linhas e paradas fixadas vão aparecer aqui.');

    await findClickableByText(wrapper, 'Histórico').trigger('click');
    expect(wrapper.text()).toContain('Histórico de alertas');

    await findClickableByText(wrapper, 'Configurações').trigger('click');
    expect(wrapper.text()).toContain('Configurações do app');

    await findClickableByText(wrapper, 'Mapa').trigger('click');
    expect(wrapper.text()).toContain('Mapa');
  });

  it('searches loaded stops and selects a stop from the topbar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ predictions: [prediction] })),
    );

    const wrapper = mount(App);

    await wrapper.find('input[placeholder="Buscar parada ou endereço"]').setValue('40134');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('40134');
    expect(wrapper.text()).toContain('ROD ANEL RODOVIARIO CELSO MELLO AZEVEDO, 11749');

    await findClickableByText(wrapper, '40134').trigger('click');
    await wrapper.vm.$nextTick();

    expect((wrapper.find('input[placeholder="Ex: 1234"]').element as HTMLInputElement).value).toBe(
      '13566',
    );
    await flushPromises();
    expect(fetch).toHaveBeenCalledWith('/api/paradas/13566/previsoes');
    expect(wrapper.text()).toContain('Estacao Sao Gabriel');
    expect(wrapper.text()).toContain('Parada monitorada');
    expect(wrapper.text()).toContain('Ponto selecionado');
    expect(wrapper.text()).toContain('40134');
    expect(wrapper.text()).toContain('ROD ANEL RODOVIARIO CELSO MELLO AZEVEDO, 11749');
  });

  it('uses the geolocation control from the map', async () => {
    const getCurrentPosition = vi.fn();
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition,
      },
    });

    const wrapper = mount(App);

    const locationButton = wrapper.find('button[aria-label="Usar minha localização"]');
    expect(locationButton.exists()).toBe(true);
    await locationButton.trigger('click');

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(wrapper.find('button[aria-label="Localizando sua posição"]').exists()).toBe(true);
  });

  it('shows the current location marker after geolocation succeeds', async () => {
    const getCurrentPosition = vi.fn(success => {
      success({
        coords: {
          latitude: -19.916342,
          longitude: -43.993759,
        },
      });
    });

    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition,
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        response({
          stops: [
            {
              code: '13566',
              publicCode: '40134',
              latitude: -19.916136,
              longitude: -43.99563,
              description: 'ROD ANEL',
              color: 4,
            },
          ],
        }),
      ),
    );

    const wrapper = mount(App);
    await wrapper.find('button[aria-label="Usar minha localização"]').trigger('click');
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Sua posição');
    expect(wrapper.text()).toContain('Localização ativa');
  });
});
