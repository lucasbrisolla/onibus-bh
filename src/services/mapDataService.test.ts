import { describe, expect, it } from 'vitest';
import type { NearbyStop, Prediction, RoutePoint, Vehicle } from '../domain/types';
import { createMapDataLoader, describeSelectedVehicleApproach, selectMapServiceId } from './mapDataService';

const prediction: Prediction = {
  id: '8350-53564-5',
  lineCode: '8350',
  description: 'EST.SAO GABRIEL/EST.BARREIRO',
  destination: 'EST.SAO GABRIEL/EST.BARREIRO',
  minutes: 5,
  queryTime: null,
  serviceId: '53564',
  vehicleId: '40743',
  color: 3,
  accessibilityCode: 6,
  variant: 'direto',
};

const monitoredStop: NearbyStop = {
  code: '13566',
  publicCode: '40134',
  latitude: -19.92,
  longitude: -43.92,
  description: 'ROD ANEL',
  color: 4,
};

describe('selectMapServiceId', () => {
  it('selects the first matching prediction service id', () => {
    const predictions: Prediction[] = [
      { ...prediction, lineCode: '8151', serviceId: '54443' },
      prediction,
    ];

    expect(selectMapServiceId(predictions, '8350')).toBe('53564');
  });

  it('returns null without matching finite prediction service id', () => {
    expect(selectMapServiceId([{ ...prediction, serviceId: null }], '8350')).toBeNull();
    expect(
      selectMapServiceId([{ ...prediction, minutes: Number.POSITIVE_INFINITY }], '8350'),
    ).toBeNull();
    expect(selectMapServiceId([prediction], '6350')).toBeNull();
  });
});

describe('createMapDataLoader', () => {
  it('loads route and vehicles for the requested service id', async () => {
    const route: RoutePoint[] = [{ latitude: -19.9, longitude: -43.9 }];
    const vehicles: Vehicle[] = [
      {
        latitude: -19.91,
        longitude: -43.99,
        color: 3,
        lineCode: '8350',
        vehicleId: '40743',
        bearing: 135,
      },
    ];
    const loader = createMapDataLoader({
      fetchRoutePoints: async () => route,
      fetchVehicles: async () => vehicles,
    });

    await expect(loader.load('53564')).resolves.toEqual({
      serviceId: '53564',
      route,
      vehicles,
    });
  });

  it('returns null for stale responses when a newer request starts', async () => {
    let resolveFirstRoute: (value: RoutePoint[]) => void = () => {};
    let resolveFirstVehicles: (value: Vehicle[]) => void = () => {};

    const loader = createMapDataLoader({
      fetchRoutePoints: serviceId =>
        serviceId === 'old'
          ? new Promise<RoutePoint[]>(resolve => {
              resolveFirstRoute = resolve;
            })
          : Promise.resolve([{ latitude: -19.8, longitude: -43.8 }]),
      fetchVehicles: serviceId =>
        serviceId === 'old'
          ? new Promise<Vehicle[]>(resolve => {
              resolveFirstVehicles = resolve;
            })
          : Promise.resolve([]),
    });

    const stalePromise = loader.load('old');
    const freshPromise = loader.load('new');

    resolveFirstRoute([{ latitude: -19.9, longitude: -43.9 }]);
    resolveFirstVehicles([]);

    await expect(stalePromise).resolves.toBeNull();
    await expect(freshPromise).resolves.toEqual({
      serviceId: 'new',
      route: [{ latitude: -19.8, longitude: -43.8 }],
      vehicles: [],
    });
  });
});

describe('describeSelectedVehicleApproach', () => {
  it('marks the selected vehicle as approaching when it is before the stop on the route', () => {
    const route: RoutePoint[] = [
      { latitude: -19.94, longitude: -43.94 },
      { latitude: -19.93, longitude: -43.93 },
      { latitude: -19.92, longitude: -43.92 },
      { latitude: -19.91, longitude: -43.91 },
    ];
    const vehicles: Vehicle[] = [
      {
        latitude: -19.939,
        longitude: -43.939,
        color: 3,
        lineCode: '8350',
        vehicleId: '40743',
        bearing: 135,
      },
    ];

    expect(
      describeSelectedVehicleApproach({
        prediction,
        monitoredStop,
        route,
        vehicles,
      }),
    ).toMatchObject({
      state: 'approaching',
      vehicleId: '40743',
      lineCode: '8350',
      minutes: 5,
    });
  });

  it('marks the selected vehicle as already passed when it is after the stop on the route', () => {
    const route: RoutePoint[] = [
      { latitude: -19.94, longitude: -43.94 },
      { latitude: -19.93, longitude: -43.93 },
      { latitude: -19.92, longitude: -43.92 },
      { latitude: -19.91, longitude: -43.91 },
    ];
    const vehicles: Vehicle[] = [
      {
        latitude: -19.909,
        longitude: -43.909,
        color: 3,
        lineCode: '8350',
        vehicleId: '40743',
        bearing: 135,
      },
    ];

    expect(
      describeSelectedVehicleApproach({
        prediction,
        monitoredStop,
        route,
        vehicles,
      }),
    ).toMatchObject({
      state: 'passed',
      vehicleId: '40743',
      lineCode: '8350',
      minutes: 5,
    });
  });
});
