import type { NearbyStop, RoutePoint, Vehicle, VehicleApproachInfo } from '../domain/types';

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

export type UserLocation = MapCoordinate;

export interface MapBounds {
  southWest: MapCoordinate;
  northEast: MapCoordinate;
}

export type MapSceneLabelKind = 'stop' | 'vehicle';

export interface MapSceneLabel {
  kind: MapSceneLabelKind;
  text: string;
  permanent: boolean;
}

export interface MapScenePopup {
  title: string;
  body: readonly string[];
}

export interface MapSceneStop {
  source: NearbyStop;
  coordinate: MapCoordinate;
  role: 'monitored' | 'nearby';
  markerTitle: string;
  popup: MapScenePopup;
  label: MapSceneLabel | null;
}

export interface MapSceneLocation {
  coordinate: MapCoordinate;
  markerTitle: string;
  popup: MapScenePopup;
}

export type MapRouteLayerKind = 'base' | 'flow';

export interface MapSceneRouteLayer {
  kind: MapRouteLayerKind;
  color: string;
  dashPattern?: string;
  lineCap: 'round';
  lineJoin: 'round';
  opacity: number;
  weight: number;
}

export interface MapSceneRoute {
  coordinates: readonly MapCoordinate[];
  layers: readonly MapSceneRouteLayer[];
}

export interface MapSceneVehicle {
  source: Vehicle;
  coordinate: MapCoordinate;
  markerTitle: string;
  isHighlighted: boolean;
  label: MapSceneLabel | null;
}

export interface MapScene {
  stops: readonly MapSceneStop[];
  userLocation: MapSceneLocation | null;
  route: MapSceneRoute | null;
  vehicles: readonly MapSceneVehicle[];
  bounds: MapBounds | null;
}

export interface MapSceneInput {
  monitoredStop?: NearbyStop | null;
  nearbyStops?: readonly NearbyStop[];
  route?: readonly RoutePoint[];
  vehicles?: readonly Vehicle[];
  selectedVehicleId?: string | null;
  selectedVehicleStatus?: VehicleApproachInfo | null;
  userLocation?: MapCoordinate | null;
  showNearbyStops?: boolean;
}

export const mapRouteLayerStyles = {
  base: {
    kind: 'base',
    color: '#7c3aed',
    lineCap: 'round',
    lineJoin: 'round',
    opacity: 0.68,
    weight: 5,
  },
  flow: {
    kind: 'flow',
    color: '#ddd6fe',
    dashPattern: '2 12',
    lineCap: 'round',
    lineJoin: 'round',
    opacity: 0.42,
    weight: 3,
  },
} as const satisfies Record<MapRouteLayerKind, MapSceneRouteLayer>;

const routeLayers: readonly MapSceneRouteLayer[] = [mapRouteLayerStyles.base, mapRouteLayerStyles.flow];

function normalizeMapDisplayText(value: string): string {
  const hasLetters = /\p{L}/u.test(value);
  const isAllCaps = hasLetters && value === value.toLocaleUpperCase('pt-BR');

  if (!isAllCaps) {
    return value;
  }

  return value.toLocaleLowerCase('pt-BR').replace(/\p{L}[\p{L}\p{M}]*/gu, word =>
    word.charAt(0).toLocaleUpperCase('pt-BR') + word.slice(1),
  );
}

function createMapBounds(coordinates: readonly MapCoordinate[]): MapBounds | null {
  if (coordinates.length === 0) {
    return null;
  }

  let minLatitude = coordinates[0].latitude;
  let maxLatitude = coordinates[0].latitude;
  let minLongitude = coordinates[0].longitude;
  let maxLongitude = coordinates[0].longitude;

  for (const coordinate of coordinates.slice(1)) {
    minLatitude = Math.min(minLatitude, coordinate.latitude);
    maxLatitude = Math.max(maxLatitude, coordinate.latitude);
    minLongitude = Math.min(minLongitude, coordinate.longitude);
    maxLongitude = Math.max(maxLongitude, coordinate.longitude);
  }

  return {
    southWest: {
      latitude: minLatitude,
      longitude: minLongitude,
    },
    northEast: {
      latitude: maxLatitude,
      longitude: maxLongitude,
    },
  };
}

export function createMapScene(input: MapSceneInput = {}): MapScene {
  const stops: MapSceneStop[] = [];
  const seenStopCodes = new Set<string>();

  function addStop(source: NearbyStop, role: MapSceneStop['role']): void {
    if (seenStopCodes.has(source.code)) {
      return;
    }

    seenStopCodes.add(source.code);
    const displayDescription = normalizeMapDisplayText(source.description);
    stops.push({
      source,
      coordinate: {
        latitude: source.latitude,
        longitude: source.longitude,
      },
      role,
      markerTitle: displayDescription,
      popup: {
        title: source.publicCode || source.code,
        body: [displayDescription, 'Clique para ver os ônibus desta parada.'],
      },
      label:
        role === 'monitored'
          ? {
              kind: 'stop',
              text: displayDescription,
              permanent: true,
            }
          : null,
    });
  }

  if (input.monitoredStop) {
    addStop(input.monitoredStop, 'monitored');
  }

  if (input.showNearbyStops !== false) {
    for (const stop of input.nearbyStops ?? []) {
      addStop(stop, 'nearby');
    }
  }

  const userLocation = input.userLocation
    ? {
        coordinate: {
          latitude: input.userLocation.latitude,
          longitude: input.userLocation.longitude,
        },
        markerTitle: 'Sua posição',
        popup: {
          title: 'Sua posição',
          body: ['Localização ativa no mapa.'],
        },
      }
    : null;

  const visibleVehicles = input.selectedVehicleId
    ? (input.vehicles ?? []).filter(vehicle => vehicle.vehicleId === input.selectedVehicleId)
    : input.vehicles ?? [];
  const vehicles = visibleVehicles.map<MapSceneVehicle>(source => {
    const isHighlighted = Boolean(input.selectedVehicleId) && source.vehicleId === input.selectedVehicleId;
    const hasFiniteMinutes =
      isHighlighted && input.selectedVehicleStatus && Number.isFinite(input.selectedVehicleStatus.minutes);

    return {
      source,
      coordinate: {
        latitude: source.latitude,
        longitude: source.longitude,
      },
      markerTitle: `${source.lineCode} - ${source.vehicleId}`,
      isHighlighted,
      label: isHighlighted
        ? {
            kind: 'vehicle',
            text: hasFiniteMinutes ? `${source.lineCode} • ${input.selectedVehicleStatus?.minutes} min` : source.lineCode,
            permanent: true,
          }
        : null,
    };
  });
  const routeCoordinates = (input.route ?? []).map(point => ({
    latitude: point.latitude,
    longitude: point.longitude,
  }));
  const route = routeCoordinates.length > 0 ? { coordinates: routeCoordinates, layers: routeLayers } : null;
  const bounds = createMapBounds([
    ...stops.map(stop => stop.coordinate),
    ...(userLocation ? [userLocation.coordinate] : []),
    ...(route?.coordinates ?? []),
    ...vehicles.map(vehicle => vehicle.coordinate),
  ]);

  return {
    stops,
    userLocation,
    route,
    vehicles,
    bounds,
  };
}
