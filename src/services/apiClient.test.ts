import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiClientError,
  fetchNearbyStops,
  fetchRoutePoints,
  fetchStopPredictions,
  fetchVehicles,
} from './apiClient';
import type { Prediction } from '../domain/types';

const prediction: Prediction = {
  id: '8350-1',
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

function response(body: string, init: ResponseInit): Response {
  return new Response(body, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

describe('fetchStopPredictions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns predictions from a successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response(JSON.stringify({ predictions: [prediction] }), { status: 200 })),
    );

    await expect(fetchStopPredictions('1034')).resolves.toEqual([prediction]);
    expect(fetch).toHaveBeenCalledWith('/api/paradas/1034/previsoes', expect.any(Object));
  });

  it('uses the API error message for JSON error responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        response(JSON.stringify({ error: { message: 'Parada nao encontrada' } }), { status: 404 }),
      ),
    );

    await expect(fetchStopPredictions('x')).rejects.toMatchObject({
      name: 'ApiClientError',
      message: 'Parada nao encontrada',
      status: 404,
    });
  });

  it('uses a fallback message when an error response is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>erro</html>', { status: 500 })),
    );

    await expect(fetchStopPredictions('1034')).rejects.toMatchObject({
      name: 'ApiClientError',
      message: 'Erro ao consultar API',
      status: 500,
    });
  });

  it('wraps fetch network failures in ApiClientError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );

    await expect(fetchStopPredictions('1034')).rejects.toBeInstanceOf(ApiClientError);
    await expect(fetchStopPredictions('1034')).rejects.toMatchObject({
      message: 'Não foi possível conectar à API',
      status: 0,
    });
  });

  it('aborts stalled prediction requests and disables browser cache', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              const error = new Error('Aborted');
              error.name = 'AbortError';
              reject(error);
            });
          }),
      ),
    );

    const pendingRequest = expect(fetchStopPredictions('1034')).rejects.toMatchObject({
      name: 'ApiClientError',
      message: 'Não foi possível conectar à API',
      status: 0,
    });
    await vi.advanceTimersByTimeAsync(8_100);
    await pendingRequest;
    expect(fetch).toHaveBeenCalledWith(
      '/api/paradas/1034/previsoes',
      expect.objectContaining({ cache: 'no-store', signal: expect.any(AbortSignal) }),
    );
  });
});

describe('map API clients', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches nearby stops with lat and lng query params', async () => {
    const stops = [
      {
        code: '13566',
        publicCode: '40134',
        latitude: -19.916136,
        longitude: -43.99563,
        description: 'ROD ANEL',
        color: 4,
      },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response(JSON.stringify({ stops }), { status: 200 })),
    );

    await expect(fetchNearbyStops(-19.916342, -43.993759)).resolves.toEqual(stops);
    expect(fetch).toHaveBeenCalledWith(
      '/api/paradas/proximas?lat=-19%2E916342&lng=-43%2E993759',
      expect.objectContaining({ cache: 'no-store', signal: expect.any(AbortSignal) }),
    );
  });

  it('fetches route points by service id', async () => {
    const route = [{ latitude: -19.9, longitude: -43.9 }];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response(JSON.stringify({ route }), { status: 200 })),
    );

    await expect(fetchRoutePoints('53564')).resolves.toEqual(route);
    expect(fetch).toHaveBeenCalledWith(
      '/api/itinerarios/53564',
      expect.objectContaining({ cache: 'no-store', signal: expect.any(AbortSignal) }),
    );
  });

  it('fetches vehicles by service id', async () => {
    const vehicles = [
      {
        latitude: -19.91,
        longitude: -43.99,
        color: 3,
        lineCode: '8350',
        vehicleId: '40743',
        bearing: 135,
      },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response(JSON.stringify({ vehicles }), { status: 200 })),
    );

    await expect(fetchVehicles('53564')).resolves.toEqual(vehicles);
    expect(fetch).toHaveBeenCalledWith(
      '/api/itinerarios/53564/veiculos',
      expect.objectContaining({ cache: 'no-store', signal: expect.any(AbortSignal) }),
    );
  });
});
