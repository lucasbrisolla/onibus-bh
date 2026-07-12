import type { NearbyStop, Prediction, RoutePoint, Vehicle } from '../domain/types';

interface PredictionsResponse {
  predictions: Prediction[];
}

interface NearbyStopsResponse {
  stops: NearbyStop[];
}

interface RouteResponse {
  route: RoutePoint[];
}

interface VehiclesResponse {
  vehicles: Vehicle[];
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function readJson<T>(response: Response): Promise<T> {
  let data: (T & { error?: { message?: string } }) | null = null;

  try {
    data = (await response.json()) as T & { error?: { message?: string } };
  } catch {
    if (!response.ok) {
      throw new ApiClientError('Erro ao consultar API', response.status);
    }

    throw new ApiClientError('Erro ao consultar API', response.status);
  }

  if (!response.ok) {
    throw new ApiClientError(data.error?.message ?? 'Erro ao consultar API', response.status);
  }

  return data;
}

export async function fetchStopPredictions(stopCode: string): Promise<Prediction[]> {
  let response: Response;

  try {
    response = await fetch(`/api/paradas/${encodeURIComponent(stopCode)}/previsoes`);
  } catch {
    throw new ApiClientError('Não foi possível conectar à API', 0);
  }

  const data = await readJson<PredictionsResponse>(response);
  return data.predictions;
}

export async function fetchNearbyStops(
  latitude: number,
  longitude: number,
): Promise<NearbyStop[]> {
  let response: Response;
  const encodeCoordinate = (value: number) => encodeURIComponent(String(value)).replaceAll('.', '%2E');
  const params = `lat=${encodeCoordinate(latitude)}&lng=${encodeCoordinate(longitude)}`;

  try {
    response = await fetch(`/api/paradas/proximas?${params}`);
  } catch {
    throw new ApiClientError('Não foi possível conectar à API', 0);
  }

  const data = await readJson<NearbyStopsResponse>(response);
  return data.stops;
}

export async function fetchRoutePoints(serviceId: string): Promise<RoutePoint[]> {
  let response: Response;

  try {
    response = await fetch(`/api/itinerarios/${encodeURIComponent(serviceId)}`);
  } catch {
    throw new ApiClientError('Não foi possível conectar à API', 0);
  }

  const data = await readJson<RouteResponse>(response);
  return data.route ?? [];
}

export async function fetchVehicles(serviceId: string): Promise<Vehicle[]> {
  let response: Response;

  try {
    response = await fetch(`/api/itinerarios/${encodeURIComponent(serviceId)}/veiculos`);
  } catch {
    throw new ApiClientError('Não foi possível conectar à API', 0);
  }

  const data = await readJson<VehiclesResponse>(response);
  return data.vehicles ?? [];
}
