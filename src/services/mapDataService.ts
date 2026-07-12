import type {
  NearbyStop,
  Prediction,
  RoutePoint,
  Vehicle,
  VehicleApproachInfo,
} from '../domain/types';

export interface MapData {
  serviceId: string;
  route: RoutePoint[];
  vehicles: Vehicle[];
}

function findClosestRouteIndex(route: RoutePoint[], latitude: number, longitude: number): number | null {
  if (route.length === 0) {
    return null;
  }

  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  route.forEach((point, index) => {
    const distance = (point.latitude - latitude) ** 2 + (point.longitude - longitude) ** 2;
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
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

export function describeSelectedVehicleApproach(params: {
  prediction: Prediction | null;
  monitoredStop: NearbyStop | null;
  route?: RoutePoint[];
  vehicles?: Vehicle[];
}): VehicleApproachInfo | null {
  const { prediction, monitoredStop, route = [], vehicles = [] } = params;

  if (!prediction) {
    return null;
  }

  if (!prediction.vehicleId) {
    return {
      state: 'no-live-vehicle',
      vehicleId: null,
      lineCode: prediction.lineCode,
      minutes: prediction.minutes,
      message: 'Esse ônibus ainda não informou um veículo em tempo real.',
    };
  }

  const liveVehicle = vehicles.find(vehicle => vehicle.vehicleId === prediction.vehicleId);

  if (!liveVehicle) {
    return {
      state: 'vehicle-not-found',
      vehicleId: prediction.vehicleId,
      lineCode: prediction.lineCode,
      minutes: prediction.minutes,
      message: `Ônibus ${prediction.lineCode} ainda não apareceu no mapa em tempo real.`,
    };
  }

  if (!monitoredStop || route.length === 0) {
    return {
      state: 'route-unavailable',
      vehicleId: liveVehicle.vehicleId,
      lineCode: prediction.lineCode,
      minutes: prediction.minutes,
      message: `Ônibus ${prediction.lineCode} localizado, mas a trajetória ainda não está disponível.`,
    };
  }

  const stopIndex = findClosestRouteIndex(route, monitoredStop.latitude, monitoredStop.longitude);
  const vehicleIndex = findClosestRouteIndex(route, liveVehicle.latitude, liveVehicle.longitude);

  if (stopIndex === null || vehicleIndex === null) {
    return {
      state: 'route-unavailable',
      vehicleId: liveVehicle.vehicleId,
      lineCode: prediction.lineCode,
      minutes: prediction.minutes,
      message: `Ônibus ${prediction.lineCode} localizado, mas não foi possível comparar com a trajetória.`,
    };
  }

  if (vehicleIndex <= stopIndex) {
    return {
      state: 'approaching',
      vehicleId: liveVehicle.vehicleId,
      lineCode: prediction.lineCode,
      minutes: prediction.minutes,
      message: `Ônibus ${prediction.lineCode} está vindo para a sua parada.`,
    };
  }

  return {
    state: 'passed',
    vehicleId: liveVehicle.vehicleId,
    lineCode: prediction.lineCode,
    minutes: prediction.minutes,
    message: `Ônibus ${prediction.lineCode} já passou da sua parada neste itinerário.`,
  };
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
