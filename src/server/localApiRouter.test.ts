import { describe, expect, it, vi } from 'vitest';

import { resolveLocalApiRequest } from './localApiRouter';

describe('resolveLocalApiRequest', () => {
  it('returns health and lines through the local adapter', async () => {
    const checkSiuHealth = vi.fn(async () => ({ ok: true as const }));
    const getLines = vi.fn(async () => ({ lines: ['8350'] }));
    const handlers = {
      checkSiuHealth,
      getLines,
      getStopPredictions: vi.fn(),
      getNearbyStops: vi.fn(),
      getRoutePoints: vi.fn(),
      getVehicles: vi.fn(),
      searchMobilibusLines: vi.fn(),
      getMobilibusTimetable: vi.fn(),
      getMobilibusStops: vi.fn(),
      getMobilibusDepartures: vi.fn(),
    };

    await expect(
      resolveLocalApiRequest({ method: 'GET', url: '/api/health', handlers }),
    ).resolves.toEqual({ status: 200, body: { ok: true } });
    await expect(
      resolveLocalApiRequest({ method: 'GET', url: '/api/linhas', handlers }),
    ).resolves.toEqual({ status: 200, body: { lines: ['8350'] } });
    expect(checkSiuHealth).toHaveBeenCalledOnce();
    expect(getLines).toHaveBeenCalledOnce();
  });

  it('returns normalized stop predictions for the Vite dev API route', async () => {
    const getStopPredictions = vi.fn(async () => [
      {
        id: '8350-53564-12',
        lineCode: '8350',
        description: 'EST.SAO GABRIEL/EST.BARREIRO',
        destination: 'EST.SAO GABRIEL/EST.BARREIRO',
        minutes: 12,
        queryTime: '06:45',
        serviceId: '53564',
        vehicleId: '11353',
        color: 4,
        accessibilityCode: 6,
        variant: 'direto' as const,
      },
    ]);

    const result = await resolveLocalApiRequest({
      method: 'GET',
      url: '/api/paradas/13566/previsoes',
      handlers: {
        checkSiuHealth: vi.fn(),
        getLines: vi.fn(),
        getStopPredictions,
        getNearbyStops: vi.fn(),
        getRoutePoints: vi.fn(),
        getVehicles: vi.fn(),
        searchMobilibusLines: vi.fn(),
        getMobilibusTimetable: vi.fn(),
        getMobilibusStops: vi.fn(),
        getMobilibusDepartures: vi.fn(),
      },
    });

    expect(getStopPredictions).toHaveBeenCalledWith('13566');
    expect(result).toEqual({
      status: 200,
      body: {
        predictions: [
          {
            id: '8350-53564-12',
            lineCode: '8350',
            description: 'EST.SAO GABRIEL/EST.BARREIRO',
            destination: 'EST.SAO GABRIEL/EST.BARREIRO',
            minutes: 12,
            queryTime: '06:45',
            serviceId: '53564',
            vehicleId: '11353',
            color: 4,
            accessibilityCode: 6,
            variant: 'direto',
          },
        ],
      },
    });
  });

  it('returns nearby stops for the Vite dev API route', async () => {
    const getNearbyStops = vi.fn(async () => [
      {
        code: '13566',
        publicCode: '40134',
        latitude: -19.916136,
        longitude: -43.99563,
        description: 'ROD ANEL',
        color: 4,
      },
    ]);

    const result = await resolveLocalApiRequest({
      method: 'GET',
      url: '/api/paradas/proximas?lat=-19%2E916342&lng=-43%2E993759',
      handlers: {
        checkSiuHealth: vi.fn(),
        getLines: vi.fn(),
        getStopPredictions: vi.fn(),
        getNearbyStops,
        getRoutePoints: vi.fn(),
        getVehicles: vi.fn(),
        searchMobilibusLines: vi.fn(),
        getMobilibusTimetable: vi.fn(),
        getMobilibusStops: vi.fn(),
        getMobilibusDepartures: vi.fn(),
      },
    });

    expect(getNearbyStops).toHaveBeenCalledWith(-19.916342, -43.993759);
    expect(result?.status).toBe(200);
    expect(result?.body).toMatchObject({
      stops: [{ code: '13566', publicCode: '40134', description: 'ROD ANEL' }],
    });
  });

  it('returns null for non-api routes', async () => {
    await expect(
      resolveLocalApiRequest({
        method: 'GET',
        url: '/src/App.vue',
        handlers: {
          checkSiuHealth: vi.fn(),
          getLines: vi.fn(),
          getStopPredictions: vi.fn(),
          getNearbyStops: vi.fn(),
          getRoutePoints: vi.fn(),
          getVehicles: vi.fn(),
        searchMobilibusLines: vi.fn(),
        getMobilibusTimetable: vi.fn(),
        getMobilibusStops: vi.fn(),
        getMobilibusDepartures: vi.fn(),
        },
      }),
    ).resolves.toBeNull();
  });

  it('returns a canonical not found response for unknown api routes', async () => {
    await expect(
      resolveLocalApiRequest({
        method: 'GET',
        url: '/api/unknown',
        handlers: {
          checkSiuHealth: vi.fn(),
          getLines: vi.fn(),
          getStopPredictions: vi.fn(),
          getNearbyStops: vi.fn(),
          getRoutePoints: vi.fn(),
          getVehicles: vi.fn(),
          searchMobilibusLines: vi.fn(),
          getMobilibusTimetable: vi.fn(),
          getMobilibusStops: vi.fn(),
          getMobilibusDepartures: vi.fn(),
        },
      }),
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
});
