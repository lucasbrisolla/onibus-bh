import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, fetchStopPredictions } from './apiClient';
import type { Prediction } from '../domain/types';

const prediction: Prediction = {
  id: '8350-1',
  lineCode: '8350',
  description: 'Estacao Barreiro / Estacao Sao Gabriel',
  destination: 'Estacao Sao Gabriel',
  minutes: 5,
  queryTime: null,
  serviceId: null,
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
    expect(fetch).toHaveBeenCalledWith('/api/paradas/1034/previsoes');
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
});
