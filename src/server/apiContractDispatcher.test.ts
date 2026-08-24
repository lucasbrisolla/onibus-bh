import { describe, expect, it, vi } from 'vitest';

import type { NearbyStop, Prediction, RoutePoint, Vehicle } from '../domain/types';
import type {
  MobilibusLine,
  MobilibusStop,
  MobilibusStopDepartures,
  MobilibusTimetable,
} from '../domain/mobilibusTypes';
import { BadGatewayError, NotFoundError } from './errors';
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

const mobilibusLine: MobilibusLine = {
  projectId: 501,
  routeId: 572385,
  shortName: '2890',
  name: 'Morada Nova / Pindorama / Cidade Industrial',
  network: 'Ótimo/RMBH',
  fare: 8.45,
};

const mobilibusTimetable: MobilibusTimetable = {
  projectId: 501,
  routeId: 572385,
  directions: [
    {
      name: 'Ida',
      services: [{ name: 'Dias Úteis', departures: ['06:30', '05:15'] }],
    },
  ],
};

const mobilibusStop: MobilibusStop = {
  projectId: 501,
  stopId: 15192689,
  latitude: -19.93193292,
  longitude: -43.93043518,
  name: 'Av. Afonso Pena, 2323 - Parada DEOESP',
  code: null,
  address: 'Avenida Afonso Pena 2328',
  bearing: 340,
};

const mobilibusDepartures: MobilibusStopDepartures = {
  projectId: 501,
  stopId: 15192689,
  stopName: mobilibusStop.name,
  referenceTime: 1787529945917,
  departures: [],
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
    searchMobilibusLines: vi.fn(async () => [mobilibusLine]),
    getMobilibusTimetable: vi.fn(async () => mobilibusTimetable),
    getMobilibusStops: vi.fn(async () => [mobilibusStop]),
    getMobilibusDepartures: vi.fn(async () => mobilibusDepartures),
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

  it('encaminha pesquisa e horários Mobilibus com seus envelopes próprios', async () => {
    const operations = createOperations();

    await expect(
      dispatchApiRequest(
        { method: 'GET', url: '/api/mobilibus/linhas?q=2890' },
        operations,
      ),
    ).resolves.toEqual({ status: 200, body: { lines: [mobilibusLine] } });
    await expect(
      dispatchApiRequest(
        { method: 'GET', url: '/api/mobilibus/projetos/501/linhas/572385/horarios' },
        operations,
      ),
    ).resolves.toEqual({ status: 200, body: { timetable: mobilibusTimetable } });

    expect(operations.searchMobilibusLines).toHaveBeenCalledWith('2890');
    expect(operations.getMobilibusTimetable).toHaveBeenCalledWith(501, 572385);
  });

  it('encaminha pontos Mobilibus por projeto e tile', async () => {
    const operations = createOperations();

    await expect(
      dispatchApiRequest(
        {
          method: 'GET',
          url: '/api/mobilibus/projetos/501/pontos',
          query: { tile: '6192,9117,16' },
        },
        operations,
      ),
    ).resolves.toEqual({ status: 200, body: { stops: [mobilibusStop] } });
    expect(operations.getMobilibusStops).toHaveBeenCalledWith(501, {
      x: 6192,
      y: 9117,
      zoom: 16,
    });
  });

  it('encaminha partidas Mobilibus pelo projeto e ponto selecionado', async () => {
    const operations = createOperations();

    await expect(
      dispatchApiRequest(
        { method: 'GET', url: '/api/mobilibus/projetos/501/pontos/15192689/partidas' },
        operations,
      ),
    ).resolves.toEqual({ status: 200, body: { departures: mobilibusDepartures } });
    expect(operations.getMobilibusDepartures).toHaveBeenCalledWith(501, 15192689);
  });

  it.each([
    '/api/health',
    '/api/linhas',
    '/api/paradas/proximas?lat=-19.9&lng=-43.9',
    '/api/paradas/13566/previsoes',
    '/api/itinerarios/53564',
    '/api/itinerarios/53564/veiculos',
    '/api/mobilibus/linhas?q=2890',
    '/api/mobilibus/projetos/501/pontos?tile=6192,9117,16',
    '/api/mobilibus/projetos/501/pontos/15192689/partidas',
    '/api/mobilibus/projetos/501/linhas/572385/horarios',
  ])('responde método não permitido com o envelope canônico em %s', async url => {
    const operations = createOperations();

    await expect(
      dispatchApiRequest({ method: 'POST', url }, operations),
    ).resolves.toEqual({
      status: 405,
      body: {
        error: {
          code: 'method_not_allowed',
          message: 'Método não permitido',
        },
      },
    });
    for (const operation of Object.values(operations)) {
      expect(operation).not.toHaveBeenCalled();
    }
  });

  it.each([
    ['/api/paradas/proximas?lat=-19.9', 'Latitude e longitude são obrigatórias'],
    ['/api/paradas/proximas?lat=nao&lng=-43.9', 'Latitude e longitude são obrigatórias'],
    ['/api/paradas/abc/previsoes', 'Código da parada inválido'],
    ['/api/itinerarios/abc', 'Código do itinerário inválido'],
    ['/api/itinerarios/abc/veiculos', 'Código do itinerário inválido'],
    ['/api/mobilibus/linhas', 'A consulta deve ter pelo menos dois caracteres'],
    ['/api/mobilibus/linhas?q=a', 'A consulta deve ter pelo menos dois caracteres'],
    ['/api/mobilibus/projetos/501/pontos', 'Tile Mobilibus inválido'],
    ['/api/mobilibus/projetos/501/pontos?tile=6192,9117,13', 'Tile Mobilibus inválido'],
    ['/api/mobilibus/projetos/603/pontos?tile=6192,9117,16', 'Projeto Mobilibus não suportado'],
    ['/api/mobilibus/projetos/501/pontos/abc/partidas', 'Ponto Mobilibus inválido'],
    ['/api/mobilibus/projetos/603/pontos/15192689/partidas', 'Projeto Mobilibus não suportado'],
    ['/api/mobilibus/projetos/603/linhas/572385/horarios', 'Projeto Mobilibus não suportado'],
    ['/api/mobilibus/projetos/501/linhas/invalida/horarios', 'Rota Mobilibus inválida'],
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

  it('responde rota Mobilibus desconhecida com erro not_found', async () => {
    await expect(
      dispatchApiRequest({ method: 'GET', url: '/api/mobilibus/desconhecida' }, createOperations()),
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
    ['/api/mobilibus/linhas?q=2890', 'searchMobilibusLines'],
    ['/api/mobilibus/projetos/501/pontos?tile=6192,9117,16', 'getMobilibusStops'],
    ['/api/mobilibus/projetos/501/pontos/15192689/partidas', 'getMobilibusDepartures'],
    ['/api/mobilibus/projetos/501/linhas/572385/horarios', 'getMobilibusTimetable'],
  ])('traduz erro upstream na rota Mobilibus %s', async (url, operationName) => {
    const failingOperation = vi.fn(async () => {
      throw new BadGatewayError('Mobilibus indisponível');
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
          message: 'Mobilibus indisponível',
        },
      },
    });
  });

  it('traduz rota Mobilibus desconhecida para not_found', async () => {
    const operations = createOperations({
      getMobilibusTimetable: vi.fn(async () => {
        throw new NotFoundError('Linha Mobilibus não encontrada');
      }),
    });

    await expect(
      dispatchApiRequest(
        { method: 'GET', url: '/api/mobilibus/projetos/501/linhas/999999/horarios' },
        operations,
      ),
    ).resolves.toEqual({
      status: 404,
      body: {
        error: {
          code: 'not_found',
          message: 'Linha Mobilibus não encontrada',
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
