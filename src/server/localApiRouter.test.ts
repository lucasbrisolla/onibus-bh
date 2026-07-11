import { describe, expect, it, vi } from 'vitest';

import { resolveLocalApiRequest } from './localApiRouter';

describe('resolveLocalApiRequest', () => {
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
        getStopPredictions,
        getNearbyStops: vi.fn(),
        getRoutePoints: vi.fn(),
        getVehicles: vi.fn(),
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
        getStopPredictions: vi.fn(),
        getNearbyStops,
        getRoutePoints: vi.fn(),
        getVehicles: vi.fn(),
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
          getStopPredictions: vi.fn(),
          getNearbyStops: vi.fn(),
          getRoutePoints: vi.fn(),
          getVehicles: vi.fn(),
        },
      }),
    ).resolves.toBeNull();
  });
});
