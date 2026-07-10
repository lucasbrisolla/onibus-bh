import type { Prediction, RoutePoint, Vehicle } from '../domain/types';

export interface MapData {
  serviceId: string;
  route: RoutePoint[];
  vehicles: Vehicle[];
}

export function selectMapServiceId(predictions: Prediction[], lineCode: string): string | null {
  const normalizedLine = lineCode.trim().toLowerCase();
  if (!normalizedLine) {
    return null;
  }

  const match = predictions.find(
    prediction =>
      prediction.lineCode.trim().toLowerCase() === normalizedLine &&
      Number.isFinite(prediction.minutes) &&
      Boolean(prediction.serviceId),
  );

  return match?.serviceId ?? null;
}

export function createMapDataLoader(fetchers: {
  fetchRoutePoints: (serviceId: string) => Promise<RoutePoint[]>;
  fetchVehicles: (serviceId: string) => Promise<Vehicle[]>;
}) {
  let requestId = 0;

  return {
    async load(serviceId: string): Promise<MapData | null> {
      const currentRequestId = ++requestId;
      const [route, vehicles] = await Promise.all([
        fetchers.fetchRoutePoints(serviceId),
        fetchers.fetchVehicles(serviceId),
      ]);

      if (currentRequestId !== requestId) {
        return null;
      }

      return { serviceId, route, vehicles };
    },
  };
}
