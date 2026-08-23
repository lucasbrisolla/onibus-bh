import { describe, expect, it, vi } from 'vitest';

import type { NearbyStop, Prediction, RoutePoint, Vehicle } from '../domain/types';
import { BadGatewayError } from './errors';
import {
  dispatchApiRequest,
  type ApiContractOperations,
} from './apiContractDispatcher';

const prediction: Prediction = {
  id: '8350-53564-12',
  lineCode: '8350',
  description: 'Estacao Barreiro / Estacao Sao Gabriel',
  destination: 'Estacao Sao Gabriel',
  minutes: 12,
  queryTime: '06:45',
  serviceId: '53564',
  vehicleId: '11353',
  color: 4,
  accessibilityCode: 6,
  variant: 'direto',
};

const stop: NearbyStop = {
  code: '13566',
  publicCode: '40134',
  latitude: -19.916136,
  longitude: -43.99563,
  description: 'ROD ANEL',
  color: 4,
};

const route: RoutePoint[] = [{ latitude: -19.9, longitude: -43.9 }];

const vehicle: Vehicle = {
  latitude: -19.91,
  longitude: -43.99,
  color: 3,
  lineCode: '8350',
  vehicleId: '40743',
  bearing: 135,
};

function createOperations(
  overrides: Partial<ApiContractOperations> = {},
): ApiContractOperations {
  return {
    checkSiuHealth: vi.fn(async () => ({ ok: true as const })),
    getLines: vi.fn(async () => ({ lines: ['8350'] })),
    getNearbyStops: vi.fn(async () => [stop]),
    getStopPredictions: vi.fn(async () => [prediction]),
    getRoutePoints: vi.fn(async () => route),
    getVehicles: vi.fn(async () => [vehicle]),
    ...overrides,
  };
}

describe('dispatchApiRequest', () => {
  it('responde saúde e linhas com o payload devolvido pelas operações', async () => {
    const operations = createOperations();

    await expect(
      dispatchApiRequest({ method: 'GET', url: '/api/health' }, operations),
    ).resolves.toEqual({ status: 200, body: { ok: true } });
    await expect(
      dispatchApiRequest({ method: 'GET', url: '/api/linhas' }, operations),
    ).resolves.toEqual({ status: 200, body: { lines: ['8350'] } });
    expect(operations.checkSiuHealth).toHaveBeenCalledOnce();
    expect(operations.getLines).toHaveBeenCalledOnce();
  });

  it('encaminha paradas próximas preservando latitude e longitude', async () => {
    const operations = createOperations();

    await expect(
      dispatchApiRequest(
        {
          method: 'GET',
          url: '/api/paradas/proximas',
          query: { lat: '-19.916342', lng: '-43.993759' },
        },
        operations,
      ),
    ).resolves.toEqual({ status: 200, body: { stops: [stop] } });
    expect(operations.getNearbyStops).toHaveBeenCalledWith(-19.916342, -43.993759);
  });

  it('encaminha previsões, itinerário e veículos pelos códigos do path', async () => {
    const operations = createOperations();

    await expect(
      dispatchApiRequest({ method: 'GET', url: '/api/paradas/13566/previsoes' }, operations),
    ).resolves.toEqual({ status: 200, body: { predictions: [prediction] } });
    await expect(
      dispatchApiRequest({ method: 'GET', url: '/api/itinerarios/53564' }, operations),
    ).resolves.toEqual({ status: 200, body: { route } });
    await expect(
      dispatchApiRequest({ method: 'GET', url: '/api/itinerarios/53564/veiculos' }, operations),
    ).resolves.toEqual({ status: 200, body: { vehicles: [vehicle] } });

    expect(operations.getStopPredictions).toHaveBeenCalledWith('13566');
    expect(operations.getRoutePoints).toHaveBeenCalledWith('53564');
    expect(operations.getVehicles).toHaveBeenCalledWith('53564');
  });

  it('responde método não permitido com o envelope canônico', async () => {
    const operations = createOperations();

    await expect(
      dispatchApiRequest({ method: 'POST', url: '/api/health' }, operations),
    ).resolves.toEqual({
      status: 405,
      body: {
        error: {
          code: 'method_not_allowed',
          message: 'Método não permitido',
        },
      },
    });
    expect(operations.checkSiuHealth).not.toHaveBeenCalled();
  });

  it.each([
    ['/api/paradas/proximas?lat=-19.9', 'Latitude e longitude são obrigatórias'],
    ['/api/paradas/proximas?lat=nao&lng=-43.9', 'Latitude e longitude são obrigatórias'],
    ['/api/paradas/abc/previsoes', 'Código da parada inválido'],
    ['/api/itinerarios/abc', 'Código do itinerário inválido'],
    ['/api/itinerarios/abc/veiculos', 'Código do itinerário inválido'],
  ])('responde parâmetro inválido em %s', async (url, message) => {
    await expect(
      dispatchApiRequest({ method: 'GET', url }, createOperations()),
    ).resolves.toEqual({
      status: 400,
      body: {
        error: {
          code: 'bad_request',
          message,
        },
      },
    });
  });

  it('responde rota desconhecida dentro de /api/* com erro not_found', async () => {
    await expect(
      dispatchApiRequest({ method: 'GET', url: '/api/desconhecida' }, createOperations()),
    ).resolves.toEqual({
      status: 404,
      body: {
        error: {
          code: 'not_found',
          message: 'Rota da API não encontrada',
        },
      },
    });
  });

  it('traduz AppError da operação sem perder status e código', async () => {
    const operations = createOperations({
      getLines: vi.fn(async () => {
        throw new BadGatewayError('SIU indisponível');
      }),
    });

    await expect(
      dispatchApiRequest({ method: 'GET', url: '/api/linhas' }, operations),
    ).resolves.toEqual({
      status: 502,
      body: {
        error: {
          code: 'bad_gateway',
          message: 'SIU indisponível',
        },
      },
    });
  });

  it.each([
    ['health', '/api/health', 'checkSiuHealth'],
    ['linhas', '/api/linhas', 'getLines'],
    ['paradas próximas', '/api/paradas/proximas?lat=-19.9&lng=-43.9', 'getNearbyStops'],
    ['previsões', '/api/paradas/13566/previsoes', 'getStopPredictions'],
    ['itinerário', '/api/itinerarios/53564', 'getRoutePoints'],
    ['veículos', '/api/itinerarios/53564/veiculos', 'getVehicles'],
  ])('traduz erro upstream na rota de %s', async (_name, url, operationName) => {
    const failingOperation = vi.fn(async () => {
      throw new BadGatewayError('SIU indisponível');
    });
    const operations = createOperations({
      [operationName]: failingOperation,
    } as Partial<ApiContractOperations>);

    await expect(
      dispatchApiRequest({ method: 'GET', url }, operations),
    ).resolves.toEqual({
      status: 502,
      body: {
        error: {
          code: 'bad_gateway',
          message: 'SIU indisponível',
        },
      },
    });
  });

  it('traduz falha inesperada para erro interno canônico', async () => {
    const operations = createOperations({
      checkSiuHealth: vi.fn(async () => {
        throw new Error('falha inesperada');
      }),
    });

    await expect(
      dispatchApiRequest({ method: 'GET', url: '/api/health' }, operations),
    ).resolves.toEqual({
      status: 500,
      body: {
        error: {
          code: 'internal_error',
          message: 'Erro interno',
        },
      },
    });
  });

  it('deixa caminhos fora de /api/* para o próximo adapter', async () => {
    await expect(
      dispatchApiRequest({ method: 'GET', url: '/src/App.vue' }, createOperations()),
    ).resolves.toBeNull();
  });
});
