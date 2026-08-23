import { describe, expect, it } from 'vitest';

import type { NearbyStop } from '../domain/types';
import { createMapBehavior } from './mapBehavior';

const monitoredStop: NearbyStop = {
  code: '13566',
  publicCode: '40134',
  latitude: -19.916,
  longitude: -43.995,
  description: 'ROD ANEL RODOVIARIO',
  color: 4,
};

const nearbyStop: NearbyStop = {
  ...monitoredStop,
  code: '14276',
  publicCode: '40170',
  latitude: -19.917,
  longitude: -43.992,
};

describe('createMapBehavior', () => {
  it('devolve a cena declarativa e o comando de viewport a partir da mesma atualização', () => {
    const behavior = createMapBehavior();

    const result = behavior.dispatch({
      type: 'scene-updated',
      input: {
        monitoredStop,
        nearbyStops: [monitoredStop, nearbyStop],
        showNearbyStops: false,
      },
    });

    expect(result.scene.stops.map(stop => stop.source.code)).toEqual([monitoredStop.code]);
    expect(result.viewport).toMatchObject({
      type: 'fit-bounds',
      bounds: result.scene.bounds,
    });
  });

  it('mantém o viewport quando a cena muda apenas por dados frequentes', () => {
    const behavior = createMapBehavior();

    behavior.dispatch({
      type: 'scene-updated',
      input: {
        monitoredStop,
        nearbyStops: [monitoredStop],
      },
    });

    const result = behavior.dispatch({
      type: 'scene-updated',
      input: {
        monitoredStop,
        nearbyStops: [monitoredStop],
        route: [
          { latitude: -19.93, longitude: -44.02 },
          { latitude: -19.9, longitude: -43.98 },
        ],
      },
    });

    expect(result.viewport).toEqual({ type: 'keep' });
    expect(result.scene.route?.coordinates).toHaveLength(2);
  });

  it('mantém o viewport quando a cena muda apenas por veículos', () => {
    const behavior = createMapBehavior();

    behavior.dispatch({
      type: 'scene-updated',
      input: {
        monitoredStop,
        nearbyStops: [monitoredStop],
      },
    });

    const result = behavior.dispatch({
      type: 'scene-updated',
      input: {
        monitoredStop,
        nearbyStops: [monitoredStop],
        vehicles: [
          {
            latitude: -19.93,
            longitude: -44.02,
            color: null,
            lineCode: '8350',
            vehicleId: '40743',
            bearing: null,
          },
        ],
      },
    });

    expect(result.viewport).toEqual({ type: 'keep' });
    expect(result.scene.vehicles.map(vehicle => vehicle.source.vehicleId)).toEqual(['40743']);
  });

  it('devolve a cena atual e o comando de área quando o movimento termina manualmente', () => {
    const behavior = createMapBehavior();
    const initial = behavior.dispatch({
      type: 'scene-updated',
      input: { monitoredStop },
    });
    const center = { latitude: -19.93, longitude: -44.01 };

    const result = behavior.dispatch({ type: 'moveend', center });

    expect(result.scene).toBe(initial.scene);
    expect(result.viewport).toEqual({ type: 'keep' });

    const manualResult = behavior.dispatch({ type: 'moveend', center });
    expect(manualResult.scene).toBe(initial.scene);
    expect(manualResult.viewport).toEqual({ type: 'emit-area-change', center });
  });
});
