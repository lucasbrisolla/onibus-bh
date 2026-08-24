import { describe, expect, it } from 'vitest';

import {
  createMapViewportPolicy,
  type MapViewportSceneSnapshot,
} from './mapViewportPolicy';

const firstBounds = {
  southWest: { latitude: -19.92, longitude: -44.01 },
  northEast: { latitude: -19.91, longitude: -43.99 },
};

const secondBounds = {
  southWest: { latitude: -19.93, longitude: -44.02 },
  northEast: { latitude: -19.9, longitude: -43.98 },
};

const firstStop = {
  code: '13566',
  publicCode: '40134',
  latitude: -19.916,
  longitude: -43.995,
  description: 'ROD ANEL RODOVIARIO',
  color: 4,
};

const secondStop = {
  ...firstStop,
  code: '14276',
  publicCode: '40170',
  latitude: -19.917,
  longitude: -43.992,
};

function sceneSnapshot(
  overrides: Partial<MapViewportSceneSnapshot> = {},
): MapViewportSceneSnapshot {
  return {
    bounds: firstBounds,
    monitoredStopCode: firstStop.code,
    userLocation: null,
    ...overrides,
  };
}

describe('createMapViewportPolicy', () => {
  it('enquadra a cena com bounds na montagem e consome sua conclusão programática', () => {
    const policy = createMapViewportPolicy();

    expect(policy.decide({ type: 'scene-updated', snapshot: sceneSnapshot() })).toEqual({
      type: 'fit-bounds',
      bounds: firstBounds,
      padding: [72, 72],
      maxZoom: 15,
      minimumSpan: 0.01,
    });
    expect(policy.decide({ type: 'programmatic-move-started' })).toEqual({ type: 'keep' });

    expect(
      policy.decide({
        type: 'moveend',
        center: { latitude: -19.915, longitude: -43.994 },
      }),
    ).toEqual({ type: 'keep' });
  });

  it('usa a visão padrão na montagem quando a cena não tem bounds', () => {
    const policy = createMapViewportPolicy();

    expect(policy.decide({
      type: 'scene-updated',
      snapshot: sceneSnapshot({ bounds: null }),
    })).toEqual({
      type: 'set-default-view',
      center: { latitude: -19.916342, longitude: -43.993759 },
      zoom: 14,
    });
    policy.decide({ type: 'programmatic-move-started' });

    expect(
      policy.decide({
        type: 'moveend',
        center: { latitude: -19.916342, longitude: -43.993759 },
      }),
    ).toEqual({ type: 'keep' });
  });

  it('reenquadra quando a parada monitorada ou a localização mudam de forma relevante', () => {
    const policy = createMapViewportPolicy();
    policy.decide({ type: 'scene-updated', snapshot: sceneSnapshot() });

    expect(
      policy.decide({
        type: 'scene-updated',
        snapshot: sceneSnapshot({
          bounds: secondBounds,
          monitoredStopCode: secondStop.code,
        }),
      }),
    ).toMatchObject({ type: 'fit-bounds', bounds: secondBounds });

    policy.decide({
      type: 'moveend',
      center: { latitude: -19.91, longitude: -43.99 },
    });

    expect(
      policy.decide({
        type: 'scene-updated',
        snapshot: sceneSnapshot({
          userLocation: { latitude: -19.9, longitude: -43.98 },
        }),
      }),
    ).toMatchObject({ type: 'fit-bounds', bounds: firstBounds });
  });

  it('mantém a visão em uma atualização exclusiva de rota', () => {
    const policy = createMapViewportPolicy();
    policy.decide({ type: 'scene-updated', snapshot: sceneSnapshot() });

    expect(
      policy.decide({
        type: 'scene-updated',
        snapshot: sceneSnapshot({ bounds: secondBounds }),
      }),
    ).toEqual({ type: 'keep' });
  });

  it('mantém a visão em uma atualização exclusiva de veículos', () => {
    const policy = createMapViewportPolicy();
    policy.decide({ type: 'scene-updated', snapshot: sceneSnapshot() });

    expect(
      policy.decide({
        type: 'scene-updated',
        snapshot: sceneSnapshot({ bounds: secondBounds }),
      }),
    ).toEqual({ type: 'keep' });
  });

  it('comunica o centro de uma exploração manual', () => {
    const policy = createMapViewportPolicy();
    policy.decide({ type: 'scene-updated', snapshot: sceneSnapshot() });
    policy.decide({
      type: 'moveend',
      center: { latitude: -19.915, longitude: -43.994 },
    });

    const center = { latitude: -19.93, longitude: -44.01 };
    expect(policy.decide({ type: 'moveend', center })).toEqual({
      type: 'emit-area-change',
      center,
    });
  });

  it('consome somente a conclusão de um movimento programático que realmente começou', () => {
    const policy = createMapViewportPolicy();
    policy.decide({ type: 'scene-updated', snapshot: sceneSnapshot() });
    policy.decide({
      type: 'scene-updated',
      snapshot: sceneSnapshot({
        bounds: secondBounds,
        monitoredStopCode: secondStop.code,
      }),
    });
    policy.decide({ type: 'programmatic-move-started' });

    const center = { latitude: -19.92, longitude: -44.0 };
    expect(policy.decide({ type: 'moveend', center })).toEqual({ type: 'keep' });
    expect(policy.decide({ type: 'moveend', center })).toEqual({
      type: 'emit-area-change',
      center,
    });
  });

  it('não descarta movimento manual quando um comando programático não iniciou movimento', () => {
    const policy = createMapViewportPolicy();
    policy.decide({ type: 'scene-updated', snapshot: sceneSnapshot() });

    const center = { latitude: -19.94, longitude: -44.03 };
    expect(policy.decide({ type: 'moveend', center })).toEqual({
      type: 'emit-area-change',
      center,
    });
  });
});
