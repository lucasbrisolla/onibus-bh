import type { MapBounds, MapCoordinate } from './mapScene';

export interface MapViewportSceneSnapshot {
  bounds: MapBounds | null;
  monitoredStopCode: string | null;
  userLocation: MapCoordinate | null;
}

export interface MapViewportFitCommand {
  type: 'fit-bounds';
  bounds: MapBounds;
  padding: readonly [number, number];
  maxZoom: number;
  minimumSpan: number;
}

export interface MapViewportDefaultCommand {
  type: 'set-default-view';
  center: MapCoordinate;
  zoom: number;
}

export interface MapViewportAreaChangeCommand {
  type: 'emit-area-change';
  center: MapCoordinate;
}

export type MapViewportCommand =
  | { type: 'keep' }
  | MapViewportFitCommand
  | MapViewportDefaultCommand
  | MapViewportAreaChangeCommand;

export type MapViewportEvent =
  | {
      type: 'scene-updated';
      snapshot: MapViewportSceneSnapshot;
    }
  | {
      type: 'moveend';
      center: MapCoordinate;
    };

export const mapViewportDefaults = {
  defaultView: {
    center: {
      latitude: -19.916342,
      longitude: -43.993759,
    },
    zoom: 14,
  },
  fitBounds: {
    padding: [72, 72] as readonly [number, number],
    maxZoom: 15,
    minimumSpan: 0.01,
  },
} as const;

export interface MapViewportPolicy {
  decide(event: MapViewportEvent): MapViewportCommand;
}

function sameCoordinate(left: MapCoordinate | null, right: MapCoordinate | null): boolean {
  if (!left || !right) {
    return left === right;
  }

  return left.latitude === right.latitude && left.longitude === right.longitude;
}

function hasStructuralChange(
  previous: MapViewportSceneSnapshot,
  next: MapViewportSceneSnapshot,
): boolean {
  return (
    previous.monitoredStopCode !== next.monitoredStopCode ||
    !sameCoordinate(previous.userLocation, next.userLocation)
  );
}

export function createMapViewportPolicy(): MapViewportPolicy {
  let hasReceivedScene = false;
  let previousSnapshot: MapViewportSceneSnapshot | null = null;
  let pendingProgrammaticMoves = 0;

  function frame(snapshot: MapViewportSceneSnapshot): MapViewportCommand {
    pendingProgrammaticMoves += 1;

    if (!snapshot.bounds) {
      return {
        type: 'set-default-view',
        center: { ...mapViewportDefaults.defaultView.center },
        zoom: mapViewportDefaults.defaultView.zoom,
      };
    }

    return {
      type: 'fit-bounds',
      bounds: snapshot.bounds,
      padding: [...mapViewportDefaults.fitBounds.padding] as [number, number],
      maxZoom: mapViewportDefaults.fitBounds.maxZoom,
      minimumSpan: mapViewportDefaults.fitBounds.minimumSpan,
    };
  }

  function decide(event: MapViewportEvent): MapViewportCommand {
    if (event.type === 'moveend') {
      if (pendingProgrammaticMoves > 0) {
        pendingProgrammaticMoves -= 1;
        return { type: 'keep' };
      }

      return {
        type: 'emit-area-change',
        center: { ...event.center },
      };
    }

    const shouldFrame =
      !hasReceivedScene ||
      (previousSnapshot !== null && hasStructuralChange(previousSnapshot, event.snapshot));

    hasReceivedScene = true;
    previousSnapshot = {
      bounds: event.snapshot.bounds,
      monitoredStopCode: event.snapshot.monitoredStopCode,
      userLocation: event.snapshot.userLocation ? { ...event.snapshot.userLocation } : null,
    };

    return shouldFrame ? frame(event.snapshot) : { type: 'keep' };
  }

  return { decide };
}
