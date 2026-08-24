import type { NearbyStop, Prediction, RoutePoint, Vehicle } from '../domain/types';
import type {
  MobilibusLine,
  MobilibusMapTile,
  MobilibusStop,
  MobilibusStopDepartures,
  MobilibusTimetable,
} from '../domain/mobilibusTypes';

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

interface MobilibusLinesResponse {
  lines: MobilibusLine[];
}

interface MobilibusTimetableResponse {
  timetable: MobilibusTimetable;
}

interface MobilibusStopsResponse {
  stops: MobilibusStop[];
}

interface MobilibusDeparturesResponse {
  departures: MobilibusStopDepartures;
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

export async function fetchMobilibusLines(query: string): Promise<MobilibusLine[]> {
  const response = await fetchFromApi(`/api/mobilibus/linhas?q=${encodeURIComponent(query)}`);
  const data = await readJson<MobilibusLinesResponse>(response);
  return data.lines;
}

export async function fetchMobilibusTimetable(line: MobilibusLine): Promise<MobilibusTimetable> {
  const response = await fetchFromApi(
    `/api/mobilibus/projetos/${encodeURIComponent(String(line.projectId))}/linhas/${encodeURIComponent(String(line.routeId))}/horarios`,
  );
  const data = await readJson<MobilibusTimetableResponse>(response);
  return data.timetable;
}

export async function fetchMobilibusStops(
  projectId: number,
  tile: MobilibusMapTile,
): Promise<MobilibusStop[]> {
  const params = encodeURIComponent(`${tile.x},${tile.y},${tile.zoom}`);
  const response = await fetchFromApi(
    `/api/mobilibus/projetos/${encodeURIComponent(String(projectId))}/pontos?tile=${params}`,
  );
  const data = await readJson<MobilibusStopsResponse>(response);
  return data.stops ?? [];
}

export async function fetchMobilibusDepartures(
  stop: MobilibusStop,
): Promise<MobilibusStopDepartures> {
  const response = await fetchFromApi(
    `/api/mobilibus/projetos/${encodeURIComponent(String(stop.projectId))}/pontos/${encodeURIComponent(String(stop.stopId))}/partidas`,
  );
  const data = await readJson<MobilibusDeparturesResponse>(response);
  return data.departures;
}
