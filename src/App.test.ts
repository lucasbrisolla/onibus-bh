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
  serviceId: '53564',
  vehicleId: '40743',
  color: null,
  accessibilityCode: null,
  variant: 'direto',
};

function findClickableByText(wrapper: ReturnType<typeof mount>, text: string) {
  const target = wrapper
    .findAll('button, a, [role="button"]')
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

    expect(wrapper.text()).toContain('Próximos ônibus');
    expect(wrapper.text()).toContain('Mapa');
    expect(wrapper.text()).toContain('Monitoramento');
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

    expect(fetch).toHaveBeenCalledWith(
      '/api/paradas/1034/previsoes',
      expect.objectContaining({ cache: 'no-store', signal: expect.any(AbortSignal) }),
    );
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
    expect(
      vi.mocked(fetch).mock.calls.filter(([url]) => url === '/api/paradas/1034/previsoes').length,
    ).toBe(2);
  });

  it('polls immediately again when the window regains focus', async () => {
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

    const requestsBeforeFocus = vi.mocked(fetch).mock.calls.filter(
      ([url]) => url === '/api/paradas/1034/previsoes',
    ).length;

    window.dispatchEvent(new Event('focus'));
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(
      vi.mocked(fetch).mock.calls.filter(([url]) => url === '/api/paradas/1034/previsoes').length,
    ).toBeGreaterThan(requestsBeforeFocus);
  });

  it('keeps polling after selecting a stop while alerts are paused', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url === '/api/paradas/13566/previsoes') {
          return response({ predictions: [prediction] });
        }

        if (url === '/api/itinerarios/53564') {
          return response({ route: [] });
        }

        if (url === '/api/itinerarios/53564/veiculos') {
          return response({ vehicles: [] });
        }

        return response({});
      }),
    );

    const wrapper = mount(App);

    await wrapper.find('input[placeholder="Buscar parada ou endereço"]').setValue('40134');
    await wrapper.vm.$nextTick();
    await findClickableByText(wrapper, '40134').trigger('click');
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(
      vi.mocked(fetch).mock.calls.filter(([url]) => url === '/api/paradas/13566/previsoes').length,
    ).toBe(1);
    expect(notifyArrival).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(10_000);
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(
      vi.mocked(fetch).mock.calls.filter(([url]) => url === '/api/paradas/13566/previsoes').length,
    ).toBe(2);
    expect(notifyArrival).not.toHaveBeenCalled();
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

    let predictionRequests = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url === '/api/paradas/1034/previsoes') {
          predictionRequests += 1;

          if (predictionRequests === 1) {
            return response({ predictions: [prediction] });
          }

          throw new TypeError('Failed to fetch');
        }

        if (url === '/api/itinerarios/53564') {
          return response({ route: [] });
        }

        if (url === '/api/itinerarios/53564/veiculos') {
          return response({ vehicles: [] });
        }

        return response({});
      }),
    );

    const wrapper = mount(App);
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Estacao Sao Gabriel');

    await vi.advanceTimersByTimeAsync(10_000);
    await flushPromises();
    await wrapper.vm.$nextTick();

    await findClickableByText(wrapper, 'Mapa').trigger('click');
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

  it('renders departure labels without treating them as arrival minutes', async () => {
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
      vi.fn(async () =>
        response({
          predictions: [{ ...prediction, minutes: Infinity, departureLabel: 'Saída 12h45' }],
        }),
      ),
    );

    const wrapper = mount(App);
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Saída 12h45');
    expect(wrapper.text()).not.toContain('Infinity min');
    expect(notifyArrival).not.toHaveBeenCalled();
  });

  it('clamps alert minutes input into the supported range', async () => {
    const wrapper = mount(App);
    await findClickableByText(wrapper, 'Mapa').trigger('click');
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

    await findClickableByText(wrapper, 'Mapa').trigger('click');
    await wrapper.find('input[placeholder="Ex: 1234"]').setValue('9999');
    resolveFetch(response({ predictions: [prediction] }));
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).not.toContain('Estacao Sao Gabriel');
    expect(notifyArrival).not.toHaveBeenCalled();
  });

  it('retries polling after a stalled request times out', async () => {
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

    let predictionRequests = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url === '/api/paradas/1034/previsoes') {
          predictionRequests += 1;

          if (predictionRequests === 1) {
            return new Promise<Response>((_resolve, reject) => {
              init?.signal?.addEventListener('abort', () => {
                const error = new Error('Aborted');
                error.name = 'AbortError';
                reject(error);
              });
            });
          }

          return Promise.resolve(response({ predictions: [prediction] }));
        }

        if (url === '/api/itinerarios/53564') {
          return Promise.resolve(response({ route: [] }));
        }

        if (url === '/api/itinerarios/53564/veiculos') {
          return Promise.resolve(response({ vehicles: [] }));
        }

        return Promise.resolve(response({}));
      }),
    );

    const wrapper = mount(App);
    await vi.advanceTimersByTimeAsync(8_000);
    await flushPromises();
    await wrapper.vm.$nextTick();

    await vi.advanceTimersByTimeAsync(10_000);
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(
      vi.mocked(fetch).mock.calls.filter(([url]) => url === '/api/paradas/1034/previsoes').length,
    ).toBe(2);
    expect(wrapper.text()).toContain('Estacao Sao Gabriel');
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
    await findClickableByText(wrapper, 'Mapa').trigger('click');
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

    const favoritosButton = findClickableByText(wrapper, 'Favoritos');
    expect(favoritosButton.find('svg').exists()).toBe(true);

    await findClickableByText(wrapper, 'Favoritos').trigger('click');
    expect(wrapper.text()).toContain('Favoritos salvos');
    expect(wrapper.text()).toContain('Suas paradas mais usadas ficam aqui, com o endereço em destaque.');

    await findClickableByText(wrapper, 'Histórico').trigger('click');
    expect(wrapper.text()).toContain('Histórico de alertas');

    await findClickableByText(wrapper, 'Configurações').trigger('click');
    expect(wrapper.text()).toContain('Configurações do app');

    await findClickableByText(wrapper, 'Monitoramento').trigger('click');
    expect(wrapper.text()).toContain('Próximos ônibus');
    expect(wrapper.text()).not.toContain('Configuração do monitoramento');

    await findClickableByText(wrapper, 'Mapa').trigger('click');
    expect(wrapper.text()).toContain('Configuração do monitoramento');
    expect(wrapper.text()).toContain('Próximos ônibus');
  });

  it('hides and reopens the sidebar from the topbar toggle', async () => {
    const wrapper = mount(App);

    const shell = wrapper.find('.dashboard-shell');
    const sidebar = wrapper.find('.sidebar');
    const hideButton = wrapper.find('button[aria-label="Recolher sidebar"]');

    expect(shell.classes()).not.toContain('is-sidebar-hidden');
    expect(sidebar.attributes('style') ?? '').not.toContain('display: none');
    expect(hideButton.exists()).toBe(true);

    await hideButton.trigger('click');

    expect(shell.classes()).toContain('is-sidebar-hidden');
    expect(wrapper.find('.sidebar').attributes('style')).toContain('display: none');
    expect(wrapper.find('button[aria-label="Abrir sidebar"]').exists()).toBe(true);

    await wrapper.find('button[aria-label="Abrir sidebar"]').trigger('click');

    expect(shell.classes()).not.toContain('is-sidebar-hidden');
    expect(wrapper.find('.sidebar').attributes('style') ?? '').not.toContain('display: none');
    expect(wrapper.find('button[aria-label="Recolher sidebar"]').exists()).toBe(true);
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

    await findClickableByText(wrapper, 'Mapa').trigger('click');
    expect((wrapper.find('input[placeholder="Ex: 1234"]').element as HTMLInputElement).value).toBe(
      '13566',
    );
    await flushPromises();
    expect(fetch).toHaveBeenCalledWith(
      '/api/paradas/13566/previsoes',
      expect.objectContaining({ cache: 'no-store', signal: expect.any(AbortSignal) }),
    );
    expect(wrapper.text()).toContain('Estacao Sao Gabriel');
    expect(wrapper.text()).toContain('Parada monitorada');
    expect(wrapper.text()).toContain('Ponto selecionado');

    const selectedStopCard = wrapper.find('.selected-stop-card');
    expect(selectedStopCard.exists()).toBe(true);
    expect(selectedStopCard.find('h3').text()).toBe('ROD ANEL RODOVIARIO CELSO MELLO AZEVEDO, 11749');
    expect(selectedStopCard.text()).toContain('40134');
  });

  it('saves the selected stop as favorite and opens it from the favorites section', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ predictions: [prediction] })),
    );

    const wrapper = mount(App);

    await wrapper.find('input[placeholder="Buscar parada ou endereço"]').setValue('40134');
    await wrapper.vm.$nextTick();
    await findClickableByText(wrapper, '40134').trigger('click');
    await flushPromises();
    await wrapper.vm.$nextTick();

    await findClickableByText(wrapper, 'Mapa').trigger('click');
    await wrapper.find('button[aria-label="Salvar parada"]').trigger('click');
    await wrapper.vm.$nextTick();

    await findClickableByText(wrapper, 'Favoritos').trigger('click');
    expect(wrapper.text()).toContain('ROD ANEL RODOVIARIO CELSO MELLO AZEVEDO, 11749');
    expect(wrapper.text()).toContain('Abrir parada');

    await findClickableByText(wrapper, 'Abrir parada').trigger('click');
    await wrapper.vm.$nextTick();

    await findClickableByText(wrapper, 'Mapa').trigger('click');
    expect(wrapper.text()).toContain('Configuração do monitoramento');
    expect(wrapper.text()).toContain('Ponto selecionado');
    expect(wrapper.text()).toContain('Estacao Sao Gabriel');
  });

  it('keeps the selected stop card visible when opening a favorite outside the loaded nearby stops', async () => {
    localStorage.setItem(
      'onibus-bh-favorite-stops',
      JSON.stringify([
        {
          code: '99999',
          publicCode: '50001',
          latitude: -19.9,
          longitude: -43.9,
          description: 'RUA TESTE, 123',
          color: 4,
        },
      ]),
    );

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url === '/api/paradas/99999/previsoes') {
          return response({
            predictions: [
              {
                ...prediction,
                id: '9200-99999-5',
                lineCode: '9200',
                description: 'Circular Bairro',
                destination: 'Centro',
                serviceId: '99999',
                vehicleId: '99901',
              },
            ],
          });
        }

        if (url === '/api/itinerarios/99999') {
          return response({ route: [] });
        }

        if (url === '/api/itinerarios/99999/veiculos') {
          return response({ vehicles: [] });
        }

        return response({ predictions: [] });
      }),
    );

    const wrapper = mount(App);

    await findClickableByText(wrapper, 'Favoritos').trigger('click');
    await wrapper.vm.$nextTick();
    await findClickableByText(wrapper, 'Abrir parada').trigger('click');
    await flushPromises();
    await wrapper.vm.$nextTick();

    await findClickableByText(wrapper, 'Mapa').trigger('click');
    expect(wrapper.text()).toContain('Ponto selecionado');
    expect(wrapper.text()).toContain('RUA TESTE, 123');
    expect(wrapper.text()).toContain('Ponto 50001');
  });

  it('shows the selected bus trajectory context on the map when a prediction card is clicked', async () => {
    const fasterPrediction: Prediction = {
      ...prediction,
      id: '8350-direto-2',
      minutes: 2,
      vehicleId: '50743',
      serviceId: '54545',
    };

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url === '/api/paradas/13566/previsoes') {
          return response({ predictions: [prediction, fasterPrediction] });
        }

        if (url === '/api/itinerarios/53564') {
          return response({
            route: [
              { latitude: -19.94, longitude: -43.94 },
              { latitude: -19.93, longitude: -43.93 },
              { latitude: -19.92, longitude: -43.92 },
            ],
          });
        }

        if (url === '/api/itinerarios/53564/veiculos') {
          return response({
            vehicles: [
              {
                latitude: -19.939,
                longitude: -43.939,
                color: 3,
                lineCode: '8350',
                vehicleId: '40743',
                bearing: 135,
              },
            ],
          });
        }

        if (url === '/api/itinerarios/54545') {
          return response({
            route: [
              { latitude: -19.94, longitude: -43.94 },
              { latitude: -19.93, longitude: -43.93 },
              { latitude: -19.92, longitude: -43.92 },
            ],
          });
        }

        if (url === '/api/itinerarios/54545/veiculos') {
          return response({
            vehicles: [
              {
                latitude: -19.91,
                longitude: -43.91,
                color: 3,
                lineCode: '8350',
                vehicleId: '50743',
                bearing: 135,
              },
            ],
          });
        }

        return new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } });
      }),
    );

    localStorage.setItem(
      'onibus-bh-alert-settings',
      JSON.stringify({
        stopCode: '13566',
        lineCode: '8350',
        variantFilter: 'direto',
        minutesBefore: 7,
        enabled: true,
        lastNotifiedPredictionId: null,
      }),
    );

    const wrapper = mount(App);
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('8350 • 5 min');

    await findClickableByText(wrapper, '2 min').trigger('click');
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('8350 • 2 min');
    expect(wrapper.find('.prediction-card.is-selected').text()).toContain('2 min');
  });

  it('keeps the selected bus highlighted after polling updates its minutes', async () => {
    const updatedPrediction: Prediction = {
      ...prediction,
      id: '8350-direto-4',
      minutes: 4,
    };

    let predictionRequests = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url === '/api/paradas/1034/previsoes') {
          predictionRequests += 1;
          return response({
            predictions: [predictionRequests === 1 ? prediction : updatedPrediction],
          });
        }

        if (url === '/api/itinerarios/53564') {
          return response({
            route: [
              { latitude: -19.94, longitude: -43.94 },
              { latitude: -19.93, longitude: -43.93 },
            ],
          });
        }

        if (url === '/api/itinerarios/53564/veiculos') {
          return response({
            vehicles: [
              {
                latitude: -19.939,
                longitude: -43.939,
                color: 3,
                lineCode: '8350',
                vehicleId: '40743',
                bearing: 135,
              },
            ],
          });
        }

        return response({});
      }),
    );

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

    const wrapper = mount(App);
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('8350 • 5 min');

    await vi.advanceTimersByTimeAsync(10_000);
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('8350 • 4 min');
    expect(wrapper.find('.prediction-card.is-selected').text()).toContain('4 min');
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

  it('toggles dark mode from the sidebar', async () => {
    const wrapper = mount(App);

    expect(wrapper.find('.app-theme').attributes('data-theme')).toBe('light');

    await findClickableByText(wrapper, 'Modo escuro').trigger('click');

    expect(wrapper.find('.app-theme').attributes('data-theme')).toBe('dark');
    expect(localStorage.getItem('onibus-bh-theme')).toBe('dark');
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

    expect(wrapper.find('[data-map-icon="user-location"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Sua posição');
    expect(wrapper.text()).not.toContain('Localização ativa');
  });
});
