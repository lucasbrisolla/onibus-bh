import type { NearbyStop, Prediction, RoutePoint, Vehicle } from '../domain/types';

const CLIENT_TIMEOUT_MS = 8_000;

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

async function fetchFromApi(input: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    return await fetch(input, {
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch {
    throw new ApiClientError('Não foi possível conectar à API', 0);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function fetchStopPredictions(stopCode: string): Promise<Prediction[]> {
  const response = await fetchFromApi(`/api/paradas/${encodeURIComponent(stopCode)}/previsoes`);
  const data = await readJson<PredictionsResponse>(response);
  return data.predictions;
}

export async function fetchNearbyStops(
  latitude: number,
  longitude: number,
): Promise<NearbyStop[]> {
  const encodeCoordinate = (value: number) => encodeURIComponent(String(value)).replaceAll('.', '%2E');
  const params = `lat=${encodeCoordinate(latitude)}&lng=${encodeCoordinate(longitude)}`;
  const response = await fetchFromApi(`/api/paradas/proximas?${params}`);
  const data = await readJson<NearbyStopsResponse>(response);
  return data.stops;
}

export async function fetchRoutePoints(serviceId: string): Promise<RoutePoint[]> {
  const response = await fetchFromApi(`/api/itinerarios/${encodeURIComponent(serviceId)}`);
  const data = await readJson<RouteResponse>(response);
  return data.route ?? [];
}

export async function fetchVehicles(serviceId: string): Promise<Vehicle[]> {
  const response = await fetchFromApi(
    `/api/itinerarios/${encodeURIComponent(serviceId)}/veiculos`,
  );
  const data = await readJson<VehiclesResponse>(response);
  return data.vehicles ?? [];
}
