import {
  OTIMO_RMBH_NETWORK,
  OTIMO_RMBH_PROJECT_ID,
  type MobilibusLine,
  type MobilibusDeparture,
  type MobilibusMapTile,
  type MobilibusPlannedDirection,
  type MobilibusPlannedService,
  type MobilibusStop,
  type MobilibusStopDepartures,
  type MobilibusTimetable,
} from '../domain/mobilibusTypes.js';
import {
  AppError,
  BadGatewayError,
  BadRequestError,
  GatewayTimeoutError,
  NotFoundError,
} from './errors.js';

export const MOBILIBUS_BASE_URL = 'https://ss7u5urlxs.singularcdn.net.br/api/';
export const MOBILIBUS_CATALOG_CACHE_TTL_MS = 30 * 60 * 1000;
export const MOBILIBUS_TIMETABLE_CACHE_TTL_MS = 5 * 60 * 1000;
export const MOBILIBUS_STOPS_CACHE_TTL_MS = 30 * 60 * 1000;
export const MOBILIBUS_DEPARTURES_CACHE_TTL_MS = 15 * 1000;

const DEFAULT_TIMEOUT_MS = 8_000;

export interface MobilibusHttpResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type MobilibusHttpTransport = (
  input: string,
  init: RequestInit,
) => Promise<MobilibusHttpResponse>;

export interface MobilibusClock {
  now(): number;
}

export interface MobilibusClientOptions {
  transport?: MobilibusHttpTransport;
  clock?: MobilibusClock;
  timeoutMs?: number;
  baseUrl?: string;
}

export interface MobilibusClient {
  searchLines(query: string): Promise<MobilibusLine[]>;
  getTimetable(projectId: number, routeId: number): Promise<MobilibusTimetable>;
  getStopsInTile(projectId: number, tile: MobilibusMapTile): Promise<MobilibusStop[]>;
  getDepartures(projectId: number, stopId: number): Promise<MobilibusStopDepartures>;
}

type UnknownRecord = Record<string, unknown>;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readPositiveInteger(record: UnknownRecord, key: string): number | null {
  const value = record[key];
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function readRequiredString(record: UnknownRecord, key: string): string | null {
  const value = record[key];

  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  return value.trim();
}

function readOptionalFare(record: UnknownRecord): number | null {
  const value = record.price;

  if (value === null || value === undefined || value === '') {
    return null;
  }

  const fare = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(fare) && fare >= 0 ? fare : null;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

function normalizeRoute(record: unknown): MobilibusLine | null {
  if (!isRecord(record)) {
    return null;
  }

  const routeId = readPositiveInteger(record, 'routeId');
  const shortName = readRequiredString(record, 'shortName');
  const name = readRequiredString(record, 'longName');

  if (routeId === null || shortName === null || name === null) {
    return null;
  }

  return {
    projectId: OTIMO_RMBH_PROJECT_ID,
    routeId,
    shortName,
    name,
    network: OTIMO_RMBH_NETWORK,
    fare: readOptionalFare(record),
  };
}

function normalizeRoutes(payload: unknown): MobilibusLine[] {
  if (!Array.isArray(payload)) {
    throw new BadGatewayError('Resposta de linhas da Mobilibus inválida');
  }

  return payload
    .map(normalizeRoute)
    .filter((line): line is MobilibusLine => line !== null);
}

function readDescription(record: UnknownRecord, fallback: string): string {
  const value = record.desc;
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeDepartures(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(item => {
    if (!isRecord(item) || typeof item.dep !== 'string' || !item.dep.trim()) {
      return [];
    }

    return [item.dep.trim()];
  });
}

function normalizeServices(value: unknown): MobilibusPlannedService[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(item => {
    if (!isRecord(item)) {
      return [];
    }

    return [
      {
        name: readDescription(item, 'Serviço não informado'),
        departures: normalizeDepartures(item.departures),
      },
    ];
  });
}

function normalizeDirections(value: unknown): MobilibusPlannedDirection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(item => {
    if (!isRecord(item)) {
      return [];
    }

    return [
      {
        name: readDescription(item, 'Sentido não informado'),
        services: normalizeServices(item.services),
      },
    ];
  });
}

function normalizeTimetable(
  payload: unknown,
  projectId: number,
  routeId: number,
): MobilibusTimetable {
  if (!Array.isArray(payload)) {
    throw new BadGatewayError('Resposta de horários da Mobilibus inválida');
  }

  if (payload.length === 0) {
    throw new NotFoundError('Linha Mobilibus não encontrada');
  }

  if (!payload.some(isRecord)) {
    throw new BadGatewayError('Resposta de horários da Mobilibus inválida');
  }

  const route = payload.find(
    (item): item is UnknownRecord => isRecord(item) && readPositiveInteger(item, 'routeId') === routeId,
  );

  if (!route) {
    throw new NotFoundError('Linha Mobilibus não encontrada');
  }

  if (!isRecord(route.timetable)) {
    return { projectId, routeId, directions: [] };
  }

  return {
    projectId,
    routeId,
    directions: normalizeDirections(route.timetable.directions),
  };
}

function readOptionalString(record: UnknownRecord, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readOptionalFiniteNumber(record: UnknownRecord, key: string): number | null {
  const value = record[key];
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeStop(record: unknown, projectId: number): MobilibusStop | null {
  if (!isRecord(record)) {
    return null;
  }

  const stopId = readPositiveInteger(record, 'stopId');
  const latitude = readOptionalFiniteNumber(record, 'lat');
  const longitude = readOptionalFiniteNumber(record, 'lng');
  const name = readRequiredString(record, 'name');

  if (
    stopId === null ||
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    name === null
  ) {
    return null;
  }

  return {
    projectId,
    stopId,
    latitude,
    longitude,
    name,
    code: readOptionalString(record, 'code'),
    address: readOptionalString(record, 'address'),
    bearing: readOptionalFiniteNumber(record, 'bearing'),
  };
}

function normalizeStops(payload: unknown, projectId: number): MobilibusStop[] {
  const entries = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.stops)
      ? payload.stops
      : null;

  if (!entries) {
    throw new BadGatewayError('Resposta de pontos da Mobilibus inválida');
  }

  return entries
    .map(item => normalizeStop(item, projectId))
    .filter((stop): stop is MobilibusStop => stop !== null);
}

function readOptionalVehicleId(record: UnknownRecord): string | null {
  const value = record.vehicleId;

  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function normalizeDeparture(
  record: unknown,
  trip: UnknownRecord,
  projectId: number,
  stopId: number,
): MobilibusDeparture | null {
  if (!isRecord(record)) {
    return null;
  }

  const routeId = readPositiveInteger(trip, 'routeId');
  const shortName = readRequiredString(trip, 'shortName');
  const scheduledTime = readRequiredString(record, 'time');

  if (routeId === null || shortName === null || scheduledTime === null) {
    return null;
  }

  const vehicleId = readOptionalVehicleId(record);
  const positionAge = readOptionalFiniteNumber(record, 'positionAge');
  const gpsTime = readOptionalString(record, 'gpsTime');

  return {
    projectId,
    stopId,
    routeId,
    shortName,
    lineName: readRequiredString(trip, 'longName') ?? shortName,
    headsign: readRequiredString(trip, 'headsign') ?? 'Destino não informado',
    color: readOptionalString(trip, 'color'),
    scheduledTime,
    nextDay: record.nextDay === true,
    vehicleId,
    positionAge,
    gpsTime,
    bearing: readOptionalFiniteNumber(record, 'bearing'),
    delay: readOptionalFiniteNumber(record, 'delay'),
    realtime: vehicleId !== null || positionAge !== null || gpsTime !== null,
  };
}

function normalizeStopDepartures(
  payload: unknown,
  projectId: number,
  stopId: number,
): MobilibusStopDepartures {
  if (!isRecord(payload) || !Array.isArray(payload.trips)) {
    throw new BadGatewayError('Resposta de partidas da Mobilibus inválida');
  }

  const departures: MobilibusDeparture[] = [];
  for (const tripValue of payload.trips) {
    if (!isRecord(tripValue) || !Array.isArray(tripValue.departures)) {
      continue;
    }

    for (const departure of tripValue.departures) {
      const normalized = normalizeDeparture(departure, tripValue, projectId, stopId);
      if (normalized) {
        departures.push(normalized);
      }
    }
  }

  return {
    projectId,
    stopId,
    stopName: readRequiredString(payload, 'stopName') ?? 'Ponto Mobilibus',
    referenceTime: readOptionalFiniteNumber(payload, 'time'),
    departures,
  };
}

function defaultTransport(input: string, init: RequestInit): Promise<MobilibusHttpResponse> {
  return fetch(input, init);
}

function defaultClock(): MobilibusClock {
  return { now: () => Date.now() };
}

function trimBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

function buildPath(baseUrl: string, resource: string, params: Record<string, number>): string {
  const searchParams = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  );

  return `${trimBaseUrl(baseUrl)}${resource}?${searchParams.toString()}`;
}

function buildStopsPath(baseUrl: string, projectId: number, tile: MobilibusMapTile): string {
  return `${trimBaseUrl(baseUrl)}stops?project_id=${projectId}&tile=${tile.x},${tile.y},${tile.zoom}`;
}

export function createMobilibusClient(options: MobilibusClientOptions = {}): MobilibusClient {
  const transport = options.transport ?? defaultTransport;
  const clock = options.clock ?? defaultClock();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const baseUrl = options.baseUrl ?? MOBILIBUS_BASE_URL;

  let catalogCache: CacheEntry<MobilibusLine[]> | null = null;
  let catalogRequest: Promise<MobilibusLine[]> | null = null;
  const timetableCache = new Map<string, CacheEntry<MobilibusTimetable>>();
  const timetableRequests = new Map<string, Promise<MobilibusTimetable>>();
  const stopsCache = new Map<string, CacheEntry<MobilibusStop[]>>();
  const stopsRequests = new Map<string, Promise<MobilibusStop[]>>();
  const departuresCache = new Map<string, CacheEntry<MobilibusStopDepartures>>();
  const departuresRequests = new Map<string, Promise<MobilibusStopDepartures>>();

  async function requestJson(path: string, resource: string): Promise<unknown> {
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        reject(new GatewayTimeoutError('Mobilibus não respondeu no tempo esperado'));
      }, timeoutMs);
    });

    try {
      let response: MobilibusHttpResponse;
      try {
        response = await Promise.race([
          transport(path, { signal: controller.signal }),
          timeout,
        ]);
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }

        if (error instanceof Error && error.name === 'AbortError') {
          throw new GatewayTimeoutError('Mobilibus não respondeu no tempo esperado', error);
        }

        throw new BadGatewayError(`Falha ao consultar a Mobilibus para ${resource}`, error);
      }

      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundError('Recurso Mobilibus não encontrado');
        }

        throw new BadGatewayError(`Mobilibus respondeu com HTTP ${response.status}`);
      }

      try {
        return await response.json();
      } catch (error) {
        throw new BadGatewayError(`Resposta de ${resource} da Mobilibus inválida`, error);
      }
    } finally {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    }
  }

  async function loadCatalog(): Promise<MobilibusLine[]> {
    const now = clock.now();
    if (catalogCache && now < catalogCache.expiresAt) {
      return catalogCache.value;
    }

    if (catalogRequest) {
      return catalogRequest;
    }

    const request = requestJson(
      buildPath(baseUrl, 'routes', { project_id: OTIMO_RMBH_PROJECT_ID }),
      'linhas',
    )
      .then(normalizeRoutes)
      .then(lines => {
        catalogCache = {
          value: lines,
          expiresAt: clock.now() + MOBILIBUS_CATALOG_CACHE_TTL_MS,
        };
        return lines;
      });

    catalogRequest = request;

    try {
      return await request;
    } finally {
      if (catalogRequest === request) {
        catalogRequest = null;
      }
    }
  }

  async function searchLines(query: string): Promise<MobilibusLine[]> {
    const trimmedQuery = query.trim();
    if (Array.from(trimmedQuery).length < 2) {
      throw new BadRequestError('A consulta deve ter pelo menos dois caracteres');
    }

    const normalizedQuery = normalizeSearchText(trimmedQuery);
    const lines = await loadCatalog();

    return lines.filter(line =>
      [line.shortName, line.name].some(value => normalizeSearchText(value).includes(normalizedQuery)),
    );
  }

  async function getTimetable(projectId: number, routeId: number): Promise<MobilibusTimetable> {
    if (projectId !== OTIMO_RMBH_PROJECT_ID) {
      throw new BadRequestError('Projeto Mobilibus não suportado');
    }

    if (!Number.isSafeInteger(routeId) || routeId <= 0) {
      throw new BadRequestError('Rota Mobilibus inválida');
    }

    const key = `${projectId}:${routeId}`;
    const cached = timetableCache.get(key);
    if (cached && clock.now() < cached.expiresAt) {
      return cached.value;
    }

    const pending = timetableRequests.get(key);
    if (pending) {
      return pending;
    }

    const request = requestJson(
      buildPath(baseUrl, 'timetable', { project_id: projectId, route_id: routeId }),
      'horários',
    )
      .then(payload => normalizeTimetable(payload, projectId, routeId))
      .then(timetable => {
        timetableCache.set(key, {
          value: timetable,
          expiresAt: clock.now() + MOBILIBUS_TIMETABLE_CACHE_TTL_MS,
        });
        return timetable;
      });

    timetableRequests.set(key, request);

    try {
      return await request;
    } finally {
      if (timetableRequests.get(key) === request) {
        timetableRequests.delete(key);
      }
    }
  }

  async function getStopsInTile(projectId: number, tile: MobilibusMapTile): Promise<MobilibusStop[]> {
    if (projectId !== OTIMO_RMBH_PROJECT_ID) {
      throw new BadRequestError('Projeto Mobilibus não suportado');
    }

    if (
      !Number.isSafeInteger(tile.x) ||
      tile.x < 0 ||
      !Number.isSafeInteger(tile.y) ||
      tile.y < 0 ||
      !Number.isSafeInteger(tile.zoom) ||
      tile.zoom < 14 ||
      tile.zoom > 20
    ) {
      throw new BadRequestError('Tile Mobilibus inválido');
    }

    const key = `${projectId}:${tile.x},${tile.y},${tile.zoom}`;
    const cached = stopsCache.get(key);
    if (cached && clock.now() < cached.expiresAt) {
      return cached.value;
    }

    const pending = stopsRequests.get(key);
    if (pending) {
      return pending;
    }

    const request = requestJson(
      buildStopsPath(baseUrl, projectId, tile),
      'pontos',
    )
      .then(payload => normalizeStops(payload, projectId))
      .then(stops => {
        stopsCache.set(key, {
          value: stops,
          expiresAt: clock.now() + MOBILIBUS_STOPS_CACHE_TTL_MS,
        });
        return stops;
      });

    stopsRequests.set(key, request);

    try {
      return await request;
    } finally {
      if (stopsRequests.get(key) === request) {
        stopsRequests.delete(key);
      }
    }
  }

  async function getDepartures(projectId: number, stopId: number): Promise<MobilibusStopDepartures> {
    if (projectId !== OTIMO_RMBH_PROJECT_ID) {
      throw new BadRequestError('Projeto Mobilibus não suportado');
    }

    if (!Number.isSafeInteger(stopId) || stopId <= 0) {
      throw new BadRequestError('Ponto Mobilibus inválido');
    }

    const key = `${projectId}:${stopId}`;
    const cached = departuresCache.get(key);
    if (cached && clock.now() < cached.expiresAt) {
      return cached.value;
    }

    const pending = departuresRequests.get(key);
    if (pending) {
      return pending;
    }

    const request = requestJson(
      buildPath(baseUrl, 'departures', { stop_id: stopId, project_id: projectId }),
      'partidas',
    )
      .then(payload => normalizeStopDepartures(payload, projectId, stopId))
      .then(result => {
        departuresCache.set(key, {
          value: result,
          expiresAt: clock.now() + MOBILIBUS_DEPARTURES_CACHE_TTL_MS,
        });
        return result;
      });

    departuresRequests.set(key, request);

    try {
      return await request;
    } finally {
      if (departuresRequests.get(key) === request) {
        departuresRequests.delete(key);
      }
    }
  }

  return { searchLines, getTimetable, getStopsInTile, getDepartures };
}

export const defaultMobilibusClient = createMobilibusClient();

export const searchMobilibusLines = (query: string) => defaultMobilibusClient.searchLines(query);

export const getMobilibusTimetable = (projectId: number, routeId: number) =>
  defaultMobilibusClient.getTimetable(projectId, routeId);

export const getMobilibusStopsInTile = (projectId: number, tile: MobilibusMapTile) =>
  defaultMobilibusClient.getStopsInTile(projectId, tile);

export const getMobilibusDepartures = (projectId: number, stopId: number) =>
  defaultMobilibusClient.getDepartures(projectId, stopId);
