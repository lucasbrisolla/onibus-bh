import { describe, expect, it, vi } from 'vitest';

import type { NearbyStop, Prediction, RoutePoint, Vehicle } from '../domain/types';
import type {
  MobilibusLine,
  MobilibusStop,
  MobilibusStopDepartures,
  MobilibusTimetable,
} from '../domain/mobilibusTypes';
import { BadGatewayError } from './errors';
import { resolveLocalApiRequest } from './localApiRouter';
import type { ApiContractOperations } from './apiContractDispatcher';
import {
  createVercelApiHandler,
  resolveVercelApiRequest,
  type VercelApiRequest,
} from './vercelApiAdapter';

const stop: NearbyStop = {
  code: '13566',
  publicCode: '40134',
  latitude: -19.916136,
  longitude: -43.99563,
  description: 'ROD ANEL',
  color: 4,
};

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
  fare: null,
};

const mobilibusTimetable: MobilibusTimetable = {
  projectId: 501,
  routeId: 572385,
  directions: [{ name: 'Ida', services: [{ name: 'Dias Úteis', departures: ['06:30'] }] }],
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

function vercelRequest(request: Partial<VercelApiRequest>): VercelApiRequest {
  return {
    method: 'GET',
    url: '/api/health',
    query: {},
    ...request,
  };
}

describe('adapters do contrato HTTP', () => {
  it('produzem a mesma resposta para paradas próximas', async () => {
    const operations = createOperations();
    const localResponse = await resolveLocalApiRequest({
      method: 'GET',
      url: '/api/paradas/proximas?lat=-19%2E916342&lng=-43%2E993759',
      handlers: operations,
    });
    const vercelResponse = await resolveVercelApiRequest(
      vercelRequest({
        url: '/api/paradas/proximas',
        query: { lat: '-19.916342', lng: '-43.993759' },
      }),
      operations,
    );

    expect(vercelResponse).toEqual(localResponse);
  });

  it('produzem a mesma validação para código inválido', async () => {
    const operations = createOperations();
    const localResponse = await resolveLocalApiRequest({
      method: 'GET',
      url: '/api/itinerarios/invalido/veiculos',
      handlers: operations,
    });
    const vercelResponse = await resolveVercelApiRequest(
      vercelRequest({ url: '/api/itinerarios/invalido/veiculos' }),
      operations,
    );

    expect(vercelResponse).toEqual(localResponse);
  });

  it('produzem a mesma resposta para pesquisa e horários Mobilibus', async () => {
    const operations = createOperations();
    const localLines = await resolveLocalApiRequest({
      method: 'GET',
      url: '/api/mobilibus/linhas?q=2890',
      handlers: operations,
    });
    const vercelLines = await resolveVercelApiRequest(
      vercelRequest({ url: '/api/mobilibus/linhas', query: { q: '2890' } }),
      operations,
    );
    const localTimetable = await resolveLocalApiRequest({
      method: 'GET',
      url: '/api/mobilibus/projetos/501/linhas/572385/horarios',
      handlers: operations,
    });
    const vercelTimetable = await resolveVercelApiRequest(
      vercelRequest({
        url: '/api/mobilibus/projetos/501/linhas/572385/horarios',
        query: {},
      }),
      operations,
    );

    expect(vercelLines).toEqual(localLines);
    expect(vercelTimetable).toEqual(localTimetable);
  });

  it('produzem a mesma resposta para pontos Mobilibus', async () => {
    const operations = createOperations();
    const localResponse = await resolveLocalApiRequest({
      method: 'GET',
      url: '/api/mobilibus/projetos/501/pontos?tile=6192,9117,16',
      handlers: operations,
    });
    const vercelResponse = await resolveVercelApiRequest(
      vercelRequest({
        url: '/api/mobilibus/projetos/501/pontos',
        query: { tile: '6192,9117,16' },
      }),
      operations,
    );

    expect(vercelResponse).toEqual(localResponse);
  });

  it('produzem a mesma resposta para partidas Mobilibus', async () => {
    const operations = createOperations();
    const localResponse = await resolveLocalApiRequest({
      method: 'GET',
      url: '/api/mobilibus/projetos/501/pontos/15192689/partidas',
      handlers: operations,
    });
    const vercelResponse = await resolveVercelApiRequest(
      vercelRequest({ url: '/api/mobilibus/projetos/501/pontos/15192689/partidas' }),
      operations,
    );

    expect(vercelResponse).toEqual(localResponse);
  });

  it('produzem a mesma validação de rede não suportada', async () => {
    const operations = createOperations();
    const localResponse = await resolveLocalApiRequest({
      method: 'GET',
      url: '/api/mobilibus/projetos/603/linhas/572385/horarios',
      handlers: operations,
    });
    const vercelResponse = await resolveVercelApiRequest(
      vercelRequest({ url: '/api/mobilibus/projetos/603/linhas/572385/horarios' }),
      operations,
    );

    expect(vercelResponse).toEqual(localResponse);
  });

  it('produzem a mesma tradução de erro upstream', async () => {
    const operations = createOperations({
      getLines: vi.fn(async () => {
        throw new BadGatewayError('SIU indisponível');
      }),
    });
    const localResponse = await resolveLocalApiRequest({
      method: 'GET',
      url: '/api/linhas',
      handlers: operations,
    });
    const vercelResponse = await resolveVercelApiRequest(
      vercelRequest({ url: '/api/linhas' }),
      operations,
    );

    expect(vercelResponse).toEqual(localResponse);
  });

  it('produzem a mesma tradução de falha upstream nos horários Mobilibus', async () => {
    const operations = createOperations({
      getMobilibusTimetable: vi.fn(async () => {
        throw new BadGatewayError('Mobilibus indisponível');
      }),
    });
    const localResponse = await resolveLocalApiRequest({
      method: 'GET',
      url: '/api/mobilibus/projetos/501/linhas/572385/horarios',
      handlers: operations,
    });
    const vercelResponse = await resolveVercelApiRequest(
      vercelRequest({ url: '/api/mobilibus/projetos/501/linhas/572385/horarios' }),
      operations,
    );

    expect(vercelResponse).toEqual(localResponse);
  });

  it('escreve o response canônico no adapter Vercel', async () => {
    const operations = createOperations();
    const status = vi.fn(() => response);
    const json = vi.fn();
    const response = { status, json };
    const handler = createVercelApiHandler(operations);

    await handler(vercelRequest({ url: '/api/health' }), response);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ ok: true });
  });
});
