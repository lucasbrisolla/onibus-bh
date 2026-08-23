import { describe, expect, it } from 'vitest';

import type { NearbyStop, Vehicle, VehicleApproachInfo } from '../domain/types';
import { createMapScene } from './mapScene';

const monitoredStop: NearbyStop = {
  code: '13566',
  publicCode: '40134',
  latitude: -19.916136,
  longitude: -43.99563,
  description: 'ROD ANEL RODOVIARIO CELSO MELLO AZEVEDO, 11749',
  color: 4,
};

const nearbyStop: NearbyStop = {
  code: '14276',
  publicCode: '40170',
  latitude: -19.916051,
  longitude: -43.991969,
  description: 'PCA CAPELA NOVA, 20',
  color: 4,
};

const vehicles: Vehicle[] = [
  {
    latitude: -19.915,
    longitude: -43.995,
    color: null,
    lineCode: '8350',
    vehicleId: '40743',
    bearing: null,
  },
  {
    latitude: -19.917,
    longitude: -43.994,
    color: null,
    lineCode: '8350',
    vehicleId: '40799',
    bearing: null,
  },
];

const selectedVehicleStatus: VehicleApproachInfo = {
  lineCode: '8350',
  minutes: 2,
  state: 'approaching',
  vehicleId: '40743',
  message: 'Ônibus 8350 está se aproximando da sua parada',
};

describe('createMapScene', () => {
  it('mantém a parada monitorada visível uma única vez quando os pontos estão ocultos', () => {
    const scene = createMapScene({
      monitoredStop,
      nearbyStops: [monitoredStop, nearbyStop],
      showNearbyStops: false,
    });

    expect(scene.stops.map(stop => ({ code: stop.source.code, role: stop.role }))).toEqual([
      { code: '13566', role: 'monitored' },
    ]);
  });

  it('deduplica a parada monitorada e preserva os demais pontos quando estão visíveis', () => {
    const scene = createMapScene({
      monitoredStop,
      nearbyStops: [monitoredStop, nearbyStop],
      showNearbyStops: true,
    });

    expect(scene.stops.map(stop => ({ code: stop.source.code, role: stop.role }))).toEqual([
      { code: '13566', role: 'monitored' },
      { code: '14276', role: 'nearby' },
    ]);
  });

  it('normaliza textos em caixa alta apenas na apresentação da parada', () => {
    const originalDescription = monitoredStop.description;
    const scene = createMapScene({ monitoredStop });

    expect(scene.stops[0]).toMatchObject({
      markerTitle: 'Rod Anel Rodoviario Celso Mello Azevedo, 11749',
      popup: {
        body: ['Rod Anel Rodoviario Celso Mello Azevedo, 11749', 'Clique para ver os ônibus desta parada.'],
      },
      label: {
        kind: 'stop',
        permanent: true,
        text: 'Rod Anel Rodoviario Celso Mello Azevedo, 11749',
      },
    });
    expect(monitoredStop.description).toBe(originalDescription);
  });

  it('representa a localização do usuário como um elemento visual próprio', () => {
    const scene = createMapScene({
      userLocation: {
        latitude: -19.915,
        longitude: -43.994,
      },
    });

    expect(scene.userLocation).toEqual({
      coordinate: {
        latitude: -19.915,
        longitude: -43.994,
      },
      markerTitle: 'Sua posição',
      popup: {
        title: 'Sua posição',
        body: ['Localização ativa no mapa.'],
      },
    });
  });

  it('exibe somente o veículo selecionado e o destaca com linha e minutos finitos', () => {
    const scene = createMapScene({
      vehicles,
      selectedVehicleId: '40743',
      selectedVehicleStatus,
    });

    expect(scene.vehicles.map(vehicle => vehicle.source.vehicleId)).toEqual(['40743']);
    expect(scene.vehicles[0]).toMatchObject({
      isHighlighted: true,
      label: {
        kind: 'vehicle',
        permanent: true,
        text: '8350 • 2 min',
      },
    });
  });

  it('usa a linha como fallback quando os minutos do veículo não são finitos', () => {
    const scene = createMapScene({
      vehicles,
      selectedVehicleId: '40743',
      selectedVehicleStatus: { ...selectedVehicleStatus, minutes: Number.POSITIVE_INFINITY },
    });

    expect(scene.vehicles[0]?.label?.text).toBe('8350');
  });

  it('representa a rota com base roxa contínua e traço interno discreto', () => {
    const route = [
      { latitude: -19.91, longitude: -43.99 },
      { latitude: -19.92, longitude: -43.98 },
    ];
    const scene = createMapScene({ route });

    expect(scene.route).toEqual({
      coordinates: route,
      layers: [
        {
          kind: 'base',
          color: '#7c3aed',
          lineCap: 'round',
          lineJoin: 'round',
          opacity: 0.68,
          weight: 5,
        },
        {
          kind: 'flow',
          color: '#ddd6fe',
          dashPattern: '2 12',
          lineCap: 'round',
          lineJoin: 'round',
          opacity: 0.42,
          weight: 3,
        },
      ],
    });
  });

  it('calcula bounds somente com elementos visíveis e relevantes à cena', () => {
    const scene = createMapScene({
      monitoredStop,
      nearbyStops: [nearbyStop],
      showNearbyStops: false,
      userLocation: {
        latitude: -19.91,
        longitude: -43.99,
      },
      route: [
        { latitude: -19.92, longitude: -43.98 },
        { latitude: -19.93, longitude: -44.0 },
      ],
      vehicles: [
        vehicles[0],
        {
          ...vehicles[1],
          latitude: -19.8,
          longitude: -43.8,
        },
      ],
      selectedVehicleId: vehicles[0].vehicleId,
    });

    expect(scene.bounds).toEqual({
      southWest: {
        latitude: -19.93,
        longitude: -44.0,
      },
      northEast: {
        latitude: -19.91,
        longitude: -43.98,
      },
    });
  });
});
