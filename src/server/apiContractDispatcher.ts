import type { NearbyStop, Prediction, RoutePoint, Vehicle } from '../domain/types';
import type {
  MobilibusLine,
  MobilibusMapTile,
  MobilibusStop,
  MobilibusStopDepartures,
  MobilibusTimetable,
} from '../domain/mobilibusTypes.js';
import { BadRequestError, NotFoundError, toHttpError } from './errors.js';

export type ApiQueryValue = string | readonly string[] | undefined;

export interface ApiContractRequest {
  method: string | undefined;
  url: string | undefined;
  query?: Readonly<Record<string, ApiQueryValue>>;
}

export interface ApiContractResponse {
  status: number;
  body: unknown;
}

export interface ApiContractOperations {
  checkSiuHealth: () => Promise<{ ok: true }>;
  getLines: () => Promise<unknown>;
  getNearbyStops: (latitude: number, longitude: number) => Promise<NearbyStop[]>;
  getStopPredictions: (stopCode: string) => Promise<Prediction[]>;
  getRoutePoints: (serviceId: string) => Promise<RoutePoint[]>;
  getVehicles: (serviceId: string) => Promise<Vehicle[]>;
  searchMobilibusLines: (query: string) => Promise<MobilibusLine[]>;
  getMobilibusTimetable: (projectId: number, routeId: number) => Promise<MobilibusTimetable>;
  getMobilibusStops: (projectId: number, tile: MobilibusMapTile) => Promise<MobilibusStop[]>;
  getMobilibusDepartures: (projectId: number, stopId: number) => Promise<MobilibusStopDepartures>;
}

function apiError(error: unknown): ApiContractResponse {
  const httpError = toHttpError(error);

  return {
    status: httpError.statusCode,
    body: {
      error: {
        code: httpError.code,
        message: httpError.message,
      },
    },
  };
}

function methodNotAllowed(): ApiContractResponse {
  return {
    status: 405,
    body: {
      error: {
        code: 'method_not_allowed',
        message: 'Método não permitido',
      },
    },
  };
}

function badRequest(message: string): ApiContractResponse {
  return apiError(new BadRequestError(message));
}

function notFound(): ApiContractResponse {
  return apiError(new NotFoundError('Rota da API não encontrada'));
}

function firstQueryValue(value: ApiQueryValue): string | null {
  if (value === undefined) {
    return null;
  }

  return typeof value === 'string' ? value : value[0] ?? null;
}

function readQueryValue(
  request: ApiContractRequest,
  parsedUrl: URL,
  name: string,
): string | null {
  const runtimeValue = request.query?.[name];
  if (runtimeValue !== undefined) {
    return firstQueryValue(runtimeValue);
  }

  return parsedUrl.searchParams.get(name);
}

function readNumber(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readPositiveInteger(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function readMapTile(value: string | null): MobilibusMapTile | null {
  const match = value?.match(/^(\d+),(\d+),(\d+)$/);
  if (!match) {
    return null;
  }

  const x = Number(match[1]);
  const y = Number(match[2]);
  const zoom = Number(match[3]);

  if (
    !Number.isSafeInteger(x) ||
    !Number.isSafeInteger(y) ||
    !Number.isSafeInteger(zoom) ||
    zoom < 14 ||
    zoom > 20
  ) {
    return null;
  }

  return { x, y, zoom };
}

function decodePathSegment(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

async function execute<T>(operation: () => Promise<T>, envelope: (value: T) => unknown) {
  try {
    return {
      status: 200,
      body: envelope(await operation()),
    } satisfies ApiContractResponse;
  } catch (error) {
    return apiError(error);
  }
}

export async function dispatchApiRequest(
  request: ApiContractRequest,
  operations: ApiContractOperations,
): Promise<ApiContractResponse | null> {
  if (!request.url) {
    return null;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(request.url, 'http://localhost');
  } catch (error) {
    return apiError(new BadRequestError('URL da API inválida', error));
  }

  const { pathname } = parsedUrl;
  if (!pathname.startsWith('/api/')) {
    return null;
  }

  if (request.method !== 'GET') {
    return methodNotAllowed();
  }

  if (pathname === '/api/health') {
    return execute(operations.checkSiuHealth, value => value);
  }

  if (pathname === '/api/linhas') {
    return execute(operations.getLines, value => value);
  }

  if (pathname === '/api/mobilibus/linhas') {
    const query = readQueryValue(request, parsedUrl, 'q')?.trim() ?? '';
    if (Array.from(query).length < 2) {
      return badRequest('A consulta deve ter pelo menos dois caracteres');
    }

    return execute(
      () => operations.searchMobilibusLines(query),
      lines => ({ lines }),
    );
  }

  const stopsMatch = pathname.match(/^\/api\/mobilibus\/projetos\/([^/]+)\/pontos$/);
  if (stopsMatch) {
    const projectId = decodePathSegment(stopsMatch[1]);
    const parsedProjectId = readPositiveInteger(projectId);
    const tile = readMapTile(readQueryValue(request, parsedUrl, 'tile'));

    if (parsedProjectId === null) {
      return badRequest('Projeto Mobilibus inválido');
    }

    if (parsedProjectId !== 501) {
      return badRequest('Projeto Mobilibus não suportado');
    }

    if (!tile) {
      return badRequest('Tile Mobilibus inválido');
    }

    return execute(
      () => operations.getMobilibusStops(parsedProjectId, tile),
      stops => ({ stops }),
    );
  }

  const departuresMatch = pathname.match(
    /^\/api\/mobilibus\/projetos\/([^/]+)\/pontos\/([^/]+)\/partidas$/,
  );
  if (departuresMatch) {
    const projectId = decodePathSegment(departuresMatch[1]);
    const stopId = decodePathSegment(departuresMatch[2]);
    const parsedProjectId = readPositiveInteger(projectId);
    const parsedStopId = readPositiveInteger(stopId);

    if (parsedProjectId === null) {
      return badRequest('Projeto Mobilibus inválido');
    }

    if (parsedProjectId !== 501) {
      return badRequest('Projeto Mobilibus não suportado');
    }

    if (parsedStopId === null) {
      return badRequest('Ponto Mobilibus inválido');
    }

    return execute(
      () => operations.getMobilibusDepartures(parsedProjectId, parsedStopId),
      departures => ({ departures }),
    );
  }

  if (pathname === '/api/paradas/proximas') {
    const latitude = readNumber(readQueryValue(request, parsedUrl, 'lat'));
    const longitude = readNumber(readQueryValue(request, parsedUrl, 'lng'));

    if (latitude === null || longitude === null) {
      return badRequest('Latitude e longitude são obrigatórias');
    }

    return execute(
      () => operations.getNearbyStops(latitude, longitude),
      stops => ({ stops }),
    );
  }

  const predictionMatch = pathname.match(/^\/api\/paradas\/([^/]+)\/previsoes$/);
  if (predictionMatch) {
    const stopCode = decodePathSegment(predictionMatch[1]);
    if (!stopCode || !/^\d+$/.test(stopCode)) {
      return badRequest('Código da parada inválido');
    }

    return execute(
      () => operations.getStopPredictions(stopCode),
      predictions => ({ predictions }),
    );
  }

  const vehicleMatch = pathname.match(/^\/api\/itinerarios\/([^/]+)\/veiculos$/);
  if (vehicleMatch) {
    const serviceId = decodePathSegment(vehicleMatch[1]);
    if (!serviceId || !/^\d+$/.test(serviceId)) {
      return badRequest('Código do itinerário inválido');
    }

    return execute(
      () => operations.getVehicles(serviceId),
      vehicles => ({ vehicles }),
    );
  }

  const routeMatch = pathname.match(/^\/api\/itinerarios\/([^/]+)$/);
  if (routeMatch) {
    const serviceId = decodePathSegment(routeMatch[1]);
    if (!serviceId || !/^\d+$/.test(serviceId)) {
      return badRequest('Código do itinerário inválido');
    }

    return execute(
      () => operations.getRoutePoints(serviceId),
      route => ({ route }),
    );
  }

  const timetableMatch = pathname.match(
    /^\/api\/mobilibus\/projetos\/([^/]+)\/linhas\/([^/]+)\/horarios$/,
  );
  if (timetableMatch) {
    const projectId = decodePathSegment(timetableMatch[1]);
    const routeId = decodePathSegment(timetableMatch[2]);
    const parsedProjectId = readPositiveInteger(projectId);
    const parsedRouteId = readPositiveInteger(routeId);

    if (parsedProjectId === null) {
      return badRequest('Projeto Mobilibus inválido');
    }

    if (parsedProjectId !== 501) {
      return badRequest('Projeto Mobilibus não suportado');
    }

    if (parsedRouteId === null) {
      return badRequest('Rota Mobilibus inválida');
    }

    return execute(
      () => operations.getMobilibusTimetable(parsedProjectId, parsedRouteId),
      timetable => ({ timetable }),
    );
  }

  return notFound();
}
